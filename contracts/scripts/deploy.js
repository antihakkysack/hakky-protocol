/* eslint-disable no-console */
const hre = require("hardhat");

/**
 * Deploys the full Hakky Protocol stack and wires roles.
 *
 *   AttestationRegistry -> ReserveOracle -> CompliancePolicy -> CleanBTC -> ReserveVault
 *
 * The deployer is granted the operational roles (attestor, reserve updater, verifier,
 * settler) so a fresh deployment is immediately demoable on a local/testnet node.
 * In production these roles belong to multisigs / accredited providers.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const admin = deployer.address;
  console.log("Deployer / admin:", admin);
  console.log("Network:", hre.network.name);

  const Registry = await hre.ethers.getContractFactory("AttestationRegistry");
  const registry = await Registry.deploy(admin);
  await registry.waitForDeployment();

  const Oracle = await hre.ethers.getContractFactory("ReserveOracle");
  const oracle = await Oracle.deploy(admin);
  await oracle.waitForDeployment();

  const Policy = await hre.ethers.getContractFactory("CompliancePolicy");
  const policy = await Policy.deploy(admin, await registry.getAddress());
  await policy.waitForDeployment();

  const CleanBTC = await hre.ethers.getContractFactory("CleanBTC");
  const cbtc = await CleanBTC.deploy(
    admin,
    await oracle.getAddress(),
    await policy.getAddress()
  );
  await cbtc.waitForDeployment();

  const Vault = await hre.ethers.getContractFactory("ReserveVault");
  const vault = await Vault.deploy(
    admin,
    await cbtc.getAddress(),
    await registry.getAddress()
  );
  await vault.waitForDeployment();

  // Wire roles: the vault mints and burns cBTC.
  await (await cbtc.grantRole(await cbtc.MINTER_ROLE(), await vault.getAddress())).wait();
  await (await cbtc.grantRole(await cbtc.BURNER_ROLE(), await vault.getAddress())).wait();

  // Operational roles to the deployer for demo/testnet convenience.
  await (await registry.grantRole(await registry.ATTESTOR_ROLE(), admin)).wait();
  await (await oracle.grantRole(await oracle.RESERVE_UPDATER_ROLE(), admin)).wait();
  await (await vault.grantRole(await vault.VERIFIER_ROLE(), admin)).wait();
  await (await vault.grantRole(await vault.SETTLER_ROLE(), admin)).wait();

  const addresses = {
    network: hre.network.name,
    AttestationRegistry: await registry.getAddress(),
    ReserveOracle: await oracle.getAddress(),
    CompliancePolicy: await policy.getAddress(),
    CleanBTC: await cbtc.getAddress(),
    ReserveVault: await vault.getAddress(),
  };

  console.log("\nDeployed Hakky Protocol:");
  console.table(addresses);
  console.log("\ncBTC decimals:", (await cbtc.decimals()).toString());
  console.log("Compliance mode:", (await policy.mode()).toString(), "(0 = MONITOR)");

  return addresses;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
