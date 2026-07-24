import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CASE_COUNT,
  GENERATOR_IDENTITY,
  SCHEMA_VERSION,
  SEED_HEX,
  renderCurvePoolVectors,
} from "../scripts/render-curve-pool-vectors.mjs";

const VECTOR_PATH = new URL(
  "../programs/hakky-market/test-vectors/curve-pool-v1.json",
  import.meta.url,
);
const SIDECAR_PATH = new URL(`${VECTOR_PATH.href}.sha256`);

const TOTAL = 10_000_000_000_000n;
const S = 8_000_000_000_000n;
const L = 2_000_000_000_000n;
const Q = 24_000_000_000n;
const D = 1_000_000n;
const F = 997_500n;

const errors = Object.freeze({
  ZeroAmount: "error:484b0004",
  CurveDomain: "error:484b0014",
  InsufficientCurveLiquidity: "error:484b0015",
  ArithmeticOverflow: "error:484b0016",
  ZeroQuote: "error:484b0017",
  ReserveInvariant: "error:484b001a",
});

function ceilDiv(numerator, denominator) {
  assert(denominator > 0n);
  return numerator / denominator + (numerator % denominator === 0n ? 0n : 1n);
}

function curveReserve(sold) {
  if (sold > S) return errors.CurveDomain;
  return (Q * sold) / (4n * S - 3n * sold);
}

function curveBuy(sold, amount) {
  if (amount === 0n) return errors.ZeroAmount;
  if (sold > S) return errors.CurveDomain;
  if (amount > S - sold) return errors.InsufficientCurveLiquidity;
  const result = curveReserve(sold + amount) - curveReserve(sold);
  return result === 0n ? errors.ZeroQuote : result;
}

function curveSell(sold, amount) {
  if (amount === 0n) return errors.ZeroAmount;
  if (sold > S) return errors.CurveDomain;
  if (amount > sold) return errors.InsufficientCurveLiquidity;
  const result = curveReserve(sold) - curveReserve(sold - amount);
  return result === 0n ? errors.ZeroQuote : result;
}

function validPool(base, quote) {
  return (
    base > 0n &&
    base <= TOTAL &&
    quote > 0n &&
    base * quote >= L * Q
  );
}

function poolBuy(base, quote, amount) {
  if (amount === 0n) return errors.ZeroAmount;
  if (!validPool(base, quote)) return errors.ReserveInvariant;
  if (amount >= base) return errors.InsufficientCurveLiquidity;
  const effective = ceilDiv(quote * amount, base - amount);
  const gross = ceilDiv(effective * D, F);
  const quoteAfter = quote + gross;
  if (quoteAfter > 0xffff_ffff_ffff_ffffn) return errors.ArithmeticOverflow;
  const baseAfter = base - amount;
  if (
    baseAfter === 0n ||
    baseAfter * quoteAfter < base * quote ||
    baseAfter * quoteAfter < L * Q
  ) {
    return errors.ReserveInvariant;
  }
  return gross === 0n ? errors.ZeroQuote : gross;
}

function poolSell(base, quote, amount) {
  if (amount === 0n) return errors.ZeroAmount;
  if (!validPool(base, quote)) return errors.ReserveInvariant;
  const baseAfter = base + amount;
  if (baseAfter > 0xffff_ffff_ffff_ffffn) return errors.ArithmeticOverflow;
  if (baseAfter > TOTAL) return errors.ReserveInvariant;
  const effective = (amount * F) / D;
  if (effective === 0n) return errors.ZeroQuote;
  const quoteOut = (quote * effective) / (base + effective);
  if (quoteOut === 0n) return errors.ZeroQuote;
  const quoteAfter = quote - quoteOut;
  if (
    quoteAfter === 0n ||
    baseAfter * quoteAfter < base * quote ||
    baseAfter * quoteAfter < L * Q
  ) {
    return errors.ReserveInvariant;
  }
  return quoteOut;
}

