import assert from "node:assert/strict";
import test from "node:test";
import {
  HAKKY_SOURCE_COVERAGE_UNAVAILABLE,
} from "../src/raydium-launchlab.mjs";
import { encodeBase58 } from "../src/solana-transaction.mjs";
import {
  reconcileLaunchlabEvidence,
  runLaunchlabVerifier,
} from "../src/launchlab-proof.mjs";
import {
  createLaunchlabReconciliationFixture,
} from "../test-support/launchlab-proof-fixtures.mjs";
import {
  main as launchlabMain,
  readOptions,
} from "../scripts/verify-launchlab.mjs";

const CLI_VALUES = Object.freeze({
  mint: "11111111111111111111111111111111",
  creator: "SysvarC1ock11111111111111111111111111111111",
  launchId: "SysvarRent111111111111111111111111111111111",
  platformConfig: "Config1111111111111111111111111111111111111",
  creation: "1".repeat(64),
  recovery: encodeBase58(Buffer.alloc(64, 2)),
});

function validArgv() {
  return [
    "--mint", CLI_VALUES.mint,
    "--creator", CLI_VALUES.creator,
    "--launch-id", CLI_VALUES.launchId,
    "--platform-config", CLI_VALUES.platformConfig,
    "--creation-transaction", CLI_VALUES.creation,
    "--metadata-manifest", "artifacts/metadata/manifest.json",
    "--metadata-readback", "artifacts/metadata/readback.json",
    "--recovery-transaction", CLI_VALUES.recovery,
    "--rpc", "https://api.mainnet-beta.solana.com/",
  ];
}

function setPath(root, dottedPath, value) {
  const parts = dottedPath.split(".");
  let cursor = root;
  for (const part of parts.slice(0, -1)) cursor = cursor[part];
  cursor[parts.at(-1)] = value;
}

test("ordinary two-source reconciliation reaches the exact frozen coverage stop", () => {
  const fixture = createLaunchlabReconciliationFixture();
  const before = structuredClone(fixture);
  const result = reconcileLaunchlabEvidence(fixture);
  assert.deepEqual(result, HAKKY_SOURCE_COVERAGE_UNAVAILABLE);
  assert.strictEqual(result, HAKKY_SOURCE_COVERAGE_UNAVAILABLE);
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(fixture, before);
  assert.equal("proof" in result, false);
  assert.equal("candidate" in result, false);
});

test("each independent transaction/account source mismatch fails a named check", () => {
  const cases = [
    ["identities.mint", "11111111111111111111111111111112", "sources-agree-identities"],
    ["platformConfig.address", "SysvarFees111111111111111111111111111111111", "sources-agree-platform-config"],
    ["allocations.publicCurveBaseUnits", "799999999999", "sources-agree-allocations"],
    ["quote.graduationThresholdLamports", "23999999999", "sources-agree-quote"],
    ["creatorFirstBuy.creatorLamports", "1", "sources-agree-creator-first-buy"],
    ["vesting.lockedBaseUnits", "1", "sources-agree-vesting"],
    ["fees.creatorTradingFeeRateMillionths", "1", "sources-agree-fees"],
    ["migration.creatorLpBps", 1, "sources-agree-migration"],
    ["metadata.symbol", "FAKE", "sources-agree-metadata"],
    ["cost.creationDebitLamports", "2001", "sources-agree-cost"],
    ["links.raydiumLaunchlab", "https://raydium.io/launchpad/token/11111111111111111111111111111112", "sources-agree-links"],
  ];
  for (const [path, value, code] of cases) {
    const fixture = createLaunchlabReconciliationFixture();
    setPath(fixture.accountEvidence, path, value);
    assert.throws(() => reconcileLaunchlabEvidence(fixture), new RegExp(code), path);
  }
});

test("public identifiers bind the finalized transaction and both evidence sources", () => {
  const cases = [
    ["mint", "11111111111111111111111111111112", "public-mint"],
    ["creator", "SysvarFees111111111111111111111111111111111", "public-creator"],
    ["launchId", "Vote111111111111111111111111111111111111111", "public-launch-id"],
    ["creationSignature", "2".repeat(64), "public-creation-signature"],
  ];
  for (const [field, value, code] of cases) {
    const fixture = createLaunchlabReconciliationFixture();
    fixture.publicIdentifiers[field] = value;
    assert.throws(() => reconcileLaunchlabEvidence(fixture), new RegExp(code), field);
  }
});

