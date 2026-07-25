import { ethers } from "ethers";
import {
  config,
  CONTRACT_MAX_RESERVE_AGE_SECONDS,
  PILOT_MAX_SATS,
} from "./config.js";
import {
  reserveOracleAbi,
  cleanBtcAbi,
  attestationRegistryAbi,
  reserveVaultAbi,
} from "./abis.js";

export const provider = new ethers.JsonRpcProvider(config.RPC_URL, config.CHAIN_ID);

/** Signer for services that write to chain. Undefined for read-only services. */
const roleSignerKey = {
  api: undefined,
  attestation: config.ATTESTATION_SIGNER_PRIVATE_KEY,
  "reserve-oracle": config.RESERVE_ORACLE_SIGNER_PRIVATE_KEY,
  orchestrator: config.ORCHESTRATOR_SIGNER_PRIVATE_KEY,
}[config.SERVICE_ROLE];
const signerKey =
  roleSignerKey ?? (config.OPERATING_MODE === "demo" ? config.SIGNER_PRIVATE_KEY : undefined);

export const signer = signerKey
  ? new ethers.Wallet(signerKey, provider)
  : undefined;

const runner: ethers.ContractRunner = signer ?? provider;

function make(address: string, abi: string[]): ethers.Contract | undefined {
  return address ? new ethers.Contract(address, abi, runner) : undefined;
}

export const reserveOracle = make(config.ADDR_RESERVE_ORACLE, reserveOracleAbi);
export const cleanBtc = make(config.ADDR_CLEAN_BTC, cleanBtcAbi);
export const attestationRegistry = make(config.ADDR_ATTESTATION_REGISTRY, attestationRegistryAbi);
export const reserveVault = make(config.ADDR_RESERVE_VAULT, reserveVaultAbi);

/** Assert a contract is configured (address present in .env) before using it. */
export function requireContract(
  c: ethers.Contract | undefined,
  name: string,
): ethers.Contract {
  if (!c) throw new Error(`Contract "${name}" is not configured — set its address in .env`);
  return c;
}

/** Assert a signer is configured before attempting a write. */
export function requireSigner(): ethers.Wallet {
  if (!signer) {
    throw new Error(`No signer is configured for service role "${config.SERVICE_ROLE}"`);
  }
  return signer;
}

/**
 * Live startup check for the selected chain, deployed bytecode, and immutable
 * pilot constants. This catches wrong manifests and wrong-network RPCs before
 * a service accepts traffic.
 */
export async function assertProtocolReady(
  contracts: Array<[name: string, contract: ethers.Contract | undefined]>,
): Promise<void> {
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(config.CHAIN_ID)) {
    throw new Error(
      `EVM network mismatch: expected chain ${config.CHAIN_ID}, received ${network.chainId}`,
    );
  }

  for (const [name, candidate] of contracts) {
    const contract = requireContract(candidate, name);
    const address = await contract.getAddress();
    if ((await provider.getCode(address)) === "0x") {
      throw new Error(`Contract "${name}" has no bytecode at ${address}`);
    }
  }

  if (contracts.some(([, contract]) => contract === cleanBtc)) {
    const cbtc = requireContract(cleanBtc, "CleanBTC");
    const [cap, maxReserveAge] = await Promise.all([
      cbtc.PILOT_SUPPLY_CAP_SATS() as Promise<bigint>,
      cbtc.MAX_RESERVE_AGE_SECONDS() as Promise<bigint>,
    ]);
    if (cap !== PILOT_MAX_SATS) {
      throw new Error(`CleanBTC pilot cap mismatch: expected ${PILOT_MAX_SATS}, received ${cap}`);
    }
    if (maxReserveAge !== BigInt(CONTRACT_MAX_RESERVE_AGE_SECONDS)) {
      throw new Error(
        `CleanBTC reserve age mismatch: expected ${CONTRACT_MAX_RESERVE_AGE_SECONDS}, received ${maxReserveAge}`,
      );
    }
  }
}

/** Refuse live startup when the configured signer lacks an expected role. */
export async function assertSignerRoles(
  requirements: Array<[
    contractName: string,
    contract: ethers.Contract | undefined,
    roleName: string,
  ]>,
): Promise<void> {
  const operator = requireSigner();
  for (const [contractName, candidate, roleName] of requirements) {
    const contract = requireContract(candidate, contractName);
    const role = ethers.id(roleName);
    if (!((await contract.hasRole(role, operator.address)) as boolean)) {
      throw new Error(
        `Signer ${operator.address} lacks ${roleName} on ${contractName}`,
      );
    }
  }
}
