import pino from "pino";
import { config } from "./config.js";

/// Header paths stripped from every log record.
///
/// `pino-http` serializes `req.headers` verbatim, so without this the bearer
/// token in `Authorization` -- the single credential authorising minting,
/// settlement, and attestation -- is written to stdout on every write request,
/// including failed authentication attempts. Anyone holding log access (the
/// Docker daemon, a log shipper, a support bundle) would hold that credential.
export const REDACTED_LOG_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
] as const;

export const logger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  base: undefined,
  redact: { paths: [...REDACTED_LOG_PATHS], censor: "[redacted]" },
});
