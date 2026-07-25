/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

const ONE_BTC_SATS = 100_000_000n;

/**
 * Seeds a freshly deployed local/testnet one-BTC pilot.
 * This script is intentionally blocked on mainnet.
 */
async function main() {
  if (hre.network.name === "mainnet") {
    throw new Error("seed-demo is disabled on mainnet");
  }

  const manifestPath = path.join(
    __dirname,
    "..",
    "deployments",
    `${hre.network.name}.json`,
  );
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Deployment manifest not found: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const addresses = manifest.contracts ?? manifest;
  const [deployer] = await hre.ethers.getSigners();

  const oracle = await hre.ethers.getContractAt(
    "ReserveOracle",
    addresses.ReserveOracle,
    deployer,
  );
  const registry = await hre.ethers.getContractAt(
    "AttestationRegistry",
    addresses.AttestationRegistry,
    deployer,
  );
  const vault = await hre.ethers.getContractAt(
    "ReserveVault",
    addresses.ReserveVault,
    deployer,
  );
  const cbtc = await hre.ethers.getContractAt(
    "CleanBTC",
    addresses.CleanBTC,
    deployer,
  );

  console.log("Seeding one-BTC demo from:", deployer.address, "on", hre.network.name);
  await (
    await oracle.updateReserves(
      ONE_BTC_SATS,
      "https://api.hakky.xyz/reports/reserve-demo.json",
    )
  ).wait();
  await (
    await registry.attest(
      deployer.address,
      95,
      false,
      0,
      "https://api.hakky.xyz/reports/screening-demo.json",
    )
  ).wait();

  const btcTxid = hre.ethers.id("hakky-demo-deposit-1");
  await (
    await vault.processDeposit(
      deployer.address,
      ONE_BTC_SATS,
      btcTxid,
      0,
      "https://api.hakky.xyz/reports/deposit-demo.json",
    )
  ).wait();

  const [reserves, supply, balance, cap] = await Promise.all([
    oracle.reserveSats(),
    cbtc.totalSupply(),
    cbtc.balanceOf(deployer.address),
    cbtc.PILOT_SUPPLY_CAP_SATS(),
  ]);
  console.log({
    reserveSats: reserves.toString(),
    cbtcSupply: supply.toString(),
    pilotCapSats: cap.toString(),
    holderBalance: balance.toString(),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
