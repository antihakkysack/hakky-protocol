import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  planVendorMaterialization,
  validateVendorBundle,
} from "./materialize-hakky-cargo-vendor.mjs";
import {
  assertBuildRecord,
  serializeBuildRecord,
} from "../src/release-manifest.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const RUST_IMAGE =
  "rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3";
const RUST_HOST_TOOLCHAIN = "1.95.0";
const VENDOR_RELATIVE = "artifacts/build/dependencies/vendor";
const CARGO_HOME_RELATIVE = "artifacts/build/dependencies/cargo-home";
const CANDIDATE_TEST =
  "exact_candidate_sbf_executes_reviewed_decoder_surface";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function normalizeCandidateBuildDirectory(value) {
  if (
    typeof value !== "string" ||
    !/^artifacts\/build\/candidate\/[a-z0-9][a-z0-9-]*$/u.test(value)
  ) {
    throw new Error(
      "candidate runtime requires --build artifacts/build/candidate/<id>",
    );
  }
  return value;
}

export async function verifySbfReceipt(
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  lane = "test-sbf",
  buildDirectory,
) {
  if (lane !== "test-sbf" && lane !== "candidate-sbf") {
    throw new Error("runtime lane must be test-sbf or candidate-sbf");
  }
  const normalizedBuildDirectory =
    lane === "candidate-sbf"
      ? normalizeCandidateBuildDirectory(buildDirectory)
      : "artifacts/build/test-sbf";
  const directory = path.resolve(
    repositoryRoot,
    ...normalizedBuildDirectory.split("/"),
  );
  const binaryPath = path.join(directory, "hakky_market.so");
  const receiptPath = path.join(
    directory,
    lane === "candidate-sbf" ? "build-record.json" : "build-receipt.json",
  );
  const receiptBytes = await readFile(receiptPath);
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  const binary = await readFile(binaryPath);
  if (lane === "candidate-sbf") {
    assertBuildRecord(receipt);
    if (!Buffer.from(receiptBytes).equals(serializeBuildRecord(receipt))) {
      throw new Error("candidate-SBF build record is not canonical");
    }
    if (receipt.buildDirectory !== normalizedBuildDirectory) {
      throw new Error("candidate-SBF build record has the wrong directory");
    }
    if (
      receipt.executable.byteLength !== binary.byteLength ||
      receipt.executable.sha256 !== sha256(binary)
    ) {
      throw new Error(
        "candidate-SBF binary hash does not match its build record",
      );
    }
    return {
      binaryPath,
      directory,
      receipt,
      buildRecordSha256: sha256(receiptBytes),
      binarySha256: receipt.executable.sha256,
    };
  }
  if (receipt.lane !== lane) throw new Error(`${lane} receipt has the wrong lane`);
  if (receipt.testFeatureEnabled !== false) {
    throw new Error("test-SBF release binary must not contain the native test feature");
  }
  const identitySeparationIsValid =
    lane === "test-sbf"
      ? receipt.testIdentityPresent === true &&
        receipt.releaseIdentityExcluded === true
      : receipt.releaseIdentityPresent === true &&
        receipt.testIdentityExcluded === true;
  if (!identitySeparationIsValid) {
    throw new Error(`${lane} receipt has invalid release/test identity separation`);
  }
  if (receipt.binarySha256 !== sha256(binary)) {
    throw new Error("test-SBF binary hash does not match its build receipt");
  }
  return {
    binaryPath,
    directory,
    receipt,
    binarySha256: receipt.binarySha256,
  };
}

export function planExactSbfRun({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  lane = "test-sbf",
} = {}) {
  if (lane !== "test-sbf") {
    throw new Error(
      "planExactSbfRun is test-SBF only; use planCandidateSbfRun for candidate-SBF",
    );
  }
  const root = path.resolve(repositoryRoot);
  const containerBinary = "/workspace/artifacts/build/test-sbf/hakky_market.so";
  const cargoArguments = [
    "cargo",
    "test",
    "--offline",
    "--locked",
    "-p",
    "hakky-market",
  ];
  cargoArguments.push("--features", "test-release-config");
  cargoArguments.push(
    "--test",
    "sbf_runtime",
    "exact_sbf_binary_executes_reviewed_decoder_and_curve_lifecycle",
    "--",
    "--ignored",
    "--exact",
    "--nocapture",
  );
  return [
    "rtk",
    "docker",
    "run",
    "--rm",
    "--network",
    "none",
    "-e",
    `RUSTUP_TOOLCHAIN=${RUST_HOST_TOOLCHAIN}`,
    "-e",
    "CARGO_HOME=/cargo-home",
    "-e",
    "CARGO_TARGET_DIR=/tmp/hakky-host-target",
    "-e",
    `HAKKY_SBF_PATH=${containerBinary}`,
    "-v",
    `${root}:/workspace:rw`,
    "-v",
    `${path.join(root, VENDOR_RELATIVE)}:/vendor:ro`,
    "-v",
    `${path.join(root, CARGO_HOME_RELATIVE)}:/cargo-home:rw`,
    "-w",
    "/workspace",
    RUST_IMAGE,
    ...cargoArguments,
  ];
}

