import express from "express";
import { pinoHttp } from "pino-http";
import { isAddress, getAddress } from "ethers";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { initDb, audit } from "../shared/db.js";
import {
  assertProtocolReady,
  assertSignerRoles,
  attestationRegistry,
  requireContract,
  requireSigner,
} from "../shared/chain.js";
import {
  screenAddress,
  validateManualScreening,
} from "../shared/screening.js";
import { requireWriteAuth } from "../shared/auth.js";

const log = logger.child({ service: "attestation" });

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "attestation" }));

/**
 * Screen an address for provenance and publish a signed cleanliness attestation
 * on-chain via `AttestationRegistry.attest`. Requires ATTESTOR_ROLE.
 *
 *   POST /screen { "address": "0x...", "score": 95,
 *                  "sanctioned": false, "evidenceURI": "https://..." }
 *
 * Re-screening the same address replaces its current state; the event log
 * retains the public history.
 */
app.post("/screen", requireWriteAuth, async (req, res) => {
  const address = (req.body?.address ?? "").toString();
  if (!isAddress(address)) return res.status(400).json({ error: "invalid EVM address" });
  const subject = getAddress(address);

  const registry = requireContract(attestationRegistry, "AttestationRegistry");
  try {
    requireSigner();
    const result =
      config.SCREENING_PROVIDER === "stub"
        ? screenAddress(subject)
        : validateManualScreening(req.body);
    const tx = await registry.attest(
      subject,
      result.score,
      result.sanctioned,
      config.ATTESTATION_TTL_SECONDS, // 0 => contract defaultTtl (90 days)
      result.evidenceURI,
    );
    const receipt = await tx.wait();
    await audit("attestation", "attested", {
      subject,
      score: result.score,
      sanctioned: result.sanctioned,
      txHash: receipt?.hash,
    });
    log.info(
      { subject, score: result.score, sanctioned: result.sanctioned, txHash: receipt?.hash },
      "attestation published",
    );
    res.json({
      subject,
      score: result.score,
      sanctioned: result.sanctioned,
      evidenceURI: result.evidenceURI,
      txHash: receipt?.hash,
    });
  } catch (e) {
    log.error({ err: e }, "screen failed");
    res.status(500).json({ error: (e as Error).message });
  }
});

async function main(): Promise<void> {
  await initDb();
  if (config.OPERATING_MODE === "live") {
    await assertProtocolReady([["AttestationRegistry", attestationRegistry]]);
    await assertSignerRoles([
      ["AttestationRegistry", attestationRegistry, "ATTESTOR_ROLE"],
    ]);
  }
  app.listen(config.ATTESTATION_PORT, () => {
    log.info(
      { port: config.ATTESTATION_PORT, provider: config.SCREENING_PROVIDER },
      "attestation-service listening",
    );
  });
}

main().catch((e) => {
  log.error({ err: e }, "attestation fatal");
  process.exit(1);
});
