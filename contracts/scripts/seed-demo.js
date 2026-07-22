/* eslint-disable no-console */
const hre = require("hardhat");

/**
 * Seed the deployed Sepolia stack with a coherent demo state so the public
 * read API returns meaningful (non-zero) proof-of-reserves and attestation data:
 *
 *   1. ReserveOracle.updateReserves  -> 10.5 BTC attested in custody
 *   2. AttestationRegistry.attest    -> clean (score 95) attestation for the holder
 *   3. ReserveVault.processDeposit   -> mint 10 cBTC to the holder (=> 105% backed)
 *
 * All three calls are made from the deployer, which holds RESERVE_UPDATER_ROLE,
 * ATTESTOR_ROLE and VERIFIER_ROLE from the initial deployment.
 */
const ADDR = {
  AttestationRegistry: "0xa767B23a5D3fA900dDDdC98f3b5328B05B2e85Fa",
  ReserveOracle: "0x40Deaa7a9a923E73c433C1587B3C848eB7857575",
  CleanBTC: "0xee92CcB2D6Bb3A8174d00652eE73B64500E7cB52",
  ReserveVault: "0xE4987A1f376D44F8BD68478fBf14e19cfDcdeBd3",
};

const RESERVE_SATS = 1_050_000_000n; // 10.5 BTC held in custody
const MINT_SATS = 1_000_000_000n; //    10 cBTC issued -> 105% collateralized

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Seeding from:", deployer.address, "on", hre.network.name);

  const oracle = await hre.ethers.getContractAt("ReserveOracle", ADDR.ReserveOracle, deployer);
  const registry = await hre.ethers.getContractAt("AttestationRegistry", ADDR.AttestationRegistry, deployer);
  const vault = await hre.ethers.getContractAt("ReserveVault", ADDR.ReserveVault, deployer);
  const cbtc = await hre.ethers.getContractAt("CleanBTC", ADDR.CleanBTC, deployer);

  console.log("\n1/3 updateReserves ->", RESERVE_SATS.toString(), "sats (10.5 BTC)");
  await (await oracle.updateReserves(
    RESERVE_SATS,
    "https://api.hakky.xyz/reports/reserve-2026-07-22.json"
  )).wait();

  console.log("2/3 attest ->", deployer.address, "(score 95, not sanctioned)");
  await (await registry.attest(
    deployer.address,
    95,
    false,
    0, // ttl 0 => defaultTtl (90 days)
    "https://api.hakky.xyz/reports/screening-demo.json"
  )).wait();

  const btcTxid = hre.ethers.id("hakky-demo-deposit-1"); // deterministic bytes32
  console.log("3/3 processDeposit ->", MINT_SATS.toString(), "sats (10 cBTC) to holder");
  await (await vault.processDeposit(
    deployer.address,
    MINT_SATS,
    btcTxid,
    "https://api.hakky.xyz/reports/deposit-demo.json"
  )).wait();

  const [reserves, supply, bal] = await Promise.all([
    oracle.reserveSats(),
    cbtc.totalSupply(),
    cbtc.balanceOf(deployer.address),
  ]);
  console.log("\n=== on-chain state now ===");
  console.log("reserveSats:", reserves.toString());
  console.log("cbtcSupply :", supply.toString());
  console.log("ratio      :", (Number(reserves) / Number(supply)).toFixed(4), "(reserves / supply)");
  console.log("holder cBTC:", bal.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
