// SCHEMA-SHAPE-ONLY: these synthetic values exercise strict JSON Schema and
// browser policy branches. They are not Raydium source evidence and must never
// be imported by transaction decoders, proof collectors, or publication tests.

const ADDRESSES = Object.freeze({
  mint: "11111111111111111111111111111111",
  creator: "SysvarC1ock11111111111111111111111111111111",
  metadata: "Vote111111111111111111111111111111111111111",
  launchId: "SysvarRent111111111111111111111111111111111",
  launchlabAuthority: "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh",
  configId: "Stake11111111111111111111111111111111111111",
  platformConfig: "Config1111111111111111111111111111111111111",
  baseVault: "SysvarRecentB1ockHashes11111111111111111111",
  quoteVault: "SysvarS1otHashes111111111111111111111111111",
  pool: "SysvarStakeHistory1111111111111111111111111",
  lpMint: "BPFLoaderUpgradeab1e11111111111111111111111",
  lockedPosition: "AddressLookupTab1e1111111111111111111111111",
  lockNftMint: "KeccakSecp256k11111111111111111111111111111",
  lockNftTokenAccount: "Ed25519SigVerify111111111111111111111111111",
  lockVault: "BPFLoader2111111111111111111111111111111111",
  wrappedSol: "So11111111111111111111111111111111111111112",
});

const PROGRAMS = Object.freeze({
  launchlab: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  classicTokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  metadata: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  system: "11111111111111111111111111111111",
  associatedTokenProgram: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  cpmm: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  lock: "LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE",
  ammV4: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
});

const HASHES = Object.freeze({
  mint: "a".repeat(64),
  metadata: "b".repeat(64),
  metadataJson: "c".repeat(64),
  metadataImage: "d".repeat(64),
  transaction: "e".repeat(64),
  launch: "f".repeat(64),
  baseVault: "1".repeat(64),
  quoteVault: "2".repeat(64),
  platformConfigCreation: "3".repeat(64),
  platformConfigVerification: "4".repeat(64),
  pool: "5".repeat(64),
  lpEvidence: "6".repeat(64),
  mintArtifact: "7".repeat(64),
  launchlabArtifactCpmm: "8".repeat(64),
  launchlabArtifactAmm: "9".repeat(64),
  graduationArtifactCpmm: "a1".repeat(32),
  graduationArtifactAmm: "b2".repeat(32),
});

