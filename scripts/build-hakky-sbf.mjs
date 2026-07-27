import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  copyFile,
  lstat,
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

import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
import {
  BUILD_IMAGE,
  BUILD_LOG_NORMALIZATION,
  CANDIDATE_COMMAND,
  CANDIDATE_ENVIRONMENT,
  LOCAL_BUILD_OPERATOR_BYTES,
  LOCAL_BUILD_OPERATOR_PATH,
  LOCAL_BUILD_OPERATOR_SHA256,
  MAX_CANDIDATE_BYTES,
  RELEASE_PROGRAM_ID,
  TEST_PROGRAM_ID,
  assertBuildRecord,
  normalizeBuildLog,
  serializeBuildRecord,
} from "../src/release-manifest.mjs";
import { validateVendorBundle } from "./materialize-hakky-cargo-vendor.mjs";

export const SBF_IMAGE_DIGEST =
  "sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68";
export const SBF_IMAGE = BUILD_IMAGE;
export const SBF_TOOLS_VERSION = "v1.53";
export const SBF_ARCH = "v0";
export const SBF_HOST_TOOLCHAIN = "1.93.1";
export const MAX_PROGRAM_BYTES = MAX_CANDIDATE_BYTES;

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const VENDOR_RELATIVE = "artifacts/build/dependencies/vendor";
const CARGO_HOME_RELATIVE = "artifacts/build/dependencies/cargo-home";
const SOURCE_BINARY_RELATIVE = "target/deploy/hakky_market.so";
const TEST_SOURCE_RELATIVE = "artifacts/build/test-sbf/source";
const CANDIDATE_OUTPUT_PATTERN =
  /^artifacts\/build\/candidate\/[a-z0-9][a-z0-9-]*$/u;

function volume(hostPath, containerPath, mode) {
  return `${path.resolve(hostPath)}:${containerPath}:${mode}`;
}

export function planSbfBuild({
  lane,
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  outputRelativePath,
}) {
  if (lane !== "test-sbf" && lane !== "candidate-sbf") {
    throw new Error("SBF lane must be test-sbf or candidate-sbf");
  }
  if (
    lane === "candidate-sbf" &&
    !CANDIDATE_OUTPUT_PATTERN.test(outputRelativePath ?? "")
  ) {
    throw new Error(
      "Candidate SBF output must be artifacts/build/candidate/<build-id>",
    );
  }
  if (lane === "test-sbf" && outputRelativePath !== undefined) {
    throw new Error("Test SBF output is fixed");
  }
  const root = path.resolve(repositoryRoot);
  const vendorDirectory = path.join(root, VENDOR_RELATIVE);
  const outputDirectory =
    lane === "candidate-sbf"
      ? path.resolve(root, ...outputRelativePath.split("/"))
      : path.join(root, "artifacts", "build", "test-sbf");
  const sourceDirectory =
    lane === "candidate-sbf" ? path.join(outputDirectory, "source") : root;
  const cargoHome =
    lane === "candidate-sbf"
      ? path.join(outputDirectory, "cargo-home")
      : path.join(root, CARGO_HOME_RELATIVE);
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
    volume(
      lane === "candidate-sbf" ? sourceDirectory : root,
      "/workspace",
      "rw",
    ),
    "-v",
    volume(vendorDirectory, "/vendor", "ro"),
    "-v",
    volume(cargoHome, "/cargo-home", "rw"),
    "-w",
    containerWorkdir,
    SBF_IMAGE,
    ...CANDIDATE_COMMAND,
  ];
  return {
    buildDirectory: outputRelativePath,
    cargoHome,
    command,
    lane,
    outputDirectory,
    repositoryRoot: root,
    requiresCleanTree: lane === "candidate-sbf",
    sourceBinary: path.join(
      testSourceDirectory ?? sourceDirectory,
      SOURCE_BINARY_RELATIVE,
    ),
    sourceDirectory,
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
  return validateVendorBundle(plan.repositoryRoot);
}

