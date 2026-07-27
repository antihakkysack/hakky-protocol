import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUILD_RECORD_SCHEMA_VERSION,
  LOCAL_BUILD_OPERATOR_SHA256,
  serializeBuildRecord,
} from "../src/release-manifest.mjs";
import {
  parseReproductionOptions,
  runSbfReproductionVerification,
} from "../scripts/verify-sbf-reproduction.mjs";

const EXECUTABLE = Buffer.from("hakky-sbf-candidate", "utf8");
const EXECUTABLE_SHA256 = createHash("sha256")
  .update(EXECUTABLE)
  .digest("hex");
const LEFT = "artifacts/build/candidate/local-a";
const RIGHT = "artifacts/build/candidate/local-b";

function record(buildDirectory, startedAt, completedAt) {
  return {
    schemaVersion: BUILD_RECORD_SCHEMA_VERSION,
    lane: "candidate-sbf",
    buildDirectory,
    startedAt,
    completedAt,
    source: {
      commit: "1".repeat(40),
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
      image:
        "solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68",
      network: "none",
    },
    toolchain: {
      rustc: "rustc 1.93.1",
      cargo: "cargo 1.93.1",
      solana: "solana-cli 4.0.0",
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
      byteLength: EXECUTABLE.byteLength,
      sha256: EXECUTABLE_SHA256,
    },
    mainnetActionsAuthorized: false,
  };
}

test("reproduction CLI accepts only two fixed candidate build directories", () => {
  assert.deepEqual(
    parseReproductionOptions([
      "--lane",
      "candidate-sbf",
      "--left",
      LEFT,
      "--right",
      RIGHT,
    ]),
    {
      lane: "candidate-sbf",
      left: LEFT,
      right: RIGHT,
    },
  );
  for (const argv of [
    [],
    ["--lane", "test-sbf", "--left", LEFT, "--right", RIGHT],
    ["--lane", "candidate-sbf", "--left", LEFT, "--right", LEFT],
    [
      "--lane",
      "candidate-sbf",
      "--left",
      "../../outside",
      "--right",
      RIGHT,
    ],
    [
      "--lane",
      "candidate-sbf",
      "--left",
      LEFT,
      "--right",
      RIGHT,
      "--wallet",
      "x",
    ],
  ]) {
    assert.throws(() => parseReproductionOptions(argv), /Usage|candidate|distinct|path|Unknown/u);
  }
});

test("reproduction CLI compares exact bytes and writes one non-authorizing receipt", async (t) => {
  const repositoryRoot = await mkdtemp(
    path.join(tmpdir(), "hakky-reproduction-"),
  );
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  for (const [directory, build] of [
    [LEFT, record(LEFT, "2026-07-27T01:00:00.000Z", "2026-07-27T01:10:00.000Z")],
    [RIGHT, record(RIGHT, "2026-07-27T01:20:00.000Z", "2026-07-27T01:30:00.000Z")],
  ]) {
    const absolute = path.join(repositoryRoot, ...directory.split("/"));
    await mkdir(absolute, { recursive: true });
    await writeFile(
      path.join(absolute, "build-record.json"),
      serializeBuildRecord(build),
    );
    await writeFile(path.join(absolute, "hakky_market.so"), EXECUTABLE);
  }

  const receipt = await runSbfReproductionVerification({
    argv: [
      "--lane",
      "candidate-sbf",
      "--left",
      LEFT,
      "--right",
      RIGHT,
    ],
    repositoryRoot,
    now: () => new Date("2026-07-27T02:00:00.000Z"),
  });
  assert.equal(receipt.ok, true);
  assert.equal(receipt.mainnetActionsAuthorized, false);
  assert.equal(receipt.executableSha256, EXECUTABLE_SHA256);
  const persisted = JSON.parse(
    await readFile(
      path.join(
        repositoryRoot,
        "artifacts",
        "build",
        "candidate",
        "reproduction-v1.json",
      ),
      "utf8",
    ),
  );
  assert.deepEqual(persisted, receipt);
});

test("reproduction CLI never trusts matching reported hashes over different bytes", async (t) => {
  const repositoryRoot = await mkdtemp(
    path.join(tmpdir(), "hakky-reproduction-drift-"),
  );
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  for (const [directory, build, bytes] of [
    [
      LEFT,
      record(LEFT, "2026-07-27T01:00:00.000Z", "2026-07-27T01:10:00.000Z"),
      EXECUTABLE,
    ],
    [
      RIGHT,
      record(RIGHT, "2026-07-27T01:20:00.000Z", "2026-07-27T01:30:00.000Z"),
      Buffer.from("mutated-binary", "utf8"),
    ],
  ]) {
    const absolute = path.join(repositoryRoot, ...directory.split("/"));
    await mkdir(absolute, { recursive: true });
    await writeFile(
      path.join(absolute, "build-record.json"),
      serializeBuildRecord(build),
    );
    await writeFile(path.join(absolute, "hakky_market.so"), bytes);
  }

  await assert.rejects(
    runSbfReproductionVerification({
      argv: [
        "--lane",
        "candidate-sbf",
        "--left",
        LEFT,
        "--right",
        RIGHT,
      ],
      repositoryRoot,
      now: () => new Date("2026-07-27T02:00:00.000Z"),
    }),
    /sbf-reproduction-invalid/u,
  );
});
