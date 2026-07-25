import cron from "node-cron";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { initDb, audit } from "../shared/db.js";
import {
  provider,
  reserveOracle,
  cleanBtc,
  reserveVault,
  assertProtocolReady,
  assertSignerRoles,
  requireContract,
  requireSigner,
} from "../shared/chain.js";
import {
  assertBitcoinCustodyReady,
  assertCustodyChainSynced,
  requireBitcoinCore,
} from "../shared/custody.js";
import { evaluateReserveBuffer, describeReserveBuffer } from "../shared/reserve-buffer.js";

const log = logger.child({ service: "reserve-oracle" });

/**
 * Reserve-oracle keeper. On a schedule it reads the BTC custody balance
 * and publishes it to `ReserveOracle.updateReserves` whenever it differs from the
 * on-chain figure — keeping proof-of-reserves fresh. Requires RESERVE_UPDATER_ROLE.
 * In bitcoin-core mode the balance is derived from confirmed, safe custody UTXOs.
 * It always reports the truth, including a balance below supply, so insolvency
 * cannot be hidden by the keeper.
 */
async function tick(): Promise<void> {
  const oracle = requireContract(reserveOracle, "ReserveOracle");
  const cbtc = requireContract(cleanBtc, "CleanBTC");
  const vault = requireContract(reserveVault, "ReserveVault");

  let target: bigint;
  if (config.DEPOSIT_VERIFICATION_MODE === "bitcoin-core") {
    // Refuse to publish anything derived from a stale chainstate. A stalled node
    // still returns UTXOs spent at a height it has not seen, which would put a
    // reserve figure on-chain for BTC that is already gone.
    await assertCustodyChainSynced();
    target = await requireBitcoinCore().getConfirmedCustodyBalanceSats(
      config.BITCOIN_CUSTODY_ADDRESS,
      config.BITCOIN_MIN_CONFIRMATIONS,
    );
  } else {
    target = BigInt(config.CUSTODY_BALANCE_SATS);
  }
  if (config.DEPOSIT_VERIFICATION_MODE === "stub" && target === 0n) {
    log.debug("CUSTODY_BALANCE_SATS=0 — keeper idle (nothing to publish)");
    return;
  }

  const [current, supply, pendingRedemptions, lastUpdated] = await Promise.all([
    oracle.reserveSats() as Promise<bigint>,
    cbtc.totalSupply() as Promise<bigint>,
    vault.pendingRedemptionSats() as Promise<bigint>,
    oracle.lastUpdated() as Promise<bigint>,
  ]);
  const liabilities = supply + pendingRedemptions;

  const buffer = evaluateReserveBuffer({
    custodySats: target,
    liabilitiesSats: liabilities,
    bufferSats: BigInt(config.BITCOIN_FEE_BUFFER_SATS),
  });
  const bufferContext = {
    ...describeReserveBuffer(buffer),
    target: target.toString(),
    supply: supply.toString(),
    pendingRedemptions: pendingRedemptions.toString(),
    liabilities: liabilities.toString(),
  };

  // Fees are funded from operator headroom, so the buffer drains before backing
  // does. Escalate on the way down rather than only once solvency is already gone.
  switch (buffer.state) {
    case "insolvent":
      log.error(
        bufferContext,
        "confirmed BTC reserves are below total liabilities; publishing insolvency state",
      );
      break;
    case "exhausted":
      log.error(
        bufferContext,
        "fee buffer is exhausted; the next redemption payout cannot fund its miner fee without breaking backing — top up custody",
      );
      break;
    case "depleted":
      log.warn(
        bufferContext,
        "fee buffer is below its configured target; top up custody before the next redemption payout",
      );
      break;
    case "healthy":
      log.debug(bufferContext, "custody covers liabilities and the full fee buffer");
      break;
  }
  const ageSeconds = BigInt(Math.floor(Date.now() / 1000)) - lastUpdated;
  if (
    current === target &&
    lastUpdated > 0n &&
    ageSeconds < BigInt(config.RESERVE_HEARTBEAT_SECONDS)
  ) {
    log.debug(
      { reserveSats: current.toString(), ageSeconds: ageSeconds.toString() },
      "reserves unchanged and heartbeat still fresh",
    );
    return;
  }

  requireSigner();
  log.info({ from: current.toString(), to: target.toString() }, "publishing updated reserves");
  const tx = await oracle.updateReserves(target, config.RESERVE_REPORT_URI);
  const receipt = await tx.wait();
  await audit("reserve-oracle", "reserves-updated", {
    reserveSats: target.toString(),
    previous: current.toString(),
    supplySats: supply.toString(),
    pendingRedemptionSats: pendingRedemptions.toString(),
    totalLiabilitiesSats: liabilities.toString(),
    solvent: buffer.solvent,
    feeBufferSats: buffer.bufferSats.toString(),
    feeBufferHeadroomSats: buffer.headroomSats.toString(),
    feeBufferState: buffer.state,
    verificationMode: config.DEPOSIT_VERIFICATION_MODE,
    uri: config.RESERVE_REPORT_URI,
    txHash: receipt?.hash,
  });
  log.info({ txHash: receipt?.hash, reserveSats: target.toString() }, "reserves published");
}

async function main(): Promise<void> {
  await initDb();
  if (config.OPERATING_MODE === "live") {
    await assertProtocolReady([
      ["ReserveOracle", reserveOracle],
      ["CleanBTC", cleanBtc],
      ["ReserveVault", reserveVault],
    ]);
    await assertSignerRoles([
      ["ReserveOracle", reserveOracle, "RESERVE_UPDATER_ROLE"],
    ]);
  }
  if (config.DEPOSIT_VERIFICATION_MODE === "bitcoin-core") {
    await assertBitcoinCustodyReady();
  }
  const block = await provider.getBlockNumber();
  log.info(
    { cron: config.RESERVE_ORACLE_CRON, chainId: config.CHAIN_ID, block },
    "reserve-oracle keeper starting",
  );

  await tick().catch((e) => log.error({ err: e }, "initial tick failed"));
  cron.schedule(config.RESERVE_ORACLE_CRON, () => {
    tick().catch((e) => log.error({ err: e }, "tick failed"));
  });
}

main().catch((e) => {
  log.error({ err: e }, "reserve-oracle fatal");
  process.exit(1);
});
