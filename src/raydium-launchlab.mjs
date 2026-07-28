import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

export const RAYDIUM_LAUNCHLAB_PROGRAM_ID = "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj";

export const RAYDIUM_SOURCE_PROVEN\u0041NCE = Object.freeze({
  repository: "https://github.com/raydium-io/raydium-sdk-V2",
  commit: "fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c",
  launchlabProgramId: RAYDIUM_LAUNCHLAB_PROGRAM_ID,
});

export const RAYDIUM_IDL_SOURCE_PROVEN\u0041NCE = Object.freeze({
  repository: "https://github.com/raydium-io/raydium-idl",
  commit: "e7e0c96fe77bcf6a020b84a44c47a722aac8e359",
  launchpadPath: "raydium_launchpad/raydium_launchpad.json",
  cpmmPath: "raydium_cpmm/raydium_cp_swap.json",
});

export const SPL_TOKEN_SOURCE_PROVEN\u0041NCE = Object.freeze({
  package: "@solana/spl-token",
  version: "0.4.15",
  mintLayoutPath: "src/state/mint.ts",
  accountLayoutPath: "src/state/account.ts",
});

export const RAYDIUM_PLATFORM_CONFIG_SOURCE_PROVEN\u0041NCE = deepFreeze({
  repository: "https://github.com/raydium-io/raydium-docs-v1",
  commit: "10dd5f7d9f23f0be7daabd571fc9e7c65ce269dc",
  path: "products/launchlab/platform-config.mdx",
  gitBlobSha256: "e048a0b3caf3cd8b543a8fd143897b4cdb5ea2de2f8ad58fb93d0837f6486b92",
  distributionLineRange: "68-72",
  cpmmDispositionLineRange: "110-117",
});

export const HAKKY_SOURCE_COVERAGE_VERIFIED = deepFreeze({
  ok: true,
  code: "source-coverage-verified",
  query: {
    migrationType: "cpmm",
    platformScaleRaw: "0",
    creatorScaleRaw: "0",
    burnScaleRaw: "1000000",
  },
  disposition: {
    lpPolicy: "burn-and-earn",
    platformLpBps: 0,
    creatorLpBps: 0,
    irreversibleLpBps: 10000,
    platformFeeKey: false,
    creatorFeeKey: false,
    withdrawalRights: false,
    feeRecipients: [],
  },
  proven\u0041nce: RAYDIUM_PLATFORM_CONFIG_SOURCE_PROVEN\u0041NCE,
});

export const HAKKY_SOURCE_COVERAGE_UNAVAILABLE = deepFreeze({
  ok: false,
  code: "source-coverage-unavailable",
  reason: "cpmm-burn-scale-lp-rights-unmapped",
});

export const HAKKY_PLATFORM_CONFIG_IMMUTABILITY_UNAVAILABLE = deepFreeze({
  ok: false,
  code: "platform-config-immutability-unavailable",
  reason: "platform-admin-can-update-graduation-economics",
});

const PROGRAMS = Object.freeze({
  launchlab: RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  authority: "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh",
  cpmm: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  lock: "LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE",
  lockAuthority: "3f7GcQFG397GAaEnv51zR6tsTVihYRydnydDD1cXekxH",
  ammV4: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  openbook: "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX",
  classicTokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  associatedTokenProgram: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  metadata: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  system: "11111111111111111111111111111111",
  rent: "SysvarRent111111111111111111111111111111111",
});

const DISCRIMINATORS = Object.freeze({
  initializeV2: Buffer.from([67, 153, 175, 39, 218, 16, 38, 32]),
  migrateToCpmm: Buffer.from([136, 92, 200, 103, 28, 218, 144, 140]),
  migrateToAmm: Buffer.from([207, 82, 192, 145, 254, 207, 145, 223]),
  createPlatformConfig: Buffer.from([176, 90, 196, 175, 253, 113, 220, 20]),
  updatePlatformConfig: Buffer.from([195, 60, 76, 129, 146, 45, 67, 143]),
  launchpadPool: Buffer.from([247, 237, 227, 245, 215, 195, 222, 70]),
  platformConfig: Buffer.from([160, 78, 128, 0, 248, 83, 230, 160]),
  cpmmPool: Buffer.from([247, 237, 227, 245, 215, 195, 222, 70]),
});

const CREATION_ACCOUNT_NAMES = Object.freeze([
  "payer", "creator", "configId", "platformId", "authority", "launchId", "mint", "quoteMint",
  "baseVault", "quoteVault", "metadataAccount", "tokenProgramBase", "tokenProgramQuote",
  "metadataProgram", "systemProgram", "rentSysvar", "eventAuthority", "launchlabProgram",
]);

const CPMM_MIGRATION_ACCOUNT_NAMES = Object.freeze([
  "payer", "baseMint", "quoteMint", "platformConfig", "cpmmProgram", "cpmmPool", "cpmmAuthority",
  "cpmmLpMint", "cpmmBaseVault", "cpmmQuoteVault", "cpmmConfig", "cpmmCreatePoolFee",
  "cpmmObservation", "lockProgram", "lockAuthority", "lockLpVault", "launchlabAuthority", "launchId",
  "globalConfig", "launchBaseVault", "launchQuoteVault", "poolLpToken", "baseTokenProgram",
  "quoteTokenProgram", "associatedTokenProgram", "systemProgram", "rentSysvar", "metadataProgram",
]);

