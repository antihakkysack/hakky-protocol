/* eslint-disable no-console */
const hre = require("hardhat");

/**
 * Demonstrate the redeem -> settle loop end-to-end:
 *   1. The deployer (holding cBTC) calls ReserveVault.requestRedeem, which burns
 *      the cBTC and records a pending redemption.
 *   2. The orchestrator worker (running on the server) sees the RedeemRequested
 *      event and calls settleRedeem. This script polls the redemption until it
 *      flips to Settled, proving the mint -> hold -> redeem -> settle loop.
 */
const ADDR = {
  CleanBTC: "0xee92CcB2D6Bb3A8174d00652eE73B64500E7cB52",
  ReserveVault: "0xE4987A1f376D44F8BD68478fBf14e19cfDcdeBd3",
};

const REDEEM_SATS = 100_000_000n; // 1 cBTC
const DEMO_BTC_ADDR = "bc1qhakkydemopayout0000000000000000000000";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const cbtc = await hre.ethers.getContractAt("CleanBTC", ADDR.CleanBTC, deployer);
  const vault = await hre.ethers.getContractAt("ReserveVault", ADDR.ReserveVault, deployer);

  const bal = await cbtc.balanceOf(deployer.address);
  console.log("deployer cBTC balance:", bal.toString(), "(need >=", REDEEM_SATS.toString() + ")");
  if (bal < REDEEM_SATS) throw new Error("insufficient cBTC to redeem");

  console.log(`\nrequesting redeem of ${REDEEM_SATS} sats (1 cBTC) -> ${DEMO_BTC_ADDR} ...`);
  const tx = await vault.requestRedeem(REDEEM_SATS, DEMO_BTC_ADDR);
  const receipt = await tx.wait();
  const id = await vault.redemptionCount();
  console.log("redeem requested. id:", id.toString(), "tx:", receipt.hash);

  console.log("\nwaiting for the orchestrator to settle (it polls every ~15s)...");
  for (let i = 0; i < 24; i++) {
    const r = await vault.redemptions(id);
    const status = r[3]; // 0 None, 1 Pending, 2 Settled, 3 Cancelled
    if (status === 2n) {
      console.log("\nSETTLED ✓  btcTxid:", r[5]);
      console.log("cBTC supply after redeem:", (await cbtc.totalSupply()).toString());
      return;
    }
    process.stdout.write(".");
    await new Promise((res) => setTimeout(res, 5000));
  }
  console.log("\n(not settled within timeout — check the orchestrator logs on the server)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