test("immutable economics, fee rights, LP union, cost, and finality fail closed", () => {
  const mutateBoth = (path, value) => {
    const fixture = createLaunchlabReconciliationFixture();
    setPath(fixture.transactionEvidence, path, value);
    setPath(fixture.accountEvidence, path, value);
    return fixture;
  };
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("fees.snapshotImmutable", false)),
    /immutable-economics/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("fees.creatorFeeKey", "11111111111111111111111111111111")),
    /fee-policy/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("fees.creatorFeeRights", true)),
    /fee-policy/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("migration.platformLpBps", 1)),
    /migration-policy/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("migration.creatorLpBps", 1)),
    /migration-policy/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("migration.lpPolicy", "lp-burn")),
    /migration-policy/,
  );

  const expensive = mutateBoth("cost.cumulativeCreatorDebitLamports", "1000000001");
  expensive.transactionEvidence.cost.creationDebitLamports = "1000000000";
  expensive.accountEvidence.cost.creationDebitLamports = "1000000000";
  expensive.transactionEvidence.cost.withinCap = false;
  expensive.accountEvidence.cost.withinCap = false;
  assert.throws(() => reconcileLaunchlabEvidence(expensive), /cost-cap/);

  const stale = createLaunchlabReconciliationFixture();
  stale.checkedAt = "2026-07-23T00:01:00.000Z";
  assert.throws(() => reconcileLaunchlabEvidence(stale), /finalized-chronology/);
});

test("the verifier never publishes when exact HAKKY source coverage is unavailable", async () => {
  const fixture = createLaunchlabReconciliationFixture();
  let publications = 0;
  const result = await runLaunchlabVerifier({
    argv: [],
    fetchEvidence: async () => fixture,
    publishProof: async () => {
      publications += 1;
      return { published: true };
    },
    options: Object.freeze({ fixtureMode: true }),
  });
  assert.deepEqual(result, {
    proof: null,
    publication: null,
    coverage: HAKKY_SOURCE_COVERAGE_UNAVAILABLE,
  });
  assert.equal(publications, 0);
});

test("CLI accepts only exact public launch inputs and repeated recovery signatures", () => {
  const parsed = readOptions([
    ...validArgv(),
    "--recovery-transaction", encodeBase58(Buffer.alloc(64, 3)),
  ]);
  assert.deepEqual(parsed, {
    mintAddress: CLI_VALUES.mint,
    creatorAddress: CLI_VALUES.creator,
    launchId: CLI_VALUES.launchId,
    platformConfigAddress: CLI_VALUES.platformConfig,
    creationSignature: CLI_VALUES.creation,
    recoverySignatures: [CLI_VALUES.recovery, encodeBase58(Buffer.alloc(64, 3))],
    metadataManifestPath: "artifacts/metadata/manifest.json",
    metadataReadbackPath: "artifacts/metadata/readback.json",
    rpcUrl: "https://api.mainnet-beta.solana.com/",
    rpcHost: "api.mainnet-beta.solana.com",
  });
  for (const mutation of [
    [...validArgv(), "--out", "proof/other.json"],
    [...validArgv(), "--mint", CLI_VALUES.mint],
    validArgv().with(0, `--mint=${CLI_VALUES.mint}`),
    validArgv().with(11, "artifacts/metadata/other.json"),
    validArgv().with(15, "https://user:secret@rpc.example.com/"),
  ]) {
    assert.throws(() => readOptions(mutation), /cli-|rpc-url-/);
  }
});

test("CLI main emits no proof and exits nonzero for the frozen coverage stop", async () => {
  let stdout = "";
  let stderr = "";
  const exitCode = await launchlabMain({
    runVerifier: async () => ({
      proof: null,
      publication: null,
      coverage: HAKKY_SOURCE_COVERAGE_UNAVAILABLE,
    }),
    stdout: { write: (value) => { stdout += value; } },
    stderr: { write: (value) => { stderr += value; } },
  });
  assert.equal(exitCode, 1);
  assert.equal(stdout, "");
  assert.equal(stderr, "SOURCE_COVERAGE_UNAVAILABLE: cpmm-burn-scale-lp-rights-unmapped\n");
});
