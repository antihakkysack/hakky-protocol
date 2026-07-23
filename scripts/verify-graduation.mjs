import path from "node:path";
import { fileURLToPath } from "node:url";
import { PublicKey } from "@solana/web3.js";
import {
  fetchGraduationEvidence,
  runGraduationVerifier,
} from "../src/graduation-proof.mjs";
import { publishJsonProof, resolveCanonicalGraduationProofPath } from "../src/proof-output.mjs";

const WORKTREE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED_ONCE = Object.freeze([
  "--mint",
  "--creator",
  "--launch-id",
]);

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

export function readOptions(argv) {
  if (!Array.isArray(argv) || argv.length % 2 !== 0) fail("cli-argv");
  const allowed = new Set(REQUIRED_ONCE);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (typeof flag !== "string" || !flag.startsWith("--") || flag.includes("=") || !allowed.has(flag)) {
      fail("cli-flag");
    }
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      fail(`cli-missing-${flag.slice(2)}`);
    }
    if (values.has(flag)) fail("cli-duplicate");
    values.set(flag, value);
  }
  for (const flag of REQUIRED_ONCE) {
    if (!values.has(flag)) fail(`cli-missing-${flag.slice(2)}`);
  }
  return Object.freeze({
    mintAddress: canonicalPublicKey(values.get("--mint"), "mint"),
    creatorAddress: canonicalPublicKey(values.get("--creator"), "creator"),
    launchId: canonicalPublicKey(values.get("--launch-id"), "launch-id"),
  });
}

export async function runFromCli({
  argv = process.argv.slice(2),
  repositoryRoot = WORKTREE_ROOT,
  publishProofImpl = publishJsonProof,
  runVerifier = runGraduationVerifier,
} = {}) {
  const options = readOptions(argv);
  const root = path.resolve(repositoryRoot);
  const outputPath = resolveCanonicalGraduationProofPath({ repositoryRoot: root });
  return runVerifier({
    argv,
    options,
    publishProof: (proof) => publishProofImpl(outputPath, proof, { repositoryRoot: root }),
    fetchEvidence: ({ options: boundOptions }) => fetchGraduationEvidence({
      repositoryRoot: root,
      options: boundOptions,
    }),
  });
}

export async function main({
  runVerifier = runFromCli,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const result = await runVerifier();
    if (result?.ok === false && result?.code === "source-coverage-unavailable") {
      stderr.write(`${result.code}\n`);
      return 1;
    }
    stderr.write("Graduation verification failed before publishing a proof.\n");
    return 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    stderr.write(`${message.startsWith("cli-") || message.startsWith("rpc-url-")
      ? message
      : "Graduation verification failed before publishing a proof."}\n`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
