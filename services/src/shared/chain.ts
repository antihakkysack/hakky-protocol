import { ethers } from "ethers";
import { config } from "./config.js";
import {
  reserveOracleAbi,
  cleanBtcAbi,
  attestationRegistryAbi,
  reserveVaultAbi,
} from "./abis.js";

export const provider = new ethers.JsonRpcProvider(config.RPC_URL, config.CHAIN_ID);

/** Signer for services that write to chain. Undefined for read-only services. */
export const signer = config.SIGNER_PRIVATE_KEY
  ? new ethers.Wallet(config.SIGNER_PRIVATE_KEY, provider)
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
  if (!signer) throw new Error("SIGNER_PRIVATE_KEY is not set — this service needs a signer to write on-chain");
  return signer;
}
