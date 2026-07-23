import {
  evaluateHakkyLaunchlabSourceCoverage,
  HAKKY_SOURCE_COVERAGE_UNAVAILABLE,
} from "./raydium-launchlab.mjs";

const SHARED_FIELDS = Object.freeze([
  "allocations",
  "quote",
  "creatorFirstBuy",
  "vesting",
  "fees",
  "migration",
  "metadata",
  "cost",
  "links",
]);

function fail(code) {
  throw new Error(code);
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys, code) {
  if (!plainObject(value)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) fail(code);
}

function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function check(id, observed, expected) {
  if (!equal(observed, expected)) fail(id);
  return true;
}

function commonPlatformConfig(value, hashField, code) {
  if (!plainObject(value) || !(hashField in value)) fail(code);
  const { [hashField]: hash, ...common } = value;
  if (typeof hash !== "string" || !/^[0-9a-f]{64}$/u.test(hash)) fail(code);
  return common;
}

function unsigned(value, code) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/u.test(value)) fail(code);
  return BigInt(value);
}

function timestamp(value, code) {
  if (typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) fail(code);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) fail(code);
  return milliseconds;
}

function checkPublicIdentifiers(transactionEvidence, accountEvidence, publicIdentifiers) {
  exactKeys(
    publicIdentifiers,
    ["mint", "creator", "launchId", "creationSignature"],
    "public-identifiers",
  );
  check("public-mint", publicIdentifiers.mint, transactionEvidence.identities.mint);
  check("public-mint", publicIdentifiers.mint, accountEvidence.identities.mint);
  check("public-creator", publicIdentifiers.creator, transactionEvidence.identities.creator);
  check("public-creator", publicIdentifiers.creator, accountEvidence.identities.creator);
  check("public-launch-id", publicIdentifiers.launchId, transactionEvidence.identities.launchId);
  check("public-launch-id", publicIdentifiers.launchId, accountEvidence.identities.launchId);
  check(
    "public-creation-signature",
    publicIdentifiers.creationSignature,
    transactionEvidence.transaction.signature,
  );
}

function checkFixedPolicy(transactionEvidence) {
  const { allocations, quote, creatorFirstBuy, vesting, fees, migration, platformConfig } = transactionEvidence;
  if (allocations.publicCurveBaseUnits !== "800000000000"
    || allocations.publicCurveBps !== 8000
    || allocations.liquidityBaseUnits !== "200000000000"
    || allocations.liquidityBps !== 2000
    || allocations.teamBaseUnits !== "0"
    || allocations.teamBps !== 0
    || allocations.totalBps !== 10000) fail("allocation-policy");
  if (quote.symbol !== "SOL"
    || quote.decimals !== 9
    || quote.graduationThresholdLamports !== "24000000000") fail("quote-policy");
  if (creatorFirstBuy.creatorLamports !== "0"
    || creatorFirstBuy.creatorTokenBaseUnits !== "0") fail("creator-first-buy-policy");
  if (vesting.lockedBaseUnits !== "0"
    || vesting.cliffSeconds !== "0"
    || vesting.unlockSeconds !== "0") fail("vesting-policy");
  if (platformConfig.immutableBinding !== "verified-per-launch-snapshot"
    || fees.snapshotImmutable !== true) fail("immutable-economics");
  if (platformConfig.creatorFeeRateMillionths !== "0"
    || fees.creatorTradingFeeRateMillionths !== "0"
    || fees.creatorFeeKey !== null
    || fees.creatorFeeRights !== false) fail("fee-policy");
  if (migration.type !== "cpmm"
    || migration.lpPolicy !== "burn-and-earn"
    || migration.platformLpBps !== 0
    || migration.creatorLpBps !== 0
    || migration.irreversibleLpBps !== 10000) fail("migration-policy");
}

function checkCost(cost) {
  const metadata = unsigned(cost.metadataUploadLamports, "cost-shape");
  const creation = unsigned(cost.creationDebitLamports, "cost-shape");
  const recovery = unsigned(cost.recoveryDebitLamports, "cost-shape");
  const graduation = unsigned(cost.graduationDebitLamports, "cost-shape");
  const cumulative = unsigned(cost.cumulativeCreatorDebitLamports, "cost-shape");
  const cap = unsigned(cost.capLamports, "cost-shape");
  if (graduation !== 0n
    || cumulative !== metadata + creation + recovery + graduation
    || cap !== 1_000_000_000n
    || cumulative > cap
    || cost.withinCap !== true) fail("cost-cap");
}