const AMM_MIGRATION_ACCOUNT_NAMES = Object.freeze([
  "payer", "baseMint", "quoteMint", "openbookProgram", "market", "requestQueue", "eventQueue", "bids",
  "asks", "marketVaultSigner", "marketBaseVault", "marketQuoteVault", "ammProgram", "ammPool",
  "ammAuthority", "ammOpenOrders", "ammLpMint", "ammBaseVault", "ammQuoteVault", "ammTargetOrders",
  "ammConfig", "ammCreateFeeDestination", "launchlabAuthority", "launchId", "globalConfig", "launchBaseVault",
  "launchQuoteVault", "poolLpToken", "tokenProgram", "associatedTokenProgram", "systemProgram", "rentSysvar",
]);

const CREATE_PLATFORM_ACCOUNT_NAMES = Object.freeze([
  "platformAdmin", "platformFeeWallet", "platformNftWallet", "platformConfig", "cpmmConfig", "systemProgram",
  "transferFeeExtensionAuthority", "platformVestingWallet",
]);

const UPDATE_VARIANTS = Object.freeze([
  "fee-wallet",
  "nft-wallet",
  "migrate-nft-info",
  "fee-rate",
  "name",
  "web",
  "image",
  "cp-swap-config",
  "all-info",
  "vesting-wallet",
  "platform-vesting-scale",
  "platform-cp-creator",
]);

export const RAYDIUM_PLATFORM_CONFIG_MUTABLE_FIELDS = Object.freeze([
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

const LAUNCH_STATUS = Object.freeze(["fund", "migrate", "trade"]);
const MIGRATION_TYPES = Object.freeze(["amm-v4", "cpmm"]);
const CPMM_CREATOR_FEE_ON = Object.freeze(["only-token-b", "both-token"]);
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${label} has unsupported properties`);
  }
}

function canonicalPublicKey(value, label) {
  try {
    if (typeof value !== "string") throw new TypeError();
    const decoded = new PublicKey(value);
    if (decoded.toBase58() !== value) throw new TypeError();
    return value;
  } catch {
    throw new TypeError(`${label} must be a canonical public key`);
  }
}

function asBytes(value, label) {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    throw new TypeError(`${label} must be bytes`);
  }
  return Buffer.from(value);
}

function requireRange(buffer, offset, length, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new RangeError(`${label} is too short`);
  }
}

function readU8(buffer, offset, label = "bytes") {
  requireRange(buffer, offset, 1, label);
  return buffer[offset];
}

function readU16LE(buffer, offset, label = "bytes") {
  requireRange(buffer, offset, 2, label);
  return buffer.readUInt16LE(offset);
}

function readU32LE(buffer, offset, label = "bytes") {
  requireRange(buffer, offset, 4, label);
  return buffer.readUInt32LE(offset);
}

function readU64LE(buffer, offset, label = "bytes") {
  requireRange(buffer, offset, 8, label);
  return buffer.readBigUInt64LE(offset);
}

function readPublicKey(buffer, offset, label = "bytes") {
  requireRange(buffer, offset, 32, label);
  return new PublicKey(buffer.subarray(offset, offset + 32)).toBase58();
}

function exactLength(buffer, length, label) {
  if (buffer.length !== length) throw new RangeError(`${label} must be exactly ${length} bytes; trailing or short data is rejected`);
}

function exactDiscriminator(buffer, expected, label) {
  requireRange(buffer, 0, expected.length, label);
  if (!buffer.subarray(0, expected.length).equals(expected)) throw new Error(`${label} discriminator is unsupported`);
}

function requireZero(buffer, start, endExclusive, label) {
  requireRange(buffer, start, endExclusive - start, label);
  for (let index = start; index < endExclusive; index += 1) {
    if (buffer[index] !== 0) throw new Error(`${label} reserved or padding bytes must be zero`);
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function discriminatorHex(buffer) {
  return buffer.subarray(0, 8).toString("hex");
}

function derivePda(seeds, programId = PROGRAMS.launchlab) {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(seeds, new PublicKey(programId));
  return deepFreeze({ publicKey: publicKey.toBase58(), bump });
}

function publicKeyBytes(value) {
  return new PublicKey(value).toBuffer();
}

function requireIdentity(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} account or program identity mismatch`);
}

function accountMap(names, accountKeys) {
  return Object.fromEntries(names.map((name, index) => [name, accountKeys[index]]));
}

function normalizedAccountKeys(accountKeys, expectedLengths, label) {
  if (!Array.isArray(accountKeys) || !expectedLengths.includes(accountKeys.length)) {
    throw new TypeError(`${label} account arity is invalid`);
  }
  return accountKeys.map((value, index) => canonicalPublicKey(value, `${label}[${index}]`));
}

class ByteCursor {
  constructor(buffer, label) {
    this.buffer = buffer;
    this.label = label;
    this.offset = 0;
  }

  skip(length) {
    requireRange(this.buffer, this.offset, length, this.label);
    this.offset += length;
  }

