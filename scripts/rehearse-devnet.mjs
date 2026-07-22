import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AuthorityType,
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  transfer,
} from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { evaluateMintEvidence } from "../src/mint-proof.mjs";
import { fetchMintEvidence } from "../src/solana-rpc.mjs";

export const DEVNET_RPC_URL = "https://api.devnet.solana.com";
export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const FULL_SUPPLY = 1_000_000_000_000n;

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIRM_OPTIONS = {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
  maxRetries: 5,
};
const DEFAULT_OPERATIONS = {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  transfer,
};

function sleep(delayMs) {
  return delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve();
}

async function retryRpc(operation, { label, maxAttempts = 4, delayMs = 1_000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(delayMs * attempt);
      }
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Devnet ${label} failed after ${maxAttempts} attempts: ${detail}`);
}

export async function confirmSignature(
  connection,
  signature,
  { maxAttempts = 30, delayMs = 2_000 } = {},
) {
  let lastRpcError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await connection.getSignatureStatuses([signature], {
        searchTransactionHistory: true,
      });
      lastRpcError = undefined;
    } catch (error) {
      lastRpcError = error;
    }
    const status = response?.value[0];
    if (status?.err) {
      throw new Error(`Devnet transaction failed: ${JSON.stringify(status.err)}`);
    }
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      return status;
    }
    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }
  if (lastRpcError) {
    const detail = lastRpcError instanceof Error ? lastRpcError.message : String(lastRpcError);
    throw new Error(`Devnet confirmation RPC failed after ${maxAttempts} attempts: ${detail}`);
  }
  throw new Error(`Devnet transaction was not confirmed after ${maxAttempts} attempts`);
}

export async function runDevnetRehearsal({
  connection = new Connection(DEVNET_RPC_URL, "confirmed"),
  outputRoot = PROJECT_ROOT,
  generateKeypair = () => Keypair.generate(),
  operations = DEFAULT_OPERATIONS,
  fetchEvidence = fetchMintEvidence,
  evaluateEvidence = evaluateMintEvidence,
  checkedAt = () => new Date().toISOString(),
  retryMaxAttempts = 4,
  retryDelayMs = 1_000,
  confirmationDelayMs = 2_000,
} = {}) {
  const artifactDirectory = path.join(outputRoot, "artifacts", "devnet-rehearsal");
  const proofPath = path.join(artifactDirectory, "proof.json");
  await rm(proofPath, { force: true });

  const genesisHash = await retryRpc(() => connection.getGenesisHash(), {
    label: "identity check",
    maxAttempts: retryMaxAttempts,
    delayMs: retryDelayMs,
  });
  if (genesisHash !== DEVNET_GENESIS_HASH) {
    throw new Error(`RPC genesis hash ${genesisHash} is not devnet`);
  }

  const payer = generateKeypair();
  const launchVaultOwner = generateKeypair();
  const airdropSignature = await retryRpc(
    () => connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL),
    { label: "faucet request", maxAttempts: retryMaxAttempts, delayMs: retryDelayMs },
  );
  await confirmSignature(connection, airdropSignature, { delayMs: confirmationDelayMs });

  const mint = await operations.createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    6,
    undefined,
    CONFIRM_OPTIONS,
    TOKEN_PROGRAM_ID,
  );
  const creatorAccount = await operations.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    false,
    "confirmed",
    CONFIRM_OPTIONS,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const vaultAccount = await operations.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    launchVaultOwner.publicKey,
    false,
    "confirmed",
    CONFIRM_OPTIONS,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  await operations.mintTo(
    connection,
    payer,
    mint,
    creatorAccount.address,
    payer,
    FULL_SUPPLY,
    [],
    CONFIRM_OPTIONS,
    TOKEN_PROGRAM_ID,
  );
  await operations.transfer(
    connection,
    payer,
    creatorAccount.address,
    vaultAccount.address,
    payer,
    FULL_SUPPLY,
    [],
    CONFIRM_OPTIONS,
    TOKEN_PROGRAM_ID,
  );
  await operations.setAuthority(
    connection,
    payer,
    mint,
    payer,
    AuthorityType.MintTokens,
    null,
    [],
    CONFIRM_OPTIONS,
    TOKEN_PROGRAM_ID,
  );

  const observed = await fetchEvidence({
    connection,
    network: "mainnet-beta",
    mintAddress: mint.toBase58(),
    creatorAddress: payer.publicKey.toBase58(),
  });
  const proof = {
    cluster: "devnet",
    checkedAt: checkedAt(),
    ...evaluateEvidence(observed),
  };
  if (!proof.ok) {
    throw new Error("Devnet rehearsal evidence failed policy evaluation");
  }
  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(proofPath, `${JSON.stringify(proof, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return proof;
}

export async function main({ stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const proof = await runDevnetRehearsal();
    stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
    return proof.ok ? 0 : 1;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    stderr.write(`Devnet rehearsal failed: ${detail}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  process.exitCode = await main();
}
