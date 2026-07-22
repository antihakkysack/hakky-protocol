import express from "express";
import { pinoHttp } from "pino-http";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { provider, cleanBtc, reserveOracle, attestationRegistry } from "../shared/chain.js";
import { pool, initDb } from "../shared/db.js";

const app = express();
app.use(pinoHttp({ logger }));
app.use((_req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*"); // public read API
  next();
});

/** Liveness + chain connectivity. */
app.get("/health", async (_req, res) => {
  try {
    const block = await provider.getBlockNumber();
    res.json({ ok: true, chainId: config.CHAIN_ID, block });
  } catch (e) {
    res.status(503).json({ ok: false, error: (e as Error).message });
  }
});

/**
 * Public proof-of-reserves. Reads the attested reserve figure and the live cBTC
 * supply straight from chain and reports the solvency invariant the contracts enforce.
 */
app.get("/proof-of-reserves", async (_req, res) => {
  if (!reserveOracle || !cleanBtc) {
    return res.status(503).json({ error: "contracts not configured (set addresses in .env)" });
  }
  const oracle = reserveOracle;
  const cbtc = cleanBtc;
  try {
    const [reserveSats, supply, attestationURI, lastUpdated] = await Promise.all([
      oracle.reserveSats() as Promise<bigint>,
      cbtc.totalSupply() as Promise<bigint>,
      oracle.attestationURI() as Promise<string>,
      oracle.lastUpdated() as Promise<bigint>,
    ]);
    const collateralRatio =
      supply === 0n ? null : Number((reserveSats * 10_000n) / supply) / 10_000;
    res.json({
      unit: "satoshis",
      reserveSats: reserveSats.toString(),
      cbtcSupply: supply.toString(),
      collateralRatio, // reserves / supply; >= 1.0 means fully backed
      solvent: supply <= reserveSats,
      attestationURI,
      lastUpdated: Number(lastUpdated),
      asOf: Math.floor(Date.now() / 1000),
    });
  } catch (e) {
    logger.error({ err: e }, "proof-of-reserves failed");
    res.status(500).json({ error: (e as Error).message });
  }
});

/** Public cleanliness attestation lookup for an address. */
app.get("/attestation/:address", async (req, res) => {
  if (!attestationRegistry) {
    return res.status(503).json({ error: "attestation registry not configured" });
  }
  const registry = attestationRegistry;
  const address = req.params.address;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: "invalid EVM address" });
  }
  try {
    const [att, sanctioned, live] = await Promise.all([
      registry.getAttestation(address),
      registry.isSanctioned(address) as Promise<boolean>,
      registry.hasLiveAttestation(address) as Promise<boolean>,
    ]);
    res.json({
      address,
      hasLiveAttestation: live,
      sanctioned,
      score: Number(att.score),
      revoked: att.revoked,
      provider: att.provider,
      issuedAt: Number(att.issuedAt),
      expiresAt: Number(att.expiresAt),
      evidenceURI: att.evidenceURI,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** Recent protocol activity from the audit log (screens, mints, settles, reserve updates). */
app.get("/activity", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT service, event, payload, created_at
         FROM audit_log
        ORDER BY id DESC
        LIMIT 25`,
    );
    res.json({ events: rows });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Ensure the audit_log table exists before serving /activity, then listen.
initDb()
  .catch((e) => logger.error({ err: e }, "initDb failed — /activity empty until a worker writes"))
  .finally(() => {
    app.listen(config.PORT, () => {
      logger.info(`Hakky proof-of-reserves API on :${config.PORT} (chain ${config.CHAIN_ID})`);
    });
  });