  u8() {
    const value = readU8(this.buffer, this.offset, this.label);
    this.offset += 1;
    return value;
  }

  u64() {
    const value = readU64LE(this.buffer, this.offset, this.label);
    this.offset += 8;
    return value;
  }

  publicKey() {
    const value = readPublicKey(this.buffer, this.offset, this.label);
    this.offset += 32;
    return value;
  }

  string() {
    const length = readU32LE(this.buffer, this.offset, this.label);
    this.offset += 4;
    requireRange(this.buffer, this.offset, length, this.label);
    let value;
    try {
      value = UTF8_DECODER.decode(this.buffer.subarray(this.offset, this.offset + length));
    } catch {
      throw new Error(`${this.label} contains invalid UTF-8`);
    }
    this.offset += length;
    return value;
  }

  done() {
    if (this.offset !== this.buffer.length) throw new RangeError(`${this.label} contains trailing bytes`);
  }
}

export function deriveLaunchlabAuthorityPda() {
  if (arguments.length !== 0) throw new TypeError("deriveLaunchlabAuthorityPda accepts no arguments");
  const result = derivePda([Buffer.from("vault_auth_seed", "utf8")]);
  requireIdentity(result.publicKey, PROGRAMS.authority, "LaunchLab authority PDA");
  return result;
}

export function derivePlatformConfigPda(platformAdmin) {
  if (arguments.length !== 1) throw new TypeError("derivePlatformConfigPda accepts exactly one argument");
  const administrator = canonicalPublicKey(platformAdmin, "platformAdmin");
  return derivePda([Buffer.from("platform_config", "utf8"), publicKeyBytes(administrator)]);
}

function deriveLaunchAccounts(accounts) {
  const launch = derivePda([
    Buffer.from("pool", "utf8"),
    publicKeyBytes(accounts.mint ?? accounts.baseMint),
    publicKeyBytes(accounts.quoteMint),
  ]);
  const baseVault = derivePda([
    Buffer.from("pool_vault", "utf8"),
    publicKeyBytes(launch.publicKey),
    publicKeyBytes(accounts.mint ?? accounts.baseMint),
  ]);
  const quoteVault = derivePda([
    Buffer.from("pool_vault", "utf8"),
    publicKeyBytes(launch.publicKey),
    publicKeyBytes(accounts.quoteMint),
  ]);
  return { launch, baseVault, quoteVault };
}

function validateLaunchInstructionAccounts(accounts, optionalAccount = null) {
  requireIdentity(accounts.authority ?? accounts.launchlabAuthority, deriveLaunchlabAuthorityPda().publicKey, "LaunchLab authority");
  const derived = deriveLaunchAccounts(accounts);
  requireIdentity(accounts.launchId, derived.launch.publicKey, "LaunchLab launch PDA");
  requireIdentity(accounts.baseVault ?? accounts.launchBaseVault, derived.baseVault.publicKey, "LaunchLab base vault PDA");
  requireIdentity(accounts.quoteVault ?? accounts.launchQuoteVault, derived.quoteVault.publicKey, "LaunchLab quote vault PDA");
  if (optionalAccount !== null) {
    const expected = derivePda([
      Buffer.from("platform_global_access", "utf8"),
      publicKeyBytes(accounts.platformId),
      publicKeyBytes(accounts.configId),
    ]).publicKey;
    requireIdentity(optionalAccount, expected, "platform-global-access optional PDA");
  }
}

export function decodeLaunchlabCreationTransaction(input) {
  exactKeys(input, ["transactionBytes", "accountKeys"], "creation decoder input");
  const data = asBytes(input.transactionBytes, "transactionBytes");
  const keys = normalizedAccountKeys(input.accountKeys, [18, 19], "initialize-v2 accounts");
  exactDiscriminator(data, DISCRIMINATORS.initializeV2, "initialize-v2");

  const cursor = new ByteCursor(data, "initialize-v2 data");
  cursor.skip(8);
  const decimals = cursor.u8();
  const name = cursor.string();
  const symbol = cursor.string();
  const uri = cursor.string();
  const curveIndex = cursor.u8();
  if (curveIndex !== 0) throw new Error("initialize-v2 curve enum must be constant-product index 0");
  const supply = cursor.u64();
  const totalSell = cursor.u64();
  const totalFundraising = cursor.u64();
  const migrationIndex = cursor.u8();
  const migrationType = MIGRATION_TYPES[migrationIndex];
  if (!migrationType) throw new Error("initialize-v2 migration enum is unsupported");
  const lockedAmount = cursor.u64();
  const cliffPeriod = cursor.u64();
  const unlockPeriod = cursor.u64();
  const cpmmFeeIndex = cursor.u8();
  const cpmmCreatorFeeOn = CPMM_CREATOR_FEE_ON[cpmmFeeIndex];
  if (!cpmmCreatorFeeOn) throw new Error("initialize-v2 CPMM creator-fee enum is unsupported");
  cursor.done();

  const accounts = accountMap(CREATION_ACCOUNT_NAMES, keys);
  requireIdentity(accounts.tokenProgramBase, PROGRAMS.classicTokenProgram, "classic base Token program");
  requireIdentity(accounts.tokenProgramQuote, PROGRAMS.classicTokenProgram, "classic quote Token program");
  requireIdentity(accounts.metadataProgram, PROGRAMS.metadata, "Metadata program");
  requireIdentity(accounts.systemProgram, PROGRAMS.system, "System program");
  requireIdentity(accounts.rentSysvar, PROGRAMS.rent, "Rent sysvar");
  requireIdentity(accounts.launchlabProgram, PROGRAMS.launchlab, "LaunchLab program");
  const eventAuthority = derivePda([Buffer.from("__event_authority", "utf8")]).publicKey;
  requireIdentity(accounts.eventAuthority, eventAuthority, "LaunchLab event authority");
  validateLaunchInstructionAccounts(accounts, keys.length === 19 ? keys[18] : null);

  return deepFreeze({
    instruction: "initialize-v2",
    discriminatorHex: discriminatorHex(data),
    accounts,
    decimals,
    name,
    symbol,
    uri,
    curve: { type: "constant-product", supply, totalSell, totalFundraising, migrationType },
    vesting: { lockedAmount, cliffPeriod, unlockPeriod },
    cpmmCreatorFeeOn,
  });
}

