import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

/** Create tables if missing. Safe to call on every service start. */
export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id         BIGSERIAL PRIMARY KEY,
      service    TEXT NOT NULL,
      event      TEXT NOT NULL,
      payload    JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

/** Append an immutable audit record. Every on-chain write should log here first. */
export async function audit(service: string, event: string, payload: unknown = {}): Promise<void> {
  await pool.query(
    "INSERT INTO audit_log (service, event, payload) VALUES ($1, $2, $3)",
    [service, event, JSON.stringify(payload)],
  );
}
