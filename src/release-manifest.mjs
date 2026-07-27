import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export const BUILD_RECORD_SCHEMA_VERSION = "hakky-sbf-build-record-v1";
export const REPRODUCTION_SCHEMA_VERSION = "hakky-sbf-reproduction-v1";
export const BUILD_IMAGE =
  "solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68";
export const MAX_CANDIDATE_BYTES = 120_000;
export const RELEASE_PROGRAM_ID =
  "Bp5ULfE8tLo7X24kHxWhUmRmWWzD9HdpNa7wxipngfxc";
export const TEST_PROGRAM_ID =
  "FAe4sisG95oZ42w7buUn5qEE4TAnfTTFPiguZUHmhiF";
export const LOCAL_BUILD_OPERATOR_PATH =
  "config/local-build-operator-v1.json";
export const LOCAL_BUILD_OPERATOR_BYTES = Buffer.from(
  '{"schemaVersion":"hakky-local-build-operator-v1","organizationId":"hakky-local","operatorId":"local-controller"}\n',
  "utf8",
);
export const LOCAL_BUILD_OPERATOR_SHA256 = sha256Hex(
  LOCAL_BUILD_OPERATOR_BYTES,
);
export const CANDIDATE_COMMAND = Object.freeze([
  "cargo-build-sbf",
  "--offline",
  "--skip-tools-install",
  "--tools-version",
  "v1.53",
  "--arch",
  "v0",
  "--",
  "--locked",
]);
export const CANDIDATE_ENVIRONMENT = Object.freeze({
  CARGO_HOME: "/cargo-home",
  RUSTUP_TOOLCHAIN: "1.93.1",
});

const UTC_MILLISECOND_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const GIT_OBJECT_PATTERN = /^[0-9a-f]{40}$/u;
const BUILD_DIRECTORY_PATTERN =
  /^artifacts\/build\/candidate\/[a-z0-9][a-z0-9-]*$/u;

const TOP_LEVEL_KEYS = Object.freeze([
  "schemaVersion",
  "lane",
  "buildDirectory",
  "startedAt",
  "completedAt",
  "source",
  "operator",
  "dependencies",
  "release",
  "container",
  "toolchain",
  "invocation",
  "logs",
  "surface",
  "executable",
  "mainnetActionsAuthorized",
]);

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function canonicalTimestamp(value) {
  if (typeof value !== "string" || !UTC_MILLISECOND_PATTERN.test(value)) {
    return false;
  }
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function shortText(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    !/[\r\n\0]/u.test(value)
  );
}

function addFailure(failures, condition, name) {
  if (!condition) failures.push(name);
}

