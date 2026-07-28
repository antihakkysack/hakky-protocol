import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
import { resolveRepositoryPath } from "../src/metadata-integrity.mjs";
import {
  evaluateReproduction,
  serializeBuildRecord,
  serializeReproductionReceipt,
} from "../src/release-manifest.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(
  new URL("../", import.meta.url),
);
export const REPRODUCTION_RECEIPT_PATH =
  "artifacts/build/candidate/reproduction-v1.json";
const CANDIDATE_DIRECTORY_PATTERN =
  /^artifacts\/build\/candidate\/[a-z0-9][a-z0-9-]*$/u;
const USAGE =
  "Usage: node scripts/verify-sbf-reproduction.mjs --lane candidate-sbf --left artifacts/build/candidate/<left> --right artifacts/build/candidate/<right>";

function validateBuildDirectory(value) {
  if (!CANDIDATE_DIRECTORY_PATTERN.test(value)) {
    throw new Error("Candidate build path must stay in artifacts/build/candidate");
  }
}

export function parseReproductionOptions(argv) {
  const parsed = parseExactCliOptions(argv, {
    usage: USAGE,
    definitions: [
      {
        flag: "--lane",
        key: "lane",
        validate(value) {
          if (value !== "candidate-sbf") {
            throw new Error("Reproduction lane must be candidate-sbf");
          }
        },
      },
      {
        flag: "--left",
        key: "left",
        validate: validateBuildDirectory,
      },
      {
        flag: "--right",
        key: "right",
        validate: validateBuildDirectory,
      },
    ],
  });
  if (parsed.left === parsed.right) {
    throw new Error("Reproduction build directories must be distinct");
  }
  return parsed;
}

async function readBuild(repositoryRoot, relativeDirectory) {
  const recordPath = await resolveRepositoryPath(
    repositoryRoot,
    `${relativeDirectory}/build-record.json`,
  );
  const executablePath = await resolveRepositoryPath(
    repositoryRoot,
    `${relativeDirectory}/hakky_market.so`,
  );
  const [recordBytes, executable] = await Promise.all([
    readFile(recordPath),
    readFile(executablePath),
  ]);
  let record;
  try {
    record = JSON.parse(recordBytes.toString("utf8"));
  } catch {
    throw new Error("sbf-reproduction-invalid");
  }
  if (!Buffer.from(recordBytes).equals(serializeBuildRecord(record))) {
    throw new Error("sbf-reproduction-invalid");
  }
  if (record.buildDirectory !== relativeDirectory) {
    throw new Error("sbf-reproduction-invalid");
  }
  return { record, executable };
}

export async function runSbfReproductionVerification({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  now = () => new Date(),
} = {}) {
  const options = parseReproductionOptions(argv);
  const [left, right] = await Promise.all([
    readBuild(repositoryRoot, options.left),
    readBuild(repositoryRoot, options.right),
  ]);
  const instant = typeof now === "function" ? now() : now;
  let comparedAt;
  try {
    comparedAt = instant.toISOString();
  } catch {
    throw new Error("sbf-reproduction-invalid");
  }
  const receipt = evaluateReproduction(left.record, right.record, {
    leftExecutable: left.executable,
    rightExecutable: right.executable,
    comparedAt,
  });
  if (!receipt.ok) throw new Error("sbf-reproduction-invalid");
  const bytes = serializeReproductionReceipt(receipt);
  const outputPath = await resolveRepositoryPath(
    repositoryRoot,
    REPRODUCTION_RECEIPT_PATH,
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  try {
    await writeFile(outputPath, bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = await readFile(outputPath);
    if (!Buffer.from(existing).equals(bytes)) {
      throw new Error("sbf-reproduction-receipt-conflict");
    }
  }
  return receipt;
}

export async function main({
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const receipt = await runSbfReproductionVerification();
    stdout.write(serializeReproductionReceipt(receipt));
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "SBF reproduction failed"}\n`);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  process.exitCode = await main();
}
