import { PublicKey } from "@solana/web3.js";

export function buildProofPost({ mint } = {}) {
  if (typeof mint !== "string") throw new Error("valid Solana mint is required");

  try {
    if (new PublicKey(mint).toBase58() !== mint) {
      throw new Error("non-canonical mint");
    }
  } catch {
    throw new Error("valid Solana mint is required");
  }

  return [
    "$HAKKY is live on Solana.",
    "",
    "10,000,000 fixed supply",
    "0% team allocation · no presale",
    "Mint revoked · freeze authority none",
    "LP burned",
    "",
    `Mint: ${mint}`,
    "",
    "Verify: https://hakky.xyz",
    "High-risk meme coin. No promised utility or returns."
  ].join("\n");
}
