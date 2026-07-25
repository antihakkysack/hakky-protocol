import express from "express";
import { pinoHttp } from "pino-http";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import {
  provider,
  cleanBtc,
  reserveOracle,
  reserveVault,
  attestationRegistry,
  assertProtocolReady,
} from "../shared/chain.js";
import { pool, initDb } from "../shared/db.js";
import { assertBitcoinCustodyReady } from "../shared/custody.js";

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
    if (config.DEPOSIT_VERIFICATION_MODE === "bitcoin-core") {
      await assertBitcoinCustodyReady();
    }
    res.json({
      ok: true,
      operatingMode: config.OPERATING_MODE,
      chainId: config.CHAIN_ID,
      block,
      bitcoinNetwork:
        config.DEPOSIT_VERIFICATION_MODE === "bitcoin-core"
          ? config.BITCOIN_NETWORK
          : null,
    });
  } catch (e) {
    res.status(503).json({ ok: false, error: (e as Error).message });
  }
});

/**
 * Public proof-of-reserves. Reads the attested reserve figure and the live cBTC
 * supply straight from chain and reports the current custody solvency condition.
 */
app.get("/proof-of-reserves", async (_req, res) => {
  if (!reserveOracle || !cleanBtc || !reserveVault) {
    return res.status(503).json({ error: "contracts not configured (set addresses in .env)" });
  }
  const oracle = reserveOracle;
  const cbtc = cleanBtc;
  const vault = reserveVault;
  try {
    const [
      reserveSats,
      supply,
      pendingRedemptionSats,
      pilotCapSats,
      attestationURI,
      lastUpdated,
    ] = await Promise.all([
      oracle.reserveSats() as Promise<bigint>,
      cbtc.totalSupply() as Promise<bigint>,
      vault.pendingRedemptionSats() as Promise<bigint>,
      cbtc.PILOT_SUPPLY_CAP_SATS() as Promise<bigint>,
      oracle.attestationURI() as Promise<string>,
      oracle.lastUpdated() as Promise<bigint>,
    ]);
    const totalLiabilitiesSats = supply + pendingRedemptionSats;
    const collateralRatio =
      totalLiabilitiesSats === 0n
        ? null
        : Number((reserveSats * 10_000n) / totalLiabilitiesSats) / 10_000;
    const mintableBacking = reserveSats < pilotCapSats ? reserveSats : pilotCapSats;
    const remainingMintCapacitySats =
      mintableBacking > totalLiabilitiesSats
        ? mintableBacking - totalLiabilitiesSats
        : 0n;
    const asOf = Math.floor(Date.now() / 1000);
    const reserveAgeSeconds =
      lastUpdated === 0n ? null : Math.max(0, asOf - Number(lastUpdated));
    res.json({
      operatingMode: config.OPERATING_MODE,
      bitcoinNetwork:
        config.DEPOSIT_VERIFICATION_MODE === "bitcoin-core"
          ? config.BITCOIN_NETWORK
          : null,
      custodyAddress:
        config.DEPOSIT_VERIFICATION_MODE === "bitcoin-core"
          ? config.BITCOIN_CUSTODY_ADDRESS
          : null,
      unit: "satoshis",
      reserveSats: reserveSats.toString(),
      cbtcSupply: supply.toString(),
      pendingRedemptionSats: pendingRedemptionSats.toString(),
      totalLiabilitiesSats: totalLiabilitiesSats.toString(),
      pilotCapSats: pilotCapSats.toString(),
      remainingMintCapacitySats: remainingMintCapacitySats.toString(),
      collateralRatio, // reserves / total liabilities; >= 1.0 means fully backed
      solvent: totalLiabilitiesSats <= reserveSats,
      reserveFresh:
        reserveAgeSeconds !== null &&
        reserveAgeSeconds <= config.RESERVE_MAX_STALENESS_SECONDS,
      reserveAgeSeconds,
      attestationURI,
      lastUpdated: Number(lastUpdated),
      asOf,
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

async function main(): Promise<void> {
  try {
    await initDb();
  } catch (e) {
    if (config.OPERATING_MODE === "live") throw e;
    logger.error({ err: e }, "initDb failed — /activity unavailable");
  }

  if (config.OPERATING_MODE === "live") {
    await assertProtocolReady([
      ["ReserveOracle", reserveOracle],
      ["CleanBTC", cleanBtc],
      ["ReserveVault", reserveVault],
      ["AttestationRegistry", attestationRegistry],
    ]);
  }

  app.listen(config.PORT, () => {
    logger.info(`Hakky proof-of-reserves API on :${config.PORT} (chain ${config.CHAIN_ID})`);
  });
}

main().catch((e) => {
  logger.error({ err: e }, "api fatal");
  process.exit(1);
});
