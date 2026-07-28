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
const U64_MAX = 0xffff_ffff_ffff_ffffn;
const MASK_64 = U64_MAX;
const EXPECTED_KINDS = [
  "curveReserve",
  "curveBuy",
  "curveSell",
  "poolBuy",
  "poolSell",
];

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

function rotateLeft64(value, bits) {
  return (((value << bits) & MASK_64) | (value >> (64n - bits))) & MASK_64;
}

function independentXoshiroKnownAnswer(seedHex, outputCount) {
  const high = BigInt(`0x${seedHex.slice(0, 16)}`);
  const low = BigInt(`0x${seedHex.slice(16)}`);
  let seed = (high ^ rotateLeft64(low, 17n)) & MASK_64;
  const state = [];
  for (let index = 0; index < 4; index += 1) {
    seed = (seed + 0x9e37_79b9_7f4a_7c15n) & MASK_64;
    let mixed = seed;
    mixed = ((mixed ^ (mixed >> 30n)) * 0xbf58_476d_1ce4_e5b9n) & MASK_64;
    mixed = ((mixed ^ (mixed >> 27n)) * 0x94d0_49bb_1331_11ebn) & MASK_64;
    state.push((mixed ^ (mixed >> 31n)) & MASK_64);
  }
  const initialState = state.map(String);
  const outputs = [];
  for (let index = 0; index < outputCount; index += 1) {
    outputs.push(
      ((rotateLeft64((state[1] * 5n) & MASK_64, 7n) * 9n) & MASK_64)
        .toString(),
    );
    const temporary = (state[1] << 17n) & MASK_64;
    state[2] ^= state[0];
    state[3] ^= state[1];
    state[1] ^= state[2];
    state[0] ^= state[3];
    state[2] ^= temporary;
    state[3] = rotateLeft64(state[3], 45n);
  }
  return { initialState, outputs };
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
    "initialState",
    "initialOutputs",
  ]);
  const knownAnswer = independentXoshiroKnownAnswer(SEED_HEX, 8);
  assert.deepEqual(knownAnswer.initialState, [
    "14708535579442662089",
    "849665406132499741",
    "17436620374991249288",
    "9832929837502808094",
  ]);
  assert.deepEqual(knownAnswer.outputs, [
    "5685559790167330181",
    "2368613918768109119",
    "11219219450210543372",
    "9918755936004139257",
    "7945129480861828247",
    "12761725465152772007",
    "10315898470543476408",
    "1706352161077581083",
  ]);
  assert.deepEqual(rendered.document.generator.initialState, knownAnswer.initialState);
  assert.deepEqual(rendered.document.generator.initialOutputs, knownAnswer.outputs);
  assert.equal(rendered.document.cases.length, CASE_COUNT);
  const kindCounts = Object.fromEntries(EXPECTED_KINDS.map((kind) => [kind, 0]));
  for (const [index, vector] of rendered.document.cases.entries()) {
    assert.equal(vector.index, String(index));
    assert.equal(vector.kind, EXPECTED_KINDS[index % EXPECTED_KINDS.length]);
    kindCounts[vector.kind] += 1;
    assert.deepEqual(Object.keys(vector), [
      "index",
      "kind",
      "a",
      "b",
      "c",
      "outcome",
    ]);
  }
  assert.deepEqual(kindCounts, {
    curveReserve: 2_000,
    curveBuy: 2_000,
    curveSell: 2_000,
    poolBuy: 2_000,
    poolSell: 2_000,
  });
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
  assert.deepEqual(fixed.fees, [
    ["1", "1", "0"],
    ["399", "1", "398"],
    ["400", "1", "399"],
    ["401", "2", "399"],
    ["799", "2", "797"],
    ["800", "2", "798"],
  ]);
  assert.deepEqual(fixed.pool, [
    ["buy", "2000000000000", "24000000000", "1", "1", "2", "1999999999999", "24000000002", "48000000003975999999998"],
    ["sell", "2000000000000", "24000000000", "85", "84", "1", "2000000000085", "23999999999", "48000000000039999999915"],
  ]);
  assert.deepEqual(fixed.fit, [
    ["1999999997391", "18443963468419611698"],
    ["1999999997392", errors.ArithmeticOverflow],
  ]);
  assert.deepEqual(fixed.rejections, [
    ["curveBuy", "0", "1", "0", errors.ZeroQuote],
    ["curveReserve", "8000000000001", "0", "0", errors.CurveDomain],
    ["poolBuy", "2000000000000", "18446744073709551615", "1", errors.ArithmeticOverflow],
    ["poolSell", "2000000000000", "24000000000", "1", errors.ZeroQuote],
    ["poolBuy", "2000000000000", "24000000000", "2000000000000", errors.InsufficientCurveLiquidity],
    ["poolBuy", "2000000000000", "23999999999", "1", errors.ReserveInvariant],
  ]);

  for (const [sold, expected] of fixed.curve) {
    assert.equal(curveReserve(BigInt(sold)).toString(), expected);
  }
  for (const [gross, expectedFee, expectedEffective] of fixed.fees) {
    const grossValue = BigInt(gross);
    const fee = ceilDiv(grossValue * (D - F), D);
    assert.equal(fee.toString(), expectedFee);
    assert.equal((grossValue - fee).toString(), expectedEffective);
  }
  for (const [kind, base, quote, amount, effective, outcome, baseAfter, quoteAfter, kAfter] of fixed.pool) {
    const baseValue = BigInt(base);
    const quoteValue = BigInt(quote);
    const amountValue = BigInt(amount);
    const actual = kind === "buy"
      ? poolBuy(baseValue, quoteValue, amountValue)
      : poolSell(baseValue, quoteValue, amountValue);
    assert.equal(actual.toString(), outcome);
    const effectiveValue = kind === "buy"
      ? ceilDiv(quoteValue * amountValue, baseValue - amountValue)
      : (amountValue * F) / D;
    assert.equal(effectiveValue.toString(), effective);
    const actualBaseAfter = kind === "buy"
      ? baseValue - amountValue
      : baseValue + amountValue;
    const actualQuoteAfter = kind === "buy"
      ? quoteValue + BigInt(outcome)
      : quoteValue - BigInt(outcome);
    assert.equal(actualBaseAfter.toString(), baseAfter);
    assert.equal(actualQuoteAfter.toString(), quoteAfter);
    assert.equal((actualBaseAfter * actualQuoteAfter).toString(), kAfter);
  }
  for (const [baseOut, expected] of fixed.fit) {
    const actual = poolBuy(L, Q, BigInt(baseOut));
    assert.equal(typeof actual === "bigint" ? actual.toString() : actual, expected);
  }
  for (const [kind, a, b, c, expected] of fixed.rejections) {
    const actual = recompute({ kind, a, b, c });
    assert.equal(typeof actual === "bigint" ? actual.toString() : actual, expected);
  }
});

