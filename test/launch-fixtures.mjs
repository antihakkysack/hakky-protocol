// Deterministic Solana system addresses are used only as non-live test fixtures.
export const FIXTURE_MINT = "11111111111111111111111111111111";
export const FIXTURE_CREATOR = "SysvarC1ock11111111111111111111111111111111";
export const FIXTURE_LAUNCH_ID = "SysvarRent111111111111111111111111111111111";
export const FIXTURE_SIGNATURE = "1".repeat(64);
export const MINT_CHECKED_AT = "2026-07-22T00:00:00.000Z";
export const LAUNCH_CHECKED_AT = "2026-07-22T00:01:00.000Z";
export const WEB_VERIFIED_AT = "2026-07-22T00:02:00.000Z";

export function createCanonicalMintProof() {
  const observed = {
    network: "mainnet-beta",
    tokenProgram: "spl-token",
    mint: FIXTURE_MINT,
    creator: FIXTURE_CREATOR,
    supplyBaseUnits: "1000000000000",
    decimals: 6,
    mintAuthority: null,
    freezeAuthority: null,
    creatorBalanceBaseUnits: "0",
  };
  const checks = [
    ["mint-public-key", observed.mint],
    ["creator-public-key", observed.creator],
    ["network-mainnet", observed.network],
    ["classic-token-program", observed.tokenProgram],
    ["fixed-supply", observed.supplyBaseUnits],
    ["six-decimals", observed.decimals],
    ["mint-authority-revoked", observed.mintAuthority],
    ["freeze-authority-none", observed.freezeAuthority],
    ["creator-balance-zero", observed.creatorBalanceBaseUnits],
  ].map(([id, value]) => ({ id, ok: true, observed: value }));
  return {
    schemaVersion: 1,
    checkedAt: MINT_CHECKED_AT,
    rpcHost: "api.mainnet-beta.solana.com",
    creator: FIXTURE_CREATOR,
    ok: true,
    checks,
    observed,
  };
}

export function createCanonicalLaunchlabProof() {
  return {
    schemaVersion: 1,
    checkedAt: LAUNCH_CHECKED_AT,
    mint: FIXTURE_MINT,
    launchId: FIXTURE_LAUNCH_ID,
    launchTransaction: FIXTURE_SIGNATURE,
    creator: FIXTURE_CREATOR,
    creatorSpendSol: 0.25,
    quoteAsset: "SOL",
    curveAllocationBps: 8000,
    liquidityAllocationBps: 2000,
    teamAllocationBps: 0,
    graduationTargetSol: 24,
    creatorFirstBuySol: 0,
    creatorFeeEnabled: false,
    lpPolicy: "burn",
    metadataName: "Hakky Protocol",
    metadataSymbol: "HAKKY",
    metadataUri: "https://hakky.xyz/metadata.json",
    metadataImage: "https://hakky.xyz/assets/token.png",
    metadataWebsite: "https://hakky.xyz",
    metadataX: "https://x.com/antihakkysack",
    metadataImmutable: true,
    raydiumUrl: `https://raydium.io/launchpad/token/?mint=${FIXTURE_MINT}`,
    solscanUrl: `https://solscan.io/token/${FIXTURE_MINT}`,
    solscanTransactionUrl: `https://solscan.io/tx/${FIXTURE_SIGNATURE}`,
    ok: true,
  };
}

export function createValidLiveRecord(prelaunchRecord) {
  const changed = structuredClone(prelaunchRecord);
  changed.status = "live";
  changed.token.mint = FIXTURE_MINT;
  changed.proof = {
    mint: FIXTURE_MINT,
    creator: FIXTURE_CREATOR,
    launchId: FIXTURE_LAUNCH_ID,
    launchTransaction: FIXTURE_SIGNATURE,
    solscanUrl: `https://solscan.io/token/${FIXTURE_MINT}`,
    solscanTransactionUrl: `https://solscan.io/tx/${FIXTURE_SIGNATURE}`,
    raydiumUrl: `https://raydium.io/launchpad/token/?mint=${FIXTURE_MINT}`,
    mintVerifiedAt: MINT_CHECKED_AT,
    launchVerifiedAt: LAUNCH_CHECKED_AT,
    verifiedAt: WEB_VERIFIED_AT,
    supplyBaseUnits: "1000000000000",
    decimals: 6,
    tokenProgram: "spl-token",
    mintAuthority: null,
    freezeAuthority: null,
    creatorBalanceBaseUnits: "0",
    metadataImmutable: true,
    metadataName: "Hakky Protocol",
    metadataSymbol: "HAKKY",
    metadataUri: "https://hakky.xyz/metadata.json",
    metadataImage: "https://hakky.xyz/assets/token.png",
    metadataWebsite: "https://hakky.xyz",
    metadataX: "https://x.com/antihakkysack",
    curveAllocationBps: 8000,
    liquidityAllocationBps: 2000,
    teamAllocationBps: 0,
    creatorFeeEnabled: false,
    lpPolicy: "burn",
    quoteAsset: "SOL",
    graduationTargetSol: 24,
    creatorFirstBuySol: 0,
    creatorSpendSol: 0.25,
  };
  return changed;
}
