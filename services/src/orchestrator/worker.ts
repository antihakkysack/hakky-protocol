import express from "express";
import { pinoHttp } from "pino-http";
import { isAddress, getAddress, id as keccakId } from "ethers";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { initDb, audit } from "../shared/db.js";
import { provider, reserveVault, requireContract, requireSigner } from "../shared/chain.js";
import { requireWriteAuth } from "../shared/auth.js";

const log = logger.child({ service: "orchestrator" });

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "orchestrator" }));

/**
 * Simulate a screened BTC deposit: confirm it and mint cBTC 1:1 to `to` via
 * `ReserveVault.processDeposit`. Requires VERIFIER_ROLE. In production the
 * verifier is a multisig fed by custodian + screening attestations; here an
 * operator triggers it manually to demonstrate the mint path.
 *
 *   POST /deposit { "to": "0x...", "amountSats": "100000000", "btcTxid"?: "0x..." }
 */
app.post("/deposit", requireWriteAuth, async (req, res) => {
  const to = (req.body?.to ?? "").toString();
  if (!isAddress(to)) return res.status(400).json({ error: "invalid recipient address" });
  const recipient = getAddress(to);

  let amountSats: bigint;
  try {
    amountSats = BigInt((req.body?.amountSats ?? "").toString());
  } catch {
    return res.status(400).json({ error: "amountSats must be an integer string (satoshis)" });
  }
  if (amountSats <= 0n) return res.status(400).json({ error: "amountSats must be > 0" });

  const vault = requireContract(reserveVault, "ReserveVault");
  // Use the supplied BTC txid, or a deterministic demo one (also the replay key).
  const btcTxid = req.body?.btcTxid
    ? String(req.body.btcTxid)
    : keccakId(`hakky-deposit:${recipient}:${amountSats}:${Date.now()}`);
  const evidenceURI = `https://api.hakky.xyz/reports/deposit/${recipient}.json`;

  try {
    requireSigner();
    const tx = await vault.processDeposit(recipient, amountSats, btcTxid, evidenceURI);
    const receipt = await tx.wait();
    await audit("orchestrator", "deposit-processed", {
      to: recipient,
      amountSats: amountSats.toString(),
      btcTxid,
      txHash: receipt?.hash,
    });
    log.info(
      { to: recipient, amountSats: amountSats.toString(), txHash: receipt?.hash },
      "deposit processed -> cBTC minted",
    );
    res.json({ to: recipient, amountSats: amountSats.toString(), btcTxid, txHash: receipt?.hash });
  } catch (e) {
    log.error({ err: e }, "deposit failed");
    res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * Poll for redemption requests and settle them. We poll with `queryFilter`
 * (eth_getLogs over a block range) rather than an event subscription, because
 * public RPCs expire the server-side filters that ethers' `.on()` relies on
 * ("filter not found"). We start from the boot block, so only redemptions made
 * while the orchestrator is running are settled. In production a settler pays
 * out BTC off-chain and then records the settling txid; here we settle
 * immediately with a deterministic demo txid to close the loop.
 */
function watchRedemptions(): void {
  const vault = requireContract(reserveVault, "ReserveVault");
  const POLL_MS = 15000;
  let fromBlock = -1;

  async function poll(): Promise<void> {
    try {
      const head = await provider.getBlockNumber();
      if (fromBlock < 0) fromBlock = head + 1; // only handle redemptions after boot
      if (head < fromBlock) return;
      const events = await vault.queryFilter(vault.filters.RedeemRequested(), fromBlock, head);
      fromBlock = head + 1;
      for (const ev of events) {
        const args = (ev as { args: readonly unknown[] }).args;
        const id = args[0] as bigint;
        const account = args[1] as string;
        const amountSats = args[2] as bigint;
        const btcPayoutAddress = args[3] as string;
        log.info(
          { id: id.toString(), account, amountSats: amountSats.toString(), btcPayoutAddress },
          "redeem requested",
        );
        try {
          requireSigner();
          const btcTxid = keccakId(`hakky-settle:${id}:${btcPayoutAddress}`);
          const tx = await vault.settleRedeem(id, btcTxid);
          const receipt = await tx.wait();
          await audit("orchestrator", "redeem-settled", {
            id: id.toString(),
            account,
            amountSats: amountSats.toString(),
            btcTxid,
            txHash: receipt?.hash,
          });
          log.info({ id: id.toString(), txHash: receipt?.hash }, "redeem settled");
        } catch (e) {
          log.error({ err: e, id: id.toString() }, "settle failed");
        }
      }
    } catch (e) {
      log.error({ err: e }, "redeem poll failed");
    }
  }

  setInterval(() => void poll(), POLL_MS);
  log.info({ pollMs: POLL_MS }, "polling ReserveVault for RedeemRequested");
}

async function main(): Promise<void> {
  await initDb();
  watchRedemptions();
  app.listen(config.ORCHESTRATOR_PORT, () => {
    log.info({ port: config.ORCHESTRATOR_PORT }, "orchestrator listening");
  });
}

main().catch((e) => {
  log.error({ err: e }, "orchestrator fatal");
  process.exit(1);
});
