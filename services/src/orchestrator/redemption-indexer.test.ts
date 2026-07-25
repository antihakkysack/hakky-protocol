import assert from "node:assert/strict";
import test from "node:test";
import {
  initialRedemptionCursor,
  missingRedemptionIds,
  nextRedemptionScanRange,
  redemptionCursorKey,
  safeEventHead,
} from "./redemption-indexer.js";

const VAULT = `0x${"ab".repeat(20)}`;
const OTHER_VAULT = `0x${"cd".repeat(20)}`;

test("a skipped redemption is detectable from the sequential id space", () => {
  // queryFilter returns [] rather than an error when a load-balanced RPC backend
  // lags the head, so the cursor can advance past a real event. Ids are strictly
  // sequential and redemptionCount() is authoritative, so any gap is visible.
  assert.deepEqual(missingRedemptionIds([1n, 2n, 4n], 4n), [3n]);
  assert.deepEqual(missingRedemptionIds([], 3n), [1n, 2n, 3n]);
  assert.deepEqual(missingRedemptionIds([1n, 2n, 3n], 3n), []);
});

test("gap detection tolerates a lagging index and unordered input", () => {
  // The tail of the range may legitimately not be indexed yet this poll.
  assert.deepEqual(missingRedemptionIds([1n, 2n], 2n), []);
  assert.deepEqual(missingRedemptionIds([3n, 1n, 2n], 3n), []);
  // Duplicates must not manufacture a phantom gap.
  assert.deepEqual(missingRedemptionIds([1n, 1n, 2n], 2n), []);
  assert.deepEqual(missingRedemptionIds([], 0n), []);
});

test("the cursor key is namespaced by chain and vault", () => {
  // Launch blockers 1 and 8 make a vault redeploy likely while blocker 6 requires the
  // database to survive it. A global key would carry the old vault's block height into
  // the new deployment and silently skip everything before it.
  const key = redemptionCursorKey(1, VAULT);
  assert.notEqual(key, redemptionCursorKey(11155111, VAULT), "chain must namespace");
  assert.notEqual(key, redemptionCursorKey(1, OTHER_VAULT), "vault must namespace");
  assert.equal(key, redemptionCursorKey(1, VAULT.toUpperCase()), "case must not fork the key");
});

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
