import { EXPECTED_POLICY } from "../web/lib/launch-policy.js";
import { PublicKey } from "@solana/web3.js";

function isCanonicalPublicKey(value) {
  try {
    return typeof value === "string" && new PublicKey(value).toBase58() === value;
  } catch {
    return false;
  }
}

export function evaluateMintEvidence(evidence) {
  const checks = [
    { id: "mint-public-key", ok: isCanonicalPublicKey(evidence.mint), observed: evidence.mint },
    { id: "creator-public-key", ok: isCanonicalPublicKey(evidence.creator), observed: evidence.creator },
    { id: "network-mainnet", ok: evidence.network === EXPECTED_POLICY.network, observed: evidence.network },
    { id: "classic-token-program", ok: evidence.tokenProgram === EXPECTED_POLICY.tokenProgram, observed: evidence.tokenProgram },
    { id: "fixed-supply", ok: evidence.supplyBaseUnits === EXPECTED_POLICY.supplyBaseUnits, observed: evidence.supplyBaseUnits },
    { id: "six-decimals", ok: evidence.decimals === EXPECTED_POLICY.decimals, observed: evidence.decimals },
    { id: "mint-authority-revoked", ok: evidence.mintAuthority === null, observed: evidence.mintAuthority },
    { id: "freeze-authority-none", ok: evidence.freezeAuthority === null, observed: evidence.freezeAuthority },
    { id: "creator-balance-zero", ok: evidence.creatorBalanceBaseUnits === "0", observed: evidence.creatorBalanceBaseUnits },
  ];
  return { ok: checks.every((check) => check.ok), checks, observed: evidence };
}
