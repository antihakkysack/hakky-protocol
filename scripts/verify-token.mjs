import { fileURLToPath } from "node:url";
import path from "node:path";
import { Connection, PublicKey } from "@solana/web3.js";
import { evaluateMintEvidence } from "../src/mint-proof.mjs";
import { publishJsonProof, resolveProofOutputPath } from "../src/proof-output.mjs";
import { assertMainnetIdentity, fetchMintEvidence } from "../src/solana-rpc.mjs";

const WORKTREE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRequiredOption(argv, name) {
  const index = argv.indexOf(name);
  const value = argv[index + 1];
  if (index === -1 || !value || value.startsWith("--")) throw new Error(`Missing ${name}`);
  return value;
}

function readPublicKeyOption(argv, name) {
  const value = readRequiredOption(argv, name);
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error(`Invalid ${name} public key`);
  }
}

export function readOptions(argv, { cwd = WORKTREE_ROOT } = {}) {
  const mintAddress = readPublicKeyOption(argv, "--mint");
  const creatorAddress = readPublicKeyOption(argv, "--creator");
  const outputPath = resolveProofOutputPath(readRequiredOption(argv, "--out"), { cwd });
  const rpcIndex = argv.indexOf("--rpc");
  const rpcValue = rpcIndex === -1 ? "https://api.mainnet-beta.solana.com" : readRequiredOption(argv, "--rpc");
  let rpc;
  try {
    rpc = new URL(rpcValue);
  } catch {
    throw new Error("Invalid --rpc URL");
  }
  if (rpc.protocol !== "https:") throw new Error("--rpc must use https");
  if (rpc.username || rpc.password) throw new Error("--rpc must not include credentials");
  return { mintAddress, creatorAddress, outputPath, rpcUrl: rpc.toString(), rpcHost: rpc.host };
}

export async function run({
  argv = process.argv.slice(2),
  cwd = WORKTREE_ROOT,
  ConnectionClass = Connection,
  fetchEvidence = fetchMintEvidence,
  publishProof = publishJsonProof,
} = {}) {
  const { mintAddress, creatorAddress, outputPath, rpcUrl, rpcHost } = readOptions(argv, { cwd });
  const connection = new ConnectionClass(rpcUrl, "confirmed");
  await assertMainnetIdentity(connection);
  const observed = await fetchEvidence({
    connection,
    network: "mainnet-beta",
    mintAddress,
    creatorAddress,
  });
  if (observed.creator !== creatorAddress) {
    throw new Error("Observed creator does not match the requested creator");
  }
  const proof = {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    rpcHost,
    creator: creatorAddress,
    ...evaluateMintEvidence(observed),
  };
  if (proof.ok) await publishProof(outputPath, proof);
  return proof;
}

function sanitizeCliError(error) {
  const message = error instanceof Error ? error.message : "";
  if (
    message.startsWith("Missing --")
    || message.startsWith("Invalid --")
    || message.startsWith("--rpc ")
    || message.startsWith("--out ")
  ) {
    return message;
  }
  return "Verification failed before publishing a proof.";
}

export async function main({ runVerifier = run, stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const proof = await runVerifier();
    stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
    return proof.ok ? 0 : 1;
  } catch (error) {
    stderr.write(`${sanitizeCliError(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
