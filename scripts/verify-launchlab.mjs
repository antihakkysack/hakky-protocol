import path from "node:path";
import { fileURLToPath } from "node:url";
import { PublicKey } from "@solana/web3.js";
import {
  runLaunchlabVerifier,
} from "../src/launchlab-proof.mjs";
import {
  publishJsonProof,
  resolveCanonicalLaunchlabProofPath,
} from "../src/proof-output.mjs";
import {
  DEFAULT_PUBLIC_MAINNET_RPC,
  parsePublicRpcUrl,
} from "../src/solana-rpc.mjs";
import { decodeBase58 } from "../src/solana-transaction.mjs";

const REQUIRED_ONCE = Object.freeze([
  "--mint",
  "--creator",
  "--launch-id",
  "--platform-config",
  "--creation-transaction",
  "--metadata-manifest",
  "--metadata-readback",
]);
const REPEATED = "--recovery-transaction";
const OPTIONAL_ONCE = "--rpc";
const MANIFEST_PATH = "artifacts/metadata/manifest.json";
const READBACK_PATH = "artifacts/metadata/readback.json";
const WORKTREE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(code) {
  throw new Error(code);
}

function canonicalPublicKey(value, label) {
  try {
    if (typeof value !== "string" || new PublicKey(value).toBase58() !== value) fail(`cli-invalid-${label}`);
    return value;
  } catch {
    fail(`cli-invalid-${label}`);
  }
}

function canonicalSignature(value, label) {
  try {
    decodeBase58(value, { length: 64, code: `cli-invalid-${label}` });
  } catch {
    fail(`cli-invalid-${label}`);
  }
  return value;
}

export function readOptions(argv) {
  if (!Array.isArray(argv) || argv.length % 2 !== 0) fail("cli-argv");
  const allowed = new Set([...REQUIRED_ONCE, REPEATED, OPTIONAL_ONCE]);
  const values = new Map();
  const recoverySignatures = [];
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (typeof flag !== "string" || !flag.startsWith("--") || flag.includes("=") || !allowed.has(flag)) {
      fail("cli-flag");
    }
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      fail(`cli-missing-${flag.slice(2)}`);
    }
    if (flag === REPEATED) {
      const signature = canonicalSignature(value, "recovery-transaction");
      if (recoverySignatures.includes(signature)) fail("cli-duplicate-recovery-transaction");
      recoverySignatures.push(signature);
    } else {
      if (values.has(flag)) fail("cli-duplicate");
      values.set(flag, value);
    }
  }
  for (const flag of REQUIRED_ONCE) {
    if (!values.has(flag)) fail(`cli-missing-${flag.slice(2)}`);
  }
  const metadataManifestPath = values.get("--metadata-manifest");
  const metadataReadbackPath = values.get("--metadata-readback");
  if (metadataManifestPath !== MANIFEST_PATH || metadataReadbackPath !== READBACK_PATH) {
    fail("cli-metadata-path");
  }
  const rpc = parsePublicRpcUrl(values.get(OPTIONAL_ONCE) ?? DEFAULT_PUBLIC_MAINNET_RPC);
  return Object.freeze({
    mintAddress: canonicalPublicKey(values.get("--mint"), "mint"),
    creatorAddress: canonicalPublicKey(values.get("--creator"), "creator"),
    launchId: canonicalPublicKey(values.get("--launch-id"), "launch-id"),
    platformConfigAddress: canonicalPublicKey(values.get("--platform-config"), "platform-config"),
    creationSignature: canonicalSignature(values.get("--creation-transaction"), "creation-transaction"),
    recoverySignatures: Object.freeze(recoverySignatures),
    metadataManifestPath,
    metadataReadbackPath,
    rpcUrl: rpc.url,
    rpcHost: rpc.hostname,
  });
}

export async function runFromCli({
  argv = process.argv.slice(2),
  repositoryRoot = WORKTREE_ROOT,
  publishProofImpl = publishJsonProof,
  runVerifier = runLaunchlabVerifier,
} = {}) {
  const options = readOptions(argv);
  const root = path.resolve(repositoryRoot);
  const outputPath = resolveCanonicalLaunchlabProofPath({ repositoryRoot: root });
  return runVerifier({
    argv,
    options,
    publishProof: (proof) => publishProofImpl(outputPath, proof, { repositoryRoot: root }),
  });
}

export async function main({
  runVerifier = runFromCli,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const result = await runVerifier();
    if (result?.proof?.ok === true && result?.publication?.published === true) {
      stdout.write(`${JSON.stringify(result.proof, null, 2)}\n`);
      for (const warning of result.publication.warnings ?? []) {
        if (warning?.code === "TEMP_UNLINK_FAILED") {
          stderr.write("WARNING: Proof was committed, but owned temporary cleanup failed. Do not retry publication.\n");
        }
      }
      return 0;
    }
    stderr.write("LaunchLab verification failed before publishing a proof.\n");
    return 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    stderr.write(`${message.startsWith("cli-") || message.startsWith("rpc-url-")
      ? message
      : "LaunchLab verification failed before publishing a proof."}\n`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
