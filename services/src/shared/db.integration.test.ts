import assert from "node:assert/strict";
import test from "node:test";
import {
  audit,
  getRedemptionJob,
  getWorkerCursor,
  initDb,
  listActionableRedemptionJobs,
  markRedemptionCancelled,
  markRedemptionError,
  markRedemptionPayoutVerified,
  markRedemptionSettled,
  pool,
  setWorkerCursor,
  upsertRedemptionJob,
} from "./db.js";

const CURSOR_NAME = "integration-test:redemptions";
const FIRST_JOB_ID = "900000001";
const SECOND_JOB_ID = "900000002";
const TXID = "ab".repeat(32);

test("Postgres persists cursors, redemption transitions, and audit records", async () => {
  await initDb();

  try {
    await pool.query("DELETE FROM worker_cursors WHERE worker = $1", [CURSOR_NAME]);
    await pool.query("DELETE FROM redemption_jobs WHERE id = ANY($1::text[])", [
      [FIRST_JOB_ID, SECOND_JOB_ID],
    ]);
    await pool.query(
      "DELETE FROM audit_log WHERE service = $1 AND event = $2",
      ["integration-test", "state-transition"],
    );

    assert.equal(await getWorkerCursor(CURSOR_NAME), null);
    await setWorkerCursor(CURSOR_NAME, 123_456);
    assert.equal(await getWorkerCursor(CURSOR_NAME), 123_456);

    await upsertRedemptionJob({
      id: SECOND_JOB_ID,
      account: "0x2222222222222222222222222222222222222222",
      amountSats: "25000000",
      btcPayoutAddress: "bc1qexamplepayoutaddress000000000000000000",
      requestBlock: 123_457,
      requestTxHash: `0x${"22".repeat(32)}`,
    });
    await upsertRedemptionJob({
      id: FIRST_JOB_ID,
      account: "0x1111111111111111111111111111111111111111",
      amountSats: "10000000",
      btcPayoutAddress: "bc1qexamplepayoutaddress111111111111111111",
      requestBlock: 123_456,
      requestTxHash: `0x${"11".repeat(32)}`,
    });

    const actionable = (await listActionableRedemptionJobs()).filter((job) =>
      [FIRST_JOB_ID, SECOND_JOB_ID].includes(job.id),
    );
    assert.deepEqual(
      actionable.map((job) => job.id),
      [FIRST_JOB_ID, SECOND_JOB_ID],
      "numeric redemption ids should be returned in deterministic order",
    );

    await assert.rejects(
      upsertRedemptionJob({
        id: FIRST_JOB_ID,
        account: "0x1111111111111111111111111111111111111111",
        amountSats: "99999999",
        btcPayoutAddress: "bc1qexamplepayoutaddress111111111111111111",
        requestBlock: 123_456,
        requestTxHash: `0x${"11".repeat(32)}`,
      }),
      /conflicts with previously indexed immutable event data/,
    );

    await markRedemptionError(FIRST_JOB_ID, "temporary failure");
    let first = await getRedemptionJob(FIRST_JOB_ID);
    assert.equal(first?.attempts, 1);
    assert.equal(first?.lastError, "temporary failure");

    await markRedemptionPayoutVerified(FIRST_JOB_ID, TXID);
    first = await getRedemptionJob(FIRST_JOB_ID);
    assert.equal(first?.status, "payout-verified");
    assert.equal(first?.btcTxid, TXID);
    assert.equal(first?.lastError, null);

    await markRedemptionSettled(FIRST_JOB_ID, TXID);
    assert.equal((await getRedemptionJob(FIRST_JOB_ID))?.status, "settled");

    await markRedemptionCancelled(SECOND_JOB_ID);
    assert.equal((await getRedemptionJob(SECOND_JOB_ID))?.status, "cancelled");

    await audit("integration-test", "state-transition", {
      cursor: 123_456,
      redemptionId: FIRST_JOB_ID,
    });
    const { rows } = await pool.query<{ payload: { redemptionId: string } }>(
      `SELECT payload
         FROM audit_log
        WHERE service = $1 AND event = $2
        ORDER BY id DESC
        LIMIT 1`,
      ["integration-test", "state-transition"],
    );
    assert.equal(rows[0]?.payload.redemptionId, FIRST_JOB_ID);
  } finally {
    await pool.query("DELETE FROM worker_cursors WHERE worker = $1", [CURSOR_NAME]);
    await pool.query("DELETE FROM redemption_jobs WHERE id = ANY($1::text[])", [
      [FIRST_JOB_ID, SECOND_JOB_ID],
    ]);
    await pool.query(
      "DELETE FROM audit_log WHERE service = $1 AND event = $2",
      ["integration-test", "state-transition"],
    );
    await pool.end();
  }
});
