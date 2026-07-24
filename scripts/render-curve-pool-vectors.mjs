import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

export const GENERATOR_IDENTITY = "xoshiro256**";
export const SEED_HEX = "48414b4b595f43555256455f504f4f4c";
export const SCHEMA_VERSION = "hakky-curve-pool-v1";
export const CASE_COUNT = 10_000;

const TOTAL = 10_000_000_000_000n;
const S = 8_000_000_000_000n;
const L = 2_000_000_000_000n;
const Q = 24_000_000_000n;
const D = 1_000_000n;
const F = 997_500n;
const U64_MAX = (1n << 64n) - 1n;
const U128_MAX = (1n << 128n) - 1n;
const MASK_64 = U64_MAX;

const errors = Object.freeze({
  zeroAmount: "error:484b0004",
  curveDomain: "error:484b0014",
  insufficientCurveLiquidity: "error:484b0015",
  arithmeticOverflow: "error:484b0016",
  zeroQuote: "error:484b0017",
  reserveInvariant: "error:484b001a",
});

function checkedAdd(left, right, maximum = U128_MAX) {
  const value = left + right;
  return value <= maximum ? value : null;
}

function checkedSub(left, right) {
  return right <= left ? left - right : null;
}

function checkedMul(left, right) {
  const value = left * right;
  return value <= U128_MAX ? value : null;
}

function checkedDiv(numerator, denominator) {
  return denominator === 0n ? null : numerator / denominator;
}

function ceilDiv(numerator, denominator) {
  const quotient = checkedDiv(numerator, denominator);
  if (quotient === null) return null;
  const remainder = numerator % denominator;
  return checkedAdd(quotient, remainder === 0n ? 0n : 1n);
}

function curveReserve(sold) {
  if (sold > S) return errors.curveDomain;
  const numerator = checkedMul(Q, sold);
  const fourS = checkedMul(S, 4n);
  const tripleSold = checkedMul(sold, 3n);
  if (numerator === null || fourS === null || tripleSold === null) {
    return errors.arithmeticOverflow;
  }
  const denominator = checkedSub(fourS, tripleSold);
  if (denominator === null) return errors.arithmeticOverflow;
  const reserve = checkedDiv(numerator, denominator);
  return reserve === null || reserve > U64_MAX
    ? errors.arithmeticOverflow
    : reserve;
}

function curveBuy(sold, amount) {
  if (amount === 0n) return errors.zeroAmount;
  if (sold > S) return errors.curveDomain;
  const available = checkedSub(S, sold);
  if (available === null) return errors.curveDomain;
  if (amount > available) return errors.insufficientCurveLiquidity;
  const soldAfter = checkedAdd(sold, amount, U64_MAX);
  if (soldAfter === null) return errors.arithmeticOverflow;
  const after = curveReserve(soldAfter);
  const before = curveReserve(sold);
  if (typeof after === "string") return after;
  if (typeof before === "string") return before;
  const quote = checkedSub(after, before);
  if (quote === null) return errors.arithmeticOverflow;
  return quote === 0n ? errors.zeroQuote : quote;
}

function curveSell(sold, amount) {
  if (amount === 0n) return errors.zeroAmount;
  if (sold > S) return errors.curveDomain;
  if (amount > sold) return errors.insufficientCurveLiquidity;
  const soldAfter = checkedSub(sold, amount);
  if (soldAfter === null) return errors.insufficientCurveLiquidity;
  const before = curveReserve(sold);
  const after = curveReserve(soldAfter);
  if (typeof before === "string") return before;
  if (typeof after === "string") return after;
  const quote = checkedSub(before, after);
  if (quote === null) return errors.arithmeticOverflow;
  return quote === 0n ? errors.zeroQuote : quote;
}

function poolProduct(base, quote) {
  return checkedMul(base, quote);
}

function validatePool(base, quote) {
  if (base === 0n || base > TOTAL || quote === 0n) return null;
  const product = poolProduct(base, quote);
  const floor = poolProduct(L, Q);
  return product !== null && floor !== null && product >= floor ? product : null;
}

function validatePoolAfter(base, quote, before) {
  if (base === 0n || base > TOTAL || quote === 0n) return false;
  const after = poolProduct(base, quote);
  const floor = poolProduct(L, Q);
  return (
    after !== null &&
    floor !== null &&
    after >= before &&
    after >= floor
  );
}

