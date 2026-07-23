import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { validateSchema } from "./schema-validation.mjs";
import {
  EXPECTED_POLICY,
  isCanonicalBase58,
  isOfficialRaydiumLaunchUrl,
  isOfficialSolscanMintUrl,
  isOfficialSolscanTransactionUrl,
  validateLaunchRecord,
} from "../web/lib/launch-policy.js";

export const MINT_PROOF_SCHEMA_VERSION = 1;
export const LAUNCHLAB_PROOF_SCHEMA_VERSION = 1;

const MINT_PROOF_FIELDS = Object.freeze([
  "schemaVersion",
  "checkedAt",
  "rpcHost",
  "creator",
  "ok",
  "checks",
  "observed",
]);
const MINT_OBSERVED_FIELDS = Object.freeze([
  "network",
  "tokenProgram",
  "mint",
  "creator",
  "supplyBaseUnits",
  "decimals",
  "mintAuthority",
  "freezeAuthority",
  "creatorBalanceBaseUnits",
]);
const MINT_CHECKS = Object.freeze([
  ["mint-public-key", "mint"],
  ["creator-public-key", "creator"],
  ["network-mainnet", "network"],
  ["classic-token-program", "tokenProgram"],
  ["fixed-supply", "supplyBaseUnits"],
  ["six-decimals", "decimals"],
  ["mint-authority-revoked", "mintAuthority"],
  ["freeze-authority-none", "freezeAuthority"],
  ["creator-balance-zero", "creatorBalanceBaseUnits"],
]);
const LAUNCHLAB_PROOF_FIELDS = Object.freeze([
  "schemaVersion",
  "checkedAt",
  "mint",
  "launchId",
  "launchTransaction",
  "creator",
  "creatorSpendSol",
  "quoteAsset",
  "curveAllocationBps",
  "liquidityAllocationBps",
  "teamAllocationBps",
  "graduationTargetSol",
  "creatorFirstBuySol",
  "creatorFeeEnabled",
  "lpPolicy",
  "metadataName",
  "metadataSymbol",
  "metadataUri",
  "metadataImage",
  "metadataWebsite",
  "metadataX",
  "metadataImmutable",
  "raydiumUrl",
  "solscanUrl",
  "solscanTransactionUrl",
  "ok",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isExactIsoTimestamp(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function validateExactFields(value, expectedFields, label, issues) {
  if (!isObject(value)) {
    issues.push(`${label} must be an object`);
    return false;
  }
  const expected = new Set(expectedFields);
  for (const field of expectedFields) {
    if (!Object.hasOwn(value, field)) issues.push(`${label} requires ${field}`);
  }
  for (const field of Object.keys(value)) {
    if (!expected.has(field)) issues.push(`${label} has unexpected field ${field}`);
  }
  return true;
}

function validateMintProof(mintProof, issues) {
  const label = "mainnet mint proof";
  if (!validateExactFields(mintProof, MINT_PROOF_FIELDS, label, issues)) return;
  if (mintProof.schemaVersion !== MINT_PROOF_SCHEMA_VERSION) {
    issues.push(`${label} schemaVersion must equal ${MINT_PROOF_SCHEMA_VERSION}`);
  }
  if (mintProof.ok !== true) issues.push(`${label} ok must equal true`);
  if (!isExactIsoTimestamp(mintProof.checkedAt)) issues.push(`${label} checkedAt must be an exact ISO-8601 timestamp`);
  if (typeof mintProof.rpcHost !== "string" || !mintProof.rpcHost || /[\s/@?#]/.test(mintProof.rpcHost)) {
    issues.push(`${label} rpcHost must be a public hostname without credentials or path data`);
  }
  if (!validateExactFields(mintProof.observed, MINT_OBSERVED_FIELDS, `${label} observed`, issues)) return;
  const expectedObserved = {
    network: EXPECTED_POLICY.network,
    tokenProgram: EXPECTED_POLICY.tokenProgram,
    supplyBaseUnits: EXPECTED_POLICY.supplyBaseUnits,
    decimals: EXPECTED_POLICY.decimals,
    mintAuthority: null,
    freezeAuthority: null,
    creatorBalanceBaseUnits: "0",
  };
  for (const [field, expected] of Object.entries(expectedObserved)) {
    if (mintProof.observed[field] !== expected) issues.push(`${label} observed.${field} must equal ${String(expected)}`);
  }
  if (mintProof.creator !== mintProof.observed.creator) {
    issues.push(`${label} creator must equal observed.creator`);
  }
  if (!Array.isArray(mintProof.checks) || mintProof.checks.length !== MINT_CHECKS.length) {
    issues.push(`${label} checks must contain the exact supported check set`);
    return;
  }
  for (let index = 0; index < MINT_CHECKS.length; index += 1) {
    const [expectedId, observedField] = MINT_CHECKS[index];
    const check = mintProof.checks[index];
    if (!validateExactFields(check, ["id", "ok", "observed"], `${label} checks[${index}]`, issues)) continue;
    if (check.id !== expectedId) issues.push(`${label} checks[${index}].id must equal ${expectedId}`);
    if (check.ok !== true) issues.push(`${label} checks.${expectedId}.ok must equal true`);
    if (!Object.is(check.observed, mintProof.observed[observedField])) {
      issues.push(`${label} checks.${expectedId}.observed must equal observed.${observedField}`);
    }
  }
}

function validateLaunchlabProof(launchlabProof, issues) {
  const label = "mainnet LaunchLab proof";
  if (!validateExactFields(launchlabProof, LAUNCHLAB_PROOF_FIELDS, label, issues)) return;
  if (launchlabProof.schemaVersion !== LAUNCHLAB_PROOF_SCHEMA_VERSION) {
    issues.push(`${label} schemaVersion must equal ${LAUNCHLAB_PROOF_SCHEMA_VERSION}`);
  }
  if (launchlabProof.ok !== true) issues.push(`${label} ok must equal true`);
  if (!isExactIsoTimestamp(launchlabProof.checkedAt)) issues.push(`${label} checkedAt must be an exact ISO-8601 timestamp`);
  const expected = {
    quoteAsset: "SOL",
    curveAllocationBps: EXPECTED_POLICY.curveAllocationBps,
    liquidityAllocationBps: EXPECTED_POLICY.liquidityAllocationBps,
    teamAllocationBps: EXPECTED_POLICY.teamAllocationBps,
    graduationTargetSol: Number(EXPECTED_POLICY.graduationTargetSol),
    creatorFirstBuySol: Number(EXPECTED_POLICY.creatorFirstBuySol),
    creatorFeeEnabled: false,
    lpPolicy: EXPECTED_POLICY.lpPolicy,
    metadataName: EXPECTED_POLICY.name,
    metadataSymbol: EXPECTED_POLICY.symbol,
    metadataImage: EXPECTED_POLICY.metadataImage,
    metadataWebsite: EXPECTED_POLICY.metadataWebsite,
    metadataX: EXPECTED_POLICY.metadataX,
    metadataImmutable: true,
  };
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (launchlabProof[field] !== expectedValue) issues.push(`${label} ${field} must equal ${String(expectedValue)}`);
  }
  if (
    !Number.isFinite(launchlabProof.creatorSpendSol)
    || launchlabProof.creatorSpendSol < 0
    || launchlabProof.creatorSpendSol > 1
  ) {
    issues.push(`${label} creatorSpendSol must be a finite number from 0 to 1`);
  }
  if (!isOfficialSolscanMintUrl(launchlabProof.solscanUrl, launchlabProof.mint)) {
    issues.push(`${label} solscanUrl must be the canonical mint route`);
  }
  if (!isOfficialSolscanTransactionUrl(launchlabProof.solscanTransactionUrl, launchlabProof.launchTransaction)) {
    issues.push(`${label} solscanTransactionUrl must be the canonical transaction route`);
  }
  if (!isOfficialRaydiumLaunchUrl(launchlabProof.raydiumUrl, launchlabProof.mint)) {
    issues.push(`${label} raydiumUrl must be the canonical LaunchLab token route`);
  }
}

function compare(field, webValue, canonicalValue, source, issues) {
  if (!Object.is(webValue, canonicalValue)) {
    issues.push(`web proof.${field} must equal ${source}.${field}`);
  }
}

export function validateCanonicalProofBinding(record, mintProof, launchlabProof) {
  const issues = validateLaunchRecord(record).map((issue) => `web launch record: ${issue}`);
  validateMintProof(mintProof, issues);
  validateLaunchlabProof(launchlabProof, issues);
  if (!isObject(record?.proof) || !isObject(mintProof?.observed) || !isObject(launchlabProof)) return issues;

  for (const field of [
    "mint",
    "creator",
    "supplyBaseUnits",
    "decimals",
    "tokenProgram",
    "mintAuthority",
    "freezeAuthority",
    "creatorBalanceBaseUnits",
  ]) {
    const mintField = field === "tokenProgram" ? "tokenProgram" : field;
    compare(field, record.proof[field], mintProof.observed[mintField], "mainnet mint proof observed", issues);
  }
  compare("creator", record.proof.creator, mintProof.creator, "mainnet mint proof", issues);
  compare("mintVerifiedAt", record.proof.mintVerifiedAt, mintProof.checkedAt, "mainnet mint proof", issues);

  for (const field of [
    "mint",
    "creator",
    "launchId",
    "launchTransaction",
    "raydiumUrl",
    "solscanUrl",
    "solscanTransactionUrl",
    "creatorSpendSol",
    "quoteAsset",
    "curveAllocationBps",
    "liquidityAllocationBps",
    "teamAllocationBps",
    "graduationTargetSol",
    "creatorFirstBuySol",
    "creatorFeeEnabled",
    "lpPolicy",
    "metadataName",
    "metadataSymbol",
    "metadataUri",
    "metadataImage",
    "metadataWebsite",
    "metadataX",
    "metadataImmutable",
  ]) {
    compare(field, record.proof[field], launchlabProof[field], "mainnet LaunchLab proof", issues);
  }
  compare("launchVerifiedAt", record.proof.launchVerifiedAt, launchlabProof.checkedAt, "mainnet LaunchLab proof", issues);

  if (
    isExactIsoTimestamp(mintProof.checkedAt)
    && isExactIsoTimestamp(launchlabProof.checkedAt)
    && Date.parse(mintProof.checkedAt) > Date.parse(launchlabProof.checkedAt)
  ) {
    issues.push("canonical proof timestamps must satisfy mint checkedAt <= LaunchLab checkedAt");
  }
  return issues;
}

async function readCanonicalJson(root, relativePath, readFileImpl) {
  const filename = path.join(root, ...relativePath.split("/"));
  let contents;
  try {
    contents = await readFileImpl(filename, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read canonical ${relativePath}: ${detail}`);
  }
  try {
    return JSON.parse(contents);
  } catch {
    throw new Error(`Invalid JSON in canonical ${relativePath}`);
  }
}

export async function loadCanonicalProofArtifacts(
  { root = process.cwd(), readFileImpl = readFile } = {},
) {
  const mintProof = await readCanonicalJson(root, "proof/mainnet-mint.json", readFileImpl);
  const launchlabProof = await readCanonicalJson(root, "proof/mainnet-launchlab.json", readFileImpl);
  return { mintProof, launchlabProof };
}

export async function loadCanonicalProofsForLaunch(
  launch,
  { root = process.cwd(), readFileImpl = readFile } = {},
) {
  if (launch?.status !== "live") return { mintProof: null, launchlabProof: null };
  return loadCanonicalProofArtifacts({ root, readFileImpl });
}

const CURVE_ARTIFACTS = Object.freeze({
  "proof/mainnet-mint.json": Object.freeze({ kind: "mint-v2", schemaVersion: 2 }),
  "proof/mainnet-launchlab.json": Object.freeze({ kind: "launchlab-v2", schemaVersion: 2 }),
});
const GRADUATION_ARTIFACT_PATH = "proof/mainnet-graduation.json";
const CURVE_ARTIFACT_FIELDS = Object.freeze(["path", "sha256", "value"]);

function curveFail(code) {
  throw new Error(`curve-${code}`);
}

function clone(value) {
  return structuredClone(value);
}

function curveArtifactIssues(artifact, relativePath) {
  const issues = [];
  if (!isObject(artifact)
    || Object.keys(artifact).sort().join(",") !== [...CURVE_ARTIFACT_FIELDS].sort().join(",")) {
    return [`${relativePath} descriptor shape`];
  }
  const specification = CURVE_ARTIFACTS[relativePath];
  if (artifact.path !== relativePath) issues.push(`${relativePath} path`);
  if (!/^[0-9a-f]{64}$/.test(artifact.sha256)
    || artifact.sha256 !== sha256(canonicalBytes(artifact.value))) {
    issues.push(`${relativePath} sha256`);
  }
  if (!specification) {
    issues.push(`${relativePath} unsupported`);
    return issues;
  }
  const schema = validateSchema(specification.kind, artifact.value);
  if (!schema.ok) issues.push(...schema.errors.map((issue) => `${relativePath} ${issue}`));
  return issues;
}

export async function readCanonicalArtifact(relativePath, {
  root = process.cwd(),
  readFileImpl = readFile,
} = {}) {
  const specification = CURVE_ARTIFACTS[relativePath];
  if (!specification) curveFail("artifact-path");
  let bytes;
  try {
    const raw = await readFileImpl(path.join(path.resolve(root), ...relativePath.split("/")));
    bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  } catch {
    throw new Error(`canonical-artifact-read-failed: ${relativePath}`);
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`canonical-artifact-invalid-json: ${relativePath}`);
  }
  if (!bytes.equals(canonicalBytes(value))) {
    throw new Error(`canonical-artifact-noncanonical: ${relativePath}`);
  }
  const schema = validateSchema(specification.kind, value);
  if (!schema.ok) throw new Error(`canonical-artifact-schema-invalid: ${relativePath}`);
  return {
    path: relativePath,
    sha256: sha256(bytes),
    value,
  };
}

export async function loadCurveProofArtifacts({
  root = process.cwd(),
  readFileImpl = readFile,
} = {}) {
  try {
    await readFileImpl(path.join(path.resolve(root), ...GRADUATION_ARTIFACT_PATH.split("/")));
    curveFail("stage-stale");
  } catch (error) {
    if (error?.message === "curve-stage-stale") throw error;
    if (error?.code !== "ENOENT") curveFail("stage-stale-check");
  }
  const mintArtifact = await readCanonicalArtifact("proof/mainnet-mint.json", { root, readFileImpl });
  const launchlabArtifact = await readCanonicalArtifact(
    "proof/mainnet-launchlab.json",
    { root, readFileImpl },
  );
  return { mintArtifact, launchlabArtifact };
}

function curveProofFromArtifacts(mintArtifact, launchlabArtifact) {
  const mint = mintArtifact.value;
  const launchlab = launchlabArtifact.value;
  return {
    stage: "curve-live",
    availability: "verified",
    sourceArtifacts: {
      mint: {
        path: mintArtifact.path,
        sha256: mintArtifact.sha256,
        schemaVersion: mint.schemaVersion,
      },
      launchlab: {
        path: launchlabArtifact.path,
        sha256: launchlabArtifact.sha256,
        schemaVersion: launchlab.schemaVersion,
      },
    },
    observation: {
      finalizedSlot: launchlab.observation.finalizedSlot,
      finalizedAt: launchlab.observation.finalizedAt,
      checkedAt: launchlab.observation.checkedAt,
      rpcHost: launchlab.observation.rpcHost,
    },
    supply: clone(mint.supply),
    authorities: clone(mint.authorities),
    creatorBalance: clone(mint.creatorBalance),
    allocations: clone(launchlab.allocations),
    quote: clone(launchlab.quote),
    creatorFirstBuy: clone(launchlab.creatorFirstBuy),
    vesting: clone(launchlab.vesting),
    fees: clone(launchlab.fees),
    cost: clone(launchlab.cost),
    metadata: clone(launchlab.metadata),
    transactions: {
      creation: {
        signature: launchlab.transaction.signature,
        finalizedSlot: launchlab.transaction.finalizedSlot,
        finalizedAt: launchlab.transaction.finalizedAt,
      },
    },
    links: clone(launchlab.links),
  };
}

function compareCurveFact(issues, label, actual, expected) {
  if (!isDeepStrictEqual(actual, expected)) issues.push(`curve record ${label} does not match artifacts`);
}

export function validateCurveProofBinding({ record, mintArtifact, launchlabArtifact }) {
  const issues = [
    ...curveArtifactIssues(mintArtifact, "proof/mainnet-mint.json"),
    ...curveArtifactIssues(launchlabArtifact, "proof/mainnet-launchlab.json"),
  ];
  if (issues.length) return issues;
  issues.push(...validateLaunchRecord(record).map((issue) => `curve record ${issue}`));
  const mint = mintArtifact.value;
  const launchlab = launchlabArtifact.value;
  for (const field of ["mint", "creator", "metadataAccount", "launchId", "launchlabAuthority"]) {
    if (mint.identities[field] !== launchlab.identities[field]) {
      issues.push(`artifact identity ${field} does not match`);
    }
  }
  if (!isDeepStrictEqual(mint.metadata, launchlab.metadata)) {
    issues.push("artifact metadata does not match");
  }
  if (mint.network !== launchlab.network
    || mint.supply.tokenProgram !== launchlab.programs.token
    || mint.authorities.mintAuthority !== launchlab.identities.launchlabAuthority
    || mint.observation.creationSignature !== launchlab.transaction.signature
    || mint.observation.creationSlot > launchlab.transaction.finalizedSlot
    || launchlab.transaction.finalizedSlot > launchlab.observation.finalizedSlot
    || Date.parse(mint.observation.checkedAt) > Date.parse(launchlab.observation.checkedAt)) {
    issues.push("artifact chronology or program binding does not match");
  }
  if (!isObject(record)) return [...issues, "curve record shape"];
  compareCurveFact(issues, "status", record.status, "curve-live");
  compareCurveFact(issues, "network", record.network, "mainnet-beta");
  compareCurveFact(issues, "token mint", record.token?.mint, mint.identities.mint);
  const expectedProof = curveProofFromArtifacts(mintArtifact, launchlabArtifact);
  for (const [field, expected] of Object.entries(expectedProof)) {
    compareCurveFact(issues, `proof.${field}`, record.proof?.[field], expected);
  }
  return issues;
}

export function buildCurveLiveRecord(input) {
  if (!isObject(input)
    || Object.keys(input).sort().join(",") !== [
      "launchlabArtifact",
      "mintArtifact",
      "publishedAt",
      "sourceRecord",
    ].sort().join(",")) curveFail("arguments");
  const {
    sourceRecord,
    mintArtifact,
    launchlabArtifact,
    publishedAt,
  } = input;
  const sourceIssues = validateLaunchRecord(sourceRecord);
  const sourceAllowed = sourceRecord?.status === "prelaunch" && sourceRecord.proof === null
    || sourceRecord?.status === "curve-live"
      && sourceRecord.proof?.availability === "unavailable";
  if (sourceIssues.length || !sourceAllowed) curveFail("source-record");
  const artifactIssues = [
    ...curveArtifactIssues(mintArtifact, "proof/mainnet-mint.json"),
    ...curveArtifactIssues(launchlabArtifact, "proof/mainnet-launchlab.json"),
  ];
  if (artifactIssues.length) curveFail("artifacts");
  if (!isExactIsoTimestamp(publishedAt)
    || Date.parse(publishedAt) < Date.parse(launchlabArtifact.value.observation.checkedAt)) {
    curveFail("published-at");
  }
  const record = {
    schemaVersion: sourceRecord.schemaVersion,
    status: "curve-live",
    network: sourceRecord.network,
    project: clone(sourceRecord.project),
    token: {
      ...clone(sourceRecord.token),
      mint: mintArtifact.value.identities.mint,
    },
    launch: clone(sourceRecord.launch),
    proof: curveProofFromArtifacts(mintArtifact, launchlabArtifact),
  };
  const issues = validateCurveProofBinding({ record, mintArtifact, launchlabArtifact });
  if (issues.length) curveFail("binding");
  return record;
}

const STAGE_RECEIPT_FIELDS = Object.freeze([
  "schemaVersion",
  "network",
  "stage",
  "mint",
  "launchId",
  "signature",
  "finalizedSlot",
  "finalizedAt",
  "launchlabProgramId",
  "checks",
  "ok",
]);
const CURVE_RECEIPT_CHECKS = Object.freeze([
  "mainnetGenesis",
  "officialProgram",
  "transactionFinalized",
  "stageInstructionDecoded",
  "launchAccountMatches",
]);
const GRADUATED_RECEIPT_CHECKS = Object.freeze([
  ...CURVE_RECEIPT_CHECKS,
  "poolObserved",
]);
const CONTINUITY_RECEIPT_FIELDS = Object.freeze([
  "schemaVersion",
  "network",
  "stage",
  "mint",
  "launchId",
  "publicRecordSha256",
  "stageReceiptSha256",
  "finalizedSlot",
  "finalizedAt",
  "ok",
]);
const LAUNCHLAB_PROGRAM_ID = "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj";

function unavailableFail(code) {
  throw new Error(`unavailable-${code}`);
}

function exactUnavailableKeys(value, expected, code) {
  if (!isObject(value)
    || Object.keys(value).sort().join(",") !== [...expected].sort().join(",")) {
    unavailableFail(code);
  }
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validateStageReceipt(receipt, expectedStage) {
  const expectedChecks = expectedStage === "curve-live"
    ? CURVE_RECEIPT_CHECKS
    : expectedStage === "graduated"
      ? GRADUATED_RECEIPT_CHECKS
      : unavailableFail("stage");
  exactUnavailableKeys(receipt, STAGE_RECEIPT_FIELDS, "stage-receipt-shape");
  exactUnavailableKeys(receipt.checks, expectedChecks, "stage-receipt-checks");
  if (receipt.schemaVersion !== "observed-stage-v1"
    || receipt.network !== "mainnet-beta"
    || receipt.stage !== expectedStage
    || receipt.launchlabProgramId !== LAUNCHLAB_PROGRAM_ID
    || receipt.ok !== true
    || !Number.isSafeInteger(receipt.finalizedSlot)
    || receipt.finalizedSlot < 0
    || !isExactIsoTimestamp(receipt.finalizedAt)
    || !isCanonicalBase58(receipt.mint, 32)
    || !isCanonicalBase58(receipt.launchId, 32)
    || !isCanonicalBase58(receipt.signature, 64)
    || expectedChecks.some((field) => receipt.checks[field] !== true)) {
    unavailableFail("stage-receipt");
  }
}

function buildContinuityReceipt(record, stageReceipt) {
  return {
    schemaVersion: "unavailable-continuity-v1",
    network: "mainnet-beta",
    stage: stageReceipt.stage,
    mint: stageReceipt.mint,
    launchId: stageReceipt.launchId,
    publicRecordSha256: sha256(canonicalBytes(record)),
    stageReceiptSha256: sha256(canonicalBytes(stageReceipt)),
    finalizedSlot: stageReceipt.finalizedSlot,
    finalizedAt: stageReceipt.finalizedAt,
    ok: true,
  };
}

export function validateUnavailablePublication({
  record,
  stageReceipt,
  continuityReceipt,
}) {
  const issues = validateLaunchRecord(record).map((issue) => `record ${issue}`);
  if (!["curve-live", "graduated"].includes(record?.status)
    || record?.proof?.availability !== "unavailable") {
    issues.push("record is not unavailable lifecycle state");
  }
  try {
    validateStageReceipt(stageReceipt, record?.status);
  } catch {
    issues.push("stage receipt is invalid");
  }
  if (issues.length) return issues;
  try {
    exactUnavailableKeys(continuityReceipt, CONTINUITY_RECEIPT_FIELDS, "continuity-shape");
  } catch {
    return ["continuity receipt shape is invalid"];
  }
  const expected = buildContinuityReceipt(record, stageReceipt);
  if (!isDeepStrictEqual(continuityReceipt, expected)) {
    issues.push("continuity receipt does not bind record and stage receipt");
  }
  return issues;
}

function validatePriorUnavailableContinuity({
  sourceRecord,
  sourceStageReceipt,
  sourceContinuityReceipt,
  nextStageReceipt,
}) {
  validateStageReceipt(sourceStageReceipt, "curve-live");
  exactUnavailableKeys(
    sourceContinuityReceipt,
    CONTINUITY_RECEIPT_FIELDS,
    "source-continuity-shape",
  );
  const expectedPublicHash = sha256(canonicalBytes(sourceRecord));
  const expectedStageHash = sha256(canonicalBytes(sourceStageReceipt));
  if (sourceContinuityReceipt.schemaVersion !== "unavailable-continuity-v1"
    || sourceContinuityReceipt.network !== "mainnet-beta"
    || sourceContinuityReceipt.stage !== "curve-live"
    || sourceContinuityReceipt.mint !== sourceStageReceipt.mint
    || sourceContinuityReceipt.launchId !== sourceStageReceipt.launchId
    || sourceContinuityReceipt.publicRecordSha256 !== expectedPublicHash
    || sourceContinuityReceipt.stageReceiptSha256 !== expectedStageHash
    || sourceContinuityReceipt.finalizedSlot !== sourceStageReceipt.finalizedSlot
    || sourceContinuityReceipt.finalizedAt !== sourceStageReceipt.finalizedAt
    || sourceContinuityReceipt.ok !== true
    || nextStageReceipt.mint !== sourceStageReceipt.mint
    || nextStageReceipt.launchId !== sourceStageReceipt.launchId
    || nextStageReceipt.finalizedSlot < sourceStageReceipt.finalizedSlot
    || Date.parse(nextStageReceipt.finalizedAt) < Date.parse(sourceStageReceipt.finalizedAt)) {
    unavailableFail("source-continuity");
  }
}

export function buildUnavailableRecord(input) {
  if (!isObject(input)
    || !Object.hasOwn(input, "sourceRecord")
    || Object.keys(input).some((field) => ![
      "sourceRecord",
      "stageReceipt",
      "sourceStageReceipt",
      "sourceContinuityReceipt",
    ].includes(field))) unavailableFail("arguments");
  const {
    sourceRecord,
    stageReceipt = null,
    sourceStageReceipt = null,
    sourceContinuityReceipt = null,
  } = input;
  const sourceIssues = validateLaunchRecord(sourceRecord);
  if (sourceIssues.length) unavailableFail("source-record");

  if (["curve-live", "graduated"].includes(sourceRecord.status)
    && sourceRecord.proof?.availability === "unavailable"
    && stageReceipt === null
    && sourceStageReceipt === null
    && sourceContinuityReceipt === null) {
    return {
      record: structuredClone(sourceRecord),
      continuityReceipt: null,
    };
  }
  let targetStage;
  if (sourceRecord.status === "prelaunch"
    && sourceRecord.proof === null
    && sourceStageReceipt === null
    && sourceContinuityReceipt === null) {
    targetStage = "curve-live";
    validateStageReceipt(stageReceipt, targetStage);
  } else if (sourceRecord.status === "curve-live"
    && sourceRecord.proof?.availability === "verified"
    && sourceStageReceipt === null
    && sourceContinuityReceipt === null) {
    targetStage = "graduated";
    validateStageReceipt(stageReceipt, targetStage);
    const creation = sourceRecord.proof.transactions?.creation;
    if (stageReceipt.mint !== sourceRecord.token.mint
      || !creation
      || stageReceipt.finalizedSlot < creation.finalizedSlot
      || Date.parse(stageReceipt.finalizedAt) < Date.parse(creation.finalizedAt)) {
      unavailableFail("verified-source-binding");
    }
  } else if (sourceRecord.status === "curve-live"
    && sourceRecord.proof?.availability === "unavailable"
    && sourceStageReceipt !== null
    && sourceContinuityReceipt !== null) {
    targetStage = "graduated";
    validateStageReceipt(stageReceipt, targetStage);
    validatePriorUnavailableContinuity({
      sourceRecord,
      sourceStageReceipt,
      sourceContinuityReceipt,
      nextStageReceipt: stageReceipt,
    });
  } else {
    unavailableFail("transition");
  }

  const record = {
    schemaVersion: sourceRecord.schemaVersion,
    status: targetStage,
    network: sourceRecord.network,
    project: structuredClone(sourceRecord.project),
    token: {
      ...structuredClone(sourceRecord.token),
      mint: null,
    },
    launch: structuredClone(sourceRecord.launch),
    proof: {
      stage: targetStage,
      availability: "unavailable",
    },
  };
  const issues = validateLaunchRecord(record);
  if (issues.length) unavailableFail("record");
  const continuityReceipt = buildContinuityReceipt(record, stageReceipt);
  return { record, continuityReceipt };
}
