import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { planExactSbfRun } from "../scripts/test-hakky-test-sbf.mjs";

test("exact-SBF runtime lane has no native processor fallback", async () => {
  const source = await readFile(
    new URL("../programs/hakky-market/tests/sbf_runtime.rs", import.meta.url),
    "utf8",
  );
  assert.match(source, /ProgramTest::new\("hakky_market", EXPECTED_PROGRAM_ID, None\)/u);
  assert.match(source, /prefer_bpf\(true\)/u);
  assert.doesNotMatch(
    source,
    /ProgramTest::new\("hakky_market", EXPECTED_PROGRAM_ID, processor!\(/u,
  );
  assert.match(source, /assert_exact_sbf_curve_round_trip\(\)\.await/u);
  assert.match(source, /assert_exact_sbf_initialization\(&binary\)\.await/u);
  assert.match(source, /finalized_programdata_with_sbf\(&binary\)/u);
  assert.match(source, /owner: LOADER_PROGRAM,\s+executable: true/gu);

  const command = planExactSbfRun({
    repositoryRoot: path.resolve("C:/repo"),
    lane: "test-sbf",
  });
  assert.deepEqual(command.slice(0, 6), [
    "rtk",
    "docker",
    "run",
    "--rm",
    "--network",
    "none",
  ]);
  assert(command.includes("--offline"));
  assert(command.includes("RUSTUP_TOOLCHAIN=1.95.0"));
  assert(command.includes("CARGO_TARGET_DIR=/tmp/hakky-host-target"));
  assert(command.some((argument) => argument.endsWith(":/vendor:ro")));
  assert.deepEqual(
    command.slice(command.indexOf("--features"), command.indexOf("--features") + 2),
    ["--features", "test-release-config"],
  );
  assert(command.includes("exact_sbf_binary_executes_reviewed_decoder_and_curve_lifecycle"));

  const candidateCommand = planExactSbfRun({
    repositoryRoot: path.resolve("C:/repo"),
    lane: "candidate-sbf",
  });
  assert.equal(candidateCommand.includes("--features"), false);
  assert(
    candidateCommand.includes("exact_candidate_sbf_executes_reviewed_decoder_surface"),
  );
  assert(
    candidateCommand.includes(
      "HAKKY_SBF_PATH=/workspace/artifacts/build/candidate/local-a/hakky_market.so",
    ),
  );
});

test("package scripts keep native, test-SBF, and candidate-SBF lanes separate", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(packageJson.scripts.test, 'node --test "test/*.test.mjs"');
  assert.equal(packageJson.scripts["program:test-native"], "node scripts/test-hakky-native.mjs");
  assert.equal(packageJson.scripts["program:build-test-sbf"], "node scripts/build-hakky-test-sbf.mjs");
  assert.equal(packageJson.scripts["program:test-test-sbf"], "node scripts/test-hakky-test-sbf.mjs");
  assert.equal(
    packageJson.scripts["program:build-candidate"],
    "node scripts/build-hakky-sbf.mjs --lane candidate-sbf",
  );
  assert.equal(
    packageJson.scripts["program:test-candidate-sbf"],
    "node scripts/test-hakky-candidate-sbf.mjs",
  );
});