function poolBuy(base, quote, amount) {
  if (amount === 0n) return errors.zeroAmount;
  const before = validatePool(base, quote);
  if (before === null) return errors.reserveInvariant;
  if (amount >= base) return errors.insufficientCurveLiquidity;
  const baseAfter = checkedSub(base, amount);
  const effectiveNumerator = checkedMul(quote, amount);
  if (baseAfter === null || effectiveNumerator === null) {
    return errors.arithmeticOverflow;
  }
  const effective = ceilDiv(effectiveNumerator, baseAfter);
  if (effective === null) return errors.arithmeticOverflow;
  const grossNumerator = checkedMul(effective, D);
  if (grossNumerator === null) return errors.arithmeticOverflow;
  const gross = ceilDiv(grossNumerator, F);
  if (gross === null || gross > U64_MAX) return errors.arithmeticOverflow;
  if (gross === 0n) return errors.zeroQuote;
  const quoteAfter = checkedAdd(quote, gross, U64_MAX);
  if (quoteAfter === null) return errors.arithmeticOverflow;
  return validatePoolAfter(baseAfter, quoteAfter, before)
    ? gross
    : errors.reserveInvariant;
}

function poolSell(base, quote, amount) {
  if (amount === 0n) return errors.zeroAmount;
  const before = validatePool(base, quote);
  if (before === null) return errors.reserveInvariant;
  const baseAfter = checkedAdd(base, amount, U64_MAX);
  if (baseAfter === null) return errors.arithmeticOverflow;
  if (baseAfter > TOTAL) return errors.reserveInvariant;
  const effectiveNumerator = checkedMul(amount, F);
  if (effectiveNumerator === null) return errors.arithmeticOverflow;
  const effective = checkedDiv(effectiveNumerator, D);
  if (effective === null) return errors.arithmeticOverflow;
  if (effective === 0n) return errors.zeroQuote;
  const quoteNumerator = checkedMul(quote, effective);
  const denominator = checkedAdd(base, effective);
  if (quoteNumerator === null || denominator === null) {
    return errors.arithmeticOverflow;
  }
  const quoteOut = checkedDiv(quoteNumerator, denominator);
  if (quoteOut === null || quoteOut > U64_MAX) {
    return errors.arithmeticOverflow;
  }
  if (quoteOut === 0n) return errors.zeroQuote;
  const quoteAfter = checkedSub(quote, quoteOut);
  if (quoteAfter === null) return errors.arithmeticOverflow;
  return validatePoolAfter(baseAfter, quoteAfter, before)
    ? quoteOut
    : errors.reserveInvariant;
}

function rotateLeft64(value, bits) {
  return (
    ((value << bits) & MASK_64) | (value >> (64n - bits))
  ) & MASK_64;
}

function splitMix64(value) {
  let next = (value + 0x9e37_79b9_7f4a_7c15n) & MASK_64;
  let mixed = next;
  mixed = ((mixed ^ (mixed >> 30n)) * 0xbf58_476d_1ce4_e5b9n) & MASK_64;
  mixed = ((mixed ^ (mixed >> 27n)) * 0x94d0_49bb_1331_11ebn) & MASK_64;
  return [next, (mixed ^ (mixed >> 31n)) & MASK_64];
}

function createXoshiro256StarStar() {
  const high = BigInt(`0x${SEED_HEX.slice(0, 16)}`);
  const low = BigInt(`0x${SEED_HEX.slice(16)}`);
  let seed = (high ^ rotateLeft64(low, 17n)) & MASK_64;
  const state = [];
  for (let index = 0; index < 4; index += 1) {
    const [nextSeed, output] = splitMix64(seed);
    seed = nextSeed;
    state.push(output);
  }

  return () => {
    const result = (rotateLeft64((state[1] * 5n) & MASK_64, 7n) * 9n) & MASK_64;
    const temporary = (state[1] << 17n) & MASK_64;
    state[2] ^= state[0];
    state[3] ^= state[1];
    state[1] ^= state[2];
    state[0] ^= state[3];
    state[2] ^= temporary;
    state[3] = rotateLeft64(state[3], 45n);
    return result;
  };
}

