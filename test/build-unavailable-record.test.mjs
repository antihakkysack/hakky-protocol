import assert from "node:assert/strict";
import test from "node:test";
import { buildUnavailableRecord } from "../src/canonical-proof.mjs";
import {
  createCurveLiveRecordV2,
  createPrelaunchRecordV2,
} from "../test-support/launch-fixtures.mjs";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";

const MINT = "11111111111111111111111111111111";
const LAUNCH_ID = "SysvarRent111111111111111111111111111111111";
const SIGNATURE = "1".repeat(64);

function curveReceipt() {
  return {
    schemaVersion: "observed-stage-v1",
    network: "mainnet-beta",
    stage: "curve-live",
    mint: MINT,
    launchId: LAUNCH_ID,
    signature: SIGNATURE,
    finalizedSlot: 300000010,
    finalizedAt: "2026-07-23T00:01:00.000Z",
    launchlabProgramId: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
    checks: {
      mainnetGenesis: true,
      officialProgram: true,
      transactionFinalized: true,
      stageInstructionDecoded: true,
      launchAccountMatches: true,
    },
    ok: true,
  };
}

function graduatedReceipt() {
  return {
    ...curveReceipt(),
    stage: "graduated",
    signature: `${"1".repeat(63)}2`,
    finalizedSlot: 300000020,
    finalizedAt: "2026-07-23T00:02:00.000Z",
    checks: {
      ...curveReceipt().checks,
      poolObserved: true,
    },
  };
}

