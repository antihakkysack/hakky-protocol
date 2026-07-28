export const FINAL_SUITE_SCHEMA_VERSION = "hakky-final-suite-v1";

export const FINAL_SUITE_COMMANDS = Object.freeze([
  Object.freeze({
    id: "node-repository-site",
    argv: Object.freeze(["rtk", "npm", "run", "check"]),
  }),
  Object.freeze({
    id: "generated-schema-drift",
    argv: Object.freeze([
      "rtk",
      "npm",
      "run",
      "schemas",
      "--",
      "--check",
    ]),
  }),
  Object.freeze({
    id: "native-rust",
    argv: Object.freeze(["rtk", "npm", "run", "program:test-native"]),
  }),
  Object.freeze({
    id: "test-sbf-build",
    argv: Object.freeze(["rtk", "npm", "run", "program:build-test-sbf"]),
  }),
  Object.freeze({
    id: "test-sbf-runtime",
    argv: Object.freeze(["rtk", "npm", "run", "program:test-test-sbf"]),
  }),
  Object.freeze({
    id: "bounded-fuzz",
    argv: Object.freeze(["rtk", "npm", "run", "program:fuzz"]),
  }),
]);

const RECEIPT_KEYS = Object.freeze([
  "schemaVersion",
  "sourceCommit",
  "startedAt",
  "completedAt",
  "commands",
  "mainnetActionsAuthorized",
]);
const COMMAND_KEYS = Object.freeze([
  "id",
  "argv",
  "startedAt",
  "completedAt",
  "exitCode",
  "stdoutSha256",
  "stderrSha256",
]);
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const UTC_MILLISECOND_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function invalid() {
  return new Error("final-suite-receipt-invalid");
}

function hasExactKeys(value, expected) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function isCanonicalTimestamp(value) {
  if (
    typeof value !== "string" ||
    !UTC_MILLISECOND_PATTERN.test(value)
  ) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function assertTimestampOrder(startedAt, completedAt) {
  if (
    !isCanonicalTimestamp(startedAt) ||
    !isCanonicalTimestamp(completedAt) ||
    Date.parse(completedAt) < Date.parse(startedAt)
  ) {
    throw invalid();
  }
}

function assertExactCommand(command, expected) {
  if (
    !hasExactKeys(command, COMMAND_KEYS) ||
    command.id !== expected.id ||
    !Array.isArray(command.argv) ||
    command.argv.length !== expected.argv.length ||
    !command.argv.every((value, index) => value === expected.argv[index]) ||
    command.exitCode !== 0 ||
    !SHA256_PATTERN.test(command.stdoutSha256) ||
    !SHA256_PATTERN.test(command.stderrSha256)
  ) {
    throw invalid();
  }
  assertTimestampOrder(command.startedAt, command.completedAt);
}

export function assertFinalSuiteReceiptV1(receipt) {
  if (
    !hasExactKeys(receipt, RECEIPT_KEYS) ||
    receipt.schemaVersion !== FINAL_SUITE_SCHEMA_VERSION ||
    !GIT_COMMIT_PATTERN.test(receipt.sourceCommit) ||
    receipt.mainnetActionsAuthorized !== false ||
    !Array.isArray(receipt.commands) ||
    receipt.commands.length !== FINAL_SUITE_COMMANDS.length
  ) {
    throw invalid();
  }
  assertTimestampOrder(receipt.startedAt, receipt.completedAt);
  receipt.commands.forEach((command, index) => {
    assertExactCommand(command, FINAL_SUITE_COMMANDS[index]);
    if (
      Date.parse(command.startedAt) < Date.parse(receipt.startedAt) ||
      Date.parse(command.completedAt) > Date.parse(receipt.completedAt)
    ) {
      throw invalid();
    }
  });
  return receipt;
}

export function buildFinalSuiteReceiptV1({
  sourceCommit,
  startedAt,
  completedAt,
  results,
} = {}) {
  const receipt = {
    schemaVersion: FINAL_SUITE_SCHEMA_VERSION,
    sourceCommit,
    startedAt,
    completedAt,
    commands: Array.isArray(results)
      ? results.map((result) => ({
          id: result?.id,
          argv: Array.isArray(result?.argv) ? [...result.argv] : result?.argv,
          startedAt: result?.startedAt,
          completedAt: result?.completedAt,
          exitCode: result?.exitCode,
          stdoutSha256: result?.stdoutSha256,
          stderrSha256: result?.stderrSha256,
        }))
      : results,
    mainnetActionsAuthorized: false,
  };
  return assertFinalSuiteReceiptV1(receipt);
}

export function serializeFinalSuiteReceiptV1(receipt) {
  assertFinalSuiteReceiptV1(receipt);
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}
