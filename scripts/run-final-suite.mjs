import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  FINAL_SUITE_COMMANDS,
  buildFinalSuiteReceiptV1,
  serializeFinalSuiteReceiptV1,
} from "../src/final-suite-receipt.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUTPUT_PATH = "artifacts/verify/final-suite-v1.json";
const USAGE = "Usage: npm run verify:final-suite";

export function parseFinalSuiteOptions(argv = process.argv.slice(2)) {
  if (!Array.isArray(argv) || argv.length !== 0) throw new Error(USAGE);
  return {};
}

export function planFinalSuiteRun() {
  return FINAL_SUITE_COMMANDS.map(({ id, argv }) => ({
    id,
    argv: [...argv],
  }));
}

function runGit(repositoryRoot, args) {
  const result = spawnSync("rtk", ["git", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "final suite git command failed");
  }
  return result.stdout;
}

function assertCleanTree(repositoryRoot) {
  const status = runGit(
    repositoryRoot,
    ["status", "--porcelain=v1", "--untracked-files=all"],
  ).trim();
  if (status !== "" && status !== "ok") {
    throw new Error("final suite requires a clean Git tree");
  }
}

function runCommand({
  command,
  repositoryRoot,
  stdout,
  stderr,
  now,
  spawnImpl,
}) {
  return new Promise((resolve, reject) => {
    const [executable, ...args] = command.argv;
    const stdoutHash = createHash("sha256");
    const stderrHash = createHash("sha256");
    const startedAt = now().toISOString();
    const child = spawnImpl(executable, args, {
      cwd: repositoryRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.once("error", reject);
    child.stdout.on("data", (chunk) => {
      stdoutHash.update(chunk);
      stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrHash.update(chunk);
      stderr.write(chunk);
    });
    child.once("close", (exitCode, signal) => {
      const completedAt = now().toISOString();
      if (signal !== null || exitCode !== 0) {
        reject(
          new Error(
            `final suite command ${command.id} failed with ${
              signal === null ? `exit code ${exitCode}` : `signal ${signal}`
            }`,
          ),
        );
        return;
      }
      resolve({
        id: command.id,
        argv: [...command.argv],
        startedAt,
        completedAt,
        exitCode,
        stdoutSha256: stdoutHash.digest("hex"),
        stderrSha256: stderrHash.digest("hex"),
      });
    });
  });
}

async function writeReceipt(repositoryRoot, bytes) {
  const outputPath = path.join(
    repositoryRoot,
    ...OUTPUT_PATH.split("/"),
  );
  const outputDirectory = path.dirname(outputPath);
  const temporaryPath = path.join(
    outputDirectory,
    `.${path.basename(outputPath)}.${randomUUID()}.tmp`,
  );
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(temporaryPath, bytes, { flag: "wx" });
  try {
    await rm(outputPath, { force: true });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function runFinalSuite({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  stdout = process.stdout,
  stderr = process.stderr,
  now = () => new Date(),
  spawnImpl = spawn,
} = {}) {
  parseFinalSuiteOptions(argv);
  const root = path.resolve(repositoryRoot);
  assertCleanTree(root);
  const sourceCommit = runGit(root, ["rev-parse", "HEAD"]).trim();
  const startedAt = now().toISOString();
  const results = [];
  for (const command of planFinalSuiteRun()) {
    stdout.write(`\n[final-suite] ${command.id}\n`);
    results.push(
      await runCommand({
        command,
        repositoryRoot: root,
        stdout,
        stderr,
        now,
        spawnImpl,
      }),
    );
  }
  const completedAt = now().toISOString();
  const receipt = buildFinalSuiteReceiptV1({
    sourceCommit,
    startedAt,
    completedAt,
    results,
  });
  await writeReceipt(root, serializeFinalSuiteReceiptV1(receipt));
  return receipt;
}

export async function main({
  argv = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const receipt = await runFinalSuite({ argv, stdout, stderr });
    stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "final suite failed"}\n`);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  process.exitCode = await main();
}