export function planCandidateSbfRun({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  buildDirectory,
  sourceCommit,
  binarySha256,
  runId,
} = {}) {
  const root = path.resolve(repositoryRoot);
  const normalizedBuildDirectory =
    normalizeCandidateBuildDirectory(buildDirectory);
  if (!/^[0-9a-f]{40}$/u.test(sourceCommit || "")) {
    throw new Error("candidate runtime source commit must be a lowercase Git SHA");
  }
  if (!/^[0-9a-f]{64}$/u.test(binarySha256 || "")) {
    throw new Error("candidate runtime binary hash must be lowercase SHA-256");
  }
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/u.test(runId || "")) {
    throw new Error("candidate runtime run ID is invalid");
  }

  const absoluteBuildDirectory = path.resolve(
    root,
    ...normalizedBuildDirectory.split("/"),
  );
  const runtimeDirectory = path.join(absoluteBuildDirectory, "runtime");
  const sourceArchivePath = path.join(runtimeDirectory, "source.tar");
  const containerName =
    `hakky-candidate-${binarySha256.slice(0, 12)}-${runId}`;
  const cargoArguments = [
    "cargo",
    "test",
    "--offline",
    "--locked",
    "-p",
    "hakky-market",
    "--test",
    "sbf_runtime",
    CANDIDATE_TEST,
    "--",
    "--ignored",
    "--exact",
    "--nocapture",
  ];

  return {
    containerName,
    runtimeDirectory,
    sourceArchivePath,
    archive: [
      "rtk",
      "git",
      "archive",
      "--format=tar",
      `--output=${sourceArchivePath}`,
      sourceCommit,
      "--",
      "Cargo.toml",
      "Cargo.lock",
      ".cargo",
      "programs/hakky-market",
    ],
    create: [
      "rtk",
      "docker",
      "create",
      "--name",
      containerName,
      "--network",
      "none",
      "-e",
      `RUSTUP_TOOLCHAIN=${RUST_HOST_TOOLCHAIN}`,
      "-e",
      "CARGO_HOME=/cargo-home",
      "-e",
      "CARGO_TARGET_DIR=/tmp/hakky-host-target",
      "-e",
      "HAKKY_SBF_PATH=/candidate/hakky_market.so",
      "-w",
      "/workspace",
      RUST_IMAGE,
      "sleep",
      "infinity",
    ],
    start: ["rtk", "docker", "start", containerName],
    prepare: [
      "rtk",
      "docker",
      "exec",
      containerName,
      "sh",
      "-lc",
      "mkdir -p /workspace /vendor /cargo-home /candidate",
    ],
    copy: [
      [
        "rtk",
        "docker",
        "cp",
        sourceArchivePath,
        `${containerName}:/tmp/source.tar`,
      ],
      [
        "rtk",
        "docker",
        "cp",
        `${path.join(root, VENDOR_RELATIVE)}${path.sep}.`,
        `${containerName}:/vendor`,
      ],
      [
        "rtk",
        "docker",
        "cp",
        `${path.join(root, CARGO_HOME_RELATIVE)}${path.sep}.`,
        `${containerName}:/cargo-home`,
      ],
      [
        "rtk",
        "docker",
        "cp",
        path.join(absoluteBuildDirectory, "hakky_market.so"),
        `${containerName}:/candidate/hakky_market.so`,
      ],
    ],
    extract: [
      "rtk",
      "docker",
      "exec",
      containerName,
      "tar",
      "-xf",
      "/tmp/source.tar",
      "-C",
      "/workspace",
    ],
    test: ["rtk", "docker", "exec", containerName, ...cargoArguments],
    remove: ["rtk", "docker", "rm", "--force", containerName],
  };
}