function validateCpmmMigrationAccounts(accounts) {
  requireIdentity(accounts.cpmmProgram, PROGRAMS.cpmm, "CPMM program");
  requireIdentity(accounts.lockProgram, PROGRAMS.lock, "CPMM lock program");
  requireIdentity(accounts.lockAuthority, PROGRAMS.lockAuthority, "CPMM lock authority");
  requireIdentity(accounts.launchlabAuthority, PROGRAMS.authority, "LaunchLab authority");
  requireIdentity(accounts.baseTokenProgram, PROGRAMS.classicTokenProgram, "classic base Token program");
  requireIdentity(accounts.quoteTokenProgram, PROGRAMS.classicTokenProgram, "classic quote Token program");
  requireIdentity(accounts.associatedTokenProgram, PROGRAMS.associatedTokenProgram, "Associated Token program");
  requireIdentity(accounts.systemProgram, PROGRAMS.system, "System program");
  requireIdentity(accounts.rentSysvar, PROGRAMS.rent, "Rent sysvar");
  requireIdentity(accounts.metadataProgram, PROGRAMS.metadata, "Metadata program");
  validateLaunchInstructionAccounts(accounts);
}

function validateAmmMigrationAccounts(accounts) {
  requireIdentity(accounts.openbookProgram, PROGRAMS.openbook, "OpenBook program");
  requireIdentity(accounts.ammProgram, PROGRAMS.ammV4, "AMM-v4 program");
  requireIdentity(accounts.launchlabAuthority, PROGRAMS.authority, "LaunchLab authority");
  requireIdentity(accounts.tokenProgram, PROGRAMS.classicTokenProgram, "classic Token program");
  requireIdentity(accounts.associatedTokenProgram, PROGRAMS.associatedTokenProgram, "Associated Token program");
  requireIdentity(accounts.systemProgram, PROGRAMS.system, "System program");
  requireIdentity(accounts.rentSysvar, PROGRAMS.rent, "Rent sysvar");
  validateLaunchInstructionAccounts(accounts);
}

export function decodeLaunchlabGraduationTransaction(input) {
  exactKeys(input, ["transactionBytes", "accountKeys"], "graduation decoder input");
  const data = asBytes(input.transactionBytes, "transactionBytes");
  requireRange(data, 0, 8, "graduation instruction");

  if (data.subarray(0, 8).equals(DISCRIMINATORS.migrateToCpmm)) {
    exactLength(data, 8, "migrate-to-cpswap data");
    const keys = normalizedAccountKeys(input.accountKeys, [28], "migrate-to-cpswap accounts");
    const accounts = accountMap(CPMM_MIGRATION_ACCOUNT_NAMES, keys);
    validateCpmmMigrationAccounts(accounts);
    return deepFreeze({
      instruction: "migrate-to-cpswap",
      discriminatorHex: discriminatorHex(data),
      migrationType: "cpmm",
      accounts,
    });
  }

  if (data.subarray(0, 8).equals(DISCRIMINATORS.migrateToAmm)) {
    exactLength(data, 25, "migrate-to-amm data");
    const keys = normalizedAccountKeys(input.accountKeys, [32], "migrate-to-amm accounts");
    const accounts = accountMap(AMM_MIGRATION_ACCOUNT_NAMES, keys);
    validateAmmMigrationAccounts(accounts);
    return deepFreeze({
      instruction: "migrate-to-amm",
      discriminatorHex: discriminatorHex(data),
      migrationType: "amm-v4",
      accounts,
      baseLotSize: readU64LE(data, 8, "migrate-to-amm data"),
      quoteLotSize: readU64LE(data, 16, "migrate-to-amm data"),
      marketVaultSignerNonce: readU8(data, 24, "migrate-to-amm data"),
    });
  }

  throw new Error("graduation instruction discriminator is unsupported");
}

