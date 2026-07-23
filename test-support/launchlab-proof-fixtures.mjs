const IDS = Object.freeze({
  mint: "11111111111111111111111111111111",
  creator: "SysvarC1ock11111111111111111111111111111111",
  launchId: "SysvarRent111111111111111111111111111111111",
  configId: "Stake11111111111111111111111111111111111111",
  platformConfig: "Config1111111111111111111111111111111111111",
  launchlabAuthority: "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh",
  baseVault: "SysvarRecentB1ockHashes11111111111111111111",
  quoteVault: "SysvarS1otHashes111111111111111111111111111",
  metadataAccount: "Vote111111111111111111111111111111111111111",
});

const PROGRAMS = Object.freeze({
  launchlab: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  token: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  metadata: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  system: "11111111111111111111111111111111",
  associatedToken: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  quoteMint: "So11111111111111111111111111111111111111112",
});

const HASHES = Object.freeze({
  transaction: "a".repeat(64),
  launch: "b".repeat(64),
  baseVault: "c".repeat(64),
  quoteVault: "d".repeat(64),
  platformCreation: "e".repeat(64),
  platformVerification: "f".repeat(64),
  metadataAccount: "1".repeat(64),
  metadataJson: "2".repeat(64),
  metadataImage: "3".repeat(64),
});

const MUTABLE_FIELDS = Object.freeze([
  "cpSwapConfig",
  "creatorFeeRate",
  "feeRate",
  "feeWallet",
  "image",
  "migrateNftInfo",
  "name",
  "nftWallet",
  "platformCpCreator",
  "platformVestingScale",
  "transferFeeExtensionAuth",
  "vestingWallet",
  "web",
]);

const METADATA_URI = "ipfs://bafkreib76rmb2chdqlh2g5g2vkqz6d3wzayx3g5e6kqbp3xg2xzf32yeqa";
const IMAGE_URI = "ipfs://bafkreifx2apd7xw5be4v5gwnw2qjzib7xqttc4x5xup5buifq2d5vvpgmu";
const SIGNATURE = "1".repeat(64);

function identities() {
  return { ...IDS };
}

function platformConfig({ creation }) {
  return {
    address: IDS.platformConfig,
    ...(creation
      ? { creationAccountSha256: HASHES.platformCreation }
      : { verificationAccountSha256: HASHES.platformVerification }),
    updateAuthorities: [IDS.platformConfig, IDS.creator].sort(),
    mutableFields: [...MUTABLE_FIELDS],
    mutabilityClassification: "platform-mutable-per-launch-snapshot-verified",
    platformScaleRaw: "0",
    creatorScaleRaw: "0",
    burnScaleRaw: "1000000",
    feeRateMillionths: "10000",
    creatorFeeRateMillionths: "0",
    platformVestingScaleRaw: "0",
    immutableBinding: "verified-per-launch-snapshot",
  };
}

function allocations() {
  return {
    publicCurveBaseUnits: "800000000000",
    publicCurveBps: 8000,
    liquidityBaseUnits: "200000000000",
    liquidityBps: 2000,
    teamBaseUnits: "0",
    teamBps: 0,
    totalBps: 10000,
  };
}

function quote() {
  return {
    mint: PROGRAMS.quoteMint,
    symbol: "SOL",
    decimals: 9,
    fundraisingLamports: "24000000000",
    graduationThresholdLamports: "24000000000",
  };
}

function creatorFirstBuy() {
  return { creatorLamports: "0", creatorTokenBaseUnits: "0" };
}

function vesting() {
  return { lockedBaseUnits: "0", cliffSeconds: "0", unlockSeconds: "0" };
}

function fees() {
  return {
    protocolBuyFeeRateMillionths: "10000",
    protocolSellFeeRateMillionths: "10000",
    feeRateDenominator: "1000000",
    creatorTradingFeeRateMillionths: "0",
    creatorFeeKey: null,
    creatorFeeRights: false,
    snapshotImmutable: true,
  };
}

function migration() {
  return {
    type: "cpmm",
    lpPolicy: "burn-and-earn",
    platformLpBps: 0,
    creatorLpBps: 0,
    irreversibleLpBps: 10000,
  };
}

function metadata() {
  return {
    name: "Hakky Protocol",
    symbol: "HAKKY",
    uri: METADATA_URI,
    metadataAccount: IDS.metadataAccount,
    metadataAccountSha256: HASHES.metadataAccount,
    jsonSha256: HASHES.metadataJson,
    imageUri: IMAGE_URI,
    imageSha256: HASHES.metadataImage,
    externalUrl: "https://hakky.xyz",
    twitter: "https://x.com/antihakkysack",
    updateAuthority: IDS.creator,
    isMutable: false,
  };
}

function cost() {
  return {
    metadataUploadLamports: "1000",
    creationDebitLamports: "2000",
    recoveryDebitLamports: "0",
    graduationDebitLamports: "0",
    cumulativeCreatorDebitLamports: "3000",
    capLamports: "1000000000",
    withinCap: true,
  };
}

function links() {
  return {
    solscanMint: `https://solscan.io/token/${IDS.mint}`,
    solscanCreationTransaction: `https://solscan.io/tx/${SIGNATURE}`,
    raydiumLaunchlab: `https://raydium.io/launchpad/token/${IDS.mint}`,
  };
}

function economics() {
  return {
    allocations: allocations(),
    quote: quote(),
    creatorFirstBuy: creatorFirstBuy(),
    vesting: vesting(),
    fees: fees(),
    migration: migration(),
    metadata: metadata(),
    cost: cost(),
    links: links(),
  };
}

export function createLaunchlabReconciliationFixture() {
  const shared = economics();
  return {
    transactionEvidence: {
      network: "mainnet-beta",
      identities: identities(),
      transaction: {
        signature: SIGNATURE,
        finalizedSlot: 300000010,
        finalizedAt: "2026-07-23T00:01:00.000Z",
        instruction: "initialize-v2",
        instructionDiscriminatorHex: "4399af27da102620",
        transactionSha256: HASHES.transaction,
      },
      programs: { ...PROGRAMS },
      platformConfig: platformConfig({ creation: true }),
      ...structuredClone(shared),
    },
    accountEvidence: {
      network: "mainnet-beta",
      identities: identities(),
      platformConfig: platformConfig({ creation: false }),
      ...structuredClone(shared),
      observation: {
        launchAccountSha256: HASHES.launch,
        baseVaultSha256: HASHES.baseVault,
        quoteVaultSha256: HASHES.quoteVault,
        platformConfigSha256: HASHES.platformVerification,
        finalizedSlot: 300000011,
        finalizedAt: "2026-07-23T00:01:01.000Z",
        rpcHost: "api.mainnet-beta.solana.com",
      },
    },
    publicIdentifiers: {
      mint: IDS.mint,
      creator: IDS.creator,
      launchId: IDS.launchId,
      creationSignature: SIGNATURE,
    },
    checkedAt: "2026-07-23T00:01:02.000Z",
  };
}
