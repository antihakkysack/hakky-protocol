/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

const REDEEM_SATS = 25_000_000n; // 0.25 cBTC
const DEMO_BTC_ADDR = "bcrt1qhakkydemopayout000000000000000000000";

/** Demonstrate request -> durable demo-auto settlement off mainnet. */
async function main() {
  if (hre.network.name === "mainnet") {
    throw new Error("redeem-demo is disabled on mainnet");
  }
  const manifestPath = path.join(
    __dirname,
    "..",
    "deployments",
    `${hre.network.name}.json`,
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const addresses = manifest.contracts ?? manifest;
  const [deployer] = await hre.ethers.getSigners();
  const cbtc = await hre.ethers.getContractAt("CleanBTC", addresses.CleanBTC, deployer);
  const vault = await hre.ethers.getContractAt(
    "ReserveVault",
    addresses.ReserveVault,
    deployer,
  );

  const balance = await cbtc.balanceOf(deployer.address);
  if (balance < REDEEM_SATS) throw new Error("insufficient cBTC to redeem");

  const tx = await vault.requestRedeem(REDEEM_SATS, DEMO_BTC_ADDR);
  const receipt = await tx.wait();
  const id = await vault.redemptionCount();
  console.log("redeem requested", { id: id.toString(), txHash: receipt.hash });

  for (let i = 0; i < 24; i++) {
    const redemption = await vault.redemptions(id);
    if (redemption.status === 2n) {
      console.log("settled", {
        btcTxid: redemption.btcTxid,
        cbtcSupply: (await cbtc.totalSupply()).toString(),
      });
      return;
    }
    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error("not settled within timeout; inspect orchestrator logs");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
