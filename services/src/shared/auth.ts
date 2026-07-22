import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

/**
 * Express middleware guarding the on-chain write endpoints (`/screen`, `/deposit`).
 * Requires `Authorization: Bearer <WRITE_API_KEY>`. Fail-closed: if no key is
 * configured, all writes are refused (503) rather than left open. Uses a
 * constant-time compare to avoid leaking the key via timing.
 */
export function requireWriteAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = config.WRITE_API_KEY;
  if (!expected) {
    res.status(503).json({ error: "write API not configured (set WRITE_API_KEY)" });
    return;
  }
  const header = req.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
