import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateVendorBundle } from "./materialize-hakky-cargo-vendor.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const RUST_IMAGE =
  "rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3";
const RUST_HOST_TOOLCHAIN = "1.95.0";
const VENDOR_RELATIVE = "artifacts/build/dependencies/vendor";
const CARGO_HOME_RELATIVE = "artifacts/build/dependencies/cargo-home";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function verifySbfReceipt(
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  lane = "test-sbf",
) {
  if (lane !== "test-sbf" && lane !== "candidate-sbf") {
    throw new Error("runtime lane must be test-sbf or candidate-sbf");
  }
  const directory = path.join(
    repositoryRoot,
    "artifacts",
    "build",
    lane === "candidate-sbf" ? "candidate" : "test-sbf",
  );
  const binaryPath = path.join(directory, "hakky_market.so");
  const receipt = JSON.parse(await readFile(path.join(directory, "build-receipt.json"), "utf8"));
  const binary = await readFile(binaryPath);
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
  return { binaryPath, directory, receipt };
}

export function planExactSbfRun({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  lane = "test-sbf",
} = {}) {
  if (lane !== "test-sbf" && lane !== "candidate-sbf") {
    throw new Error("runtime lane must be test-sbf or candidate-sbf");
  }
  const root = path.resolve(repositoryRoot);
  const containerBinary =
    lane === "candidate-sbf"
      ? "/workspace/artifacts/build/candidate/hakky_market.so"
      : "/workspace/artifacts/build/test-sbf/hakky_market.so";
  const cargoArguments = [
    "cargo",
    "test",
    "--offline",
    "--locked",
    "-p",
    "hakky-market",
  ];
  if (lane === "test-sbf") {
    cargoArguments.push("--features", "test-release-config");
  }
  cargoArguments.push(
    "--test",
    "sbf_runtime",
    lane === "test-sbf"
      ? "exact_sbf_binary_executes_reviewed_decoder_and_curve_lifecycle"
      : "exact_candidate_sbf_executes_reviewed_decoder_surface",
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

export async function runExactSbf({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  lane = "test-sbf",
  exec = execFileSync,
} = {}) {
  const root = path.resolve(repositoryRoot);
  const { directory, receipt } = await verifySbfReceipt(root, lane);
  await validateVendorBundle(root);
  const [executable, ...args] = planExactSbfRun({ repositoryRoot: root, lane });
  exec(executable, args, { cwd: root, stdio: "inherit" });
  const result = {
    schemaVersion: "hakky-sbf-decoder-probe-v1",
    lane,
    binarySha256: receipt.binarySha256,
    nativeProcessorFallback: false,
    preferBpf: true,
    acceptedInstructionTags: [0, 1, 2],
    probedFirstBytes: 256,
    malformedLengthsRejected: true,
    immutableInitializationPassed: lane === "test-sbf",
    curveBuySellRoundTrip: lane === "test-sbf",
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