export function evaluateBuildRecord(value) {
  const failures = [];
  if (!exactKeys(value, TOP_LEVEL_KEYS)) {
    return { ok: false, failures: ["record-shape"] };
  }
  addFailure(
    failures,
    value.schemaVersion === BUILD_RECORD_SCHEMA_VERSION,
    "schema-version",
  );
  addFailure(failures, value.lane === "candidate-sbf", "lane");
  addFailure(
    failures,
    BUILD_DIRECTORY_PATTERN.test(value.buildDirectory),
    "build-directory",
  );
  addFailure(failures, canonicalTimestamp(value.startedAt), "started-at");
  addFailure(failures, canonicalTimestamp(value.completedAt), "completed-at");
  if (
    canonicalTimestamp(value.startedAt) &&
    canonicalTimestamp(value.completedAt)
  ) {
    addFailure(
      failures,
      Date.parse(value.completedAt) >= Date.parse(value.startedAt),
      "time-order",
    );
  }

  addFailure(
    failures,
    exactKeys(value.source, ["commit", "tree", "clean", "sha256"]),
    "source-shape",
  );
  if (isPlainObject(value.source)) {
    addFailure(
      failures,
      GIT_OBJECT_PATTERN.test(value.source.commit),
      "source-commit",
    );
    addFailure(
      failures,
      GIT_OBJECT_PATTERN.test(value.source.tree),
      "source-tree",
    );
    addFailure(failures, value.source.clean === true, "source-clean");
    addFailure(
      failures,
      SHA256_PATTERN.test(value.source.sha256),
      "source-sha256",
    );
  }

  addFailure(
    failures,
    exactKeys(value.operator, [
      "schemaVersion",
      "organizationId",
      "operatorId",
      "configPath",
      "configSha256",
    ]),
    "operator-shape",
  );
  if (isPlainObject(value.operator)) {
    addFailure(
      failures,
      value.operator.schemaVersion === "hakky-local-build-operator-v1",
      "operator-schema",
    );
    addFailure(
      failures,
      value.operator.organizationId === "hakky-local",
      "operator-organization",
    );
    addFailure(
      failures,
      value.operator.operatorId === "local-controller",
      "operator-id",
    );
    addFailure(
      failures,
      value.operator.configPath === LOCAL_BUILD_OPERATOR_PATH,
      "operator-config-path",
    );
    addFailure(
      failures,
      value.operator.configSha256 === LOCAL_BUILD_OPERATOR_SHA256,
      "operator-config-hash",
    );
  }

  addFailure(
    failures,
    exactKeys(value.dependencies, [
      "cargoLockSha256",
      "vendorManifestSha256",
      "vendorTreeSha256",
      "vendorSourceConfigSha256",
    ]),
    "dependencies-shape",
  );
  if (isPlainObject(value.dependencies)) {
    for (const field of [
      "cargoLockSha256",
      "vendorManifestSha256",
      "vendorTreeSha256",
      "vendorSourceConfigSha256",
    ]) {
      addFailure(
        failures,
        SHA256_PATTERN.test(value.dependencies[field]),
        `dependencies-${field}`,
      );
    }
  }

  addFailure(
    failures,
    exactKeys(value.release, [
      "configSha256",
      "rustViewSha256",
      "javascriptViewSha256",
    ]),
    "release-shape",
  );
  if (isPlainObject(value.release)) {
    for (const field of [
      "configSha256",
      "rustViewSha256",
      "javascriptViewSha256",
    ]) {
      addFailure(
        failures,
        SHA256_PATTERN.test(value.release[field]),
        `release-${field}`,
      );
    }
  }

  addFailure(
    failures,
    exactKeys(value.container, ["image", "network"]),
    "container-shape",
  );
  if (isPlainObject(value.container)) {
    addFailure(
      failures,
      value.container.image === BUILD_IMAGE,
      "container-image",
    );
    addFailure(
      failures,
      value.container.network === "none",
      "container-network",
    );
  }

  addFailure(
    failures,
    exactKeys(value.toolchain, [
      "rustc",
      "cargo",
      "solana",
      "cargoBuildSbf",
    ]),
    "toolchain-shape",
  );
  if (isPlainObject(value.toolchain)) {
    for (const field of ["rustc", "cargo", "solana", "cargoBuildSbf"]) {
      addFailure(
        failures,
        shortText(value.toolchain[field]),
        `toolchain-${field}`,
      );
    }
  }

  addFailure(
    failures,
    exactKeys(value.invocation, ["command", "environment"]),
    "invocation-shape",
  );
  if (isPlainObject(value.invocation)) {
    addFailure(
      failures,
      isDeepStrictEqual(value.invocation.command, CANDIDATE_COMMAND),
      "invocation-command",
    );
    addFailure(
      failures,
      exactKeys(value.invocation.environment, [
        "CARGO_HOME",
        "RUSTUP_TOOLCHAIN",
      ]) &&
        isDeepStrictEqual(value.invocation.environment, CANDIDATE_ENVIRONMENT),
      "invocation-environment",
    );
  }

  addFailure(
    failures,
    exactKeys(value.logs, ["stdoutSha256", "stderrSha256"]),
    "logs-shape",
  );
  if (isPlainObject(value.logs)) {
    addFailure(
      failures,
      SHA256_PATTERN.test(value.logs.stdoutSha256),
      "stdout-sha256",
    );
    addFailure(
      failures,
      SHA256_PATTERN.test(value.logs.stderrSha256),
      "stderr-sha256",
    );
  }

  addFailure(
    failures,
    exactKeys(value.surface, [
      "method",
      "releaseProgramId",
      "releaseProgramIdByteOccurrences",
      "testProgramId",
      "testProgramIdByteOccurrences",
      "testProgramIdTextOccurrences",
      "testArtifactPathOccurrences",
      "testArtifactSha256Occurrences",
    ]),
    "surface-shape",
  );
  if (isPlainObject(value.surface)) {
    addFailure(
      failures,
      value.surface.method === "raw-executable-byte-scan-v1",
      "surface-method",
    );
    addFailure(
      failures,
      value.surface.releaseProgramId === RELEASE_PROGRAM_ID,
      "surface-release-program-id",
    );
    addFailure(
      failures,
      Number.isSafeInteger(value.surface.releaseProgramIdByteOccurrences) &&
        value.surface.releaseProgramIdByteOccurrences > 0,
      "surface-release-program-occurrences",
    );
    addFailure(
      failures,
      value.surface.testProgramId === TEST_PROGRAM_ID,
      "surface-test-program-id",
    );
    for (const field of [
      "testProgramIdByteOccurrences",
      "testProgramIdTextOccurrences",
      "testArtifactPathOccurrences",
      "testArtifactSha256Occurrences",
    ]) {
      addFailure(
        failures,
        value.surface[field] === 0,
        `surface-${field}`,
      );
    }
  }

  addFailure(
    failures,
    exactKeys(value.executable, [
      "name",
      "path",
      "byteLength",
      "sha256",
    ]),
    "executable-shape",
  );
  if (isPlainObject(value.executable)) {
    addFailure(
      failures,
      value.executable.name === "hakky_market.so",
      "executable-name",
    );
    addFailure(
      failures,
      value.executable.path === "hakky_market.so",
      "executable-path",
    );
    addFailure(
      failures,
      Number.isSafeInteger(value.executable.byteLength) &&
        value.executable.byteLength > 0 &&
        value.executable.byteLength <= MAX_CANDIDATE_BYTES,
      "executable-byte-length",
    );
    addFailure(
      failures,
      SHA256_PATTERN.test(value.executable.sha256),
      "executable-sha256",
    );
  }
  addFailure(
    failures,
    value.mainnetActionsAuthorized === false,
    "mainnet-actions-authorized",
  );
  return { ok: failures.length === 0, failures };
}