function asOutcome(value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function vector(index, kind, a, b, c, outcome) {
  return {
    index: String(index),
    kind,
    a: a.toString(),
    b: b.toString(),
    c: c.toString(),
    outcome: asOutcome(outcome),
  };
}

function generatedCases() {
  const random = createXoshiro256StarStar();
  const cases = [];
  for (let index = 0; index < CASE_COUNT; index += 1) {
    const ordinal = Math.floor(index / 5);
    const first = random();
    const second = random();
    const third = random();
    switch (index % 5) {
      case 0: {
        const sold = ordinal % 1_000 === 0 ? S + 1n : first % (S + 1n);
        cases.push(vector(index, "curveReserve", sold, 0n, 0n, curveReserve(sold)));
        break;
      }
      case 1: {
        let sold = first % (S + 1n);
        let amount;
        if (ordinal % 1_000 === 0) {
          amount = 0n;
        } else if (ordinal % 1_000 === 1) {
          sold = 0n;
          amount = 1n;
        } else if (ordinal % 1_000 === 2) {
          sold = S;
          amount = 1n;
        } else {
          amount = sold === S ? 1n : 1n + (second % (S - sold));
        }
        cases.push(vector(index, "curveBuy", sold, amount, 0n, curveBuy(sold, amount)));
        break;
      }
      case 2: {
        let sold = 1n + (first % S);
        let amount;
        if (ordinal % 1_000 === 0) {
          amount = 0n;
        } else if (ordinal % 1_000 === 1) {
          sold = 1n;
          amount = 1n;
        } else if (ordinal % 1_000 === 2) {
          amount = sold + 1n;
        } else {
          amount = 1n + (second % sold);
        }
        cases.push(vector(index, "curveSell", sold, amount, 0n, curveSell(sold, amount)));
        break;
      }
      case 3: {
        const base = L + (first % (TOTAL - L + 1n));
        let quote = Q + (second % 1_000_000_000_000n);
        let amount;
        if (ordinal % 1_000 === 0) {
          amount = 0n;
        } else if (ordinal % 1_000 === 1) {
          quote = U64_MAX;
          amount = 1n;
        } else if (ordinal % 1_000 === 2) {
          amount = base;
        } else {
          amount = 1n + (third % (base - 1n));
        }
        cases.push(vector(index, "poolBuy", base, quote, amount, poolBuy(base, quote, amount)));
        break;
      }
      default: {
        let base = L + (first % (TOTAL - L));
        const quote = Q + (second % 1_000_000_000_000n);
        let amount;
        if (ordinal % 1_000 === 0) {
          amount = 0n;
        } else if (ordinal % 1_000 === 1) {
          base = L;
          amount = U64_MAX;
        } else if (ordinal % 1_000 === 2) {
          amount = 1n;
        } else {
          const maximum = (TOTAL - base) < 1_000_000_000n
            ? TOTAL - base
            : 1_000_000_000n;
          amount = 1n + (third % maximum);
        }
        cases.push(vector(index, "poolSell", base, quote, amount, poolSell(base, quote, amount)));
      }
    }
  }
  return cases;
}

export function renderCurvePoolVectors() {
  const document = {
    schemaVersion: SCHEMA_VERSION,
    generator: {
      identity: GENERATOR_IDENTITY,
      seedHex: SEED_HEX,
      caseCount: String(CASE_COUNT),
    },
    constants: {
      total: TOTAL.toString(),
      curveMax: S.toString(),
      poolSeed: L.toString(),
      terminalQuote: Q.toString(),
      feeDenominator: D.toString(),
      effectiveNumerator: F.toString(),
    },
    fixed: {
      curve: [
        ["0", "0"],
        ["1333", "0"],
        ["1334", "1"],
        ["2000000000000", "1846153846"],
        ["4000000000000", "4800000000"],
        ["6000000000000", "10285714285"],
        ["7999999999999", "23999999999"],
        ["8000000000000", "24000000000"],
      ],
      pool: [
        ["buy", "2000000000000", "24000000000", "1", "2"],
        ["sell", "2000000000000", "24000000000", "85", "1"],
      ],
      rejections: [
        ["curveBuy", "0", "1", "0", errors.zeroQuote],
        ["curveReserve", "8000000000001", "0", "0", errors.curveDomain],
        ["poolBuy", "2000000000000", U64_MAX.toString(), "1", errors.arithmeticOverflow],
        ["poolSell", "2000000000000", "24000000000", "1", errors.zeroQuote],
        ["poolBuy", "2000000000000", "24000000000", "2000000000000", errors.insufficientCurveLiquidity],
      ],
    },
    cases: generatedCases(),
  };
  const bytes = Buffer.from(`${JSON.stringify(document)}\n`, "utf8");
  const digestHex = createHash("sha256").update(bytes).digest("hex");
  return { document, bytes, digestHex };
}

async function writeCurvePoolVectors() {
  const directory = new URL("../programs/hakky-market/test-vectors/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const { bytes, digestHex } = renderCurvePoolVectors();
  await writeFile(new URL("curve-pool-v1.json", directory), bytes);
  await writeFile(
    new URL("curve-pool-v1.json.sha256", directory),
    `${digestHex}\n`,
    "utf8",
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(fileURLToPath(pathToFileURL(process.argv[1]))).href
  : null;
if (invokedPath === import.meta.url) {
  await writeCurvePoolVectors();
}
