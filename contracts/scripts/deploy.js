/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

const MAINNET_CONFIRMATION =
  "I_UNDERSTAND_THIS_DEPLOYS_UNAUDITED_CONTRACTS";

/**
 * Deploys the full one-BTC pilot stack and wires roles.
 *
 * Mainnet is deliberately harder than local/testnet:
 * - an exact confirmation phrase is required;
 * - operational roles must be supplied explicitly;
 * - deployer administration is transferred to a separate final admin;
 * - the deployer renounces every administrative role after wiring.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const isMainnet = hre.network.name === "mainnet";
  const deployerAddress = await deployer.getAddress();
  const roles = readRoles(isMainnet, deployerAddress);

  if (
    isMainnet &&
    process.env.CONFIRM_MAINNET_ONE_BTC_PILOT !== MAINNET_CONFIRMATION
  ) {
    throw new Error(
      `Mainnet deployment refused. Set CONFIRM_MAINNET_ONE_BTC_PILOT=${MAINNET_CONFIRMATION}`,
    );
  }

  console.log("Deployer:", deployerAddress);
  console.log("Network:", hre.network.name);
  console.log("Pilot supply cap: 100000000 sats (1 BTC)");

  // The deployer is temporary admin so it can complete atomic role wiring.
  // Mainnet administration is transferred and renounced before the script exits.
  const Registry = await hre.ethers.getContractFactory("AttestationRegistry");
  const registry = await Registry.deploy(deployerAddress);
  await registry.waitForDeployment();

  const Oracle = await hre.ethers.getContractFactory("ReserveOracle");
  const oracle = await Oracle.deploy(deployerAddress);
  await oracle.waitForDeployment();

  const Policy = await hre.ethers.getContractFactory("CompliancePolicy");
  const policy = await Policy.deploy(deployerAddress, await registry.getAddress());
  await policy.waitForDeployment();

  const CleanBTC = await hre.ethers.getContractFactory("CleanBTC");
  const cbtc = await CleanBTC.deploy(
    deployerAddress,
    await oracle.getAddress(),
    await policy.getAddress(),
  );
  await cbtc.waitForDeployment();

  const Vault = await hre.ethers.getContractFactory("ReserveVault");
  const vault = await Vault.deploy(
    deployerAddress,
    await cbtc.getAddress(),
    await registry.getAddress(),
  );
  await vault.waitForDeployment();

  // The vault is the only cBTC minter and burner.
  await (await cbtc.grantRole(await cbtc.MINTER_ROLE(), await vault.getAddress())).wait();
  await (await cbtc.grantRole(await cbtc.BURNER_ROLE(), await vault.getAddress())).wait();

  await (await registry.grantRole(await registry.ATTESTOR_ROLE(), roles.attestor)).wait();
  await (await oracle.grantRole(await oracle.RESERVE_UPDATER_ROLE(), roles.reserveUpdater)).wait();
  await (await vault.grantRole(await vault.VERIFIER_ROLE(), roles.verifier)).wait();
  await (await vault.grantRole(await vault.SETTLER_ROLE(), roles.settler)).wait();
  await (await vault.grantRole(await vault.PAUSER_ROLE(), roles.pauser)).wait();

  if (isMainnet) {
    await transferAdministration(
      [registry, oracle, policy, cbtc, vault],
      policy,
      deployerAddress,
      roles.admin,
    );
  }

  const addresses = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deploymentBlock: await hre.ethers.provider.getBlockNumber(),
    deployedAt: new Date().toISOString(),
    pilotSupplyCapSats: (await cbtc.PILOT_SUPPLY_CAP_SATS()).toString(),
    roles,
    contracts: {
      AttestationRegistry: await registry.getAddress(),
      ReserveOracle: await oracle.getAddress(),
      CompliancePolicy: await policy.getAddress(),
      CleanBTC: await cbtc.getAddress(),
      ReserveVault: await vault.getAddress(),
    },
  };

  const outputPath = path.join(
    __dirname,
    "..",
    "deployments",
    `${hre.network.name}.json`,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(addresses, null, 2)}\n`, {
    flag: "wx",
  });

  console.log("\nDeployed Hakky one-BTC pilot:");
  console.table(addresses.contracts);
  console.log("Roles:", roles);
  console.log("Deployment manifest:", outputPath);
  console.log("Compliance mode:", (await policy.mode()).toString(), "(0 = MONITOR)");
}

function readRoles(isMainnet, deployerAddress) {
  if (!isMainnet) {
    return {
      admin: deployerAddress,
      attestor: deployerAddress,
      reserveUpdater: deployerAddress,
      verifier: deployerAddress,
      settler: deployerAddress,
      pauser: deployerAddress,
    };
  }

  const entries = {
    admin: process.env.PROTOCOL_ADMIN_ADDRESS,
    attestor: process.env.ATTESTOR_ADDRESS,
    reserveUpdater: process.env.RESERVE_UPDATER_ADDRESS,
    verifier: process.env.VERIFIER_ADDRESS,
    settler: process.env.SETTLER_ADDRESS,
    pauser: process.env.PAUSER_ADDRESS,
  };
  for (const [role, value] of Object.entries(entries)) {
    if (!value) throw new Error(`Missing mainnet role address: ${role}`);
    entries[role] = hre.ethers.getAddress(value);
    if (entries[role] === hre.ethers.ZeroAddress) {
      throw new Error(`Mainnet role address cannot be zero: ${role}`);
    }
    if (entries[role] === deployerAddress) {
      throw new Error(`Ephemeral deployer cannot retain mainnet role: ${role}`);
    }
  }
  return entries;
}

async function transferAdministration(
  contracts,
  policy,
  deployerAddress,
  finalAdmin,
) {
  for (const contract of contracts) {
    const adminRole = await contract.DEFAULT_ADMIN_ROLE();
    await (await contract.grantRole(adminRole, finalAdmin)).wait();
  }

  const policyAdminRole = await policy.POLICY_ADMIN_ROLE();
  await (await policy.grantRole(policyAdminRole, finalAdmin)).wait();
  await (await policy.revokeRole(policyAdminRole, deployerAddress)).wait();

  for (const contract of contracts) {
    const adminRole = await contract.DEFAULT_ADMIN_ROLE();
    await (await contract.renounceRole(adminRole, deployerAddress)).wait();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
