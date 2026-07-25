import assert from "node:assert/strict";
import test from "node:test";
import {
  initialRedemptionCursor,
  nextRedemptionScanRange,
  safeEventHead,
} from "./redemption-indexer.js";

test("safe head excludes unconfirmed EVM blocks", () => {
  assert.equal(safeEventHead(1_000, 12), 988);
  assert.equal(safeEventHead(5, 12), 0);
});

test("live indexing starts at the configured deployment block", () => {
  const cursor = initialRedemptionCursor(null, 800, 1_000);
  assert.equal(cursor, 799);
  assert.deepEqual(nextRedemptionScanRange(cursor, 1_000, 100), {
    fromBlock: 800,
    toBlock: 899,
  });
});

test("persisted cursors resume without skipping or duplicating a block", () => {
  const cursor = initialRedemptionCursor(899, 800, 1_000);
  assert.deepEqual(nextRedemptionScanRange(cursor, 1_000, 500), {
    fromBlock: 900,
    toBlock: 1_000,
  });
  assert.equal(nextRedemptionScanRange(1_000, 1_000, 500), null);
});

test("zero start block keeps demo mode scoped to post-boot events", () => {
  assert.equal(initialRedemptionCursor(null, 0, 1_000), 1_000);
});