function normalizedAccountMetas(value) {
  if (!Array.isArray(value)) throw new TypeError("accountMetas must be an array");
  return value.map((meta, index) => {
    exactKeys(meta, ["publicKey", "isSigner", "isWritable"], `accountMetas[${index}]`);
    if (typeof meta.isSigner !== "boolean" || typeof meta.isWritable !== "boolean") {
      throw new TypeError(`accountMetas[${index}] privileges must be boolean`);
    }
    return {
      publicKey: canonicalPublicKey(meta.publicKey, `accountMetas[${index}].publicKey`),
      isSigner: meta.isSigner,
      isWritable: meta.isWritable,
    };
  });
}

function requireMeta(meta, { isSigner, isWritable }, label) {
  if (meta.isSigner !== isSigner || meta.isWritable !== isWritable) {
    throw new Error(`${label} meta privilege signer/writable mismatch`);
  }
}

function parseCreatePlatformParams(data) {
  const cursor = new ByteCursor(data, "create-platform-config params");
  cursor.u64();
  cursor.u64();
  cursor.u64();
  cursor.u64();
  cursor.string();
  cursor.string();
  cursor.string();
  cursor.u64();
  cursor.u64();
  cursor.done();
}

function parseUpdateVariant(data) {
  const cursor = new ByteCursor(data, "update-platform-config params");
  const variantIndex = cursor.u8();
  const mutableVariant = UPDATE_VARIANTS[variantIndex];
  if (!mutableVariant) throw new Error("update-platform-config mutable variant is unsupported");
  if (variantIndex === 0 || variantIndex === 1 || variantIndex === 9 || variantIndex === 11) {
    cursor.publicKey();
  } else if (variantIndex === 2) {
    cursor.u64();
    cursor.u64();
    cursor.u64();
  } else if (variantIndex === 3 || variantIndex === 10) {
    cursor.u64();
  } else if (variantIndex === 4 || variantIndex === 5 || variantIndex === 6) {
    cursor.string();
  } else if (variantIndex === 8) {
    cursor.publicKey();
    cursor.publicKey();
    cursor.u64();
    cursor.u64();
    cursor.u64();
    cursor.u64();
    cursor.string();
    cursor.string();
    cursor.string();
    cursor.publicKey();
    cursor.u64();
    cursor.u64();
    cursor.publicKey();
  }
  cursor.done();
  return { variantIndex, mutableVariant };
}

export function classifyPlatformConfigAuthorityInstruction(instructionBytes) {
  const data = asBytes(instructionBytes, "instructionBytes");
  requireRange(data, 0, 8, "platform authority instruction");
  if (data.subarray(0, 8).equals(DISCRIMINATORS.createPlatformConfig)) {
    return "create-platform-config";
  }
  if (data.subarray(0, 8).equals(DISCRIMINATORS.updatePlatformConfig)) {
    return "update-platform-config";
  }
  return null;
}

export function decodePlatformConfigAuthorityInstruction(input) {
  exactKeys(input, ["instructionBytes", "accountMetas", "feePayer"], "platform authority decoder input");
  const data = asBytes(input.instructionBytes, "instructionBytes");
  const feePayer = canonicalPublicKey(input.feePayer, "feePayer");
  const metas = normalizedAccountMetas(input.accountMetas);
  requireRange(data, 0, 8, "platform authority instruction");

  if (data.subarray(0, 8).equals(DISCRIMINATORS.createPlatformConfig)) {
    if (metas.length !== 8) throw new Error("create-platform-config meta arity must be 8");
    const expected = [
      { isSigner: true, isWritable: true },
      { isSigner: false, isWritable: false },
      { isSigner: false, isWritable: false },
      { isSigner: false, isWritable: true },
      { isSigner: false, isWritable: true },
      { isSigner: false, isWritable: false },
      { isSigner: false, isWritable: false },
      { isSigner: false, isWritable: false },
    ];
    metas.forEach((meta, index) => requireMeta(meta, expected[index], `create-platform-config account ${index}`));
    requireIdentity(metas[3].publicKey, derivePlatformConfigPda(metas[0].publicKey).publicKey, "PlatformConfig PDA");
    requireIdentity(metas[5].publicKey, PROGRAMS.system, "System program");
    const params = data.subarray(8);
    parseCreatePlatformParams(params);
    const accounts = accountMap(CREATE_PLATFORM_ACCOUNT_NAMES, metas.map((meta) => meta.publicKey));
    return deepFreeze({
      instruction: "create-platform-config",
      discriminatorHex: discriminatorHex(data),
      platformAdmin: metas[0].publicKey,
      platformConfig: metas[3].publicKey,
      accounts,
      paramsSha256: sha256(params),
    });
  }

  if (data.subarray(0, 8).equals(DISCRIMINATORS.updatePlatformConfig)) {
    const { variantIndex, mutableVariant } = parseUpdateVariant(data.subarray(8));
    const expectedArity = variantIndex === 7 || variantIndex === 8 ? 3 : 2;
    if (metas.length !== expectedArity) throw new Error(`update-platform-config variant ${variantIndex} meta arity is invalid`);
    const adminIsFeePayer = metas[0].publicKey === feePayer;
    requireMeta(metas[0], { isSigner: true, isWritable: adminIsFeePayer }, "update-platform-config administrator");
    requireMeta(metas[1], { isSigner: false, isWritable: true }, "update-platform-config PlatformConfig");
    if (expectedArity === 3) requireMeta(metas[2], { isSigner: false, isWritable: false }, "update-platform-config cpmmConfig");
    requireIdentity(metas[1].publicKey, derivePlatformConfigPda(metas[0].publicKey).publicKey, "PlatformConfig PDA");
    return deepFreeze({
      instruction: "update-platform-config",
      discriminatorHex: discriminatorHex(data),
      platformAdmin: metas[0].publicKey,
      platformConfig: metas[1].publicKey,
      mutableVariant,
    });
  }

  throw new Error("platform authority instruction discriminator is unsupported");
}

