import assert from "node:assert/strict";
import test from "node:test";
import { buildUnavailableRecord } from "../src/canonical-proof.mjs";
import { createPrelaunchRecordV2 } from "../test-support/launch-fixtures.mjs";
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
