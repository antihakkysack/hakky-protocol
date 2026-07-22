import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  EXPECTED_POLICY,
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
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot parse canonical ${relativePath}: ${detail}`);
  }
}

export async function loadCanonicalProofsForLaunch(
  launch,
  { root = process.cwd(), readFileImpl = readFile } = {},
) {
  if (launch?.status !== "live") return { mintProof: null, launchlabProof: null };
  const mintProof = await readCanonicalJson(root, "proof/mainnet-mint.json", readFileImpl);
  const launchlabProof = await readCanonicalJson(root, "proof/mainnet-launchlab.json", readFileImpl);
  return { mintProof, launchlabProof };
}
