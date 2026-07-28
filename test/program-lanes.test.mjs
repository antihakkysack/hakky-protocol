import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUILD_IMAGE,
  LOCAL_BUILD_OPERATOR_SHA256,
  serializeBuildRecord,
} from "../src/release-manifest.mjs";
import * as candidateWrapper from "../scripts/test-hakky-candidate-sbf.mjs";
import * as exactSbfRunner from "../scripts/test-hakky-test-sbf.mjs";

const CANDIDATE = Buffer.from("exact-candidate-sbf", "utf8");
const COMMIT = "1".repeat(40);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function validCandidateBuildRecord(
  buildDirectory = "artifacts/build/candidate/final-a",
) {
  return {
    schemaVersion: "hakky-sbf-build-record-v1",
    lane: "candidate-sbf",
    buildDirectory,
    startedAt: "2026-07-27T01:00:00.000Z",
    completedAt: "2026-07-27T01:10:00.000Z",
    source: {
      commit: COMMIT,
      tree: "2".repeat(40),
      clean: true,
      sha256: "3".repeat(64),
    },
    operator: {
      schemaVersion: "hakky-local-build-operator-v1",
      organizationId: "hakky-local",
      operatorId: "local-controller",
      configPath: "config/local-build-operator-v1.json",
      configSha256: LOCAL_BUILD_OPERATOR_SHA256,
    },
    dependencies: {
      cargoLockSha256: "4".repeat(64),
      vendorManifestSha256: "5".repeat(64),
      vendorTreeSha256: "6".repeat(64),
      vendorSourceConfigSha256: "7".repeat(64),
    },
    release: {
      configSha256: "8".repeat(64),
      rustViewSha256: "9".repeat(64),
      javascriptViewSha256: "a".repeat(64),
    },
    container: {
      image: BUILD_IMAGE,
      network: "none",
    },
    toolchain: {
      rustc: "rustc 1.93.1 (01f6ddf75 2026-02-11)",
      cargo: "cargo 1.93.1 (083ac5135 2025-12-15)",
      solana:
        "solana-cli 4.0.0 (src:devbuild; feat:3604001754, client:Agave)",
      cargoBuildSbf: "solana-cargo-build-sbf 4.0.0",
    },
    invocation: {
      command: [
        "cargo-build-sbf",
        "--offline",
        "--skip-tools-install",
        "--tools-version",
        "v1.53",
        "--arch",
        "v0",
        "--",
        "--locked",
      ],
      environment: {
        CARGO_HOME: "/cargo-home",
        RUSTUP_TOOLCHAIN: "1.93.1",
      },
    },
    logs: {
      normalization: "ansi-stripped-elapsed-redacted-sorted-lines-v1",
      stdoutSha256: "b".repeat(64),
      stderrSha256: "c".repeat(64),
    },
    surface: {
      method: "raw-executable-byte-scan-v1",
      releaseProgramId:
        "Bp5ULfE8tLo7X24kHxWhUmRmWWzD9HdpNa7wxipngfxc",
      releaseProgramIdByteOccurrences: 1,
      testProgramId:
        "FAe4sisG95oZ42w7buUn5qEE4TAnfTTFPiguZUHmhiF",
      testProgramIdByteOccurrences: 0,
      testProgramIdTextOccurrences: 0,
      testArtifactPathOccurrences: 0,
      testArtifactSha256Occurrences: 0,
    },
    executable: {
      name: "hakky_market.so",
      path: "hakky_market.so",
      byteLength: CANDIDATE.byteLength,
      sha256: sha256(CANDIDATE),
    },
    mainnetActionsAuthorized: false,
  };
}

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

  const command = exactSbfRunner.planExactSbfRun({
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
});

