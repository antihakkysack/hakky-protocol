import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReserveBuffer } from "./reserve-buffer.js";

const ONE_BTC = 100_000_000n;
const BUFFER = 200_000n; // operator-funded fee buffer

test("healthy while custody covers liabilities plus the whole fee buffer", () => {
  const status = evaluateReserveBuffer({
    custodySats: ONE_BTC + BUFFER,
    liabilitiesSats: ONE_BTC,
    bufferSats: BUFFER,
  });

  assert.equal(status.headroomSats, BUFFER);
  assert.equal(status.state, "healthy");
  assert.equal(status.solvent, true);
});

test("headroom exactly equal to the buffer is still healthy", () => {
  const status = evaluateReserveBuffer({
    custodySats: ONE_BTC + BUFFER,
    liabilitiesSats: ONE_BTC,
    bufferSats: BUFFER,
  });

  assert.equal(status.state, "healthy");
});

test("spent fees deplete the buffer before solvency is ever at risk", () => {
  // A 0.5 BTC payout with a 3,000 sat fee: custody falls by amount + fee, while
  // liabilities fall by the amount alone. The fee is absorbed by the buffer.
  const status = evaluateReserveBuffer({
    custodySats: ONE_BTC + BUFFER - 50_000_000n - 3_000n,
    liabilitiesSats: ONE_BTC - 50_000_000n,
    bufferSats: BUFFER,
  });

  assert.equal(status.headroomSats, BUFFER - 3_000n);
  assert.equal(status.state, "depleted", "buffer is below target and needs a top-up");
  assert.equal(status.solvent, true, "solvency must not be affected while buffer remains");
});

test("exhausting the buffer is reported before custody goes below liabilities", () => {
  const status = evaluateReserveBuffer({
    custodySats: ONE_BTC,
    liabilitiesSats: ONE_BTC,
    bufferSats: BUFFER,
  });

  assert.equal(status.headroomSats, 0n);
  assert.equal(status.state, "exhausted");
  assert.equal(status.solvent, true, "fully backed, but the next payout fee has no funding");
});

test("custody below liabilities is insolvent regardless of the configured buffer", () => {
  const status = evaluateReserveBuffer({
    custodySats: ONE_BTC - 3_000n,
    liabilitiesSats: ONE_BTC,
    bufferSats: BUFFER,
  });

  assert.equal(status.headroomSats, -3_000n);
  assert.equal(status.state, "insolvent");
  assert.equal(status.solvent, false);
});

test("a payout is only fundable when the buffer can cover its fee", () => {
  const status = evaluateReserveBuffer({
    custodySats: ONE_BTC + 2_000n,
    liabilitiesSats: ONE_BTC,
    bufferSats: BUFFER,
  });

  assert.equal(status.canFundFee(1_500n), true);
  assert.equal(status.canFundFee(2_000n), true, "a fee equal to headroom is fundable");
  assert.equal(status.canFundFee(2_001n), false, "a fee beyond headroom would break backing");
});

test("a zero buffer disables buffer reporting but still tracks solvency", () => {
  const status = evaluateReserveBuffer({
    custodySats: ONE_BTC,
    liabilitiesSats: ONE_BTC,
    bufferSats: 0n,
  });

  assert.equal(status.state, "healthy");
  assert.equal(status.solvent, true);
});