async function prepareCandidateSource(plan, exec) {
  const existing = await lstat(plan.outputDirectory).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (existing) {
    throw new Error("candidate build directory must not already exist");
  }
  await mkdir(plan.sourceDirectory, { recursive: true });
  const prefix = `${plan.sourceDirectory.replaceAll("\\", "/")}/`;
  exec(
    "rtk",
    ["git", "checkout-index", "--all", "--force", `--prefix=${prefix}`],
    {
      cwd: plan.repositoryRoot,
      encoding: "utf8",
    },
  );
}

function runCaptured(spawn, command, cwd) {
  const [executable, ...args] = command;
  const result = spawn(executable, args, {
    cwd,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  if (result?.error) throw result.error;
  const stdout = Buffer.from(result?.stdout ?? []);
  const stderr = Buffer.from(result?.stderr ?? []);
  return {
    status: result?.status,
    signal: result?.signal ?? null,
    stdout,
    stderr,
  };
}

function parseToolchainProbe(stdout) {
  const values = new Map();
  for (const line of stdout.toString("utf8").trim().split(/\r?\n/u)) {
    const match = /^(rustc|cargo|solana|cargoBuildSbf)=(.+)$/u.exec(line);
    if (!match || values.has(match[1])) {
      throw new Error("SBF toolchain probe output is malformed");
    }
    values.set(match[1], match[2]);
  }
  if (values.size !== 4) {
    throw new Error("SBF toolchain probe output is incomplete");
  }
  return Object.fromEntries(values);
}

export function planToolchainProbe(plan) {
  const platformToolsRoot =
    `/root/.cache/solana/${SBF_TOOLS_VERSION}/platform-tools/rust/bin`;
  const script = [
    "set -eu",
    `printf 'rustc='; ${platformToolsRoot}/rustc --version`,
    `printf 'cargo='; ${platformToolsRoot}/cargo --version`,
    "printf 'solana='; solana --version",
    "cargo-build-sbf --version > /tmp/cargo-build-sbf-version",
    "printf 'cargoBuildSbf='; sed -n '1p' /tmp/cargo-build-sbf-version",
  ].join("; ");
  return [
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
    volume(plan.cargoHome, "/cargo-home", "rw"),
    SBF_IMAGE,
    "sh",
    "-lc",
    script,
  ];
}

function probeToolchain(plan, spawn) {
  const result = runCaptured(
    spawn,
    planToolchainProbe(plan),
    plan.repositoryRoot,
  );
  if (result.status !== 0 || result.signal !== null) {
    throw new Error("SBF toolchain probe failed");
  }
  return parseToolchainProbe(result.stdout);
}

function countOccurrences(haystack, needle) {
  const bytes = Buffer.from(needle);
  if (bytes.byteLength === 0) return 0;
  let count = 0;
  let offset = 0;
  while (offset <= haystack.byteLength - bytes.byteLength) {
    const found = haystack.indexOf(bytes, offset);
    if (found === -1) break;
    count += 1;
    offset = found + bytes.byteLength;
  }
  return count;
}

async function deriveCandidateSurface(binary, sourceDirectory) {
  const releaseBytes = Buffer.from(new PublicKey(RELEASE_PROGRAM_ID).toBytes());
  const testBytes = Buffer.from(new PublicKey(TEST_PROGRAM_ID).toBytes());
  const testArtifactPath =
    "programs/hakky-market/src/test_release_config.rs";
  const testArtifact = await readFile(
    path.join(sourceDirectory, ...testArtifactPath.split("/")),
  );
  const testArtifactSha256 = sha256(testArtifact);
  return {
    method: "raw-executable-byte-scan-v1",
    releaseProgramId: RELEASE_PROGRAM_ID,
    releaseProgramIdByteOccurrences: countOccurrences(binary, releaseBytes),
    testProgramId: TEST_PROGRAM_ID,
    testProgramIdByteOccurrences: countOccurrences(binary, testBytes),
    testProgramIdTextOccurrences: countOccurrences(
      binary,
      Buffer.from(TEST_PROGRAM_ID, "utf8"),
    ),
    testArtifactPathOccurrences:
      countOccurrences(binary, Buffer.from(testArtifactPath, "utf8")) +
      countOccurrences(
        binary,
        Buffer.from("test_release_config.rs", "utf8"),
      ),
    testArtifactSha256Occurrences:
      countOccurrences(binary, Buffer.from(testArtifactSha256, "utf8")) +
      countOccurrences(binary, Buffer.from(testArtifactSha256, "hex")),
  };
}

function readGitText(exec, repositoryRoot, revision) {
  return exec("rtk", ["git", "rev-parse", revision], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
}

async function runCandidateSbfBuild({
  plan,
  exec,
  spawn,
  vendorManifest,
}) {
  await prepareCandidateSource(plan, exec);
  await prepareCargoHome(plan);
  const sourceCommit = readGitText(exec, plan.repositoryRoot, "HEAD");
  const sourceTree = readGitText(exec, plan.repositoryRoot, "HEAD^{tree}");
  const sourceSha256 = await hashSourceTree(plan.repositoryRoot);
  const stagedSourceSha256 = await hashSourceTree(plan.sourceDirectory);
  if (sourceSha256 !== stagedSourceSha256) {
    throw new Error("candidate staged source differs from the clean source");
  }
  const operatorBytes = await readFile(
    path.join(plan.repositoryRoot, ...LOCAL_BUILD_OPERATOR_PATH.split("/")),
  );
  if (!Buffer.from(operatorBytes).equals(LOCAL_BUILD_OPERATOR_BYTES)) {
    throw new Error("local build operator configuration drifted");
  }
  const toolchain = probeToolchain(plan, spawn);
  const startedAt = new Date().toISOString();
  const result = runCaptured(spawn, plan.command, plan.repositoryRoot);
  const completedAt = new Date().toISOString();
  await Promise.all([
    writeFile(path.join(plan.outputDirectory, "build-stdout.log"), result.stdout),
    writeFile(path.join(plan.outputDirectory, "build-stderr.log"), result.stderr),
  ]);
  if (result.status !== 0 || result.signal !== null) {
    throw new Error("candidate SBF build failed; inspect build logs");
  }
  const binary = await readFile(plan.sourceBinary);
  if (binary.byteLength > MAX_PROGRAM_BYTES) {
    throw new Error(
      `SBF binary is ${binary.byteLength} bytes; maximum is ${MAX_PROGRAM_BYTES}`,
    );
  }
  const outputBinary = path.join(plan.outputDirectory, "hakky_market.so");
  await copyFile(plan.sourceBinary, outputBinary);
  const [
    cargoLockBytes,
    vendorManifestBytes,
    vendorSourceConfigBytes,
    releaseConfigBytes,
    rustViewBytes,
    javascriptViewBytes,
  ] = await Promise.all([
    readFile(path.join(plan.repositoryRoot, "Cargo.lock")),
    readFile(
      path.join(
        plan.repositoryRoot,
        "artifacts",
        "build",
        "dependencies",
        "vendor-manifest.json",
      ),
    ),
    readFile(
      path.join(
        plan.repositoryRoot,
        "artifacts",
        "build",
        "dependencies",
        "source-config.toml",
      ),
    ),
    readFile(path.join(plan.sourceDirectory, "config", "hakky-release-v1.json")),
    readFile(
      path.join(
        plan.sourceDirectory,
        "programs",
        "hakky-market",
        "src",
        "constants.rs",
      ),
    ),
    readFile(
      path.join(
        plan.sourceDirectory,
        "src",
        "hakky-release-config.generated.mjs",
      ),
    ),
  ]);
  const releaseConfig = JSON.parse(releaseConfigBytes.toString("utf8"));
  if (releaseConfig.programId !== RELEASE_PROGRAM_ID) {
    throw new Error("candidate release program identity drifted");
  }
  const record = {
    schemaVersion: "hakky-sbf-build-record-v1",
    lane: "candidate-sbf",
    buildDirectory: plan.buildDirectory,
    startedAt,
    completedAt,
    source: {
      commit: sourceCommit,
      tree: sourceTree,
      clean: true,
      sha256: sourceSha256,
    },
    operator: {
      schemaVersion: "hakky-local-build-operator-v1",
      organizationId: "hakky-local",
      operatorId: "local-controller",
      configPath: LOCAL_BUILD_OPERATOR_PATH,
      configSha256: LOCAL_BUILD_OPERATOR_SHA256,
    },
    dependencies: {
      cargoLockSha256: sha256(cargoLockBytes),
      vendorManifestSha256: sha256(vendorManifestBytes),
      vendorTreeSha256: vendorManifest.treeSha256,
      vendorSourceConfigSha256: sha256(vendorSourceConfigBytes),
    },
    release: {
      configSha256: sha256(releaseConfigBytes),
      rustViewSha256: sha256(rustViewBytes),
      javascriptViewSha256: sha256(javascriptViewBytes),
    },
    container: {
      image: SBF_IMAGE,
      network: "none",
    },
    toolchain,
    invocation: {
      command: [...CANDIDATE_COMMAND],
      environment: { ...CANDIDATE_ENVIRONMENT },
    },
    logs: {
      normalization: BUILD_LOG_NORMALIZATION,
      stdoutSha256: sha256(normalizeBuildLog(result.stdout)),
      stderrSha256: sha256(normalizeBuildLog(result.stderr)),
    },
    surface: await deriveCandidateSurface(binary, plan.sourceDirectory),
    executable: {
      name: "hakky_market.so",
      path: "hakky_market.so",
      byteLength: binary.byteLength,
      sha256: sha256(binary),
    },
    mainnetActionsAuthorized: false,
  };
  assertBuildRecord(record);
  await writeFile(
    path.join(plan.outputDirectory, "build-record.json"),
    serializeBuildRecord(record),
    { flag: "wx", mode: 0o600 },
  );
  return record;
}

export async function runSbfBuild({
  lane,
  outputRelativePath,
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  exec = execFileSync,
  spawn = spawnSync,
} = {}) {
  const plan = planSbfBuild({
    lane,
    repositoryRoot,
    outputRelativePath,
  });
  if (plan.requiresCleanTree) assertCleanTree(plan.repositoryRoot, exec);
  const vendorManifest = await assertVendorBundle(plan);
  if (plan.lane === "candidate-sbf") {
    return runCandidateSbfBuild({
      plan,
      exec,
      spawn,
      vendorManifest,
    });
  }
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

export function parseBuildOptions(argv) {
  if (Array.isArray(argv) && argv.length === 2 && argv[0] === "--lane") {
    if (argv[1] !== "test-sbf") {
      throw new Error(
        "Usage: node scripts/build-hakky-sbf.mjs --lane test-sbf OR --lane candidate-sbf --output artifacts/build/candidate/<build-id>",
      );
    }
    return { lane: "test-sbf", outputRelativePath: undefined };
  }
  return parseExactCliOptions(argv, {
    usage:
      "Usage: node scripts/build-hakky-sbf.mjs --lane candidate-sbf --output artifacts/build/candidate/<build-id>",
    definitions: [
      {
        flag: "--lane",
        key: "lane",
        validate(value) {
          if (value !== "candidate-sbf") {
            throw new Error("Build lane must be candidate-sbf");
          }
        },
      },
      {
        flag: "--output",
        key: "outputRelativePath",
        validate(value) {
          if (!CANDIDATE_OUTPUT_PATTERN.test(value)) {
            throw new Error(
              "Candidate output must be artifacts/build/candidate/<build-id>",
            );
          }
        },
      },
    ],
  });
}

export async function main({ argv = process.argv.slice(2), stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const receipt = await runSbfBuild(parseBuildOptions(argv));
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
