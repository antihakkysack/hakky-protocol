import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  deriveInvokeCallsites,
  evaluateProgramSurface,
  MAX_PROGRAM_BYTES,
} from "../scripts/inspect-hakky-program.mjs";
import {
  exactTagProbeReceipt,
  fixedInvokeCallsiteReceipt,
} from "../test-support/program-surface-fixtures.mjs";

test("derives the reviewed CPI surface from the production source", async () => {
  const [processorSource, tokenSource, metadataSource] = await Promise.all(
    ["processor.rs", "token.rs", "metadata.rs"].map((name) =>
      readFile(new URL(`../programs/hakky-market/src/${name}`, import.meta.url), "utf8"),
    ),
  );
  assert.deepEqual(
    deriveInvokeCallsites({ processorSource, tokenSource, metadataSource }),
    fixedInvokeCallsiteReceipt(),
  );
});

const STANDARD_SOLANA_EXPORTS =
  "1: 00000000 0 FUNC GLOBAL DEFAULT 1 custom_panic\n" +
  "2: 00000000 0 FUNC GLOBAL DEFAULT 1 entrypoint\n";

test("accepts the standard Solana exports, tags 0..2, and exact fixed CPI surface", () => {
  const result = evaluateProgramSurface({
    binaryBytes: Buffer.alloc(119_999),
    readelfText: STANDARD_SOLANA_EXPORTS,
    tagProbe: exactTagProbeReceipt(),
    invokeCallsites: fixedInvokeCallsiteReceipt(),
  });
  assert.equal(MAX_PROGRAM_BYTES, 120_000);
  assert.equal(result.ok, true);
});

test("rejects an excess byte, extra tag, extra export, or dangerous CPI", () => {
  const baseline = {
    binaryBytes: Buffer.alloc(1),
    readelfText: STANDARD_SOLANA_EXPORTS,
    tagProbe: exactTagProbeReceipt(),
    invokeCallsites: fixedInvokeCallsiteReceipt(),
  };
  assert.equal(
    evaluateProgramSurface({
      ...baseline,
      binaryBytes: Buffer.alloc(120_001),
    }).ok,
    false,
  );
  assert.equal(
    evaluateProgramSurface({
      ...baseline,
      tagProbe: exactTagProbeReceipt([0, 1, 2, 3]),
    }).ok,
    false,
  );
  assert.equal(
    evaluateProgramSurface({
      ...baseline,
      readelfText:
        `${STANDARD_SOLANA_EXPORTS}3: 0 0 FUNC GLOBAL DEFAULT 1 withdraw\n`,
    }).ok,
    false,
  );
  assert.equal(
    evaluateProgramSurface({
      ...baseline,
      invokeCallsites: fixedInvokeCallsiteReceipt({
        token: [...fixedInvokeCallsiteReceipt().token, "close_account"],
      }),
    }).ok,
    false,
  );
});

test("rejects weakened signer, authority, direction, decimals, or amount binding", () => {
  for (const field of [
    "exactAccountMetas",
    "exactSignerSeeds",
    "exactAuthorities",
    "exactDirections",
    "exactDecimals",
    "exactAmountBindings",
  ]) {
    const result = evaluateProgramSurface({
      binaryBytes: Buffer.alloc(1),
      readelfText: STANDARD_SOLANA_EXPORTS,
      tagProbe: exactTagProbeReceipt(),
      invokeCallsites: fixedInvokeCallsiteReceipt({ [field]: false }),
    });
    assert.equal(result.ok, false, field);
  }
});
