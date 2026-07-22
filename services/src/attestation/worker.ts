import express from "express";
import { pinoHttp } from "pino-http";
import { isAddress, getAddress } from "ethers";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { initDb, audit } from "../shared/db.js";
import { attestationRegistry, requireContract, requireSigner } from "../shared/chain.js";
import { screenAddress } from "../shared/screening.js";
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
 *   POST /screen { "address": "0x..." }
 *
 * Re-screening the same address overwrites its attestation (the registry is
 * additive/latest-wins), so this is safe to call repeatedly.
 */
app.post("/screen", requireWriteAuth, async (req, res) => {
  const address = (req.body?.address ?? "").toString();
  if (!isAddress(address)) return res.status(400).json({ error: "invalid EVM address" });
  const subject = getAddress(address);

  const registry = requireContract(attestationRegistry, "AttestationRegistry");
  try {
    requireSigner();
    const result = screenAddress(subject);
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
