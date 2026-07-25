/**
 * Fee-buffer accounting for the custody wallet.
 *
 * A redemption payout must pay the recipient *exactly* the requested satoshis
 * (see `verifyPayout`), so the Bitcoin miner fee is funded from custody rather
 * than deducted from the user. Custody therefore falls by `amount + fee` while
 * `pendingRedemptionSats` falls by `amount` alone.
 *
 * Without a buffer that difference lands directly on the backing invariant:
 * reserves drop below liabilities by the fee on the first payout and stay
 * there, which permanently blocks minting (`processDeposit` requires
 * `newLiabilities <= reserves`) and trips the runbook's first stop condition
 * during entirely normal operation.
 *
 * The protocol therefore holds an operator-funded buffer in custody, above and
 * beyond user deposits. Fees are absorbed by that headroom instead of by user
 * backing, so `reserves >= liabilities` holds for as long as the buffer covers
 * cumulative fees. The published reserve figure remains the truthful confirmed
 * custody balance -- the buffer makes the protocol over-collateralised, never
 * over-reported -- and the pilot ceiling is unaffected because it binds on
 * liabilities (`totalSupply + pendingRedemptionSats`), not on custody.
 *
 * The operator's job is to keep headroom at or above the configured buffer.
 * This module exists so that job is measured and alerted on rather than
 * remembered.
 */

export type ReserveBufferState =
  /** Headroom covers the full configured buffer. Nothing to do. */
  | "healthy"
  /** Fees have eaten into the buffer. Solvent, but top up custody. */
  | "depleted"
  /** No headroom left. Still fully backed, but the next payout fee is unfunded. */
  | "exhausted"
  /** Custody is below liabilities. Backing is broken; stop condition. */
  | "insolvent";

export interface ReserveBufferInput {
  /** Confirmed, safe BTC held at the custody address, in satoshis. */
  custodySats: bigint;
  /** `totalSupply + pendingRedemptionSats`, in satoshis. */
  liabilitiesSats: bigint;
  /** Operator-funded fee buffer the custody balance should carry, in satoshis. */
  bufferSats: bigint;
}

export interface ReserveBufferStatus {
  /** Custody above liabilities. Negative means backing is broken. */
  headroomSats: bigint;
  bufferSats: bigint;
  state: ReserveBufferState;
  /** True while custody fully backs liabilities. */
  solvent: boolean;
  /** Whether a payout carrying `feeSats` can be funded without breaking backing. */
  canFundFee: (feeSats: bigint) => boolean;
}

export function evaluateReserveBuffer(input: ReserveBufferInput): ReserveBufferStatus {
  const { custodySats, liabilitiesSats, bufferSats } = input;
  const headroomSats = custodySats - liabilitiesSats;

  let state: ReserveBufferState;
  if (headroomSats < 0n) {
    state = "insolvent";
  } else if (headroomSats >= bufferSats) {
    state = "healthy";
  } else if (headroomSats === 0n) {
    state = "exhausted";
  } else {
    state = "depleted";
  }

  return {
    headroomSats,
    bufferSats,
    state,
    solvent: headroomSats >= 0n,
    canFundFee: (feeSats: bigint) => headroomSats >= feeSats,
  };
}

/** Structured log/audit payload. Bigints are stringified for JSON safety. */
export function describeReserveBuffer(status: ReserveBufferStatus): Record<string, string | boolean> {
  return {
    headroomSats: status.headroomSats.toString(),
    bufferSats: status.bufferSats.toString(),
    state: status.state,
    solvent: status.solvent,
  };
}