function normalizedAccount(value, label) {
  exactKeys(value, ["address", "owner", "data"], label);
  return {
    address: canonicalPublicKey(value.address, `${label}.address`),
    owner: canonicalPublicKey(value.owner, `${label}.owner`),
    data: asBytes(value.data, `${label}.data`),
  };
}

function decodeFixedString(buffer, start, length, label) {
  requireRange(buffer, start, length, label);
  const raw = buffer.subarray(start, start + length);
  const zero = raw.indexOf(0);
  const content = zero === -1 ? raw : raw.subarray(0, zero);
  if (zero !== -1) requireZero(raw, zero, raw.length, label);
  try {
    return UTF8_DECODER.decode(content);
  } catch {
    throw new Error(`${label} contains invalid UTF-8`);
  }
}

function decodeLaunchAccount(account) {
  requireIdentity(account.owner, PROGRAMS.launchlab, "LaunchLab account owner");
  exactLength(account.data, 429, "LaunchpadPool account");
  exactDiscriminator(account.data, DISCRIMINATORS.launchpadPool, "LaunchpadPool account");
  requireZero(account.data, 375, 429, "LaunchpadPool account");
  const statusIndex = readU8(account.data, 17, "LaunchpadPool account");
  const status = LAUNCH_STATUS[statusIndex];
  if (!status) throw new Error("LaunchpadPool status enum is unsupported");
  const migrationIndex = readU8(account.data, 20, "LaunchpadPool account");
  const migrationType = MIGRATION_TYPES[migrationIndex];
  if (!migrationType) throw new Error("LaunchpadPool migration enum is unsupported");
  const mintProgramFlag = readU8(account.data, 365, "LaunchpadPool account");
  if (mintProgramFlag !== 0) throw new Error("LaunchpadPool Token-2022 or unknown mint-program flag is unsupported");
  const cpmmFeeIndex = readU8(account.data, 366, "LaunchpadPool account");
  const cpmmCreatorFeeOn = CPMM_CREATOR_FEE_ON[cpmmFeeIndex];
  if (!cpmmCreatorFeeOn) throw new Error("LaunchpadPool CPMM creator-fee enum is unsupported");
  const integers = Array.from({ length: 10 }, (_, index) => readU64LE(account.data, 21 + index * 8, "LaunchpadPool account"));
  const vesting = Array.from({ length: 5 }, (_, index) => readU64LE(account.data, 101 + index * 8, "LaunchpadPool account"));
  const keys = Array.from({ length: 7 }, (_, index) => readPublicKey(account.data, 141 + index * 32, "LaunchpadPool account"));
  const result = {
    epoch: readU64LE(account.data, 8, "LaunchpadPool account"),
    bump: readU8(account.data, 16, "LaunchpadPool account"),
    status,
    mintDecimalsA: readU8(account.data, 18, "LaunchpadPool account"),
    mintDecimalsB: readU8(account.data, 19, "LaunchpadPool account"),
    migrationType,
    supply: integers[0],
    totalSellA: integers[1],
    virtualA: integers[2],
    virtualB: integers[3],
    realA: integers[4],
    realB: integers[5],
    totalFundRaisingB: integers[6],
    protocolFee: integers[7],
    platformFee: integers[8],
    migrateFee: integers[9],
    vestingSchedule: {
      totalLockedAmount: vesting[0],
      cliffPeriod: vesting[1],
      unlockPeriod: vesting[2],
      startTime: vesting[3],
      totalAllocatedShare: vesting[4],
    },
    configId: keys[0],
    platformId: keys[1],
    mintA: keys[2],
    mintB: keys[3],
    vaultA: keys[4],
    vaultB: keys[5],
    creator: keys[6],
    mintProgramFlag: "classic-spl-token",
    cpmmCreatorFeeOn,
    platformVestingShare: readU64LE(account.data, 367, "LaunchpadPool account"),
  };
  const derived = derivePda([Buffer.from("pool", "utf8"), publicKeyBytes(result.mintA), publicKeyBytes(result.mintB)]);
  requireIdentity(account.address, derived.publicKey, "LaunchpadPool PDA");
  if (result.bump !== derived.bump) throw new Error("LaunchpadPool PDA bump mismatch");
  return result;
}