test("prelaunch promotes only to a schema-valid curve-live unavailable record", () => {
  const sourceRecord = createPrelaunchRecordV2();
  const before = structuredClone(sourceRecord);
  const stageReceipt = curveReceipt();
  const result = buildUnavailableRecord({ sourceRecord, stageReceipt });
  assert.deepEqual(sourceRecord, before);
  assert.equal(result.record.status, "curve-live");
  assert.equal(result.record.token.mint, null);
  assert.deepEqual(result.record.proof, {
    stage: "curve-live",
    availability: "unavailable",
  });
  assert.deepEqual(validateLaunchRecord(result.record), []);
  assert.deepEqual(Object.keys(result.continuityReceipt), [
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
  assert.match(result.continuityReceipt.publicRecordSha256, /^[0-9a-f]{64}$/);
  assert.match(result.continuityReceipt.stageReceiptSha256, /^[0-9a-f]{64}$/);
  assert.equal(result.continuityReceipt.mint, MINT);
  assert.equal(result.continuityReceipt.launchId, LAUNCH_ID);
  assert.equal(result.continuityReceipt.ok, true);

  const publicBytes = `${JSON.stringify(result.record, null, 2)}\n`;
  for (const forbidden of [
    MINT,
    LAUNCH_ID,
    SIGNATURE,
    "source-coverage-unavailable",
    "solscan.io",
    "raydium.io/launchpad/token/",
    "finalizedSlot",
    "launchlabProgramId",
  ]) {
    assert.equal(publicBytes.includes(forbidden), false, forbidden);
  }
});

test("unavailable promotion rejects fabricated, wrong-stage, or incomplete receipts", () => {
  for (const mutate of [
    (receipt) => { receipt.ok = false; },
    (receipt) => { receipt.network = "devnet"; },
    (receipt) => { receipt.stage = "graduated"; },
    (receipt) => { receipt.checks.transactionFinalized = false; },
    (receipt) => { receipt.mint = ""; },
    (receipt) => { receipt.launchId = "0".repeat(32); },
    (receipt) => { receipt.signature = "1".repeat(32); },
    (receipt) => { receipt.checks.poolObserved = true; },
    (receipt) => { receipt.extra = true; },
  ]) {
    const receipt = curveReceipt();
    mutate(receipt);
    assert.throws(
      () => buildUnavailableRecord({
        sourceRecord: createPrelaunchRecordV2(),
        stageReceipt: receipt,
      }),
      /unavailable-/,
    );
  }
});

test("same-stage unavailable promotion is idempotent and consumes no fabricated receipt", () => {
  const first = buildUnavailableRecord({
    sourceRecord: createPrelaunchRecordV2(),
    stageReceipt: curveReceipt(),
  });
  const second = buildUnavailableRecord({ sourceRecord: first.record });
  assert.deepEqual(second, { record: first.record, continuityReceipt: null });
  assert.notStrictEqual(second.record, first.record);
});

test("verified curve promotes to graduated unavailable only from matching later evidence", () => {
  const sourceRecord = createCurveLiveRecordV2();
  const receipt = graduatedReceipt();
  receipt.mint = sourceRecord.token.mint;
  const result = buildUnavailableRecord({ sourceRecord, stageReceipt: receipt });
  assert.equal(result.record.status, "graduated");
  assert.equal(result.record.token.mint, null);
  assert.deepEqual(result.record.proof, {
    stage: "graduated",
    availability: "unavailable",
  });
  assert.deepEqual(validateLaunchRecord(result.record), []);
  assert.equal(result.continuityReceipt.stage, "graduated");
  assert.equal(result.continuityReceipt.mint, receipt.mint);

  for (const mutate of [
    (candidate) => { candidate.mint = LAUNCH_ID; },
    (candidate) => { candidate.finalizedSlot = sourceRecord.proof.transactions.creation.finalizedSlot - 1; },
    (candidate) => { candidate.finalizedAt = "2026-07-22T23:59:00.000Z"; },
    (candidate) => { candidate.checks.poolObserved = false; },
  ]) {
    const invalid = graduatedReceipt();
    invalid.mint = sourceRecord.token.mint;
    mutate(invalid);
    assert.throws(
      () => buildUnavailableRecord({ sourceRecord, stageReceipt: invalid }),
      /unavailable-/,
    );
  }
});

test("unavailable continuity must bind the exact prior record and receipt", () => {
  const sourceStageReceipt = curveReceipt();
  const first = buildUnavailableRecord({
    sourceRecord: createPrelaunchRecordV2(),
    stageReceipt: sourceStageReceipt,
  });
  const nextStageReceipt = graduatedReceipt();
  const result = buildUnavailableRecord({
    sourceRecord: first.record,
    sourceStageReceipt,
    sourceContinuityReceipt: first.continuityReceipt,
    stageReceipt: nextStageReceipt,
  });
  assert.equal(result.record.status, "graduated");
  assert.equal(result.record.token.mint, null);
  assert.deepEqual(result.record.proof, {
    stage: "graduated",
    availability: "unavailable",
  });
  assert.deepEqual(validateLaunchRecord(result.record), []);

  for (const mutate of [
    ({ continuity }) => { continuity.publicRecordSha256 = "0".repeat(64); },
    ({ continuity }) => { continuity.stageReceiptSha256 = "0".repeat(64); },
    ({ continuity }) => { continuity.ok = false; },
    ({ sourceReceipt }) => { sourceReceipt.mint = "SysvarC1ock11111111111111111111111111111111"; },
    ({ nextReceipt }) => { nextReceipt.launchId = "SysvarC1ock11111111111111111111111111111111"; },
    ({ nextReceipt }) => { nextReceipt.finalizedSlot = sourceStageReceipt.finalizedSlot - 1; },
    ({ nextReceipt }) => { nextReceipt.finalizedAt = "2026-07-22T23:59:00.000Z"; },
  ]) {
    const sourceReceipt = structuredClone(sourceStageReceipt);
    const continuity = structuredClone(first.continuityReceipt);
    const nextReceipt = graduatedReceipt();
    mutate({ sourceReceipt, continuity, nextReceipt });
    assert.throws(
      () => buildUnavailableRecord({
        sourceRecord: first.record,
        sourceStageReceipt: sourceReceipt,
        sourceContinuityReceipt: continuity,
        stageReceipt: nextReceipt,
      }),
      /unavailable-/,
    );
  }
});

test("unavailable builder rejects regressions, jumps, and irrelevant receipt chains", () => {
  assert.throws(
    () => buildUnavailableRecord({
      sourceRecord: createPrelaunchRecordV2(),
      stageReceipt: graduatedReceipt(),
    }),
    /unavailable-/,
  );
  assert.throws(
    () => buildUnavailableRecord({
      sourceRecord: createCurveLiveRecordV2(),
      stageReceipt: curveReceipt(),
    }),
    /unavailable-/,
  );
  assert.throws(
    () => buildUnavailableRecord({
      sourceRecord: createCurveLiveRecordV2({ availability: "unavailable" }),
      stageReceipt: graduatedReceipt(),
    }),
    /unavailable-/,
  );
});