test("candidate CLI requires one exact contained build directory", () => {
  assert.equal(typeof candidateWrapper.parseCandidateSbfArgs, "function");
  assert.deepEqual(
    candidateWrapper.parseCandidateSbfArgs([
      "--build",
      "artifacts/build/candidate/final-a",
    ]),
    { buildDirectory: "artifacts/build/candidate/final-a" },
  );
  assert.throws(
    () => candidateWrapper.parseCandidateSbfArgs([]),
    /--build artifacts\/build\/candidate\/<id>/u,
  );
  for (const rejected of [
    "artifacts/build/candidate",
    "artifacts/build/candidate/final-a/extra",
    "artifacts/build/candidate/../final-a",
    "C:/repo/artifacts/build/candidate/final-a",
  ]) {
    assert.throws(
      () => candidateWrapper.parseCandidateSbfArgs(["--build", rejected]),
      /artifacts\/build\/candidate\/<id>/u,
    );
  }
});

test("candidate receipt verification uses the selected build and rejects drift", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-candidate-runtime-"));
  const buildDirectory = "artifacts/build/candidate/final-a";
  const absoluteBuild = path.join(root, ...buildDirectory.split("/"));
  await mkdir(absoluteBuild, { recursive: true });
  await writeFile(path.join(absoluteBuild, "hakky_market.so"), CANDIDATE);
  await writeFile(
    path.join(absoluteBuild, "build-record.json"),
    serializeBuildRecord(validCandidateBuildRecord()),
  );

  try {
    const verified = await exactSbfRunner.verifySbfReceipt(
      root,
      "candidate-sbf",
      buildDirectory,
    );
    assert.equal(verified.directory, absoluteBuild);
    assert.equal(verified.receipt.buildDirectory, buildDirectory);
    assert.equal(verified.binarySha256, sha256(CANDIDATE));

    await writeFile(
      path.join(absoluteBuild, "build-record.json"),
      serializeBuildRecord(
        validCandidateBuildRecord("artifacts/build/candidate/other"),
      ),
    );
    await assert.rejects(
      exactSbfRunner.verifySbfReceipt(root, "candidate-sbf", buildDirectory),
      /wrong directory/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("candidate runtime plan has no host bind mounts and runs the selected binary offline", () => {
  assert.equal(typeof exactSbfRunner.planCandidateSbfRun, "function");
  const root = path.resolve("C:/repo");
  const buildDirectory = "artifacts/build/candidate/final-a";
  const plan = exactSbfRunner.planCandidateSbfRun({
    repositoryRoot: root,
    buildDirectory,
    sourceCommit: COMMIT,
    binarySha256: sha256(CANDIDATE),
    runId: "test-run",
  });

  for (const command of [
    plan.archive,
    plan.create,
    plan.start,
    plan.prepare,
    ...plan.copy,
    plan.extract,
    plan.test,
    plan.remove,
  ]) {
    assert.equal(command[0], "rtk");
  }
  assert.deepEqual(plan.create.slice(0, 6), [
    "rtk",
    "docker",
    "create",
    "--name",
    "hakky-candidate-234b132d27f0-test-run",
    "--network",
  ]);
  assert(plan.create.includes("none"));
  assert.equal(plan.create.includes("-v"), false);
  assert.equal(plan.create.includes("--volume"), false);
  assert.equal(plan.create.includes("--mount"), false);
  assert.equal(
    plan.create.some((argument) => argument.includes(`${root}:/workspace`)),
    false,
  );
  assert(plan.create.includes("HAKKY_SBF_PATH=/candidate/hakky_market.so"));
  assert(plan.archive.includes(COMMIT));
  assert(plan.archive.includes("programs/hakky-market"));
  assert(
    plan.copy.some((command) =>
      command.some((argument) =>
        argument.endsWith(
          `${buildDirectory.replaceAll("/", path.sep)}${path.sep}hakky_market.so`,
        ),
      ),
    ),
  );
  assert(plan.test.includes("--offline"));
  assert(plan.test.includes("--locked"));
  assert(plan.test.includes("exact_candidate_sbf_executes_reviewed_decoder_surface"));
  assert.deepEqual(plan.remove.slice(0, 4), [
    "rtk",
    "docker",
    "rm",
    "--force",
  ]);
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