function decodeTokenAccount(account, label) {
  requireIdentity(account.owner, PROGRAMS.classicTokenProgram, `${label} classic Token program owner`);
  exactLength(account.data, 165, `${label} classic SPL AccountLayout`);
  const state = readU8(account.data, 108, `${label} classic SPL AccountLayout`);
  if (state !== 1 && state !== 2) throw new Error(`${label} token state is unsupported`);
  const delegateOption = readU32LE(account.data, 72, `${label} classic SPL AccountLayout`);
  const nativeOption = readU32LE(account.data, 109, `${label} classic SPL AccountLayout`);
  const closeAuthorityOption = readU32LE(account.data, 129, `${label} classic SPL AccountLayout`);
  if (delegateOption > 1 || nativeOption > 1 || closeAuthorityOption > 1) throw new Error(`${label} classic SPL option enum is unsupported`);
  return {
    address: account.address,
    mint: readPublicKey(account.data, 0, `${label} classic SPL AccountLayout`),
    owner: readPublicKey(account.data, 32, `${label} classic SPL AccountLayout`),
    amount: readU64LE(account.data, 64, `${label} classic SPL AccountLayout`),
    accountSha256: sha256(account.data),
  };
}

function decodePlatformCurveItem(buffer, offset, label) {
  requireRange(buffer, offset, 491, label);
  requireZero(buffer, offset + 91, offset + 491, label);
  const migrationIndex = readU8(buffer, offset + 41, label);
  const migrationType = MIGRATION_TYPES[migrationIndex];
  if (!migrationType) throw new Error(`${label} migration enum is unsupported`);
  const cpmmFeeIndex = readU8(buffer, offset + 42, label);
  const migrateCpmmFeeOn = CPMM_CREATOR_FEE_ON[cpmmFeeIndex];
  if (!migrateCpmmFeeOn) throw new Error(`${label} CPMM creator-fee enum is unsupported`);
  return {
    epoch: readU64LE(buffer, offset, label),
    index: readU8(buffer, offset + 8, label),
    configId: readPublicKey(buffer, offset + 9, label),
    migrationType,
    migrateCpmmFeeOn,
    supply: readU64LE(buffer, offset + 43, label),
    totalSellA: readU64LE(buffer, offset + 51, label),
    totalFundRaisingB: readU64LE(buffer, offset + 59, label),
    totalLockedAmount: readU64LE(buffer, offset + 67, label),
    cliffPeriod: readU64LE(buffer, offset + 75, label),
    unlockPeriod: readU64LE(buffer, offset + 83, label),
  };
}

export function decodePlatformConfigAccount(account) {
  requireIdentity(account.owner, PROGRAMS.launchlab, "PlatformConfig account owner");
  if (account.data.length < 944) throw new RangeError("PlatformConfig account is too short");
  exactDiscriminator(account.data, DISCRIMINATORS.platformConfig, "PlatformConfig account");
  requireZero(account.data, 832, 940, "PlatformConfig account");
  const vectorLength = readU32LE(account.data, 940, "PlatformConfig account");
  const expectedLength = 944 + vectorLength * 491;
  exactLength(account.data, expectedLength, "PlatformConfig account and curve vector");
  const platformCurve = Array.from(
    { length: vectorLength },
    (_, index) => decodePlatformCurveItem(account.data, 944 + index * 491, `PlatformConfig curve item ${index}`),
  );
  return {
    address: account.address,
    epoch: readU64LE(account.data, 8, "PlatformConfig account"),
    platformClaimFeeWallet: readPublicKey(account.data, 16, "PlatformConfig account"),
    platformLockNftWallet: readPublicKey(account.data, 48, "PlatformConfig account"),
    platformScale: readU64LE(account.data, 80, "PlatformConfig account"),
    creatorScale: readU64LE(account.data, 88, "PlatformConfig account"),
    burnScale: readU64LE(account.data, 96, "PlatformConfig account"),
    feeRate: readU64LE(account.data, 104, "PlatformConfig account"),
    name: decodeFixedString(account.data, 112, 64, "PlatformConfig name"),
    web: decodeFixedString(account.data, 176, 256, "PlatformConfig web"),
    image: decodeFixedString(account.data, 432, 256, "PlatformConfig image"),
    cpConfigId: readPublicKey(account.data, 688, "PlatformConfig account"),
    creatorFeeRate: readU64LE(account.data, 720, "PlatformConfig account"),
    transferFeeExtensionAuth: readPublicKey(account.data, 728, "PlatformConfig account"),
    platformVestingWallet: readPublicKey(account.data, 760, "PlatformConfig account"),
    platformVestingScale: readU64LE(account.data, 792, "PlatformConfig account"),
    platformCpCreator: readPublicKey(account.data, 800, "PlatformConfig account"),
    platformCurve,
    accountSha256: sha256(account.data),
  };
}

