import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

/** Create tables if missing. Safe to call on every service start. */
export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // All four processes start together under Compose. Serialize DDL so
    // concurrent CREATE IF NOT EXISTS operations cannot race in PostgreSQL's
    // system catalogs.
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", ["6849659"]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id         BIGSERIAL PRIMARY KEY,
        service    TEXT NOT NULL,
        event      TEXT NOT NULL,
        payload    JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS worker_cursors (
        worker       TEXT PRIMARY KEY,
        block_number BIGINT NOT NULL,
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS redemption_jobs (
        id                 TEXT PRIMARY KEY,
        account            TEXT NOT NULL,
        amount_sats        TEXT NOT NULL,
        btc_payout_address TEXT NOT NULL,
        request_block      BIGINT NOT NULL,
        request_tx_hash    TEXT NOT NULL,
        status             TEXT NOT NULL DEFAULT 'pending',
        btc_txid           TEXT,
        attempts           INTEGER NOT NULL DEFAULT 0,
        last_error         TEXT,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS redemption_jobs_status_id_idx
        ON redemption_jobs (status, (id::numeric));
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Append an immutable audit record after a confirmed protocol action. */
export async function audit(service: string, event: string, payload: unknown = {}): Promise<void> {
  await pool.query(
    "INSERT INTO audit_log (service, event, payload) VALUES ($1, $2, $3)",
    [service, event, JSON.stringify(payload)],
  );
}

export interface RedemptionJobInput {
  id: string;
  account: string;
  amountSats: string;
  btcPayoutAddress: string;
  requestBlock: number;
  requestTxHash: string;
}

export interface RedemptionJob {
  id: string;
  account: string;
  amountSats: string;
  btcPayoutAddress: string;
  requestBlock: string;
  requestTxHash: string;
  status: string;
  btcTxid: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const redemptionColumns = `
  id,
  account,
  amount_sats AS "amountSats",
  btc_payout_address AS "btcPayoutAddress",
  request_block AS "requestBlock",
  request_tx_hash AS "requestTxHash",
  status,
  btc_txid AS "btcTxid",
  attempts,
  last_error AS "lastError",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export async function getWorkerCursor(worker: string): Promise<number | null> {
  const { rows } = await pool.query<{ block_number: string }>(
    "SELECT block_number FROM worker_cursors WHERE worker = $1",
    [worker],
  );
  if (rows.length === 0) return null;
  const value = Number(rows[0].block_number);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid persisted block cursor for ${worker}: ${rows[0].block_number}`);
  }
  return value;
}

export async function setWorkerCursor(worker: string, blockNumber: number): Promise<void> {
  if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) {
    throw new Error(`Invalid block cursor: ${blockNumber}`);
  }
  await pool.query(
    `INSERT INTO worker_cursors (worker, block_number)
     VALUES ($1, $2)
     ON CONFLICT (worker) DO UPDATE
       SET block_number = EXCLUDED.block_number,
           updated_at = now()`,
    [worker, blockNumber],
  );
}

export async function upsertRedemptionJob(job: RedemptionJobInput): Promise<void> {
  const result = await pool.query(
    `INSERT INTO redemption_jobs (
       id, account, amount_sats, btc_payout_address, request_block, request_tx_hash
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE
       SET updated_at = now()
       WHERE redemption_jobs.account = EXCLUDED.account
         AND redemption_jobs.amount_sats = EXCLUDED.amount_sats
         AND redemption_jobs.btc_payout_address = EXCLUDED.btc_payout_address
         AND redemption_jobs.request_block = EXCLUDED.request_block
         AND redemption_jobs.request_tx_hash = EXCLUDED.request_tx_hash
     RETURNING id`,
    [
      job.id,
      job.account,
      job.amountSats,
      job.btcPayoutAddress,
      job.requestBlock,
      job.requestTxHash,
    ],
  );
  if (result.rowCount !== 1) {
    throw new Error(
      `Redemption ${job.id} conflicts with previously indexed immutable event data`,
    );
  }
}

export async function getRedemptionJob(id: string): Promise<RedemptionJob | null> {
  const { rows } = await pool.query<RedemptionJob>(
    `SELECT ${redemptionColumns} FROM redemption_jobs WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listActionableRedemptionJobs(limit = 100): Promise<RedemptionJob[]> {
  const { rows } = await pool.query<RedemptionJob>(
    `SELECT ${redemptionColumns}
       FROM redemption_jobs
      WHERE status IN ('pending', 'payout-verified')
      ORDER BY id::numeric ASC
      LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function markRedemptionPayoutVerified(id: string, btcTxid: string): Promise<void> {
  await pool.query(
    `UPDATE redemption_jobs
        SET status = 'payout-verified',
            btc_txid = $2,
            last_error = NULL,
            updated_at = now()
      WHERE id = $1`,
    [id, btcTxid],
  );
}

export async function markRedemptionSettled(id: string, btcTxid: string): Promise<void> {
  await pool.query(
    `UPDATE redemption_jobs
        SET status = 'settled',
            btc_txid = $2,
            last_error = NULL,
            updated_at = now()
      WHERE id = $1`,
    [id, btcTxid],
  );
}

export async function markRedemptionCancelled(id: string): Promise<void> {
  await pool.query(
    `UPDATE redemption_jobs
        SET status = 'cancelled',
            last_error = NULL,
            updated_at = now()
      WHERE id = $1`,
    [id],
  );
}

export async function markRedemptionError(id: string, error: string): Promise<void> {
  await pool.query(
    `UPDATE redemption_jobs
        SET attempts = attempts + 1,
            last_error = $2,
            updated_at = now()
      WHERE id = $1`,
    [id, error.slice(0, 2_000)],
  );
}
