import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  assertBuildRecord,
  evaluateReproduction,
  serializeBuildRecord,
  serializeReproductionReceipt,
} from "./release-manifest.mjs";
import { evaluateCostLedger } from "./cost-ledger.mjs";
import { assertBrowserQaReceiptV1 } from "./browser-qa.mjs";
import {
  assertIndependentAuthoritiesBytes,
  assertIndependentScopeV1,
  serializeIndependentScopeV1,
} from "./independent-scope.mjs";
import { assertImageIpfsReceiptV1 } from "./image-ipfs-proof.mjs";
import {
  assertMetadataManifestV1,
  assertMetadataReadbackV1,
} from "./metadata-integrity.mjs";

export const NO_MAINNET_READINESS_SCHEMA_VERSION =
  "hakky-no-mainnet-readiness-v1";
export const NO_MAINNET_READINESS_GATE_IDS = Object.freeze([
  "program-implementation",
  "all-rust-node-sbf-tests",
  "exact-candidate-runtime",
  "binary-size",
  "two-local-reproductions",
  "third-independent-reproduction",
  "creator-cost-cap",
  "actual-metaplex-prefund-proof",
  "devnet-immutable-lifecycle",
  "image-ipfs",
  "metadata-https-readback",
  "desktop-mobile-browser-qa",
  "independent-solana-security-audit",
  "independent-economic-math-review",
  "finding-resolution-final-rebuild",
  "operator-handoff",
]);

const MAX_PROGRAM_BYTES = 120_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const UTC_MILLISECOND_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const RUST_RUNTIME_IMAGE =
  "rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3";
const CANDIDATE_RUNTIME_TEST =
  "exact_candidate_sbf_executes_reviewed_decoder_surface";