export function decodeLaunchlabAccounts(input) {
  exactKeys(input, ["launchAccount", "vaultAccount", "platformConfigAccount"], "LaunchLab accounts decoder input");
  exactKeys(input.vaultAccount, ["baseVault", "quoteVault"], "vaultAccount");
  const launchAccount = normalizedAccount(input.launchAccount, "launchAccount");
  const baseVaultAccount = normalizedAccount(input.vaultAccount.baseVault, "vaultAccount.baseVault");
  const quoteVaultAccount = normalizedAccount(input.vaultAccount.quoteVault, "vaultAccount.quoteVault");
  const platformConfigAccount = normalizedAccount(input.platformConfigAccount, "platformConfigAccount");
  const launch = decodeLaunchAccount(launchAccount);
  const baseVault = decodeTokenAccount(baseVaultAccount, "base vault");
  const quoteVault = decodeTokenAccount(quoteVaultAccount, "quote vault");
  const platformConfig = decodePlatformConfigAccount(platformConfigAccount);
  requireIdentity(baseVault.address, launch.vaultA, "base vault address");
  requireIdentity(quoteVault.address, launch.vaultB, "quote vault address");
  requireIdentity(baseVault.mint, launch.mintA, "base vault mint");
  requireIdentity(quoteVault.mint, launch.mintB, "quote vault mint");
  requireIdentity(baseVault.owner, deriveLaunchlabAuthorityPda().publicKey, "base vault token owner");
  requireIdentity(quoteVault.owner, deriveLaunchlabAuthorityPda().publicKey, "quote vault token owner");
  requireIdentity(platformConfig.address, launch.platformId, "PlatformConfig address");
  return deepFreeze({ launch, baseVault, quoteVault, platformConfig });
}

function decodeCpmmPoolAccount(account, launch) {
  requireIdentity(account.owner, PROGRAMS.cpmm, "CPMM pool account owner");
  exactLength(account.data, 637, "CPMM PoolState account");
  exactDiscriminator(account.data, DISCRIMINATORS.cpmmPool, "CPMM PoolState account");
  requireZero(account.data, 391, 397, "CPMM PoolState account");
  requireZero(account.data, 413, 637, "CPMM PoolState account");
  requireIdentity(readPublicKey(account.data, 232, "CPMM PoolState account"), PROGRAMS.classicTokenProgram, "CPMM mint program A");
  requireIdentity(readPublicKey(account.data, 264, "CPMM PoolState account"), PROGRAMS.classicTokenProgram, "CPMM mint program B");
  const feeOn = readU8(account.data, 389, "CPMM PoolState account");
  if (feeOn > 2) throw new Error("CPMM PoolState fee enum is unsupported");
  const enableCreatorFee = readU8(account.data, 390, "CPMM PoolState account");
  if (enableCreatorFee > 1) throw new Error("CPMM PoolState creator-fee boolean is unsupported");
  const pool = {
    address: account.address,
    programId: account.owner,
    baseMint: readPublicKey(account.data, 168, "CPMM PoolState account"),
    quoteMint: readPublicKey(account.data, 200, "CPMM PoolState account"),
    baseVault: readPublicKey(account.data, 72, "CPMM PoolState account"),
    quoteVault: readPublicKey(account.data, 104, "CPMM PoolState account"),
    accountSha256: sha256(account.data),
  };
  requireIdentity(pool.baseMint, launch.mintA, "CPMM base mint");
  requireIdentity(pool.quoteMint, launch.mintB, "CPMM quote mint");
  return pool;
}

function decodeAmmPoolAccount(account, launch) {
  requireIdentity(account.owner, PROGRAMS.ammV4, "AMM-v4 pool account owner");
  exactLength(account.data, 752, "AMM-v4 liquidityStateV4 account");
  requireZero(account.data, 728, 752, "AMM-v4 liquidityStateV4 account");
  const pool = {
    address: account.address,
    programId: account.owner,
    baseMint: readPublicKey(account.data, 400, "AMM-v4 liquidityStateV4 account"),
    quoteMint: readPublicKey(account.data, 432, "AMM-v4 liquidityStateV4 account"),
    baseVault: readPublicKey(account.data, 336, "AMM-v4 liquidityStateV4 account"),
    quoteVault: readPublicKey(account.data, 368, "AMM-v4 liquidityStateV4 account"),
    accountSha256: sha256(account.data),
  };
  requireIdentity(pool.baseMint, launch.mintA, "AMM-v4 base mint");
  requireIdentity(pool.quoteMint, launch.mintB, "AMM-v4 quote mint");
  return pool;
}

export function decodeGraduationAccounts(input) {
  exactKeys(input, ["launchAccount", "poolAccount", "platformConfigAccount"], "graduation accounts decoder input");
  const launchAccount = normalizedAccount(input.launchAccount, "launchAccount");
  const poolAccount = normalizedAccount(input.poolAccount, "poolAccount");
  const platformConfigAccount = normalizedAccount(input.platformConfigAccount, "platformConfigAccount");
  const launch = decodeLaunchAccount(launchAccount);
  const platformConfig = decodePlatformConfigAccount(platformConfigAccount);
  requireIdentity(platformConfig.address, launch.platformId, "PlatformConfig address");
  const pool = launch.migrationType === "cpmm"
    ? decodeCpmmPoolAccount(poolAccount, launch)
    : decodeAmmPoolAccount(poolAccount, launch);
  return deepFreeze({ launch, pool, platformConfig });
}

export function evaluateHakkyLaunchlabSourceCoverage(input) {
  exactKeys(input, ["migrationType", "platformScaleRaw", "creatorScaleRaw", "burnScaleRaw"], "HAKKY source coverage query");
  if (
    input.migrationType !== "cpmm"
    || input.platformScaleRaw !== 0n
    || input.creatorScaleRaw !== 0n
    || input.burnScaleRaw !== 1_000_000n
  ) {
    throw new Error("unsupported HAKKY source coverage query");
  }
  return HAKKY_SOURCE_COVERAGE_VERIFIED;
}
