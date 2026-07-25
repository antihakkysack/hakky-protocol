import express from "express";
import { pinoHttp } from "pino-http";
import { isAddress, getAddress, id as keccakId } from "ethers";
import { config, PILOT_MAX_SATS } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import {
  initDb,
  audit,
  getWorkerCursor,
  setWorkerCursor,
  upsertRedemptionJob,
  getRedemptionJob,
  listActionableRedemptionJobs,
  markRedemptionPayoutVerified,
  markRedemptionSettled,
  markRedemptionCancelled,
  markRedemptionError,
  type RedemptionJob,
} from "../shared/db.js";
import {
  provider,
  reserveVault,
  cleanBtc,
  assertProtocolReady,
  assertSignerRoles,
  requireContract,
  requireSigner,
} from "../shared/chain.js";
import { requireWriteAuth } from "../shared/auth.js";
import { bitcoinTxidToBytes32 } from "../shared/bitcoin.js";
import {
  assertBitcoinCustodyReady,
  assertCustodyChainSynced,
  requireBitcoinCore,
} from "../shared/custody.js";
import {
  initialRedemptionCursor,
  nextRedemptionScanRange,
  safeEventHead,
} from "./redemption-indexer.js";

const log = logger.child({ service: "orchestrator" });
const REDEMPTION_CURSOR = "orchestrator:redeem-requested";

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "orchestrator" }));

/**
 * Verify a BTC custody outpoint and mint cBTC 1:1 to `to` via
 * `ReserveVault.processDeposit`. In bitcoin-core mode, amountSats is derived
 * from the confirmed UTXO and cannot be asserted by the caller.
 *
 *   POST /deposit {
 *     "to": "0x...",
 *     "btcTxid": "<64 hex>",
 *     "vout": 0,
 *     "screeningEvidenceURI": "ipfs://..."
 *   }
 *
 * Demo stub mode retains caller-supplied amountSats, but live configuration
 * rejects that mode at startup.
 */
