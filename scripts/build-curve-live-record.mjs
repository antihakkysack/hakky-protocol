import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildCurveLiveRecord,
  loadCurveProofArtifacts,
} from "../src/canonical-proof.mjs";
import { publishLaunchRecord } from "../src/record-output.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atRoot = (root, relativePath) => path.join(root, ...relativePath.split("/"));

async function readSourceRecord(root, readFileImpl) {
  const relativePath = "web/data/launch.json";
  let contents;
  try {
    contents = await readFileImpl(atRoot(root, relativePath), "utf8");
  } catch {
    throw new Error(`curve-source-read: ${relativePath}`);
  }
  try {
    return JSON.parse(contents);
  } catch {
    throw new Error(`curve-source-invalid-json: ${relativePath}`);
  }
}

export function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== "--published-at" || !argv[1]) {
    throw new Error(
      "Usage: npm run build:curve-live-record -- --published-at <exact-ISO-8601-timestamp>",
    );
  }
  return { publishedAt: argv[1] };
}

export async function buildCurveLiveRecordFile({
  root = PROJECT_ROOT,
  publishedAt,
  readFileImpl = readFile,
  publishLaunchRecordImpl = publishLaunchRecord,
} = {}) {
  const sourceRecord = await readSourceRecord(root, readFileImpl);
  const { mintArtifact, launchlabArtifact } = await loadCurveProofArtifacts({
    root,
    readFileImpl,
  });
  const record = buildCurveLiveRecord({
    sourceRecord,
    mintArtifact,
    launchlabArtifact,
    publishedAt,
  });
  await publishLaunchRecordImpl(atRoot(root, "web/data/launch.json"), record);
  return record;
}

export async function main({
  argv = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  root = PROJECT_ROOT,
} = {}) {
  try {
    const { publishedAt } = parseArguments(argv);
    const record = await buildCurveLiveRecordFile({ root, publishedAt });
    stdout.write(`${JSON.stringify({
      ok: true,
      output: "web/data/launch.json",
      status: record.status,
      availability: record.proof.availability,
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
