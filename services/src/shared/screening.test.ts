import assert from "node:assert/strict";
import test from "node:test";
import { validateManualScreening } from "./screening.js";

test("manual screening accepts an explicit reviewed verdict", () => {
  assert.deepEqual(
    validateManualScreening({
      score: 92,
      sanctioned: false,
      evidenceURI: "ipfs://bafy-screening-report",
    }),
    {
      score: 92,
      sanctioned: false,
      evidenceURI: "ipfs://bafy-screening-report",
    },
  );
});

test("manual screening rejects ambiguous or contradictory evidence", () => {
  assert.throws(
    () =>
      validateManualScreening({
        score: 90,
        sanctioned: true,
        evidenceURI: "https://example.test/report",
      }),
    /sanctioned result must use score 0/,
  );
  assert.throws(
    () =>
      validateManualScreening({
        score: 90,
        sanctioned: false,
        evidenceURI: "javascript:alert(1)",
      }),
    /https:\/\/ or ipfs:\/\//,
  );
});