app.post("/deposit", requireWriteAuth, async (req, res) => {
  const to = (req.body?.to ?? "").toString();
  if (!isAddress(to)) return res.status(400).json({ error: "invalid recipient address" });
  const recipient = getAddress(to);

  const vout = Number(req.body?.vout ?? 0);
  if (!Number.isInteger(vout) || vout < 0 || vout > 0xffffffff) {
    return res.status(400).json({ error: "vout must be an unsigned 32-bit integer" });
  }

  const vault = requireContract(reserveVault, "ReserveVault");
  const cbtc = requireContract(cleanBtc, "CleanBTC");
  const requestedEvidenceURI = String(req.body?.screeningEvidenceURI ?? "");

  let amountSats: bigint;
  let btcTxid: string;
  let confirmations: number | null = null;
  let evidenceURI: string;

  if (config.DEPOSIT_VERIFICATION_MODE === "bitcoin-core") {
    const txidInput = String(req.body?.btcTxid ?? "");
    if (!txidInput) {
      return res.status(400).json({ error: "btcTxid is required in bitcoin-core mode" });
    }
    if (!isEvidenceUri(requestedEvidenceURI)) {
      return res.status(400).json({
        error: "screeningEvidenceURI must use https:// or ipfs:// in bitcoin-core mode",
      });
    }

    try {
      // A stalled node reports a spent outpoint as still unspent and confirmed,
      // which would mint cBTC against BTC that has already left custody.
      await assertCustodyChainSynced();
      const deposit = await requireBitcoinCore().verifyDeposit(
        txidInput,
        vout,
        config.BITCOIN_CUSTODY_ADDRESS,
        config.BITCOIN_MIN_CONFIRMATIONS,
      );
      amountSats = deposit.amountSats;
      confirmations = deposit.confirmations;
      btcTxid = bitcoinTxidToBytes32(deposit.txid);
      evidenceURI = requestedEvidenceURI;
    } catch (e) {
      log.warn({ err: e, txid: txidInput, vout }, "Bitcoin deposit verification failed");
      return res.status(422).json({ error: (e as Error).message });
    }
  } else {
    try {
      amountSats = BigInt((req.body?.amountSats ?? "").toString());
    } catch {
      return res.status(400).json({ error: "amountSats must be an integer string (satoshis)" });
    }
    const demoReference = String(req.body?.btcTxid ?? "");
    btcTxid = demoReference
      ? bitcoinTxidToBytes32(demoReference)
      : keccakId(`hakky-demo-deposit:${recipient}:${amountSats}:${Date.now()}`);
    evidenceURI =
      requestedEvidenceURI ||
      `https://api.hakky.xyz/reports/deposit-demo/${recipient}.json`;
  }

  if (amountSats <= 0n) {
    return res.status(400).json({ error: "deposit amount must be > 0" });
  }
  if (amountSats > PILOT_MAX_SATS) {
    return res.status(409).json({ error: "deposit exceeds the one-BTC pilot ceiling" });
  }

  try {
    const [supply, pendingRedemptions, contractCap, depositId] = await Promise.all([
      cbtc.totalSupply() as Promise<bigint>,
      vault.pendingRedemptionSats() as Promise<bigint>,
      cbtc.PILOT_SUPPLY_CAP_SATS() as Promise<bigint>,
      vault.getDepositId(btcTxid, vout) as Promise<string>,
    ]);
    if (contractCap !== PILOT_MAX_SATS) {
      throw new Error(
        `contract pilot cap mismatch: expected ${PILOT_MAX_SATS}, received ${contractCap}`,
      );
    }
    const liabilities = supply + pendingRedemptions;
    if (liabilities + amountSats > contractCap) {
      return res.status(409).json({
        error: "deposit would exceed the one-BTC pilot ceiling",
        currentSupplySats: supply.toString(),
        pendingRedemptionSats: pendingRedemptions.toString(),
        totalLiabilitiesSats: liabilities.toString(),
        depositSats: amountSats.toString(),
        capSats: contractCap.toString(),
      });
    }
    if ((await vault.processedDeposits(depositId)) as boolean) {
      return res.status(409).json({ error: "Bitcoin outpoint was already processed", depositId });
    }

    requireSigner();
    const tx = await vault.processDeposit(recipient, amountSats, btcTxid, vout, evidenceURI);
    const receipt = await tx.wait();
    await audit("orchestrator", "deposit-processed", {
      to: recipient,
      amountSats: amountSats.toString(),
      btcTxid,
      vout,
      confirmations,
      verificationMode: config.DEPOSIT_VERIFICATION_MODE,
      evidenceURI,
      txHash: receipt?.hash,
    });
    log.info(
      {
        to: recipient,
        amountSats: amountSats.toString(),
        btcTxid,
        vout,
        txHash: receipt?.hash,
      },
      "deposit processed -> cBTC minted",
    );
    res.json({
      to: recipient,
      amountSats: amountSats.toString(),
      btcTxid,
      vout,
      confirmations,
      evidenceURI,
      txHash: receipt?.hash,
    });
  } catch (e) {
    log.error({ err: e }, "deposit failed");
    res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * Authenticated operator view of redemptions discovered from finalized EVM logs.
 */
app.get("/redemptions/pending", requireWriteAuth, async (_req, res) => {
  try {
    const jobs = await listActionableRedemptionJobs();
    res.json({ redemptions: jobs });
  } catch (e) {
    log.error({ err: e }, "listing redemptions failed");
    res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * Verify an operator-supplied Bitcoin payout against the custody wallet, then
 * record settlement on-chain. This endpoint never creates or broadcasts a BTC
 * transaction; custody signing remains an explicit external action.
 */
app.post("/redemptions/:id/settle", requireWriteAuth, async (req, res) => {
  if (config.REDEMPTION_MODE !== "manual-verified") {
    return res.status(409).json({ error: "verified manual redemption mode is not enabled" });
  }

  const id = String(req.params.id);
  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: "redemption id must be a positive integer" });
  }

  try {
    const job = await getRedemptionJob(id);
    if (!job) {
      return res.status(404).json({ error: "redemption has not been indexed yet" });
    }
    const bitcoinTxid = String(req.body?.btcTxid ?? job.btcTxid ?? "");
    if (!bitcoinTxid) {
      return res.status(400).json({ error: "btcTxid is required" });
    }

    const vault = requireContract(reserveVault, "ReserveVault");
    const redemption = await readOnchainRedemption(vault, id);
    if (redemption.status === 2) {
      const settledTxid =
        redemption.btcTxid === "0x".padEnd(66, "0")
          ? bitcoinTxid
          : redemption.btcTxid.slice(2);
      await markRedemptionSettled(id, settledTxid);
      return res.json({ id, status: "settled", alreadySettled: true });
    }
    if (redemption.status === 3) {
      await markRedemptionCancelled(id);
      return res.status(409).json({ error: "redemption was cancelled on-chain" });
    }
    if (redemption.status !== 1) {
      throw new Error(`redemption ${id} is not pending on-chain`);
    }
    assertRedemptionMatchesJob(redemption, job);

    // Settlement confirms a payout from the same chainstate; a stalled node could
    // report confirmations for a transaction the real chain has reorganised away.
    await assertCustodyChainSynced();
    const payout = await requireBitcoinCore().verifyPayout(
      bitcoinTxid,
      redemption.btcPayoutAddress,
      redemption.amountSats,
      config.BITCOIN_PAYOUT_MIN_CONFIRMATIONS,
    );
    await markRedemptionPayoutVerified(id, payout.txid);

    requireSigner();
    const tx = await vault.settleRedeem(BigInt(id), bitcoinTxidToBytes32(payout.txid));
    const receipt = await tx.wait();
    await markRedemptionSettled(id, payout.txid);
    await audit("orchestrator", "redeem-settled", {
      id,
      account: redemption.account,
      amountSats: redemption.amountSats.toString(),
      btcPayoutAddress: redemption.btcPayoutAddress,
      btcTxid: payout.txid,
      bitcoinConfirmations: payout.confirmations,
      txHash: receipt?.hash,
    });
    log.info({ id, btcTxid: payout.txid, txHash: receipt?.hash }, "redeem settled");
    return res.json({
      id,
      status: "settled",
      btcTxid: payout.txid,
      bitcoinConfirmations: payout.confirmations,
      txHash: receipt?.hash,
    });
  } catch (e) {
    await markRedemptionError(id, (e as Error).message).catch((dbError) => {
      log.error({ err: dbError, id }, "failed to persist redemption error");
    });
    log.error({ err: e, id }, "verified redemption settlement failed");
    return res.status(422).json({ error: (e as Error).message });
  }
});

/**
 * Poll finalized RedeemRequested logs into Postgres with a durable cursor.
 * The cursor advances only after every event in the range is stored, so process
 * restarts and transient failures cannot permanently skip a redemption.
 */
function watchRedemptions(): void {
  const vault = requireContract(reserveVault, "ReserveVault");
  let pollInFlight = false;

  async function poll(): Promise<void> {
    if (pollInFlight) return;
    pollInFlight = true;
    try {
      const head = await provider.getBlockNumber();
      const safeHead = safeEventHead(head, config.EVM_EVENT_CONFIRMATIONS);
      const persisted = await getWorkerCursor(REDEMPTION_CURSOR);
      const cursor = initialRedemptionCursor(
        persisted,
        config.REDEMPTION_START_BLOCK,
        safeHead,
      );
      if (persisted === null) {
        await setWorkerCursor(REDEMPTION_CURSOR, cursor);
      }

      const range = nextRedemptionScanRange(
        cursor,
        safeHead,
        config.EVM_LOG_BATCH_SIZE,
      );
      if (range) {
        const events = await vault.queryFilter(
          vault.filters.RedeemRequested(),
          range.fromBlock,
          range.toBlock,
        );
        for (const event of events) {
          const ev = event as unknown as {
            args: readonly [bigint, string, bigint, string];
            blockNumber: number;
            transactionHash: string;
          };
          const [id, account, amountSats, btcPayoutAddress] = ev.args;
          await upsertRedemptionJob({
            id: id.toString(),
            account,
            amountSats: amountSats.toString(),
            btcPayoutAddress,
            requestBlock: ev.blockNumber,
            requestTxHash: ev.transactionHash,
          });
          log.info(
            {
              id: id.toString(),
              account,
              amountSats: amountSats.toString(),
              btcPayoutAddress,
              blockNumber: ev.blockNumber,
            },
            "redeem request indexed",
          );
        }
        await setWorkerCursor(REDEMPTION_CURSOR, range.toBlock);
        log.debug(
          { fromBlock: range.fromBlock, toBlock: range.toBlock, events: events.length },
          "redemption log range indexed",
        );
      }

      if (config.REDEMPTION_MODE === "demo-auto") {
        await processDemoRedemptions(vault);
      }
    } catch (e) {
      log.error({ err: e }, "redeem poll failed");
    } finally {
      pollInFlight = false;
    }
  }

  void poll();
  setInterval(() => void poll(), config.REDEMPTION_POLL_MS);
  log.info(
    {
      pollMs: config.REDEMPTION_POLL_MS,
      confirmations: config.EVM_EVENT_CONFIRMATIONS,
      startBlock: config.REDEMPTION_START_BLOCK,
      mode: config.REDEMPTION_MODE,
    },
    "polling ReserveVault for finalized RedeemRequested events",
  );
}

async function processDemoRedemptions(
  vault: ReturnType<typeof requireContract>,
): Promise<void> {
  const jobs = await listActionableRedemptionJobs();
  for (const job of jobs) {
    try {
      const redemption = await readOnchainRedemption(vault, job.id);
      if (redemption.status === 2) {
        const settledTxid =
          redemption.btcTxid === "0x".padEnd(66, "0")
            ? (job.btcTxid ?? "already-settled")
            : redemption.btcTxid.slice(2);
        await markRedemptionSettled(job.id, settledTxid);
        continue;
      }
      if (redemption.status === 3) {
        await markRedemptionCancelled(job.id);
        continue;
      }
      if (redemption.status !== 1) continue;

      requireSigner();
      const btcTxid = keccakId(
        `hakky-demo-settle:${job.id}:${redemption.btcPayoutAddress}`,
      );
      const tx = await vault.settleRedeem(BigInt(job.id), btcTxid);
      const receipt = await tx.wait();
      await markRedemptionSettled(job.id, btcTxid);
      await audit("orchestrator", "redeem-settled-demo", {
        id: job.id,
        account: redemption.account,
        amountSats: redemption.amountSats.toString(),
        btcTxid,
        txHash: receipt?.hash,
      });
    } catch (e) {
      await markRedemptionError(job.id, (e as Error).message);
      log.error({ err: e, id: job.id }, "demo redemption settlement failed");
    }
  }
}

interface OnchainRedemption {
  account: string;
  amountSats: bigint;
  btcPayoutAddress: string;
  status: number;
  btcTxid: string;
}

async function readOnchainRedemption(
  vault: ReturnType<typeof requireContract>,
  id: string,
): Promise<OnchainRedemption> {
  const result = (await vault.redemptions(BigInt(id))) as unknown as {
    account: string;
    amountSats: bigint;
    btcPayoutAddress: string;
    status: bigint;
    btcTxid: string;
  };
  return {
    account: getAddress(result.account),
    amountSats: result.amountSats,
    btcPayoutAddress: result.btcPayoutAddress,
    status: Number(result.status),
    btcTxid: result.btcTxid,
  };
}

function assertRedemptionMatchesJob(
  redemption: OnchainRedemption,
  job: RedemptionJob,
): void {
  if (
    redemption.account.toLowerCase() !== job.account.toLowerCase() ||
    redemption.amountSats.toString() !== job.amountSats ||
    redemption.btcPayoutAddress !== job.btcPayoutAddress
  ) {
    throw new Error(`redemption ${job.id} does not match the indexed event`);
  }
}

async function main(): Promise<void> {
  await initDb();
  if (config.OPERATING_MODE === "live") {
    await assertProtocolReady([
      ["CleanBTC", cleanBtc],
      ["ReserveVault", reserveVault],
    ]);
    await assertSignerRoles([
      ["ReserveVault", reserveVault, "VERIFIER_ROLE"],
      ["ReserveVault", reserveVault, "SETTLER_ROLE"],
    ]);
  }
  if (config.DEPOSIT_VERIFICATION_MODE === "bitcoin-core") {
    await assertBitcoinCustodyReady();
  }
  watchRedemptions();
  app.listen(config.ORCHESTRATOR_PORT, () => {
    log.info({ port: config.ORCHESTRATOR_PORT }, "orchestrator listening");
  });
}

main().catch((e) => {
  log.error({ err: e }, "orchestrator fatal");
  process.exit(1);
});

function isEvidenceUri(value: string): boolean {
  try {
    const uri = new URL(value);
    return uri.protocol === "https:" || uri.protocol === "ipfs:";
  } catch {
    return false;
  }
}