test("generated pool vectors cover both operations in both reachable reserve quadrants", () => {
  const { cases } = renderCurvePoolVectors().document;
  const accepted = cases.filter(({ outcome }) => !outcome.startsWith("error:"));
  const quadrantCounts = {
    poolBuyLowBaseHighQuote: 0,
    poolSellLowBaseHighQuote: 0,
    poolBuyHighBaseLowQuote: 0,
    poolSellHighBaseLowQuote: 0,
  };
  for (const vector of accepted.filter(({ kind }) => kind.startsWith("pool"))) {
    const base = BigInt(vector.a);
    const quote = BigInt(vector.b);
    assert(validPool(base, quote), `vector ${vector.index}`);
    if (base < L && quote > Q) {
      quadrantCounts[`${vector.kind}LowBaseHighQuote`] += 1;
    } else if (base > L && quote < Q) {
      quadrantCounts[`${vector.kind}HighBaseLowQuote`] += 1;
    }
  }
  for (const [family, count] of Object.entries(quadrantCounts)) {
    assert(count >= 900, `${family} accepted only ${count} vectors`);
  }
});

test("independent BigInt arithmetic recomputes every generated result", () => {
  const { cases } = renderCurvePoolVectors().document;
  for (const vector of cases) {
    const actual = recompute(vector);
    const outcome = typeof actual === "bigint" ? actual.toString() : actual;
    assert.equal(outcome, vector.outcome, `vector ${vector.index}`);
  }
});
