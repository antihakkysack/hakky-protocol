import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PublicKey } from "@solana/web3.js";
import { decodeBase58 } from "../src/solana-transaction.mjs";
import { assertMetadataManifestV1, assertMetadataReadbackV1, resolveRepositoryPath } from "../src/metadata-integrity.mjs";
import { evaluateMintEvidenceV2 } from "../src/mint-proof.mjs";
import { publishJsonProof, resolveCanonicalMintProofPath } from "../src/proof-output.mjs";
import {
  createBoundedPublicRpcClient,
  DEFAULT_PUBLIC_MAINNET_RPC,
  fetchMintEvidence,
  parsePublicRpcUrl,
} from "../src/solana-rpc.mjs";

const WORKTREE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = Object.freeze([
  "--mint",
  "--creator",
  "--metadata-account",
  "--creation-transaction",
  "--metadata-manifest",
  "--metadata-readback",
]);
const OPTIONAL = Object.freeze(["--rpc"]);
const MANIFEST_PATH = "artifacts/metadata/manifest.json";
const READBACK_PATH = "artifacts/metadata/readback.json";

function fail(code) {
  throw new Error(code);
}

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function canonicalPublicKey(value, name) {
  try {
    if (typeof value !== "string" || new PublicKey(value).toBase58() !== value) fail(`cli-invalid-${name}`);
    return value;
  } catch {
    fail(`cli-invalid-${name}`);
  }
}

function canonicalSignature(value) {
  try {
    decodeBase58(value, { length: 64, code: "cli-invalid-creation-transaction" });
  } catch {
    fail("cli-invalid-creation-transaction");
  }
  return value;
}

export function readOptions(argv) {
  if (!Array.isArray(argv)) fail("cli-argv");
  const allowed = new Set([...REQUIRED, ...OPTIONAL]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (typeof flag !== "string" || !flag.startsWith("--") || flag.includes("=") || !allowed.has(flag)) fail("cli-flag");
    if (values.has(flag)) fail("cli-duplicate");
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) fail(`cli-missing-${flag.slice(2)}`);
    values.set(flag, value);
  }
  if (argv.length % 2 !== 0) fail("cli-missing-value");
  for (const flag of REQUIRED) if (!values.has(flag)) fail(`cli-missing-${flag.slice(2)}`);
  const metadataManifestPath = values.get("--metadata-manifest");
  const metadataReadbackPath = values.get("--metadata-readback");
  if (metadataManifestPath !== MANIFEST_PATH || metadataReadbackPath !== READBACK_PATH) fail("cli-metadata-path");
  const rpc = parsePublicRpcUrl(values.get("--rpc") ?? DEFAULT_PUBLIC_MAINNET_RPC);
  return Object.freeze({
    mintAddress: canonicalPublicKey(values.get("--mint"), "mint"),
    creatorAddress: canonicalPublicKey(values.get("--creator"), "creator"),
    metadataAddress: canonicalPublicKey(values.get("--metadata-account"), "metadata-account"),
    creationSignature: canonicalSignature(values.get("--creation-transaction")),
    metadataManifestPath,
    metadataReadbackPath,
    rpcUrl: rpc.url,
    rpcHost: rpc.hostname,
  });
}

async function readExactJson(repositoryRoot, relativePath) {
  const resolved = await resolveRepositoryPath(repositoryRoot, relativePath);
  const source = await readFile(resolved, "utf8");
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    fail("cli-json");
  }
  if (`${JSON.stringify(value, null, 2)}\n` !== source) fail("cli-json-canonical");
  return value;
}

export async function runMintVerifier({
  argv = process.argv.slice(2),
  createRpcClient = createBoundedPublicRpcClient,
  fetchEvidence = fetchMintEvidence,
  publishProof = publishJsonProof,
  repositoryRoot = WORKTREE_ROOT,
  now = () => new Date(),
} = {}) {
  const options = readOptions(argv);
  const root = path.resolve(repositoryRoot);
  const [metadataManifest, metadataReadback] = await Promise.all([
    readExactJson(root, options.metadataManifestPath),
    readExactJson(root, options.metadataReadbackPath),
  ]);
  assertMetadataManifestV1(metadataManifest);
  assertMetadataReadbackV1({ manifest: metadataManifest, readback: metadataReadback });
  const rpcClient = createRpcClient({ rawUrl: options.rpcUrl });
  if (rpcClient.hostname !== options.rpcHost) fail("rpc-host-mismatch");
  const evidence = await fetchEvidence({
    rpcClient,
    mintAddress: options.mintAddress,
    creatorAddress: options.creatorAddress,
    metadataAddress: options.metadataAddress,
    creationSignature: options.creationSignature,
    metadataManifest,
    metadataReadback,
    repositoryRoot: root,
    now,
  });
  const proof = evaluateMintEvidenceV2(evidence);
  const outputPath = resolveCanonicalMintProofPath({ repositoryRoot: root });
  await resolveRepositoryPath(root, "proof/mainnet-mint.json");
  const publication = await publishProof(outputPath, proof, { repositoryRoot: root });
  if (!exactKeys(publication, ["published", "outputPath", "warnings"])
    || publication.published !== true || publication.outputPath !== outputPath
    || !Array.isArray(publication.warnings)) fail("publication-receipt");
  for (const warning of publication.warnings) {
    if (!exactKeys(warning, ["code", "message", "temporaryPath"])
      || warning.code !== "TEMP_UNLINK_FAILED"
      || typeof warning.message !== "string"
      || typeof warning.temporaryPath !== "string") fail("publication-receipt");
  }
  return Object.freeze({ proof, publication });
}

export const run = runMintVerifier;

function sanitizeCliError(error) {
  const message = error instanceof Error ? error.message : "";
  return message.startsWith("cli-") || message.startsWith("rpc-url-")
    ? message
    : "Verification failed before publishing a proof.";
}

export async function main({ runVerifier = runMintVerifier, stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await runVerifier();
    stdout.write(`${JSON.stringify(result.proof, null, 2)}\n`);
    for (const warning of result.publication?.warnings ?? []) {
      if (warning?.code === "TEMP_UNLINK_FAILED") {
        stderr.write("WARNING: Proof was committed, but owned temporary cleanup failed. Do not retry publication.\n");
      }
    }
    return result.proof.ok === true && result.publication?.published === true ? 0 : 1;
  } catch (error) {
    stderr.write(`${sanitizeCliError(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
