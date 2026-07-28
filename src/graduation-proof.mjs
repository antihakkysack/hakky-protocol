import path from "node:path";
import { fileURLToPath } from "node:url";
import { HAKKY_SOURCE_COVERAGE_UNAVAILABLE } from "./raydium-launchlab.mjs";
import { readCanonicalArtifact } from "./canonical-proof.mjs";

const WORKTREE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(code) {
  throw new Error(code);
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalArtifactPair(mintArtifact, launchlabArtifact, options) {
  if (!plainObject(mintArtifact) || !plainObject(launchlabArtifact)
    || !plainObject(mintArtifact.value) || !plainObject(launchlabArtifact.value)
    || !plainObject(options)
    || Object.keys(options).sort().join(",")
      !== "creatorAddress,launchId,mintAddress") {
    fail("canonical-proof-mismatch");
  }
  const mint = mintArtifact.value;
  const launchlab = launchlabArtifact.value;
  if (mint.network !== launchlab.network
    || mint.network !== "mainnet-beta"
    || mint.identities.mint !== launchlab.identities.mint
    || mint.identities.creator !== launchlab.identities.creator
    || mint.identities.launchId !== launchlab.identities.launchId
    || mint.identities.metadataAccount !== launchlab.identities.metadataAccount
    || mint.identities.launchlabAuthority !== launchlab.identities.launchlabAuthority
    || mint.identities.mint !== options.mintAddress
    || mint.identities.creator !== options.creatorAddress
    || mint.identities.launchId !== options.launchId
    || mint.supply.tokenProgram !== launchlab.programs.token
    || mint.observation.creationSignature !== launchlab.transaction.signature
    || mint.observation.creationSlot !== launchlab.transaction.finalizedSlot
    || mint.observation.creationTime !== launchlab.transaction.finalizedAt
    || mint.observation.creationTransactionSha256
      !== launchlab.transaction.transactionSha256
    || mint.observation.finalizedSlot > launchlab.observation.finalizedSlot
    || Date.parse(mint.observation.checkedAt)
      > Date.parse(launchlab.observation.checkedAt)
    || launchlab.migration.type !== "cpmm"
    || !same(mint.metadata, launchlab.metadata)) {
    fail("canonical-proof-mismatch");
  }
}

export async function fetchGraduationEvidence({
  repositoryRoot = WORKTREE_ROOT,
  options,
} = {}) {
  if (typeof repositoryRoot !== "string" || !path.isAbsolute(repositoryRoot)) {
    fail("graduation-collector");
  }
  const root = path.resolve(repositoryRoot);
  const mintArtifact = await readCanonicalArtifact(
    "proof/mainnet-mint.json",
    { root },
  );
  const launchlabArtifact = await readCanonicalArtifact(
    "proof/mainnet-launchlab.json",
    { root },
  );
  canonicalArtifactPair(mintArtifact, launchlabArtifact, options);
  return Object.freeze({ mintArtifact, launchlabArtifact });
}

export function reconcileGraduationEvidence({
  mintArtifact,
  launchlabArtifact,
  transactionEvidence,
  accountEvidence,
  checkedAt,
} = {}) {
  if (!plainObject(mintArtifact) || !plainObject(launchlabArtifact)) fail("graduation-evidence");
  canonicalArtifactPair(mintArtifact, launchlabArtifact, {
    mintAddress: mintArtifact.value?.identities?.mint,
    creatorAddress: mintArtifact.value?.identities?.creator,
    launchId: mintArtifact.value?.identities?.launchId,
  });

  // The approved docs pin only CPMM economic semantics. The raw lock-position,
  // lock-NFT, and fee-right account layouts remain unpinned, so no transaction
  // or account value can establish the graduation schema's LP disposition.
  void transactionEvidence;
  void accountEvidence;
  void checkedAt;
  return HAKKY_SOURCE_COVERAGE_UNAVAILABLE;
}

export async function runGraduationVerifier({
  argv = process.argv.slice(2),
  options,
  fetchEvidence = fetchGraduationEvidence,
  publishProof,
} = {}) {
  if (!Array.isArray(argv) || typeof fetchEvidence !== "function"
    || typeof publishProof !== "function") fail("graduation-runner");
  await fetchEvidence({ argv, options });

  // This branch is intentionally terminal. Do not construct a graduation proof
  // and do not call publishProof while raw LP source coverage is unavailable.
  return HAKKY_SOURCE_COVERAGE_UNAVAILABLE;
}
