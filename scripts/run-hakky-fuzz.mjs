import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const FUZZ_IMAGE_TAG = "hakky-market-fuzz:nightly-2026-07-20";
export const FUZZ_TARGETS = Object.freeze([
  "instruction",
  "state",
  "accounts",
  "math",
]);
export const FUZZ_RUNS = Object.freeze({
  instruction: 10_000,
  state: 10_000,
  accounts: 10_000,
  math: 100_000,
});

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const TARGET_TIMEOUT_MS = 15 * 60 * 1_000;

export function planFuzzRun(repositoryRoot = DEFAULT_REPOSITORY_ROOT) {
  const root = path.resolve(repositoryRoot);
  const outputDirectory = path.join(root, "artifacts", "fuzz");
  const registryDirectory = path.join(outputDirectory, "cargo-registry");
  const gitDirectory = path.join(outputDirectory, "cargo-git");
  const cargoCacheMounts = [
    "-v",
    `${registryDirectory}:/usr/local/cargo/registry:rw`,
    "-v",
    `${gitDirectory}:/usr/local/cargo/git:rw`,
  ];
  const buildCommand = [
    "rtk",
    "docker",
    "build",
    "--file",
    path.join(root, "Containerfile.fuzz"),
    "--tag",
    FUZZ_IMAGE_TAG,
    root,
  ];
  const dependencyCommand = [
    "rtk",
    "docker",
    "run",
    "--rm",
    "--network",
    "bridge",
    "-v",
    `${root}:/workspace:rw`,
    ...cargoCacheMounts,
    "-w",
    "/workspace/programs/hakky-market/fuzz",
    FUZZ_IMAGE_TAG,
    "cargo",
    "+nightly-2026-07-20",
    "fetch",
    "--locked",
    "--manifest-path",
    "/workspace/programs/hakky-market/fuzz/Cargo.toml",
  ];
  const runCommands = Object.fromEntries(
    FUZZ_TARGETS.map((target) => [
      target,
      [
        "rtk",
        "docker",
        "run",
        "--rm",
        "--network",
        "none",
        "-e",
        "CARGO_NET_OFFLINE=true",
        "-v",
        `${root}:/workspace:rw`,
        ...cargoCacheMounts,
        "-w",
        "/workspace/programs/hakky-market/fuzz",
        FUZZ_IMAGE_TAG,
        "cargo",
        "+nightly-2026-07-20",
        "fuzz",
        "run",
        target,
        "--",
        `-runs=${FUZZ_RUNS[target]}`,
      ],
    ]),
  );
  return {
    buildCommand,
    dependencyCommand,
    gitDirectory,
    lockPath: path.join(root, "programs", "hakky-market", "fuzz", "Cargo.lock"),
    outputDirectory,
    registryDirectory,
    repositoryRoot: root,
    runCommands,
  };
}

function execute(command, { cwd, exec, capture = false, timeout } = {}) {
  const [executable, ...args] = command;
  return exec(executable, args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    timeout,
  });
}

export async function runFuzz({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  exec = execFileSync,
} = {}) {
  const plan = planFuzzRun(repositoryRoot);
  await Promise.all([
    mkdir(plan.outputDirectory, { recursive: true }),
    mkdir(plan.registryDirectory, { recursive: true }),
    mkdir(plan.gitDirectory, { recursive: true }),
  ]);
  const fuzzLock = await readFile(plan.lockPath);
  execute(plan.buildCommand, { cwd: plan.repositoryRoot, exec });
  execute(plan.dependencyCommand, {
    cwd: plan.repositoryRoot,
    exec,
    timeout: TARGET_TIMEOUT_MS,
  });
  const imageId = execute(
    ["rtk", "docker", "image", "inspect", FUZZ_IMAGE_TAG, "--format", "{{.Id}}"],
    { cwd: plan.repositoryRoot, exec, capture: true },
  ).trim();
  if (!/^sha256:[0-9a-f]{64}$/u.test(imageId)) {
    throw new Error("fuzz image ID could not be resolved exactly");
  }

  const receipts = [];
  for (const target of FUZZ_TARGETS) {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    execute(plan.runCommands[target], {
      cwd: plan.repositoryRoot,
      exec,
      timeout: TARGET_TIMEOUT_MS,
    });
    receipts.push({
      target,
      runs: FUZZ_RUNS[target],
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - started),
      image: FUZZ_IMAGE_TAG,
      imageId,
      completed: true,
    });
  }
  const result = {
    schemaVersion: "hakky-fuzz-v1",
    toolchain: "nightly-2026-07-20",
    cargoFuzzVersion: "0.13.2",
    fuzzCargoLockSha256: createHash("sha256").update(fuzzLock).digest("hex"),
    dependencyPrefetchNetwork: "bridge",
    executionNetwork: "none",
    receipts,
  };
  await writeFile(
    path.join(plan.outputDirectory, "fuzz-receipt.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
  return result;
}

export async function main({ stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await runFuzz();
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "Hakky fuzz verification failed"}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