const REQUIRED_OPERATOR_DOCUMENTS = Object.freeze([
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "docs/LAUNCH.md",
  "docs/TOKEN.md",
  "proof/README.md",
  "launch/README.md",
  "docs/MAINNET-NO-GO-CHECKLIST.md",
]);
const INPUT_KEYS = Object.freeze([
  "generatedAt",
  "buildDirectory",
  "buildRecordBytes",
  "candidateBytes",
  "rightBuildRecordBytes",
  "rightCandidateBytes",
  "reproductionReceiptBytes",
  "runtimeReceiptBytes",
  "costLedgerBytes",
  "browserQaReceiptBytes",
  "independentAuthoritiesBytes",
  "independentScopeBytes",
  "optionalEvidenceBytes",
  "operatorDocuments",
]);
const INDEPENDENT_SCOPE_KEYS = Object.freeze([
  "securityAudit",
  "economicReview",
  "independentReproduction",
]);
const OPTIONAL_EVIDENCE_KEYS = Object.freeze([
  "fullSuite",
  "metaplexPrefund",
  "devnetLifecycle",
  "imageIpfs",
  "metadataManifest",
  "metadataReadback",
  "securityAudit",
  "economicReview",
  "independentReproduction",
  "findingResolution",
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(value, expected) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function exactBuffer(value, label) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  throw new Error(`${label} must be raw bytes`);
}

function optionalBuffer(value, label) {
  return value === null ? null : exactBuffer(value, label);
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(exactBuffer(bytes, label).toString("utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function canonicalTimestamp(value) {
  return (
    typeof value === "string" &&
    UTC_MILLISECOND_PATTERN.test(value) &&
    new Date(value).toISOString() === value
  );
}

function evidence(relativePath, bytes) {
  const exact = exactBuffer(bytes, relativePath);
  return {
    path: relativePath,
    byteLength: exact.byteLength,
    sha256: sha256(exact),
  };
}

function gate(id, status, detail, evidenceEntries = []) {
  return { id, status, detail, evidence: evidenceEntries };
}

function assertPrimaryCandidate(input) {
  const buildRecordBytes = exactBuffer(
    input.buildRecordBytes,
    "buildRecordBytes",
  );
  const candidateBytes = exactBuffer(input.candidateBytes, "candidateBytes");
  const buildRecord = parseJson(buildRecordBytes, "buildRecordBytes");
  assertBuildRecord(buildRecord);
  if (
    !buildRecordBytes.equals(serializeBuildRecord(buildRecord)) ||
    buildRecord.buildDirectory !== input.buildDirectory ||
    buildRecord.source.clean !== true
  ) {
    throw new Error("primary candidate build record is invalid");
  }
  return {
    buildRecord,
    buildRecordBytes,
    candidateBytes,
    buildRecordSha256: sha256(buildRecordBytes),
    executableSha256: sha256(candidateBytes),
    executableBound:
      buildRecord.executable.byteLength === candidateBytes.byteLength &&
      buildRecord.executable.sha256 === sha256(candidateBytes),
  };
}

function evaluateRuntimeReceipt(input, candidate) {
  if (input.runtimeReceiptBytes === null) {
    return gate(
      "exact-candidate-runtime",
      "missing",
      "The exact candidate runtime receipt is absent.",
    );
  }
  const bytes = exactBuffer(input.runtimeReceiptBytes, "runtimeReceiptBytes");
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    return gate(
      "exact-candidate-runtime",
      "fail",
      "The exact candidate runtime receipt is malformed.",
      [evidence(`${input.buildDirectory}/runtime-receipt.json`, bytes)],
    );
  }
  const valid =
    exactKeys(value, [
      "schemaVersion",
      "lane",
      "buildDirectory",
      "sourceCommit",
      "buildRecordSha256",
      "binary",
      "container",
      "test",
      "acceptedInstructionTags",
      "probedFirstBytes",
      "malformedLengthsRejected",
      "startedAt",
      "completedAt",
      "mainnetActionsAuthorized",
    ]) &&
    value.schemaVersion === "hakky-candidate-runtime-receipt-v1" &&
    value.lane === "candidate-sbf" &&
    value.buildDirectory === input.buildDirectory &&
    value.sourceCommit === candidate.buildRecord.source.commit &&
    value.buildRecordSha256 === candidate.buildRecordSha256 &&
    exactKeys(value.binary, ["byteLength", "sha256"]) &&
    value.binary.byteLength === candidate.candidateBytes.byteLength &&
    value.binary.sha256 === candidate.executableSha256 &&
    exactKeys(value.container, [
      "image",
      "network",
      "repositoryBindMounted",
      "vendorBindMounted",
      "cargoHomeBindMounted",
    ]) &&
    value.container.image === RUST_RUNTIME_IMAGE &&
    value.container.network === "none" &&
    value.container.repositoryBindMounted === false &&
    value.container.vendorBindMounted === false &&
    value.container.cargoHomeBindMounted === false &&
    exactKeys(value.test, [
      "name",
      "rustToolchain",
      "cargoOffline",
      "cargoLocked",
      "nativeProcessorFallback",
      "preferBpf",
    ]) &&
    value.test.name === CANDIDATE_RUNTIME_TEST &&
    value.test.rustToolchain === "1.95.0" &&
    value.test.cargoOffline === true &&
    value.test.cargoLocked === true &&
    value.test.nativeProcessorFallback === false &&
    value.test.preferBpf === true &&
    isDeepStrictEqual(value.acceptedInstructionTags, [0, 1, 2]) &&
    value.probedFirstBytes === 256 &&
    value.malformedLengthsRejected === true &&
    canonicalTimestamp(value.startedAt) &&
    canonicalTimestamp(value.completedAt) &&
    Date.parse(value.completedAt) >= Date.parse(value.startedAt) &&
    value.mainnetActionsAuthorized === false;
  return gate(
    "exact-candidate-runtime",
    valid ? "pass" : "fail",
    valid
      ? "The selected candidate passed the offline exact-SBF decoder surface."
      : "The exact candidate runtime receipt is invalid or does not bind the selected bytes.",
    [evidence(`${input.buildDirectory}/runtime-receipt.json`, bytes)],
  );
}

function evaluateLocalReproduction(input, candidate) {
  const evidenceEntries = [];
  try {
    const rightRecordBytes = exactBuffer(
      input.rightBuildRecordBytes,
      "rightBuildRecordBytes",
    );
    const rightCandidateBytes = exactBuffer(
      input.rightCandidateBytes,
      "rightCandidateBytes",
    );
    const rightRecord = parseJson(rightRecordBytes, "rightBuildRecordBytes");
    assertBuildRecord(rightRecord);
    if (!rightRecordBytes.equals(serializeBuildRecord(rightRecord))) {
      throw new Error("right build record is not canonical");
    }
    const reproductionBytes = exactBuffer(
      input.reproductionReceiptBytes,
      "reproductionReceiptBytes",
    );
    const supplied = parseJson(
      reproductionBytes,
      "reproductionReceiptBytes",
    );
    const expected = evaluateReproduction(candidate.buildRecord, rightRecord, {
      leftExecutable: candidate.candidateBytes,
      rightExecutable: rightCandidateBytes,
      comparedAt: supplied.comparedAt,
    });
    const valid =
      expected.ok === true &&
      reproductionBytes.equals(serializeReproductionReceipt(supplied)) &&
      isDeepStrictEqual(supplied, expected);
    evidenceEntries.push(
      evidence(
        `${rightRecord.buildDirectory}/build-record.json`,
        rightRecordBytes,
      ),
      evidence(
        `${rightRecord.buildDirectory}/hakky_market.so`,
        rightCandidateBytes,
      ),
      evidence(
        "artifacts/build/candidate/reproduction-v1.json",
        reproductionBytes,
      ),
    );
    return gate(
      "two-local-reproductions",
      valid ? "pass" : "fail",
      valid
        ? "Two distinct local clean builds reproduce identical candidate bytes."
        : "The local reproduction receipt does not match recomputed records and bytes.",
      evidenceEntries,
    );
  } catch {
    return gate(
      "two-local-reproductions",
      "fail",
      "The second local build or reproduction evidence is invalid.",
      evidenceEntries,
    );
  }
}

function evaluateCost(input, candidate) {
  if (input.costLedgerBytes === null) {
    return gate(
      "creator-cost-cap",
      "missing",
      "A current finalized cost ledger is absent.",
    );
  }
  const bytes = exactBuffer(input.costLedgerBytes, "costLedgerBytes");
  try {
    const ledger = JSON.parse(bytes.toString("utf8"));
    const evaluation = evaluateCostLedger(ledger, {
      now: input.generatedAt,
    });
    const build = ledger?.snapshot?.build;
    const binding =
      build?.recordPath === `${input.buildDirectory}/build-record.json` &&
      build?.recordSha256 === candidate.buildRecordSha256 &&
      build?.executablePath === `${input.buildDirectory}/hakky_market.so` &&
      build?.executableByteLength === candidate.candidateBytes.byteLength &&
      build?.executableSha256 === candidate.executableSha256;
    const status =
      evaluation.ok && binding
        ? "pass"
        : binding &&
            evaluation.failures.length === 1 &&
            evaluation.failures[0] === "freshness"
          ? "stale"
          : "fail";
    return gate(
      "creator-cost-cap",
      status,
      status === "pass"
        ? "The finalized cost evidence is fresh and within the one-SOL cap."
        : status === "stale"
          ? "The cost model is within cap but its finalized snapshot has expired."
          : "The cost ledger is invalid, unbound, or over the one-SOL cap.",
      [evidence("artifacts/cost/cost-ledger-v1.json", bytes)],
    );
  } catch {
    return gate(
      "creator-cost-cap",
      "fail",
      "The cost ledger is malformed.",
      [evidence("artifacts/cost/cost-ledger-v1.json", bytes)],
    );
  }
}

function evaluateBrowserQa(input, candidate) {
  if (input.browserQaReceiptBytes === null) {
    return gate(
      "desktop-mobile-browser-qa",
      "missing",
      "The browser QA certificate is absent.",
    );
  }
  const bytes = exactBuffer(
    input.browserQaReceiptBytes,
    "browserQaReceiptBytes",
  );
  try {
    const receipt = JSON.parse(bytes.toString("utf8"));
    assertBrowserQaReceiptV1(receipt);
    const valid = receipt.sourceCommit === candidate.buildRecord.source.commit;
    return gate(
      "desktop-mobile-browser-qa",
      valid ? "pass" : "fail",
      valid
        ? "Desktop and mobile prelaunch browser QA binds the candidate source commit."
        : "Browser QA was certified against a different source commit.",
      [evidence("artifacts/qa/browser-qa-v1.json", bytes)],
    );
  } catch {
    return gate(
      "desktop-mobile-browser-qa",
      "fail",
      "The browser QA certificate is invalid.",
      [evidence("artifacts/qa/browser-qa-v1.json", bytes)],
    );
  }
}

function evaluateIndependentScope(
  input,
  candidate,
  {
    inputKey,
    evidenceClass,
    gateId,
    label,
  },
) {
  const scopeBytes = input.independentScopeBytes[inputKey];
  const evidenceEntries = [
    evidence(
      "config/independent-evidence-authorities-v1.json",
      input.independentAuthoritiesBytes,
    ),
  ];
  if (scopeBytes !== null) {
    const bytes = exactBuffer(scopeBytes, `${inputKey} scope`);
    try {
      const scope = JSON.parse(bytes.toString("utf8"));
      assertIndependentScopeV1(scope);
      if (
        !bytes.equals(serializeIndependentScopeV1(scope)) ||
        scope.evidenceClass !== evidenceClass ||
        scope.authorityRegistrySha256 !==
          sha256(input.independentAuthoritiesBytes) ||
        scope.sourceCommit !== candidate.buildRecord.source.commit ||
        scope.buildRecordSha256 !== candidate.buildRecordSha256 ||
        scope.executableSha256 !== candidate.executableSha256 ||
        scope.candidateSha256 !== candidate.executableSha256 ||
        scope.executableLength !==
          String(candidate.candidateBytes.byteLength)
      ) {
        throw new Error("scope drift");
      }
      evidenceEntries.push(
        evidence(
          `artifacts/independent-evidence/scopes/${evidenceClass}/scope.json`,
          bytes,
        ),
      );
    } catch {
      return gate(
        gateId,
        "fail",
        `${label} scope is invalid or does not bind the selected candidate.`,
        evidenceEntries,
      );
    }
  }
  return gate(
    gateId,
    "external-required",
    scopeBytes === null
      ? `${label} requires genuine authenticated external evidence; no scope is prepared.`
      : `${label} scope is prepared, but a signed independent result is still required.`,
    evidenceEntries,
  );
}

function evaluateImageIpfs(input) {
  const bytes = input.optionalEvidenceBytes.imageIpfs;
  if (bytes === null) {
    return gate(
      "image-ipfs",
      "missing",
      "The approved token image has not been verified through both fixed IPFS gateways.",
    );
  }
  try {
    const value = JSON.parse(bytes.toString("utf8"));
    assertImageIpfsReceiptV1(value);
    return gate(
      "image-ipfs",
      "pass",
      "The approved image bytes match both fixed public IPFS gateways.",
      [evidence("artifacts/ipfs/image-ipfs-v1.json", bytes)],
    );
  } catch {
    return gate(
      "image-ipfs",
      "fail",
      "The image IPFS receipt is invalid.",
      [evidence("artifacts/ipfs/image-ipfs-v1.json", bytes)],
    );
  }
}

function evaluateMetadata(input) {
  const manifestBytes = input.optionalEvidenceBytes.metadataManifest;
  const readbackBytes = input.optionalEvidenceBytes.metadataReadback;
  if (manifestBytes === null || readbackBytes === null) {
    return gate(
      "metadata-https-readback",
      "missing",
      "Canonical metadata manifest and HTTPS byte readback are both required.",
    );
  }
  try {
    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    const readback = JSON.parse(readbackBytes.toString("utf8"));
    assertMetadataManifestV1(manifest);
    assertMetadataReadbackV1({ manifest, readback });
    return gate(
      "metadata-https-readback",
      "pass",
      "The canonical metadata bytes match the fixed HTTPS readback.",
      [
        evidence("artifacts/metadata/manifest.json", manifestBytes),
        evidence("artifacts/metadata/readback.json", readbackBytes),
      ],
    );
  } catch {
    return gate(
      "metadata-https-readback",
      "fail",
      "Metadata manifest or HTTPS readback evidence is invalid.",
      [
        evidence("artifacts/metadata/manifest.json", manifestBytes),
        evidence("artifacts/metadata/readback.json", readbackBytes),
      ],
    );
  }
}

function evaluateOperatorHandoff(input) {
  if (!Array.isArray(input.operatorDocuments)) {
    throw new Error("unexpected readiness input");
  }
  const byPath = new Map();
  for (const document of input.operatorDocuments) {
    if (
      !exactKeys(document, ["path", "bytes"]) ||
      typeof document.path !== "string" ||
      byPath.has(document.path)
    ) {
      throw new Error("unexpected readiness input");
    }
    byPath.set(document.path, exactBuffer(document.bytes, document.path));
  }
  const valid =
    byPath.size === REQUIRED_OPERATOR_DOCUMENTS.length &&
    REQUIRED_OPERATOR_DOCUMENTS.every(
      (documentPath) => (byPath.get(documentPath)?.byteLength || 0) > 0,
    );
  return gate(
    "operator-handoff",
    valid ? "pass" : "fail",
    valid
      ? "The complete operator and no-go handoff document set is present."
      : "One or more required operator handoff documents are absent or empty.",
    valid
      ? REQUIRED_OPERATOR_DOCUMENTS.map((documentPath) =>
          evidence(documentPath, byPath.get(documentPath)),
        )
      : [],
  );
}

function unsupportedOptionalGate(input, {
  id,
  key,
  missingDetail,
  unsupportedDetail,
  evidencePath,
}) {
  const bytes = input.optionalEvidenceBytes[key];
  if (bytes === null) return gate(id, "missing", missingDetail);
  return gate(
    id,
    "fail",
    unsupportedDetail,
    [evidence(evidencePath, bytes)],
  );
}

export function buildNoMainnetReadinessV1(input) {
  if (
    !exactKeys(input, INPUT_KEYS) ||
    !canonicalTimestamp(input.generatedAt) ||
    typeof input.buildDirectory !== "string" ||
    !/^artifacts\/build\/candidate\/[a-z0-9][a-z0-9-]*$/u.test(
      input.buildDirectory,
    ) ||
    !exactKeys(input.independentScopeBytes, INDEPENDENT_SCOPE_KEYS) ||
    !exactKeys(input.optionalEvidenceBytes, OPTIONAL_EVIDENCE_KEYS)
  ) {
    throw new Error("unexpected readiness input");
  }
  for (const [key, value] of Object.entries(input.independentScopeBytes)) {
    optionalBuffer(value, `independentScopeBytes.${key}`);
  }
  for (const [key, value] of Object.entries(input.optionalEvidenceBytes)) {
    optionalBuffer(value, `optionalEvidenceBytes.${key}`);
  }
  optionalBuffer(input.runtimeReceiptBytes, "runtimeReceiptBytes");
  optionalBuffer(input.costLedgerBytes, "costLedgerBytes");
  optionalBuffer(input.browserQaReceiptBytes, "browserQaReceiptBytes");

  const candidate = assertPrimaryCandidate(input);
  const authorities = assertIndependentAuthoritiesBytes(
    input.independentAuthoritiesBytes,
  );
  const primaryEvidence = [
    evidence(`${input.buildDirectory}/build-record.json`, candidate.buildRecordBytes),
    evidence(`${input.buildDirectory}/hakky_market.so`, candidate.candidateBytes),
  ];
  const runtimeGate = evaluateRuntimeReceipt(input, candidate);
  const gates = [
    gate(
      "program-implementation",
      candidate.executableBound ? "pass" : "fail",
      candidate.executableBound
        ? "The clean build record binds the selected candidate bytes and closed release surface."
        : "The selected executable does not match its canonical build record.",
      primaryEvidence,
    ),
    gate(
      "all-rust-node-sbf-tests",
      input.optionalEvidenceBytes.fullSuite === null ? "missing" : "fail",
      input.optionalEvidenceBytes.fullSuite === null
        ? "A final source-commit-bound full-suite receipt is absent."
        : "A raw claimed suite result is not sufficient without the closed final-suite contract.",
      input.optionalEvidenceBytes.fullSuite === null
        ? []
        : [
            evidence(
              "artifacts/verify/final-suite-v1.json",
              input.optionalEvidenceBytes.fullSuite,
            ),
          ],
    ),
    runtimeGate,
    gate(
      "binary-size",
      candidate.executableBound &&
        candidate.candidateBytes.byteLength <= MAX_PROGRAM_BYTES
        ? "pass"
        : "fail",
      candidate.candidateBytes.byteLength <= MAX_PROGRAM_BYTES
        ? `The executable is ${candidate.candidateBytes.byteLength} bytes, within the ${MAX_PROGRAM_BYTES}-byte ceiling.`
        : `The executable exceeds the ${MAX_PROGRAM_BYTES}-byte ceiling.`,
      primaryEvidence,
    ),
    evaluateLocalReproduction(input, candidate),
    evaluateIndependentScope(input, candidate, {
      inputKey: "independentReproduction",
      evidenceClass: "independent-reproduction",
      gateId: "third-independent-reproduction",
      label: "Third independent reproduction",
    }),
    evaluateCost(input, candidate),
    unsupportedOptionalGate(input, {
      id: "actual-metaplex-prefund-proof",
      key: "metaplexPrefund",
      missingDetail:
        "Actual deployed Metaplex bytes and hostile-prefund exact-SBF proof are absent.",
      unsupportedDetail:
        "Unvalidated Metaplex prefund claims cannot satisfy this gate.",
      evidencePath: "artifacts/verify/metaplex-prefund-v1.json",
    }),
    unsupportedOptionalGate(input, {
      id: "devnet-immutable-lifecycle",
      key: "devnetLifecycle",
      missingDetail:
        "The finalized deploy/finalize/initialize/curve/pool devnet proof is absent.",
      unsupportedDetail:
        "Unvalidated devnet lifecycle claims cannot satisfy this gate.",
      evidencePath: "artifacts/devnet-rehearsal/proof.json",
    }),
    evaluateImageIpfs(input),
    evaluateMetadata(input),
    evaluateBrowserQa(input, candidate),
    evaluateIndependentScope(input, candidate, {
      inputKey: "securityAudit",
      evidenceClass: "security-audit",
      gateId: "independent-solana-security-audit",
      label: "Independent Solana security audit",
    }),
    evaluateIndependentScope(input, candidate, {
      inputKey: "economicReview",
      evidenceClass: "economic-review",
      gateId: "independent-economic-math-review",
      label: "Independent economic and integer-math review",
    }),
    gate(
      "finding-resolution-final-rebuild",
      "external-required",
      input.optionalEvidenceBytes.findingResolution === null
        ? "Independent findings, resolutions, and the resulting final rebuild are not yet available."
        : "A locally supplied finding-resolution claim cannot replace signed reviewer closure and a final rebuild.",
      input.optionalEvidenceBytes.findingResolution === null
        ? []
        : [
            evidence(
              "artifacts/independent-evidence/findings/resolution.json",
              input.optionalEvidenceBytes.findingResolution,
            ),
          ],
    ),
    evaluateOperatorHandoff(input),
  ];
  if (
    gates.length !== NO_MAINNET_READINESS_GATE_IDS.length ||
    !gates.every((entry, index) =>
      entry.id === NO_MAINNET_READINESS_GATE_IDS[index]
    )
  ) {
    throw new Error("no-mainnet readiness gate order drift");
  }

  const readyForMainnetApproval = gates.every(
    (entry) => entry.status === "pass",
  );
  const report = {
    schemaVersion: NO_MAINNET_READINESS_SCHEMA_VERSION,
    generatedAt: input.generatedAt,
    candidate: {
      buildDirectory: input.buildDirectory,
      sourceCommit: candidate.buildRecord.source.commit,
      buildRecordSha256: candidate.buildRecordSha256,
      executableSha256: candidate.executableSha256,
      executableByteLength: candidate.candidateBytes.byteLength,
    },
    authorityRegistry: {
      sha256: sha256(input.independentAuthoritiesBytes),
      authorityCount: authorities.authorities.length,
    },
    gates,
    blockers: gates
      .filter((entry) => entry.status !== "pass")
      .map((entry) => entry.id),
    readyForMainnetApproval,
    readyForMainnetEffects: false,
    mainnetActionsAuthorized: false,
    actionTimeApprovals: {
      acceptedByEvaluator: false,
      requiredLater: [
        "program-deployment",
        "program-finalization",
        "market-initialization",
      ],
    },
    decision: readyForMainnetApproval
      ? "TECHNICALLY-READY-FOR-SEPARATE-ACTION-APPROVAL"
      : "NO-GO",
  };
  assertNoMainnetReadinessV1(report);
  return report;
}

export function assertNoMainnetReadinessV1(value) {
  if (
    !exactKeys(value, [
      "schemaVersion",
      "generatedAt",
      "candidate",
      "authorityRegistry",
      "gates",
      "blockers",
      "readyForMainnetApproval",
      "readyForMainnetEffects",
      "mainnetActionsAuthorized",
      "actionTimeApprovals",
      "decision",
    ]) ||
    value.schemaVersion !== NO_MAINNET_READINESS_SCHEMA_VERSION ||
    !canonicalTimestamp(value.generatedAt) ||
    !exactKeys(value.candidate, [
      "buildDirectory",
      "sourceCommit",
      "buildRecordSha256",
      "executableSha256",
      "executableByteLength",
    ]) ||
    !/^artifacts\/build\/candidate\/[a-z0-9][a-z0-9-]*$/u.test(
      value.candidate.buildDirectory,
    ) ||
    !GIT_COMMIT_PATTERN.test(value.candidate.sourceCommit) ||
    !SHA256_PATTERN.test(value.candidate.buildRecordSha256) ||
    !SHA256_PATTERN.test(value.candidate.executableSha256) ||
    !Number.isSafeInteger(value.candidate.executableByteLength) ||
    value.candidate.executableByteLength < 1 ||
    value.candidate.executableByteLength > MAX_PROGRAM_BYTES ||
    !exactKeys(value.authorityRegistry, ["sha256", "authorityCount"]) ||
    !SHA256_PATTERN.test(value.authorityRegistry.sha256) ||
    !Number.isSafeInteger(value.authorityRegistry.authorityCount) ||
    value.authorityRegistry.authorityCount < 0 ||
    !Array.isArray(value.gates) ||
    value.gates.length !== NO_MAINNET_READINESS_GATE_IDS.length
  ) {
    throw new Error("no-mainnet-readiness-invalid");
  }
  value.gates.forEach((entry, index) => {
    if (
      !exactKeys(entry, ["id", "status", "detail", "evidence"]) ||
      entry.id !== NO_MAINNET_READINESS_GATE_IDS[index] ||
      !["pass", "fail", "missing", "stale", "external-required"].includes(
        entry.status,
      ) ||
      typeof entry.detail !== "string" ||
      entry.detail.length < 1 ||
      !Array.isArray(entry.evidence)
    ) {
      throw new Error("no-mainnet-readiness-invalid");
    }
    for (const item of entry.evidence) {
      if (
        !exactKeys(item, ["path", "byteLength", "sha256"]) ||
        typeof item.path !== "string" ||
        item.path.length < 1 ||
        pathIsUnsafe(item.path) ||
        !Number.isSafeInteger(item.byteLength) ||
        item.byteLength < 1 ||
        !SHA256_PATTERN.test(item.sha256)
      ) {
        throw new Error("no-mainnet-readiness-invalid");
      }
    }
  });
  const expectedBlockers = value.gates
    .filter((entry) => entry.status !== "pass")
    .map((entry) => entry.id);
  const expectedReady = expectedBlockers.length === 0;
  if (
    !isDeepStrictEqual(value.blockers, expectedBlockers) ||
    value.readyForMainnetApproval !== expectedReady ||
    value.readyForMainnetEffects !== false ||
    value.mainnetActionsAuthorized !== false ||
    !exactKeys(value.actionTimeApprovals, [
      "acceptedByEvaluator",
      "requiredLater",
    ]) ||
    value.actionTimeApprovals.acceptedByEvaluator !== false ||
    !isDeepStrictEqual(value.actionTimeApprovals.requiredLater, [
      "program-deployment",
      "program-finalization",
      "market-initialization",
    ]) ||
    value.decision !==
      (expectedReady
        ? "TECHNICALLY-READY-FOR-SEPARATE-ACTION-APPROVAL"
        : "NO-GO")
  ) {
    throw new Error("no-mainnet-readiness-invalid");
  }
  return value;
}

function pathIsUnsafe(value) {
  return (
    value.includes("\\") ||
    value.startsWith("/") ||
    value.split("/").includes("..")
  );
}

export function serializeNoMainnetReadinessV1(value) {
  assertNoMainnetReadinessV1(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}
