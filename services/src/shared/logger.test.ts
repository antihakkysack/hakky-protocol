import assert from "node:assert/strict";
import test from "node:test";
import { Writable } from "node:stream";
import pino from "pino";
import { REDACTED_LOG_PATHS } from "./logger.js";

const WRITE_API_KEY = "super-secret-write-key-at-least-32-chars";

function captureLog(payload: Record<string, unknown>): string {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });

  // Mirrors the production logger's redaction configuration in shared/logger.ts.
  const log = pino(
    { base: undefined, redact: { paths: [...REDACTED_LOG_PATHS], censor: "[redacted]" } },
    stream,
  );
  log.info(payload, "request completed");
  return chunks.join("");
}

test("the write API key never reaches the log stream via request headers", () => {
  const output = captureLog({
    req: {
      method: "POST",
      url: "/deposit",
      headers: { authorization: `Bearer ${WRITE_API_KEY}`, "content-type": "application/json" },
    },
  });

  assert.ok(
    !output.includes(WRITE_API_KEY),
    `write API key leaked into logs: ${output}`,
  );
  assert.ok(output.includes("[redacted]"), `authorization header was not redacted: ${output}`);
  // Non-sensitive request context must survive so logs stay useful.
  assert.ok(output.includes("/deposit"), `request url was lost: ${output}`);
});

test("cookies are redacted on both requests and responses", () => {
  const output = captureLog({
    req: { headers: { cookie: `session=${WRITE_API_KEY}` } },
    res: { headers: { "set-cookie": `session=${WRITE_API_KEY}` } },
  });

  assert.ok(!output.includes(WRITE_API_KEY), `cookie value leaked into logs: ${output}`);
});
