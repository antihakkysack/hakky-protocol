import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PublicKey } from "@solana/web3.js";

import { validateVendorBundle } from "./materialize-hakky-cargo-vendor.mjs";

export const SBF_IMAGE_DIGEST =
  "sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68";
export const SBF_IMAGE =
  `solanafoundation/solana-verifiable-build:4.0.0@${SBF_IMAGE_DIGEST}`;
export const SBF_TOOLS_VERSION = "v1.53";
export const SBF_ARCH = "v0";
export const SBF_HOST_TOOLCHAIN = "1.93.1";
export const MAX_PROGRAM_BYTES = 120_000;
export const TEST_PROGRAM_ID = "FAe4sisG95oZ42w7buUn5qEE4TAnfTTFPiguZUHmhiF";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const VENDOR_RELATIVE = "artifacts/build/dependencies/vendor";
const CARGO_HOME_RELATIVE = "artifacts/build/dependencies/cargo-home";
const SOURCE_BINARY_RELATIVE = "target/deploy/hakky_market.so";
const TEST_SOURCE_RELATIVE = "artifacts/build/test-sbf/source";

function volume(hostPath, containerPath, mode) {
  return `${path.resolve(hostPath)}:${containerPath}:${mode}`;
}

export function planSbfBuild({ lane, repositoryRoot = DEFAULT_REPOSITORY_ROOT }) {
  if (lane !== "test-sbf" && lane !== "candidate-sbf") {
    throw new Error("SBF lane must be test-sbf or candidate-sbf");
  }
  const root = path.resolve(repositoryRoot);
  const vendorDirectory = path.join(root, VENDOR_RELATIVE);
  const cargoHome = path.join(root, CARGO_HOME_RELATIVE);
  const outputDirectory = path.join(
    root,
    "artifacts",
    "build",
    lane === "candidate-sbf" ? "candidate" : "test-sbf",
  );
  const testSourceDirectory =
    lane === "test-sbf" ? path.join(root, TEST_SOURCE_RELATIVE) : null;
  const containerWorkdir =
    lane === "test-sbf"
      ? "/workspace/artifacts/build/test-sbf/source"
      : "/workspace";
  const command = [
    "rtk",
    "docker",
    "run",
    "--rm",
    "--network",
    "none",
    "-e",
    `RUSTUP_TOOLCHAIN=${SBF_HOST_TOOLCHAIN}`,
    "-e",
    "CARGO_HOME=/cargo-home",
    "-v",
    volume(root, "/workspace", "rw"),
    "-v",
    volume(vendorDirectory, "/vendor", "ro"),
    "-v",
    volume(cargoHome, "/cargo-home", "rw"),
    "-w",
    containerWorkdir,
    SBF_IMAGE,
    "cargo-build-sbf",
    "--offline",
    "--skip-tools-install",
    "--tools-version",
    SBF_TOOLS_VERSION,
    "--arch",
    SBF_ARCH,
    "--",
    "--locked",
  ];
  return {
    cargoHome,
    command,
    lane,
    outputDirectory,
    repositoryRoot: root,
    requiresCleanTree: lane === "candidate-sbf",
    sourceBinary: path.join(testSourceDirectory ?? root, SOURCE_BINARY_RELATIVE),
    testSourceDirectory,
    vendorDirectory,
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function hashSourceTree(root) {
  const sourceRoot = path.join(root, "programs", "hakky-market");
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.name === "target" || entry.name === "fuzz") continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  await visit(sourceRoot);
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(path.relative(root, file).replaceAll("\\", "/"));
    digest.update("\0");
    digest.update(await readFile(file));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function extractRustByteArray(source, name) {
  const expression = new RegExp(
    `pub const ${name}: \\[u8; 32\\] = \\[[\\s\\S]*?\\];`,
    "u",
  );
  const match = source.match(expression);
  if (!match) throw new Error(`missing Rust byte array ${name}`);
  return match[0];
}

function replaceRustByteArray(source, name, replacementSource) {
  const expression = new RegExp(
    `pub const ${name}: \\[u8; 32\\] = \\[[\\s\\S]*?\\];`,
    "u",
  );
  if (!expression.test(source)) throw new Error(`missing release byte array ${name}`);
  return source.replace(expression, extractRustByteArray(replacementSource, name));
}

function assertTestSourceTarget(plan) {
  if (!plan.testSourceDirectory) throw new Error("test-SBF source directory is missing");
  const allowedParent = path.resolve(plan.outputDirectory);
  const target = path.resolve(plan.testSourceDirectory);
  if (target !== path.join(allowedParent, "source") || !target.startsWith(`${allowedParent}${path.sep}`)) {
    throw new Error("refusing unsafe test-SBF source path");
  }
}

async function prepareTestSbfSource(plan) {
  assertTestSourceTarget(plan);
  await rm(plan.testSourceDirectory, { recursive: true, force: true });
  await mkdir(path.join(plan.testSourceDirectory, "programs"), { recursive: true });
  await copyFile(
    path.join(plan.repositoryRoot, "Cargo.toml"),
    path.join(plan.testSourceDirectory, "Cargo.toml"),
  );
  await copyFile(
    path.join(plan.repositoryRoot, "Cargo.lock"),
    path.join(plan.testSourceDirectory, "Cargo.lock"),
  );
  await cp(
    path.join(plan.repositoryRoot, "programs", "hakky-market"),
    path.join(plan.testSourceDirectory, "programs", "hakky-market"),
    {
      recursive: true,
      filter: (source) => !/(?:^|[\\/])(?:fuzz|target)(?:[\\/]|$)/u.test(source),
    },
  );

  const constantsPath = path.join(
    plan.testSourceDirectory,
    "programs",
    "hakky-market",
    "src",
    "constants.rs",
  );
  const fixturePath = path.join(
    plan.testSourceDirectory,
    "programs",
    "hakky-market",
    "src",
    "test_release_config.rs",
  );
  const fixture = await readFile(fixturePath, "utf8");
  let constants = await readFile(constantsPath, "utf8");
  for (const name of [
    "EXPECTED_PROGRAM_ID_BYTES",
    "INITIALIZER_BYTES",
    "INSTANCE_COMMITMENT",
  ]) {
    constants = replaceRustByteArray(constants, name, fixture);
  }
  await writeFile(constantsPath, constants, "utf8");
}

export function isCleanRtkGitStatus(status) {
  const normalized = status.trim();
  return normalized === "" || normalized === "ok";
}

function assertCleanTree(root, exec = execFileSync) {
  const status = exec("rtk", ["git", "status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
  });
  if (!isCleanRtkGitStatus(status)) {
    throw new Error("candidate-sbf requires a clean Git tree");
  }
}

async function prepareCargoHome(plan) {
  await mkdir(plan.cargoHome, { recursive: true });
  await copyFile(
    path.join(plan.repositoryRoot, "artifacts", "build", "dependencies", "source-config.toml"),
    path.join(plan.cargoHome, "config.toml"),
  );
}

async function assertVendorBundle(plan) {
  const vendor = await stat(plan.vendorDirectory).catch(() => null);
  if (!vendor?.isDirectory()) {
    throw new Error("sealed vendor bundle is missing; run program:vendor-dependencies first");
  }
  const entries = await readdir(plan.vendorDirectory);
  if (entries.length === 0) throw new Error("sealed vendor bundle is empty");
  await validateVendorBundle(plan.repositoryRoot);
}

export async function runSbfBuild({
  lane,
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  exec = execFileSync,
} = {}) {
  const plan = planSbfBuild({ lane, repositoryRoot });
  if (plan.requiresCleanTree) assertCleanTree(plan.repositoryRoot, exec);
  await assertVendorBundle(plan);
  await prepareCargoHome(plan);
  await mkdir(plan.outputDirectory, { recursive: true });
  if (plan.lane === "test-sbf") await prepareTestSbfSource(plan);

  const [executable, ...args] = plan.command;
  const startedAt = new Date().toISOString();
  try {
    exec(executable, args, {
      cwd: plan.repositoryRoot,
      encoding: "utf8",
      stdio: "inherit",
    });

    const binary = await readFile(plan.sourceBinary);
    if (binary.length > MAX_PROGRAM_BYTES) {
      throw new Error(`SBF binary is ${binary.length} bytes; maximum is ${MAX_PROGRAM_BYTES}`);
    }
    const outputBinary = path.join(plan.outputDirectory, "hakky_market.so");
    await copyFile(plan.sourceBinary, outputBinary);
    const lockBytes = await readFile(path.join(plan.repositoryRoot, "Cargo.lock"));
    const releaseConfigBytes = await readFile(
      path.join(plan.repositoryRoot, "config", "hakky-release-v1.json"),
    );
    const releaseConfig = JSON.parse(releaseConfigBytes.toString("utf8"));
    const releaseProgramBytes = Buffer.from(new PublicKey(releaseConfig.programId).toBytes());
    const testProgramBytes = Buffer.from(new PublicKey(TEST_PROGRAM_ID).toBytes());
    const releaseIdentityPresent = binary.includes(releaseProgramBytes);
    const testIdentityPresent = binary.includes(testProgramBytes);
    const releaseIdentityExcluded = !releaseIdentityPresent;
    const testIdentityExcluded = !testIdentityPresent;
    const identitiesAreSeparated =
      plan.lane === "test-sbf"
        ? testIdentityPresent && releaseIdentityExcluded
        : releaseIdentityPresent && testIdentityExcluded;
    if (!identitiesAreSeparated) {
      throw new Error("SBF binary failed release/test identity separation");
    }
    const sourceSha256 = await hashSourceTree(plan.repositoryRoot);
    const stagedSourceSha256 =
      plan.lane === "test-sbf"
        ? await hashSourceTree(plan.testSourceDirectory)
        : sourceSha256;
    const receipt = {
      schemaVersion: "hakky-sbf-build-v1",
      lane: plan.lane,
      startedAt,
      completedAt: new Date().toISOString(),
      image: SBF_IMAGE,
      imageDigest: SBF_IMAGE_DIGEST,
      hostToolchain: SBF_HOST_TOOLCHAIN,
      toolsVersion: SBF_TOOLS_VERSION,
      architecture: SBF_ARCH,
      command: plan.command,
      cargoLockSha256: sha256(lockBytes),
      releaseConfigSha256: sha256(releaseConfigBytes),
      releaseProgramId: releaseConfig.programId,
      releaseIdentityPresent,
      releaseIdentityExcluded,
      testProgramId: TEST_PROGRAM_ID,
      testIdentityPresent,
      testIdentityExcluded,
      sourceSha256,
      stagedSourceSha256,
      binaryPath: path.relative(plan.repositoryRoot, outputBinary).replaceAll("\\", "/"),
      binaryBytes: binary.length,
      binarySha256: sha256(binary),
      maxProgramBytes: MAX_PROGRAM_BYTES,
      network: "none",
      testFeatureEnabled: false,
    };
    await writeFile(
      path.join(plan.outputDirectory, "build-receipt.json"),
      `${JSON.stringify(receipt, null, 2)}\n`,
      "utf8",
    );
    return receipt;
  } finally {
    if (plan.lane === "test-sbf") {
      assertTestSourceTarget(plan);
      await rm(plan.testSourceDirectory, { recursive: true, force: true });
    }
  }
}

function parseLane(argv) {
  if (argv.length !== 2 || argv[0] !== "--lane") {
    throw new Error("Usage: node scripts/build-hakky-sbf.mjs --lane <test-sbf|candidate-sbf>");
  }
  return argv[1];
}

export async function main({ argv = process.argv.slice(2), stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const receipt = await runSbfBuild({ lane: parseLane(argv) });
    stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "SBF build failed"}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