function executePlannedCommand(command, { root, exec }) {
  const [executable, ...args] = command;
  return exec(executable, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });
}

async function assertCandidateVendorBinding(root, buildRecord) {
  const vendorManifest = await validateVendorBundle(root);
  const vendorPlan = planVendorMaterialization(root);
  const manifestBytes = await readFile(vendorPlan.manifestPath);
  const expected = buildRecord.dependencies;
  if (
    expected.cargoLockSha256 !== vendorManifest.cargoLockSha256 ||
    expected.vendorManifestSha256 !== sha256(manifestBytes) ||
    expected.vendorTreeSha256 !== vendorManifest.treeSha256 ||
    expected.vendorSourceConfigSha256 !== vendorManifest.sourceConfigSha256
  ) {
    throw new Error("candidate-SBF vendor bundle does not match its build record");
  }
}

export async function runExactSbf({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  lane = "test-sbf",
  buildDirectory,
  exec = execFileSync,
  now = () => new Date(),
  runId = randomUUID().slice(0, 8),
} = {}) {
  const root = path.resolve(repositoryRoot);
  const verified = await verifySbfReceipt(
    root,
    lane,
    lane === "candidate-sbf" ? buildDirectory : undefined,
  );
  const { binarySha256, directory } = verified;
  const startedAt = now().toISOString();

  if (lane === "candidate-sbf") {
    await assertCandidateVendorBinding(root, verified.receipt);
    const plan = planCandidateSbfRun({
      repositoryRoot: root,
      buildDirectory,
      sourceCommit: verified.receipt.source.commit,
      binarySha256,
      runId,
    });
    await mkdir(plan.runtimeDirectory, { recursive: true });
    executePlannedCommand(plan.archive, { root, exec });
    let containerCreated = false;
    try {
      executePlannedCommand(plan.create, { root, exec });
      containerCreated = true;
      executePlannedCommand(plan.start, { root, exec });
      executePlannedCommand(plan.prepare, { root, exec });
      for (const command of plan.copy) {
        executePlannedCommand(command, { root, exec });
      }
      executePlannedCommand(plan.extract, { root, exec });
      executePlannedCommand(plan.test, { root, exec });
    } finally {
      if (containerCreated) {
        executePlannedCommand(plan.remove, { root, exec });
      }
      await rm(plan.sourceArchivePath, { force: true });
    }

    const result = {
      schemaVersion: "hakky-candidate-runtime-receipt-v1",
      lane,
      buildDirectory: normalizeCandidateBuildDirectory(buildDirectory),
      sourceCommit: verified.receipt.source.commit,
      buildRecordSha256: verified.buildRecordSha256,
      binary: {
        byteLength: verified.receipt.executable.byteLength,
        sha256: binarySha256,
      },
      container: {
        image: RUST_IMAGE,
        network: "none",
        repositoryBindMounted: false,
        vendorBindMounted: false,
        cargoHomeBindMounted: false,
      },
      test: {
        name: CANDIDATE_TEST,
        rustToolchain: RUST_HOST_TOOLCHAIN,
        cargoOffline: true,
        cargoLocked: true,
        nativeProcessorFallback: false,
        preferBpf: true,
      },
      acceptedInstructionTags: [0, 1, 2],
      probedFirstBytes: 256,
      malformedLengthsRejected: true,
      startedAt,
      completedAt: now().toISOString(),
      mainnetActionsAuthorized: false,
    };
    await writeFile(
      path.join(directory, "runtime-receipt.json"),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
    return result;
  }

  await validateVendorBundle(root);
  const [executable, ...args] = planExactSbfRun({ repositoryRoot: root, lane });
  exec(executable, args, { cwd: root, stdio: "inherit" });
  const result = {
    schemaVersion: "hakky-sbf-decoder-probe-v1",
    lane,
    binarySha256,
    nativeProcessorFallback: false,
    preferBpf: true,
    acceptedInstructionTags: [0, 1, 2],
    probedFirstBytes: 256,
    malformedLengthsRejected: true,
    immutableInitializationPassed: true,
    curveBuySellRoundTrip: true,
  };
  await writeFile(
    path.join(directory, "runtime-receipt.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
  return result;
}

export async function runTestSbf(options = {}) {
  return runExactSbf({ ...options, lane: "test-sbf" });
}

export async function main({ stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await runTestSbf();
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "test-SBF runtime verification failed"}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
