import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

import {
  BUILD_IMAGE,
  LOCAL_BUILD_OPERATOR_SHA256,
  evaluateReproduction,
  serializeBuildRecord,
  serializeReproductionReceipt,
} from "../src/release-manifest.mjs";

const CANDIDATE = Buffer.from("exact-candidate-sbf", "utf8");
const SOURCE_COMMIT = "1".repeat(40);
const GENERATED_AT = "2026-07-27T15:00:00.000Z";
const LEFT_DIRECTORY = "artifacts/build/candidate/final-a";
const RIGHT_DIRECTORY = "artifacts/build/candidate/final-b";
const REQUIRED_OPERATOR_DOCUMENTS = [
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "docs/LAUNCH.md",
  "docs/TOKEN.md",
  "proof/README.md",
  "launch/README.md",
  "docs/MAINNET-NO-GO-CHECKLIST.md",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function buildRecord(buildDirectory, startedAt, completedAt) {
  return {
    schemaVersion: "hakky-sbf-build-record-v1",
    lane: "candidate-sbf",
    buildDirectory,
    startedAt,
    completedAt,
    source: {
      commit: SOURCE_COMMIT,
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

function runtimeReceipt(leftRecord) {
  return {
    schemaVersion: "hakky-candidate-runtime-receipt-v1",
    lane: "candidate-sbf",
    buildDirectory: LEFT_DIRECTORY,
    sourceCommit: SOURCE_COMMIT,
    buildRecordSha256: sha256(serializeBuildRecord(leftRecord)),
    binary: {
      byteLength: CANDIDATE.byteLength,
      sha256: sha256(CANDIDATE),
    },
    container: {
      image:
        "rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3",
      network: "none",
      repositoryBindMounted: false,
      vendorBindMounted: false,
      cargoHomeBindMounted: false,
    },
    test: {
      name: "exact_candidate_sbf_executes_reviewed_decoder_surface",
      rustToolchain: "1.95.0",
      cargoOffline: true,
      cargoLocked: true,
      nativeProcessorFallback: false,
      preferBpf: true,
    },
    acceptedInstructionTags: [0, 1, 2],
    probedFirstBytes: 256,
    malformedLengthsRejected: true,
    startedAt: "2026-07-27T14:22:06.182Z",
    completedAt: "2026-07-27T14:28:16.928Z",
    mainnetActionsAuthorized: false,
  };
}

function rawInput(overrides = {}) {
  const leftRecord = buildRecord(
    LEFT_DIRECTORY,
    "2026-07-27T01:00:00.000Z",
    "2026-07-27T01:05:00.000Z",
  );
  const rightRecord = buildRecord(
    RIGHT_DIRECTORY,
    "2026-07-27T01:10:00.000Z",
    "2026-07-27T01:15:00.000Z",
  );
  const reproduction = evaluateReproduction(leftRecord, rightRecord, {
    leftExecutable: CANDIDATE,
    rightExecutable: CANDIDATE,
    comparedAt: "2026-07-27T01:20:00.000Z",
  });
  return {
    generatedAt: GENERATED_AT,
    buildDirectory: LEFT_DIRECTORY,
    buildRecordBytes: serializeBuildRecord(leftRecord),
    candidateBytes: CANDIDATE,
    rightBuildRecordBytes: serializeBuildRecord(rightRecord),
    rightCandidateBytes: CANDIDATE,
    reproductionReceiptBytes:
      serializeReproductionReceipt(reproduction),
    runtimeReceiptBytes: Buffer.from(
      `${JSON.stringify(runtimeReceipt(leftRecord), null, 2)}\n`,
      "utf8",
    ),
    costLedgerBytes: null,
    browserQaReceiptBytes: null,
    independentAuthoritiesBytes: Buffer.from(
      '{"schemaVersion":"hakky-independent-authorities-v1","authorities":[]}\n',
      "utf8",
    ),
    independentScopeBytes: {
      securityAudit: null,
      economicReview: null,
      independentReproduction: null,
    },
    optionalEvidenceBytes: {
      fullSuite: null,
      metaplexPrefund: null,
      devnetLifecycle: null,
      imageIpfs: null,
      metadataManifest: null,
      metadataReadback: null,
      securityAudit: null,
      economicReview: null,
      independentReproduction: null,
      findingResolution: null,
    },
    operatorDocuments: REQUIRED_OPERATOR_DOCUMENTS.map((documentPath) => ({
      path: documentPath,
      bytes: Buffer.from(`# ${documentPath}\n`, "utf8"),
    })),
    ...overrides,
  };
}

function gate(report, id) {
  return report.gates.find((entry) => entry.id === id);
}

test("derives a truthful no-go report from raw candidate evidence", async () => {
  const readiness = await import("../src/no-mainnet-readiness.mjs").catch(
    () => ({}),
  );
  assert.equal(typeof readiness.buildNoMainnetReadinessV1, "function");
  const report = readiness.buildNoMainnetReadinessV1(rawInput());

  assert.equal(gate(report, "program-implementation").status, "pass");
  assert.equal(gate(report, "exact-candidate-runtime").status, "pass");
  assert.equal(gate(report, "binary-size").status, "pass");
  assert.equal(gate(report, "two-local-reproductions").status, "pass");
  assert.equal(gate(report, "all-rust-node-sbf-tests").status, "missing");
  assert.equal(
    gate(report, "third-independent-reproduction").status,
    "external-required",
  );
  assert.equal(gate(report, "creator-cost-cap").status, "missing");
  assert.equal(gate(report, "desktop-mobile-browser-qa").status, "missing");
  assert.equal(gate(report, "operator-handoff").status, "pass");
  assert.equal(report.readyForMainnetApproval, false);
  assert.equal(report.readyForMainnetEffects, false);
  assert.equal(report.mainnetActionsAuthorized, false);
  assert.equal(report.decision, "NO-GO");
  assert.deepEqual(report.actionTimeApprovals, {
    acceptedByEvaluator: false,
    requiredLater: [
      "program-deployment",
      "program-finalization",
      "market-initialization",
    ],
  });
});

test("recomputes reproduction from bytes and rejects caller verdicts", async () => {
  const readiness = await import("../src/no-mainnet-readiness.mjs").catch(
    () => ({}),
  );
  assert.equal(typeof readiness.buildNoMainnetReadinessV1, "function");

  const drifted = rawInput({
    rightCandidateBytes: Buffer.from("different", "utf8"),
  });
  const report = readiness.buildNoMainnetReadinessV1(drifted);
  assert.equal(gate(report, "two-local-reproductions").status, "fail");

  for (const forbidden of [
    { ready: true },
    { verified: true },
    { ok: true },
    { mainnetActionsAuthorized: true },
    { readyForMainnetEffects: true },
  ]) {
    assert.throws(
      () => readiness.buildNoMainnetReadinessV1({
        ...rawInput(),
        ...forbidden,
      }),
      /unexpected readiness input/u,
    );
  }
});

test("closed schema forbids authorization and effect-ready reports", async () => {
  const readiness = await import("../src/no-mainnet-readiness.mjs").catch(
    () => ({}),
  );
  assert.equal(typeof readiness.buildNoMainnetReadinessV1, "function");
  const schema = JSON.parse(
    await readFile(
      new URL(
        "../schemas/release/no-mainnet-readiness-v1.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
    schema,
  );
  const report = readiness.buildNoMainnetReadinessV1(rawInput());
  assert.equal(validate(report), true, JSON.stringify(validate.errors));

  for (const mutate of [
    (value) => {
      value.mainnetActionsAuthorized = true;
    },
    (value) => {
      value.readyForMainnetEffects = true;
    },
    (value) => {
      value.actionTimeApprovals.acceptedByEvaluator = true;
    },
    (value) => {
      value.extra = true;
    },
  ]) {
    const value = structuredClone(report);
    mutate(value);
    assert.equal(validate(value), false);
  }
});

test("CLI accepts only raw evidence paths and no approvals", async () => {
  const command = await import(
    "../scripts/build-no-mainnet-readiness.mjs"
  ).catch(() => ({}));
  assert.equal(typeof command.parseNoMainnetReadinessOptions, "function");
  assert.deepEqual(
    command.parseNoMainnetReadinessOptions([
      "--build",
      LEFT_DIRECTORY,
      "--evidence-root",
      "artifacts/independent-evidence",
      "--output",
      "artifacts/readiness/no-mainnet-v1.json",
    ]),
    {
      buildDirectory: LEFT_DIRECTORY,
      evidenceRoot: "artifacts/independent-evidence",
      outputPath: "artifacts/readiness/no-mainnet-v1.json",
    },
  );

  for (const forbidden of [
    ["--approved", "true"],
    ["--ready", "true"],
    ["--authorize", "mainnet"],
  ]) {
    assert.throws(
      () => command.parseNoMainnetReadinessOptions([
        "--build",
        LEFT_DIRECTORY,
        "--evidence-root",
        "artifacts/independent-evidence",
        "--output",
        "artifacts/readiness/no-mainnet-v1.json",
        ...forbidden,
      ]),
      /Usage:/u,
    );
  }
});
