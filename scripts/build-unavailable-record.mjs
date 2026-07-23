import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildUnavailableRecord } from "../src/canonical-proof.mjs";
import { publishUnavailableRecord } from "../src/record-output.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atRoot = (root, relativePath) => path.join(root, ...relativePath.split("/"));

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readPublicJson(filename, label, readFileImpl) {
  let contents;
  try {
    contents = await readFileImpl(filename, "utf8");
  } catch {
    throw new Error(`unavailable-${label}-read`);
  }
  try {
    return JSON.parse(contents);
  } catch {
    throw new Error(`unavailable-${label}-invalid-json`);
  }
}

function resolvedEvidencePath(root, artifactsRoot, candidate) {
  const resolved = path.resolve(root, candidate);
  const relative = path.relative(artifactsRoot, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("unavailable-stage-evidence-path");
  }
  return resolved;
}

export function parseArguments(argv) {
  if (argv.length === 0) return { stageEvidence: null };
  if (argv.length !== 2 || argv[0] !== "--stage-evidence" || !argv[1]) {
    throw new Error(
      "Usage: npm run build:unavailable-record -- [--stage-evidence <ignored-json-path>]",
    );
  }
  return { stageEvidence: argv[1] };
}

export async function buildUnavailableRecordFile({
  root = PROJECT_ROOT,
  stageEvidence = null,
  readFileImpl = readFile,
  publishUnavailableRecordImpl = publishUnavailableRecord,
} = {}) {
  const resolvedRoot = path.resolve(root);
  const artifactsRoot = atRoot(resolvedRoot, "artifacts");
  const targetPath = atRoot(resolvedRoot, "web/data/launch.json");
  const sourceRecord = await readPublicJson(targetPath, "source", readFileImpl);
  if (sourceRecord.proof?.availability === "unavailable" && stageEvidence === null) {
    const result = buildUnavailableRecord({ sourceRecord });
    return {
      record: result.record,
      publication: { committed: false, idempotent: true, warnings: [] },
    };
  }
  if (stageEvidence === null) throw new Error("unavailable-stage-evidence-required");
  const stageEvidencePath = resolvedEvidencePath(resolvedRoot, artifactsRoot, stageEvidence);
  const stageReceipt = await readPublicJson(stageEvidencePath, "stage-evidence", readFileImpl);
  let sourceStageReceipt = null;
  let sourceContinuityReceipt = null;
  if (sourceRecord.proof?.availability === "unavailable") {
    const publicRecordSha256 = sha256(canonicalBytes(sourceRecord));
    const continuityPath = path.join(
      artifactsRoot,
      "launch",
      "unavailable-continuity",
      `${publicRecordSha256}.json`,
    );
    sourceContinuityReceipt = await readPublicJson(
      continuityPath,
      "source-continuity",
      readFileImpl,
    );
    const sourceStagePath = path.join(
      artifactsRoot,
      "launch",
      "stage-receipts",
      `${sourceContinuityReceipt.stageReceiptSha256}.json`,
    );
    sourceStageReceipt = await readPublicJson(
      sourceStagePath,
      "source-stage-evidence",
      readFileImpl,
    );
  }
  const { record, continuityReceipt } = buildUnavailableRecord({
    sourceRecord,
    stageReceipt,
    sourceStageReceipt,
    sourceContinuityReceipt,
  });
  const publication = await publishUnavailableRecordImpl({
    targetPath,
    record,
    stageReceipt,
    continuityReceipt,
    artifactsRoot,
  });
  return { record, publication };
}

export async function main({
  argv = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  root = PROJECT_ROOT,
} = {}) {
  try {
    const { stageEvidence } = parseArguments(argv);
    const result = await buildUnavailableRecordFile({ root, stageEvidence });
    stdout.write(`${JSON.stringify({
      ok: true,
      output: "web/data/launch.json",
      status: result.record.status,
      availability: result.record.proof.availability,
      idempotent: result.publication.idempotent === true,
      warnings: result.publication.warnings,
    }, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2)}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) process.exitCode = await main();