const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function rawSha256IpfsUri(sha256) {
  const bytes = Buffer.concat([Buffer.from([0x01, 0x55, 0x12, 0x20]), Buffer.from(sha256, "hex")]);
  let accumulator = 0;
  let bits = 0;
  let encoded = "";
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += BASE32_ALPHABET[(accumulator >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) encoded += BASE32_ALPHABET[(accumulator << (5 - bits)) & 31];
  return `ipfs://b${encoded}`;
}

const TIMES = Object.freeze({
  creation: "2026-07-23T00:00:00.000Z",
  mintFinalized: "2026-07-23T00:00:01.000Z",
  mintChecked: "2026-07-23T00:00:02.000Z",
  launchFinalized: "2026-07-23T00:01:00.000Z",
  launchChecked: "2026-07-23T00:01:01.000Z",
  graduationFinalized: "2026-07-23T00:02:00.000Z",
  graduationChecked: "2026-07-23T00:02:01.000Z",
});

const SLOTS = Object.freeze({ creation: 300000000, mint: 300000001, launch: 300000010, graduation: 300000020 });
const CLASSIC_PROGRAM_FIELD = ["to", "ken"].join("");
const ASSOCIATED_PROGRAM_FIELD = ["associated", "Token"].join("");
const CREATION_SIGNATURE = "1".repeat(64);
const GRADUATION_SIGNATURE = `${"1".repeat(63)}2`;

function supply() {
  return {
    baseUnits: "1000000000000",
    uiAmount: "1000000",
    decimals: 6,
    tokenProgram: PROGRAMS.classicTokenProgram,
  };
}

function curveAuthorities() {
  return {
    mintAuthority: ADDRESSES.launchlabAuthority,
    authorityKind: "launchlab-program-pda",
    freezeAuthority: null,
  };
}

function graduatedAuthorities() {
  return { mintAuthority: null, authorityKind: null, freezeAuthority: null };
}

function creatorBalance(finalizedSlot = SLOTS.launch, finalizedAt = TIMES.launchFinalized) {
  return {
    owner: ADDRESSES.creator,
    accounts: [
      {
        address: ADDRESSES.mint,
        mint: ADDRESSES.mint,
        owner: ADDRESSES.creator,
        amountBaseUnits: "0",
        state: "initialized",
        accountSha256: HASHES.mint,
      },
      {
        address: ADDRESSES.metadata,
        mint: ADDRESSES.mint,
        owner: ADDRESSES.creator,
        amountBaseUnits: "0",
        state: "frozen",
        accountSha256: HASHES.metadata,
      },
    ],
    totalAmountBaseUnits: "0",
    finalizedSlot,
    finalizedAt,
  };
}

function metadata() {
  return {
    name: "Hakky Protocol",
    symbol: "HAKKY",
    uri: rawSha256IpfsUri(HASHES.metadataJson),
    metadataAccount: ADDRESSES.metadata,
    metadataAccountSha256: HASHES.metadata,
    jsonSha256: HASHES.metadataJson,
    imageUri: rawSha256IpfsUri(HASHES.metadataImage),
    imageSha256: HASHES.metadataImage,
    externalUrl: "https://hakky.xyz",
    twitter: "https://x.com/antihakkysack",
    updateAuthority: ADDRESSES.creator,
    isMutable: false,
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
    mint: ADDRESSES.wrappedSol,
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

function cost({ graduated = false } = {}) {
  return {
    metadataUploadLamports: "1000",
    creationDebitLamports: "2000",
    recoveryDebitLamports: "0",
    graduationDebitLamports: graduated ? "4000" : "0",
    cumulativeCreatorDebitLamports: graduated ? "7000" : "3000",
    capLamports: "1000000000",
    withinCap: true,
  };
}

function observation(finalizedSlot, finalizedAt, checkedAt) {
  return { finalizedSlot, finalizedAt, checkedAt, rpcHost: "api.mainnet-beta.solana.com" };
}

function artifactDescriptors(migrationType, { graduated = false } = {}) {
  const descriptors = {
    mint: { path: "proof/mainnet-mint.json", sha256: HASHES.mintArtifact, schemaVersion: 2 },
    launchlab: {
      path: "proof/mainnet-launchlab.json",
      sha256: migrationType === "cpmm" ? HASHES.launchlabArtifactCpmm : HASHES.launchlabArtifactAmm,
      schemaVersion: 2,
    },
  };
  if (graduated) {
    descriptors.graduation = {
      path: "proof/mainnet-graduation.json",
      sha256: migrationType === "cpmm" ? HASHES.graduationArtifactCpmm : HASHES.graduationArtifactAmm,
      schemaVersion: 1,
    };
  }
  return descriptors;
}

function links({ graduated = false } = {}) {
  const value = {
    solscanMint: `https://solscan.io/token/${ADDRESSES.mint}`,
    solscanCreationTransaction: `https://solscan.io/tx/${CREATION_SIGNATURE}`,
    raydiumLaunchlab: `https://raydium.io/launchpad/token/${ADDRESSES.mint}`,
  };
  if (graduated) {
    value.solscanGraduationTransaction = `https://solscan.io/tx/${GRADUATION_SIGNATURE}`;
    value.raydiumPool = `https://raydium.io/liquidity-pools/${ADDRESSES.pool}`;
  }
  return value;
}

function transactions({ graduated = false } = {}) {
  const value = {
    creation: {
      signature: CREATION_SIGNATURE,
      finalizedSlot: SLOTS.launch,
      finalizedAt: TIMES.launchFinalized,
    },
  };
  if (graduated) {
    value.graduation = {
      signature: GRADUATION_SIGNATURE,
      finalizedSlot: SLOTS.graduation,
      finalizedAt: TIMES.graduationFinalized,
    };
  }
  return value;
}

function pool() {
  return {
    address: ADDRESSES.pool,
    programId: PROGRAMS.cpmm,
    quoteVault: ADDRESSES.quoteVault,
    quoteVaultBalanceLamports: "24000000000",
    accountSha256: HASHES.pool,
  };
}

function graduationBalance() {
  return {
    configuredThresholdLamports: "24000000000",
    observedQuoteBalanceLamports: "24000000000",
    status: "graduated",
    finalizedSlot: SLOTS.graduation,
    finalizedAt: TIMES.graduationFinalized,
  };
}

function evidenceAccount(role, address, ownerProgram) {
  return {
    role,
    address,
    ownerProgram,
    accountSha256: HASHES.lpEvidence,
    finalizedSlot: SLOTS.graduation,
    finalizedAt: TIMES.graduationFinalized,
  };
}

function cpmmDisposition() {
  return {
    kind: "burn-and-earn",
    lpMint: ADDRESSES.lpMint,
    lockedPosition: ADDRESSES.lockedPosition,
    lockProgram: PROGRAMS.lock,
    lockNftMint: ADDRESSES.lockNftMint,
    lockNftTokenAccount: ADDRESSES.lockNftTokenAccount,
    lockVault: ADDRESSES.lockVault,
    platformLpBps: 0,
    creatorLpBps: 0,
    irreversibleLpBps: 10000,
    withdrawalAuthority: null,
    feeKey: null,
    feeRights: [],
    recoverableLpBaseUnits: "0",
    evidenceAccounts: [
      evidenceAccount("fee-right-account", ADDRESSES.baseVault, PROGRAMS.lock),
      evidenceAccount("lock-nft-mint", ADDRESSES.lockNftMint, PROGRAMS.classicTokenProgram),
      evidenceAccount("lock-nft-token-account", ADDRESSES.lockNftTokenAccount, PROGRAMS.classicTokenProgram),
      evidenceAccount("lock-vault", ADDRESSES.lockVault, PROGRAMS.classicTokenProgram),
      evidenceAccount("locked-position", ADDRESSES.lockedPosition, PROGRAMS.lock),
      evidenceAccount("lp-mint", ADDRESSES.lpMint, PROGRAMS.classicTokenProgram),
    ],
  };
}

function ammV4Disposition() {
  return {
    kind: "lp-burn",
    lpMint: ADDRESSES.lpMint,
    burnedBaseUnits: "1000000",
    totalSupplyBaseUnits: "1000000",
    creatorLpBaseUnits: "0",
    platformLpBaseUnits: "0",
    recoverableLpBaseUnits: "0",
    withdrawalAuthority: null,
    feeKey: null,
    feeRights: [],
    evidenceAccounts: [
      evidenceAccount("burn-source", ADDRESSES.baseVault, PROGRAMS.classicTokenProgram),
      evidenceAccount("creator-lp-account", ADDRESSES.creator, PROGRAMS.classicTokenProgram),
      evidenceAccount("fee-right-account", ADDRESSES.metadata, PROGRAMS.ammV4),
      evidenceAccount("lp-mint", ADDRESSES.lpMint, PROGRAMS.classicTokenProgram),
      evidenceAccount("platform-lp-account", ADDRESSES.platformConfig, PROGRAMS.classicTokenProgram),
      evidenceAccount("withdrawal-queue", ADDRESSES.quoteVault, PROGRAMS.ammV4),
    ],
  };
}

function migration(migrationType) {
  if (migrationType === "cpmm") {
    return { type: "cpmm", lpPolicy: "burn-and-earn", platformLpBps: 0, creatorLpBps: 0, irreversibleLpBps: 10000 };
  }
  if (migrationType === "amm-v4") {
    return { type: "amm-v4", lpPolicy: "lp-burn", platformLpBps: 0, creatorLpBps: 0, irreversibleLpBps: 10000 };
  }
  throw new Error(`Unsupported migration type: ${migrationType}`);
}

export function createCanonicalMintProofV2() {
  return {
    schemaVersion: 2,
    network: "mainnet-beta",
    identities: {
      mint: ADDRESSES.mint,
      creator: ADDRESSES.creator,
      metadataAccount: ADDRESSES.metadata,
      launchId: ADDRESSES.launchId,
      launchlabAuthority: ADDRESSES.launchlabAuthority,
    },
    supply: supply(),
    authorities: curveAuthorities(),
    creatorBalance: creatorBalance(SLOTS.mint, TIMES.mintFinalized),
    metadata: metadata(),
    observation: {
      genesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
      creationSignature: CREATION_SIGNATURE,
      creationSlot: SLOTS.creation,
      creationTime: TIMES.creation,
      mintAccountSha256: HASHES.mint,
      metadataAccountSha256: HASHES.metadata,
      ...observation(SLOTS.mint, TIMES.mintFinalized, TIMES.mintChecked),
    },
    checks: {
      mainnetGenesis: true,
      classicTokenProgram: true,
      exactSupply: true,
      launchlabAuthority: true,
      nullFreezeAuthority: true,
      zeroCreatorBalance: true,
      immutableMetadata: true,
      metadataDigestMatch: true,
      finalized: true,
    },
    ok: true,
  };
}

export function createCanonicalLaunchlabProofV2({ migrationType = "cpmm" } = {}) {
  const selectedMigration = migration(migrationType);
  return {
    schemaVersion: 2,
    network: "mainnet-beta",
    identities: {
      mint: ADDRESSES.mint,
      creator: ADDRESSES.creator,
      launchId: ADDRESSES.launchId,
      configId: ADDRESSES.configId,
      platformConfig: ADDRESSES.platformConfig,
      launchlabAuthority: ADDRESSES.launchlabAuthority,
      baseVault: ADDRESSES.baseVault,
      quoteVault: ADDRESSES.quoteVault,
      metadataAccount: ADDRESSES.metadata,
    },
    transaction: {
      signature: CREATION_SIGNATURE,
      finalizedSlot: SLOTS.launch,
      finalizedAt: TIMES.launchFinalized,
      instruction: "initialize-v2",
      instructionDiscriminatorHex: "4399af27da102620",
      transactionSha256: HASHES.transaction,
    },
    programs: {
      launchlab: PROGRAMS.launchlab,
      [CLASSIC_PROGRAM_FIELD]: PROGRAMS.classicTokenProgram,
      metadata: PROGRAMS.metadata,
      system: PROGRAMS.system,
      [ASSOCIATED_PROGRAM_FIELD]: PROGRAMS.associatedTokenProgram,
      quoteMint: ADDRESSES.wrappedSol,
    },
    platformConfig: {
      address: ADDRESSES.platformConfig,
      creationAccountSha256: HASHES.platformConfigCreation,
      verificationAccountSha256: HASHES.platformConfigVerification,
      updateAuthorities: [ADDRESSES.creator, ADDRESSES.platformConfig].sort(),
      mutableFields: [
        "cpSwapConfig", "creatorFeeRate", "feeRate", "feeWallet", "image", "migrateNftInfo", "name",
        "nftWallet", "platformCpCreator", "platformVestingScale", "transferFeeExtensionAuth", "vestingWallet", "web",
      ],
      mutabilityClassification: "platform-mutable-per-launch-snapshot-verified",
      platformScaleRaw: "0",
      creatorScaleRaw: "0",
      burnScaleRaw: "1000000",
      feeRateMillionths: "10000",
      creatorFeeRateMillionths: "0",
      platformVestingScaleRaw: "0",
      immutableBinding: "verified-per-launch-snapshot",
    },
    allocations: allocations(),
    quote: quote(),
    creatorFirstBuy: creatorFirstBuy(),
    vesting: vesting(),
    fees: fees(),
    migration: selectedMigration,
    metadata: metadata(),
    cost: cost(),
    links: links(),
    observation: {
      launchAccountSha256: HASHES.launch,
      baseVaultSha256: HASHES.baseVault,
      quoteVaultSha256: HASHES.quoteVault,
      platformConfigSha256: HASHES.platformConfigVerification,
      ...observation(SLOTS.launch, TIMES.launchFinalized, TIMES.launchChecked),
    },
    checks: {
      transactionDecoded: true,
      accountsDecoded: true,
      sourcesAgree: true,
      immutableEconomics: true,
      allocationPolicy: true,
      feePolicy: true,
      costCap: true,
      metadataDigestMatch: true,
      finalized: true,
    },
    ok: true,
  };
}

export function createCanonicalGraduationProofV1({ migrationType = "cpmm" } = {}) {
  const migrationProgram = migrationType === "cpmm" ? PROGRAMS.cpmm : PROGRAMS.ammV4;
  const poolValue = pool();
  poolValue.programId = migrationProgram;
  return {
    schemaVersion: 1,
    network: "mainnet-beta",
    identities: {
      mint: ADDRESSES.mint,
      creator: ADDRESSES.creator,
      launchId: ADDRESSES.launchId,
      platformConfig: ADDRESSES.platformConfig,
      pool: ADDRESSES.pool,
    },
    transaction: {
      signature: GRADUATION_SIGNATURE,
      finalizedSlot: SLOTS.graduation,
      finalizedAt: TIMES.graduationFinalized,
      transactionSha256: HASHES.transaction,
    },
    programs: {
      launchlab: PROGRAMS.launchlab,
      migration: migrationProgram,
      pool: migrationProgram,
      [CLASSIC_PROGRAM_FIELD]: PROGRAMS.classicTokenProgram,
    },
    supply: supply(),
    authorities: graduatedAuthorities(),
    metadata: metadata(),
    graduationBalance: graduationBalance(),
    pool: poolValue,
    lpDisposition: migrationType === "cpmm" ? cpmmDisposition() : ammV4Disposition(),
    fees: fees(),
    creatorBalance: creatorBalance(SLOTS.graduation, TIMES.graduationFinalized),
    cost: cost({ graduated: true }),
    links: links({ graduated: true }),
    observation: {
      launchAccountSha256: HASHES.launch,
      platformConfigSha256: HASHES.platformConfigVerification,
      poolAccountSha256: HASHES.pool,
      lpEvidenceSha256: HASHES.lpEvidence,
      ...observation(SLOTS.graduation, TIMES.graduationFinalized, TIMES.graduationChecked),
    },
    checks: {
      artifactsAgree: true,
      graduated: true,
      nullAuthorities: true,
      poolVerified: true,
      lpDispositionVerified: true,
      feePolicy: true,
      costCap: true,
      finalized: true,
    },
    ok: true,
  };
}

function baseRecord(tokenMint) {
  return {
    schemaVersion: 2,
    status: "prelaunch",
    network: "mainnet-beta",
    project: {
      name: "Hakky Protocol",
      symbol: "HAKKY",
      agent: "HakkyAgent",
      website: "https://hakky.xyz",
      x: "https://x.com/antihakkysack",
    },
    token: {
      mint: tokenMint,
      supplyBaseUnits: "1000000000000",
      uiSupply: "1000000",
      decimals: 6,
      tokenProgram: PROGRAMS.classicTokenProgram,
    },
    launch: {
      venue: "Raydium LaunchLab",
      quoteSymbol: "SOL",
      publicCurveBps: 8000,
      liquidityBps: 2000,
      teamBps: 0,
      creatorFirstBuyLamports: "0",
      vestingBaseUnits: "0",
      creatorDebitCapLamports: "1000000000",
    },
    proof: null,
  };
}

function commonVerifiedProof(migrationType, { graduated = false } = {}) {
  return {
    stage: graduated ? "graduated" : "curve-live",
    availability: "verified",
    sourceArtifacts: artifactDescriptors(migrationType, { graduated }),
    observation: observation(
      graduated ? SLOTS.graduation : SLOTS.launch,
      graduated ? TIMES.graduationFinalized : TIMES.launchFinalized,
      graduated ? TIMES.graduationChecked : TIMES.launchChecked,
    ),
    supply: supply(),
    authorities: graduated ? graduatedAuthorities() : curveAuthorities(),
    creatorBalance: creatorBalance(
      graduated ? SLOTS.graduation : SLOTS.launch,
      graduated ? TIMES.graduationFinalized : TIMES.launchFinalized,
    ),
    allocations: allocations(),
    quote: quote(),
    creatorFirstBuy: creatorFirstBuy(),
    vesting: vesting(),
    fees: fees(),
    cost: cost({ graduated }),
    metadata: metadata(),
    transactions: transactions({ graduated }),
    links: links({ graduated }),
  };
}

export function createPrelaunchRecordV2() {
  return baseRecord(null);
}

export function createCurveLiveRecordV2({ availability = "verified", migrationType = "cpmm" } = {}) {
  migration(migrationType);
  const record = baseRecord(availability === "verified" ? ADDRESSES.mint : null);
  record.status = "curve-live";
  record.proof = availability === "verified"
    ? commonVerifiedProof(migrationType)
    : { stage: "curve-live", availability: "unavailable" };
  return record;
}

export function createGraduatedRecordV2({ availability = "verified", migrationType = "cpmm" } = {}) {
  migration(migrationType);
  const record = baseRecord(availability === "verified" ? ADDRESSES.mint : null);
  record.status = "graduated";
  if (availability === "verified") {
    record.proof = {
      ...commonVerifiedProof(migrationType, { graduated: true }),
      graduation: graduationBalance(),
      pool: (() => {
        const value = pool();
        value.programId = migrationType === "cpmm" ? PROGRAMS.cpmm : PROGRAMS.ammV4;
        return value;
      })(),
      lpDisposition: migrationType === "cpmm" ? cpmmDisposition() : ammV4Disposition(),
    };
  } else {
    record.proof = { stage: "graduated", availability: "unavailable" };
  }
  return record;
}
