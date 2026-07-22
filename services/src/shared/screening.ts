import { getAddress, isAddress } from "ethers";
import { config } from "./config.js";

/** A cleanliness screening result for an address. */
export interface ScreeningResult {
  /** Cleanliness score 0-100 (100 = cleanest). */
  score: number;
  /** True if the subject is tied to a sanctioned entity. */
  sanctioned: boolean;
  /** Pointer to the (off-chain) screening evidence report. */
  evidenceURI: string;
}

/** Demo sanctions list, sourced from SANCTIONED_ADDRESSES (comma-separated). */
const sanctionedSet = new Set(
  config.SANCTIONED_ADDRESSES.split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0),
);

/**
 * Stub provenance screening. Deterministic per address so repeated screens are
 * stable and demoable. Production swaps this for a real analytics provider
 * (e.g. Chainalysis / TRM / Elliptic) behind this same interface — selected via
 * `SCREENING_PROVIDER`.
 */
export function screenAddress(address: string): ScreeningResult {
  if (!isAddress(address)) throw new Error("invalid EVM address");
  const subject = getAddress(address); // checksummed
  const evidenceURI = `https://api.hakky.xyz/reports/screening/${subject}.json`;

  if (sanctionedSet.has(subject.toLowerCase())) {
    return { score: 0, sanctioned: true, evidenceURI };
  }

  // Deterministic pseudo-score in [72, 99] derived from the address bytes.
  const tail = parseInt(subject.toLowerCase().slice(-6), 16);
  const score = 72 + (tail % 28);
  return { score, sanctioned: false, evidenceURI };
}