function recompute({ kind, a, b, c }) {
  const values = [a, b, c].map(BigInt);
  switch (kind) {
    case "curveReserve":
      return curveReserve(values[0]);
    case "curveBuy":
      return curveBuy(values[0], values[1]);
    case "curveSell":
      return curveSell(values[0], values[1]);
    case "poolBuy":
      return poolBuy(values[0], values[1], values[2]);
    case "poolSell":
      return poolSell(values[0], values[1], values[2]);
    default:
      throw new Error(`unknown vector kind ${kind}`);
  }
}

test("generator identity seed schema order and case count are frozen", async () => {
  assert.equal(GENERATOR_IDENTITY, "xoshiro256**");
  assert.equal(SEED_HEX, "48414b4b595f43555256455f504f4f4c");
  assert.equal(SCHEMA_VERSION, "hakky-curve-pool-v1");
  assert.equal(CASE_COUNT, 10_000);

  const rendered = renderCurvePoolVectors();
  assert.equal(rendered.document.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(Object.keys(rendered.document), [
    "schemaVersion",
    "generator",
    "constants",
    "fixed",
    "cases",
  ]);
  assert.deepEqual(Object.keys(rendered.document.generator), [
    "identity",
    "seedHex",
    "caseCount",
  ]);
  assert.equal(rendered.document.cases.length, CASE_COUNT);
  for (const [index, vector] of rendered.document.cases.entries()) {
    assert.equal(vector.index, String(index));
    assert.deepEqual(Object.keys(vector), [
      "index",
      "kind",
      "a",
      "b",
      "c",
      "outcome",
    ]);
  }
});

test("detached lowercase SHA-256 authenticates exact canonical bytes", async () => {
  const bytes = await readFile(VECTOR_PATH);
  const sidecar = await readFile(SIDECAR_PATH, "utf8");
  assert(bytes.subarray(-1).equals(Buffer.from("\n")));
  assert(!bytes.subarray(0, -1).includes(0x0a));
  assert.match(sidecar, /^[0-9a-f]{64}\n$/);
  assert.equal(
    sidecar,
    `${createHash("sha256").update(bytes).digest("hex")}\n`,
  );
  const rendered = renderCurvePoolVectors();
  assert(bytes.equals(rendered.bytes));
  assert.equal(sidecar, `${rendered.digestHex}\n`);
  assert(!Object.hasOwn(rendered.document, "sha256"));
});

test("fixed endpoints dust fees overflow and rejection vectors are exact", () => {
  const { fixed } = renderCurvePoolVectors().document;
  assert.deepEqual(fixed.curve, [
    ["0", "0"],
    ["1333", "0"],
    ["1334", "1"],
    ["2000000000000", "1846153846"],
    ["4000000000000", "4800000000"],
    ["6000000000000", "10285714285"],
    ["7999999999999", "23999999999"],
    ["8000000000000", "24000000000"],
  ]);
  assert.deepEqual(fixed.pool, [
    ["buy", "2000000000000", "24000000000", "1", "2"],
    ["sell", "2000000000000", "24000000000", "85", "1"],
  ]);
  assert.deepEqual(fixed.rejections, [
    ["curveBuy", "0", "1", "0", errors.ZeroQuote],
    ["curveReserve", "8000000000001", "0", "0", errors.CurveDomain],
    ["poolBuy", "2000000000000", "18446744073709551615", "1", errors.ArithmeticOverflow],
    ["poolSell", "2000000000000", "24000000000", "1", errors.ZeroQuote],
    ["poolBuy", "2000000000000", "24000000000", "2000000000000", errors.InsufficientCurveLiquidity],
  ]);
});

test("independent BigInt arithmetic recomputes every generated result", () => {
  const { cases } = renderCurvePoolVectors().document;
  for (const vector of cases) {
    const actual = recompute(vector);
    const outcome = typeof actual === "bigint" ? actual.toString() : actual;
    assert.equal(outcome, vector.outcome, `vector ${vector.index}`);
  }
});
