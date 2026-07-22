import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Connection, PublicKey } from "@solana/web3.js";
import { evaluateMintEvidence } from "../src/mint-proof.mjs";
import { assertMainnetIdentity, fetchMintEvidence } from "../src/solana-rpc.mjs";

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

export function readOptions(argv) {
  const mintAddress = readPublicKeyOption(argv, "--mint");
  const creatorAddress = readPublicKeyOption(argv, "--creator");
  const outputPath = readRequiredOption(argv, "--out");
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
  ConnectionClass = Connection,
  fetchEvidence = fetchMintEvidence,
} = {}) {
  const { mintAddress, creatorAddress, outputPath, rpcUrl, rpcHost } = readOptions(argv);
  const connection = new ConnectionClass(rpcUrl, "confirmed");
  await assertMainnetIdentity(connection);
  const observed = await fetchEvidence({
    connection,
    network: "mainnet-beta",
    mintAddress,
    creatorAddress,
  });
  const proof = {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    rpcHost,
    ...evaluateMintEvidence(observed),
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
  return proof;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const proof = await run();
  console.log(JSON.stringify(proof, null, 2));
  if (!proof.ok) process.exitCode = 1;
}