export function assertBuildRecord(value) {
  const evaluation = evaluateBuildRecord(value);
  if (!evaluation.ok) {
    throw new Error(
      `sbf-build-record-invalid:${evaluation.failures.join(",")}`,
    );
  }
  return value;
}

export function serializeBuildRecord(value) {
  assertBuildRecord(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function comparableRecord(value) {
  const copy = structuredClone(value);
  delete copy.buildDirectory;
  delete copy.startedAt;
  delete copy.completedAt;
  return copy;
}

export function evaluateReproduction(
  left,
  right,
  {
    leftExecutable,
    rightExecutable,
    comparedAt = new Date().toISOString(),
  } = {},
) {
  const failures = [];
  const leftEvaluation = evaluateBuildRecord(left);
  const rightEvaluation = evaluateBuildRecord(right);
  if (!leftEvaluation.ok) failures.push("left-build-record");
  if (!rightEvaluation.ok) failures.push("right-build-record");
  if (
    leftEvaluation.ok &&
    rightEvaluation.ok &&
    left.buildDirectory === right.buildDirectory
  ) {
    failures.push("reused-build-directory");
  }
  if (
    leftEvaluation.ok &&
    rightEvaluation.ok &&
    !isDeepStrictEqual(comparableRecord(left), comparableRecord(right))
  ) {
    failures.push("build-record-drift");
  }
  const leftBytes = Buffer.isBuffer(leftExecutable)
    ? leftExecutable
    : leftExecutable instanceof Uint8Array
      ? Buffer.from(leftExecutable)
      : null;
  const rightBytes = Buffer.isBuffer(rightExecutable)
    ? rightExecutable
    : rightExecutable instanceof Uint8Array
      ? Buffer.from(rightExecutable)
      : null;
  if (!leftBytes || !rightBytes) {
    failures.push("executable-bytes-missing");
  } else {
    if (
      leftEvaluation.ok &&
      (leftBytes.byteLength !== left.executable.byteLength ||
        sha256Hex(leftBytes) !== left.executable.sha256)
    ) {
      failures.push("left-executable-binding");
    }
    if (
      rightEvaluation.ok &&
      (rightBytes.byteLength !== right.executable.byteLength ||
        sha256Hex(rightBytes) !== right.executable.sha256)
    ) {
      failures.push("right-executable-binding");
    }
    if (!leftBytes.equals(rightBytes)) failures.push("executable-byte-drift");
  }
  if (!canonicalTimestamp(comparedAt)) failures.push("compared-at");
  const ok = failures.length === 0;
  if (!ok) return { ok, failures };
  return {
    schemaVersion: REPRODUCTION_SCHEMA_VERSION,
    lane: "candidate-sbf",
    left: {
      buildDirectory: left.buildDirectory,
      buildRecordSha256: sha256Hex(serializeBuildRecord(left)),
    },
    right: {
      buildDirectory: right.buildDirectory,
      buildRecordSha256: sha256Hex(serializeBuildRecord(right)),
    },
    comparedAt,
    executableByteLength: leftBytes.byteLength,
    executableSha256: sha256Hex(leftBytes),
    byteIdentical: true,
    ok: true,
    mainnetActionsAuthorized: false,
  };
}

export function serializeReproductionReceipt(value) {
  if (
    !exactKeys(value, [
      "schemaVersion",
      "lane",
      "left",
      "right",
      "comparedAt",
      "executableByteLength",
      "executableSha256",
      "byteIdentical",
      "ok",
      "mainnetActionsAuthorized",
    ]) ||
    value.schemaVersion !== REPRODUCTION_SCHEMA_VERSION ||
    value.lane !== "candidate-sbf" ||
    !exactKeys(value.left, ["buildDirectory", "buildRecordSha256"]) ||
    !exactKeys(value.right, ["buildDirectory", "buildRecordSha256"]) ||
    value.left.buildDirectory === value.right.buildDirectory ||
    !BUILD_DIRECTORY_PATTERN.test(value.left.buildDirectory) ||
    !BUILD_DIRECTORY_PATTERN.test(value.right.buildDirectory) ||
    !SHA256_PATTERN.test(value.left.buildRecordSha256) ||
    !SHA256_PATTERN.test(value.right.buildRecordSha256) ||
    !canonicalTimestamp(value.comparedAt) ||
    !Number.isSafeInteger(value.executableByteLength) ||
    value.executableByteLength < 1 ||
    value.executableByteLength > MAX_CANDIDATE_BYTES ||
    !SHA256_PATTERN.test(value.executableSha256) ||
    value.byteIdentical !== true ||
    value.ok !== true ||
    value.mainnetActionsAuthorized !== false
  ) {
    throw new Error("sbf-reproduction-invalid");
  }
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}
