import { validateLaunchRecord } from "./launch-policy.js";

const EMPTY_DESTINATIONS = Object.freeze({
  solscanMint: null,
  solscanCreationTransaction: null,
  solscanGraduationTransaction: null,
  raydiumLaunchlab: null,
  raydiumPool: null,
});

function cloneAndFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneAndFreeze));
  if (value && typeof value === "object") {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, cloneAndFreeze(nested)]),
    ));
  }
  return value;
}

function hiddenView({ state, declaredStatus, heading }) {
  return Object.freeze({
    state,
    declaredStatus,
    verified: false,
    heading,
    mint: null,
    proof: null,
    destinations: Object.freeze({ ...EMPTY_DESTINATIONS }),
  });
}

export function buildLaunchView(record) {
  const issues = validateLaunchRecord(record);
  if (issues.length) throw new Error(`Invalid launch record: ${issues.join("; ")}`);

  if (record.status === "prelaunch") {
    return hiddenView({
      state: "prelaunch",
      declaredStatus: "prelaunch",
      heading: "PRE-LAUNCH: No official mint address exists yet - ignore impostors.",
    });
  }

  if (record.proof.availability === "unavailable") {
    return hiddenView({
      state: "unavailable",
      declaredStatus: record.status,
      heading: "VERIFICATION UNAVAILABLE",
    });
  }

  const proof = cloneAndFreeze(record.proof);
  const destinations = Object.freeze(Object.fromEntries([
    ["solscanMint", proof.links.solscanMint],
    ["solscanCreationTransaction", proof.links.solscanCreationTransaction],
    ["solscanGraduationTransaction", record.status === "graduated" ? proof.links.solscanGraduationTransaction : null],
    ["raydiumLaunchlab", proof.links.raydiumLaunchlab],
    ["raydiumPool", record.status === "graduated" ? proof.links.raydiumPool : null],
  ]));

  return Object.freeze({
    state: record.status,
    declaredStatus: record.status,
    verified: true,
    heading: record.status === "curve-live"
      ? "CURVE LIVE - PROGRAM AUTHORITY ACTIVE"
      : "GRADUATED - FINAL STATE VERIFIED",
    mint: record.token.mint,
    proof,
    destinations,
  });
}