function checkChronology(transactionEvidence, accountEvidence, checkedAt) {
  if (!Number.isSafeInteger(transactionEvidence.transaction.finalizedSlot)
    || transactionEvidence.transaction.finalizedSlot < 0
    || !Number.isSafeInteger(accountEvidence.observation.finalizedSlot)
    || accountEvidence.observation.finalizedSlot < transactionEvidence.transaction.finalizedSlot) {
    fail("finalized-chronology");
  }
  const transactionTime = timestamp(transactionEvidence.transaction.finalizedAt, "finalized-chronology");
  const accountTime = timestamp(accountEvidence.observation.finalizedAt, "finalized-chronology");
  const checkedTime = timestamp(checkedAt, "finalized-chronology");
  if (transactionTime > accountTime || accountTime > checkedTime) fail("finalized-chronology");
}

export function reconcileLaunchlabEvidence({
  transactionEvidence,
  accountEvidence,
  publicIdentifiers,
  checkedAt,
}) {
  if (!plainObject(transactionEvidence) || !plainObject(accountEvidence)) fail("launchlab-evidence");
  check("sources-agree-network", transactionEvidence.network, accountEvidence.network);
  check("sources-agree-network", transactionEvidence.network, "mainnet-beta");
  check("sources-agree-identities", transactionEvidence.identities, accountEvidence.identities);
  const transactionPlatform = commonPlatformConfig(
    transactionEvidence.platformConfig,
    "creationAccountSha256",
    "sources-agree-platform-config",
  );
  const accountPlatform = commonPlatformConfig(
    accountEvidence.platformConfig,
    "verificationAccountSha256",
    "sources-agree-platform-config",
  );
  check("sources-agree-platform-config", transactionPlatform, accountPlatform);
  for (const field of SHARED_FIELDS) {
    const id = `sources-agree-${field.replaceAll(/[A-Z]/gu, (value) => `-${value.toLowerCase()}`)}`;
    check(id, transactionEvidence[field], accountEvidence[field]);
  }
  checkPublicIdentifiers(transactionEvidence, accountEvidence, publicIdentifiers);
  checkFixedPolicy(transactionEvidence);
  checkCost(transactionEvidence.cost);
  checkChronology(transactionEvidence, accountEvidence, checkedAt);
  const coverage = evaluateHakkyLaunchlabSourceCoverage({
    migrationType: transactionEvidence.migration.type,
    platformScaleRaw: unsigned(transactionEvidence.platformConfig.platformScaleRaw, "coverage-query"),
    creatorScaleRaw: unsigned(transactionEvidence.platformConfig.creatorScaleRaw, "coverage-query"),
    burnScaleRaw: unsigned(transactionEvidence.platformConfig.burnScaleRaw, "coverage-query"),
  });
  check("source-coverage-control", coverage, HAKKY_SOURCE_COVERAGE_UNAVAILABLE);
  return HAKKY_SOURCE_COVERAGE_UNAVAILABLE;
}

export async function fetchLaunchlabEvidence({ connection, request }) {
  if (!plainObject(connection) || typeof connection.collectLaunchlabEvidence !== "function") {
    fail("launchlab-collector");
  }
  return connection.collectLaunchlabEvidence(request);
}

export async function runLaunchlabVerifier({
  argv = process.argv.slice(2),
  fetchEvidence = fetchLaunchlabEvidence,
  publishProof,
  options,
} = {}) {
  if (!Array.isArray(argv) || typeof fetchEvidence !== "function") fail("launchlab-runner");
  const evidence = await fetchEvidence({ argv, options });
  const coverage = reconcileLaunchlabEvidence(evidence);
  if (!equal(coverage, HAKKY_SOURCE_COVERAGE_UNAVAILABLE)) fail("source-coverage-control");
  void publishProof;
  return Object.freeze({
    proof: null,
    publication: null,
    coverage: HAKKY_SOURCE_COVERAGE_UNAVAILABLE,
  });
}
