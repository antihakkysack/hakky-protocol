import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

import {
  BUILD_IMAGE,
  LOCAL_BUILD_OPERATOR_SHA256,
  serializeBuildRecord,
} from "../src/release-manifest.mjs";
import {
  INDEPENDENT_AUTHORITIES_PATH,
  buildIndependentScopeV1,
  parseIndependentScopeOptions,
  serializeIndependentScopeV1,
} from "../src/independent-scope.mjs";
import { runIndependentScopeBuild } from "../scripts/build-independent-scope.mjs";

const COMMIT = "1".repeat(40);
const CANDIDATE = Buffer.from("hakky-sbf-candidate", "utf8");
const CARGO_LOCK = Buffer.from("cargo-lock\n", "utf8");
const RELEASE_CONFIG = Buffer.from('{"release":"fixed"}\n', "utf8");
const DESIGN_SPEC = Buffer.from("# immutable design\n", "utf8");
const CURVE_VECTOR = Buffer.from('{"vectors":[]}\n', "utf8");
const SOURCE_ARCHIVE = Buffer.from("canonical-tar", "utf8");
const REGISTRY = Buffer.from(
  '{"schemaVersion":"hakky-independent-authorities-v1","authorities":[]}\n',
  "utf8",
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function validBuildRecord() {
  return {
    schemaVersion: "hakky-sbf-build-record-v1",
    lane: "candidate-sbf",
    buildDirectory: "artifacts/build/candidate/final-a",
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
      cargoLockSha256: sha256(CARGO_LOCK),
      vendorManifestSha256: "5".repeat(64),
      vendorTreeSha256: "6".repeat(64),
      vendorSourceConfigSha256: "7".repeat(64),
    },
    release: {
      configSha256: sha256(RELEASE_CONFIG),
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

function validInput(overrides = {}) {
  return {
    evidenceClass: "security-audit",
    authorityRegistryBytes: REGISTRY,
    candidateBytes: CANDIDATE,
    sourceArchiveBytes: SOURCE_ARCHIVE,
    cargoLockBytes: CARGO_LOCK,
    releaseConfigBytes: RELEASE_CONFIG,
    designSpecBytes: DESIGN_SPEC,
    curveVectorBytes: CURVE_VECTOR,
    curveVectorSidecarBytes: Buffer.from(`${sha256(CURVE_VECTOR)}\n`, "utf8"),
    buildRecordBytes: serializeBuildRecord(validBuildRecord()),
    sourceCommit: COMMIT,
    gitStatus: "",
    ...overrides,
  };
}

test("builds the exact canonical scope without accepting caller hashes", () => {
  const result = buildIndependentScopeV1(validInput());
  assert.deepEqual(result.scope, {
    schemaVersion: "hakky-independent-scope-v1",
    evidenceClass: "security-audit",
    authorityRegistrySha256: sha256(REGISTRY),
    candidateSha256: sha256(CANDIDATE),
    sourceCommit: COMMIT,
    sourceArchiveSha256: sha256(SOURCE_ARCHIVE),
    cargoLockSha256: sha256(CARGO_LOCK),
    releaseConfigSha256: sha256(RELEASE_CONFIG),
    designSpecSha256: sha256(DESIGN_SPEC),
    curveVectorSha256: sha256(CURVE_VECTOR),
    buildRecordSha256: sha256(serializeBuildRecord(validBuildRecord())),
    executableSha256: sha256(CANDIDATE),
    executableLength: String(CANDIDATE.byteLength),
  });
  assert.deepEqual(result.scopeBytes, serializeIndependentScopeV1(result.scope));
  assert.equal(result.scopeSha256, sha256(result.scopeBytes));
  assert.equal(Object.isFrozen(result.scope), true);
  assert.equal(INDEPENDENT_AUTHORITIES_PATH, "config/independent-evidence-authorities-v1.json");
});

test("rejects dirty trees and every decisive cross-file mismatch", () => {
  const mutations = [
    input => { input.gitStatus = " M src/lib.rs"; },
    input => { input.sourceCommit = "f".repeat(40); },
    input => { input.candidateBytes = Buffer.from("different"); },
    input => { input.cargoLockBytes = Buffer.from("different"); },
    input => { input.releaseConfigBytes = Buffer.from("different"); },
    input => { input.curveVectorSidecarBytes = Buffer.from(`${"0".repeat(64)}\n`); },
    input => { input.authorityRegistryBytes = Buffer.from('{"schemaVersion":"hakky-independent-authorities-v1","authorities":[]}', "utf8"); },
    input => { input.authorityRegistryBytes = Buffer.from('{"authorities":[],"schemaVersion":"hakky-independent-authorities-v1"}\n', "utf8"); },
  ];
  for (const mutate of mutations) {
    const input = validInput();
    mutate(input);
    assert.throws(
      () => buildIndependentScopeV1(input),
      /independent-scope-invalid/u,
    );
  }
  assert.throws(
    () => buildIndependentScopeV1({ ...validInput(), candidateSha256: sha256(CANDIDATE) }),
    /independent-scope-invalid/u,
  );
});

test("scope CLI accepts only one candidate directory and exact class output", () => {
  assert.deepEqual(
    parseIndependentScopeOptions([
      "--class",
      "economic-review",
      "--candidate",
      "artifacts/build/candidate/final-a/hakky_market.so",
      "--build-record",
      "artifacts/build/candidate/final-a/build-record.json",
      "--output-root",
      "artifacts/independent-evidence/scopes/economic-review",
    ]),
    {
      evidenceClass: "economic-review",
      candidatePath:
        "artifacts/build/candidate/final-a/hakky_market.so",
      buildRecordPath:
        "artifacts/build/candidate/final-a/build-record.json",
      outputRoot:
        "artifacts/independent-evidence/scopes/economic-review",
    },
  );
  for (const argv of [
    [],
    [
      "--class", "security-audit",
      "--candidate", "candidate.so",
      "--build-record", "record.json",
      "--output-root", "artifacts/independent-evidence/scopes/security-audit",
    ],
    [
      "--class", "security-audit",
      "--candidate", "artifacts/build/candidate/a/hakky_market.so",
      "--build-record", "artifacts/build/candidate/b/build-record.json",
      "--output-root", "artifacts/independent-evidence/scopes/security-audit",
    ],
    [
      "--class", "security-audit",
      "--candidate", "artifacts/build/candidate/a/hakky_market.so",
      "--build-record", "artifacts/build/candidate/a/build-record.json",
      "--output-root", "artifacts/independent-evidence/scopes/economic-review",
    ],
  ]) {
    assert.throws(() => parseIndependentScopeOptions(argv), /Usage|scope|candidate/u);
  }
});

test("scope schemas accept the empty registry and generated scope", async () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const registrySchema = JSON.parse(
    await readFile("schemas/evidence/independent-evidence-authorities-v1.schema.json", "utf8"),
  );
  const scopeSchema = JSON.parse(
    await readFile("schemas/evidence/independent-scope-v1.schema.json", "utf8"),
  );
  assert.equal(ajv.compile(registrySchema)(JSON.parse(REGISTRY)), true);
  assert.equal(ajv.compile(scopeSchema)(buildIndependentScopeV1(validInput()).scope), true);
});

test("generator writes one no-clobber scope directory from raw evidence", async (t) => {
  const repositoryRoot = await mkdtemp(
    path.join(os.tmpdir(), "hakky-independent-scope-"),
  );
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  const paths = new Map([
    ["config/independent-evidence-authorities-v1.json", REGISTRY],
    ["Cargo.lock", CARGO_LOCK],
    ["config/hakky-release-v1.json", RELEASE_CONFIG],
    [
      "docs/superpowers/specs/2026-07-24-hakky-immutable-curve-pool-design.md",
      DESIGN_SPEC,
    ],
    ["programs/hakky-market/test-vectors/curve-pool-v1.json", CURVE_VECTOR],
    [
      "programs/hakky-market/test-vectors/curve-pool-v1.json.sha256",
      Buffer.from(`${sha256(CURVE_VECTOR)}\n`, "utf8"),
    ],
    ["artifacts/build/candidate/final-a/hakky_market.so", CANDIDATE],
    [
      "artifacts/build/candidate/final-a/build-record.json",
      serializeBuildRecord(validBuildRecord()),
    ],
  ]);
  for (const [relativePath, bytes] of paths) {
    const absolutePath = path.join(repositoryRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, bytes);
  }
  const argv = [
    "--class", "security-audit",
    "--candidate", "artifacts/build/candidate/final-a/hakky_market.so",
    "--build-record", "artifacts/build/candidate/final-a/build-record.json",
    "--output-root", "artifacts/independent-evidence/scopes/security-audit",
  ];
  const result = await runIndependentScopeBuild({
    argv,
    repositoryRoot,
    gitImpl(args) {
      if (args[0] === "status") return { status: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
      if (args[0] === "rev-parse") return { status: 0, stdout: Buffer.from(`${COMMIT}\n`), stderr: Buffer.from("") };
      if (args[0] === "archive") return { status: 0, stdout: SOURCE_ARCHIVE, stderr: Buffer.from("") };
      throw new Error("unexpected git call");
    },
  });
  assert.equal(result.scope.sourceCommit, COMMIT);
  const outputRoot = path.join(
    repositoryRoot,
    "artifacts",
    "independent-evidence",
    "scopes",
    "security-audit",
  );
  assert.deepEqual(await readFile(path.join(outputRoot, "source.tar")), SOURCE_ARCHIVE);
  assert.deepEqual(
    await readFile(path.join(outputRoot, "scope.json")),
    serializeIndependentScopeV1(result.scope),
  );
  await assert.rejects(
    runIndependentScopeBuild({ argv, repositoryRoot, gitImpl: () => { throw new Error("must not run"); } }),
    /scope output already exists/u,
  );
});
