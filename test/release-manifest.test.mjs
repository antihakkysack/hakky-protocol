import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

import {
  BUILD_IMAGE,
  BUILD_RECORD_SCHEMA_VERSION,
  LOCAL_BUILD_OPERATOR_BYTES,
  LOCAL_BUILD_OPERATOR_SHA256,
  MAX_CANDIDATE_BYTES,
  evaluateBuildRecord,
  evaluateReproduction,
} from "../src/release-manifest.mjs";

const EXECUTABLE = Buffer.from("hakky-sbf-candidate", "utf8");
const EXECUTABLE_SHA256 = createHash("sha256")
  .update(EXECUTABLE)
  .digest("hex");

export function validBuild(overrides = {}) {
  const record = {
    schemaVersion: BUILD_RECORD_SCHEMA_VERSION,
    lane: "candidate-sbf",
    buildDirectory: "artifacts/build/candidate/local-a",
    startedAt: "2026-07-27T01:00:00.000Z",
    completedAt: "2026-07-27T01:10:00.000Z",
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
      image: BUILD_IMAGE,
      network: "none",
    },
    toolchain: {
      rustc: "rustc 1.93.1 (01f6ddf75 2026-02-11)",
      cargo: "cargo 1.93.1 (083ac5135 2025-12-15)",
      solana: "solana-cli 4.0.0 (src:devbuild; feat:3604001754, client:Agave)",
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
  return structuredClone(Object.assign(record, overrides));
}

test("pins the exact verifiable image, local operator, and binary ceiling", () => {
  assert.equal(
    BUILD_IMAGE,
    "solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68",
  );
  assert.equal(MAX_CANDIDATE_BYTES, 120_000);
  assert.deepEqual(
    LOCAL_BUILD_OPERATOR_BYTES,
    Buffer.from(
      '{"schemaVersion":"hakky-local-build-operator-v1","organizationId":"hakky-local","operatorId":"local-controller"}\n',
      "utf8",
    ),
  );
  assert.equal(evaluateBuildRecord(validBuild()).ok, true);
  assert.equal(
    evaluateBuildRecord(
      validBuild({
        executable: {
          ...validBuild().executable,
          byteLength: 120_000,
        },
      }),
    ).ok,
    true,
  );
  assert.equal(
    evaluateBuildRecord(
      validBuild({
        executable: {
          ...validBuild().executable,
          byteLength: 120_001,
        },
      }),
    ).ok,
    false,
  );
});

test("build records fail closed on source, invocation, and surface drift", () => {
  const mutations = [
    (value) => {
      value.source.clean = false;
    },
    (value) => {
      value.container.image =
        "solanafoundation/solana-verifiable-build:4.0.0";
    },
    (value) => {
      value.container.network = "bridge";
    },
    (value) => {
      value.lane = "test-sbf";
    },
    (value) => {
      value.operator.operatorId = "other";
    },
    (value) => {
      value.operator.configSha256 = "0".repeat(64);
    },
    (value) => {
      value.invocation.command =
        value.invocation.command.filter((entry) => entry !== "--offline");
    },
    (value) => {
      value.invocation.command =
        value.invocation.command.filter((entry) => entry !== "--locked");
    },
    (value) => {
      value.invocation.environment.EXTRA = "not-allowed";
    },
    (value) => {
      value.logs.stdoutSha256 = "";
    },
    (value) => {
      value.startedAt = "2026-07-27";
    },
    (value) => {
      value.executable.name = "other.so";
    },
    (value) => {
      value.surface.method = "asserted-v1";
    },
    (value) => {
      value.surface.testProgramIdByteOccurrences = 1;
    },
    (value) => {
      value.surface.testProgramIdTextOccurrences = 1;
    },
    (value) => {
      value.surface.testArtifactPathOccurrences = 1;
    },
    (value) => {
      value.surface.testArtifactSha256Occurrences = 1;
    },
    (value) => {
      value.mainnetActionsAuthorized = true;
    },
    (value) => {
      value.wallet = "not-allowed";
    },
    (value) => {
      value.dependencies.unknown = "not-allowed";
    },
  ];
  for (const mutate of mutations) {
    const candidate = validBuild();
    mutate(candidate);
    assert.equal(
      evaluateBuildRecord(candidate).ok,
      false,
      JSON.stringify(candidate),
    );
  }
});

test("reproduction requires distinct clean directories and actual identical bytes", () => {
  const left = validBuild();
  const right = validBuild({
    buildDirectory: "artifacts/build/candidate/local-b",
    startedAt: "2026-07-27T01:20:00.000Z",
    completedAt: "2026-07-27T01:30:00.000Z",
  });
  assert.equal(
    evaluateReproduction(left, right, {
      leftExecutable: EXECUTABLE,
      rightExecutable: EXECUTABLE,
      comparedAt: "2026-07-27T02:00:00.000Z",
    }).ok,
    true,
  );

  assert.equal(
    evaluateReproduction(left, { ...right, buildDirectory: left.buildDirectory }, {
      leftExecutable: EXECUTABLE,
      rightExecutable: EXECUTABLE,
      comparedAt: "2026-07-27T02:00:00.000Z",
    }).ok,
    false,
  );
  assert.equal(
    evaluateReproduction(left, right, {
      leftExecutable: EXECUTABLE,
      rightExecutable: Buffer.from("different", "utf8"),
      comparedAt: "2026-07-27T02:00:00.000Z",
    }).ok,
    false,
  );
  const drifted = structuredClone(right);
  drifted.toolchain.cargo = "cargo drift";
  assert.equal(
    evaluateReproduction(left, drifted, {
      leftExecutable: EXECUTABLE,
      rightExecutable: EXECUTABLE,
      comparedAt: "2026-07-27T02:00:00.000Z",
    }).ok,
    false,
  );
});

test("build-record schema matches the runtime closed contract", async () => {
  const schema = JSON.parse(
    await readFile(
      new URL(
        "../schemas/release/build-record-v1.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
    schema,
  );
  assert.equal(validate(validBuild()), true, JSON.stringify(validate.errors));
  const candidate = validBuild();
  candidate.source.extra = true;
  assert.equal(validate(candidate), false);
});

test("tracked operator configuration is the exact canonical byte contract", async () => {
  const bytes = await readFile(
    new URL("../config/local-build-operator-v1.json", import.meta.url),
  );
  assert.deepEqual(bytes, LOCAL_BUILD_OPERATOR_BYTES);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    LOCAL_BUILD_OPERATOR_SHA256,
  );
});

test("Containerfile is only the exact digest-pinned build image and workdir", async () => {
  const contents = await readFile(
    new URL("../Containerfile.sbf", import.meta.url),
    "utf8",
  );
  assert.equal(
    contents,
    `FROM ${BUILD_IMAGE}\nWORKDIR /workspace\n`,
  );
});
