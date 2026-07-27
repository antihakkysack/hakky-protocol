import assert from "node:assert/strict";
import test from "node:test";

const SOURCE_COMMIT = "1".repeat(40);
const STARTED_AT = "2026-07-27T15:00:00.000Z";
const COMPLETED_AT = "2026-07-27T15:30:00.000Z";
const SHA256 = "a".repeat(64);
const EXPECTED_COMMANDS = [
  {
    id: "node-repository-site",
    argv: ["rtk", "npm", "run", "check"],
  },
  {
    id: "generated-schema-drift",
    argv: ["rtk", "npm", "run", "schemas", "--", "--check"],
  },
  {
    id: "native-rust",
    argv: ["rtk", "npm", "run", "program:test-native"],
  },
  {
    id: "test-sbf-build",
    argv: ["rtk", "npm", "run", "program:build-test-sbf"],
  },
  {
    id: "test-sbf-runtime",
    argv: ["rtk", "npm", "run", "program:test-test-sbf"],
  },
  {
    id: "bounded-fuzz",
    argv: ["rtk", "npm", "run", "program:fuzz"],
  },
];

function validResults() {
  return EXPECTED_COMMANDS.map(({ id, argv }, index) => ({
    id,
    argv,
    startedAt: `2026-07-27T15:0${index}:00.000Z`,
    completedAt: `2026-07-27T15:0${index}:30.000Z`,
    exitCode: 0,
    stdoutSha256: SHA256,
    stderrSha256: SHA256,
  }));
}

test("builds one closed non-authorizing final-suite receipt", async () => {
  const suite = await import("../src/final-suite-receipt.mjs").catch(
    () => ({}),
  );
  assert.equal(typeof suite.buildFinalSuiteReceiptV1, "function");
  const receipt = suite.buildFinalSuiteReceiptV1({
    sourceCommit: SOURCE_COMMIT,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT,
    results: validResults(),
  });
  assert.deepEqual(receipt, {
    schemaVersion: "hakky-final-suite-v1",
    sourceCommit: SOURCE_COMMIT,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT,
    commands: validResults(),
    mainnetActionsAuthorized: false,
  });
  assert.equal(suite.assertFinalSuiteReceiptV1(receipt), receipt);
  assert.deepEqual(
    suite.serializeFinalSuiteReceiptV1(receipt),
    Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
  );
});

test("rejects omitted commands, failures, drift, and authorization", async () => {
  const suite = await import("../src/final-suite-receipt.mjs").catch(
    () => ({}),
  );
  assert.equal(typeof suite.buildFinalSuiteReceiptV1, "function");
  for (const mutate of [
    (results) => results.pop(),
    (results) => { results[0].argv = ["rtk", "npm", "test"]; },
    (results) => { results[0].exitCode = 1; },
    (results) => { results[0].stdoutSha256 = "not-a-hash"; },
    (results) => { results.reverse(); },
  ]) {
    const results = validResults();
    mutate(results);
    assert.throws(
      () => suite.buildFinalSuiteReceiptV1({
        sourceCommit: SOURCE_COMMIT,
        startedAt: STARTED_AT,
        completedAt: COMPLETED_AT,
        results,
      }),
      /final-suite-receipt-invalid/u,
    );
  }

  const receipt = suite.buildFinalSuiteReceiptV1({
    sourceCommit: SOURCE_COMMIT,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT,
    results: validResults(),
  });
  receipt.mainnetActionsAuthorized = true;
  assert.throws(
    () => suite.assertFinalSuiteReceiptV1(receipt),
    /final-suite-receipt-invalid/u,
  );
});

test("runner plan executes the exact commands and accepts no options", async () => {
  const runner = await import("../scripts/run-final-suite.mjs").catch(
    () => ({}),
  );
  assert.equal(typeof runner.planFinalSuiteRun, "function");
  assert.deepEqual(
    runner.planFinalSuiteRun().map(({ id, argv }) => ({ id, argv })),
    EXPECTED_COMMANDS,
  );
  assert.deepEqual(runner.parseFinalSuiteOptions([]), {});
  for (const argv of [
    ["--approved"],
    ["--skip", "fuzz"],
    ["--authorize", "mainnet"],
  ]) {
    assert.throws(
      () => runner.parseFinalSuiteOptions(argv),
      /Usage: npm run verify:final-suite/u,
    );
  }
});
