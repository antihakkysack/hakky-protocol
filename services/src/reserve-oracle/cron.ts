import cron from "node-cron";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { initDb, audit } from "../shared/db.js";
import {
  provider,
  reserveOracle,
  cleanBtc,
  requireContract,
  requireSigner,
} from "../shared/chain.js";

const log = logger.child({ service: "reserve-oracle" });

/**
 * Reserve-oracle keeper. On a schedule it reads the (stubbed) BTC custody balance
 * and publishes it to `ReserveOracle.updateReserves` whenever it differs from the
 * on-chain figure — keeping proof-of-reserves fresh. Requires RESERVE_UPDATER_ROLE.
 * It never publishes a figure below cBTC supply (that would break the solvency
 * invariant), and it is a no-op when the value is unchanged (no wasted gas).
 */
async function tick(): Promise<void> {
  const oracle = requireContract(reserveOracle, "ReserveOracle");
  const cbtc = requireContract(cleanBtc, "CleanBTC");

  const target = BigInt(config.CUSTODY_BALANCE_SATS);
  if (target === 0n) {
    log.debug("CUSTODY_BALANCE_SATS=0 — keeper idle (nothing to publish)");
    return;
  }

  const [current, supply] = await Promise.all([
    oracle.reserveSats() as Promise<bigint>,
    cbtc.totalSupply() as Promise<bigint>,
  ]);

  if (target < supply) {
    log.warn(
      { target: target.toString(), supply: supply.toString() },
      "refusing to publish reserves below cBTC supply (solvency invariant)",
    );
    return;
  }
  if (current === target) {
    log.debug({ reserveSats: current.toString() }, "reserves already up to date");
    return;
  }

  requireSigner();
  log.info({ from: current.toString(), to: target.toString() }, "publishing updated reserves");
  const tx = await oracle.updateReserves(target, config.RESERVE_REPORT_URI);
  const receipt = await tx.wait();
  await audit("reserve-oracle", "reserves-updated", {
    reserveSats: target.toString(),
    previous: current.toString(),
    uri: config.RESERVE_REPORT_URI,
    txHash: receipt?.hash,
  });
  log.info({ txHash: receipt?.hash, reserveSats: target.toString() }, "reserves published");
}

async function main(): Promise<void> {
  await initDb();
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
