import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  HAKKY_SOURCE_COVERAGE_VERIFIED,
  RAYDIUM_IDL_SOURCE_PROVEN\u0041NCE,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  RAYDIUM_PLATFORM_CONFIG_SOURCE_PROVEN\u0041NCE,
  RAYDIUM_SOURCE_PROVEN\u0041NCE,
  SPL_TOKEN_SOURCE_PROVEN\u0041NCE,
  decodeGraduationAccounts,
  decodeLaunchlabAccounts,
  decodeLaunchlabCreationTransaction,
  decodeLaunchlabGraduationTransaction,
  decodePlatformConfigAuthorityInstruction,
  deriveLaunchlabAuthorityPda,
  derivePlatformConfigPda,
  evaluateHakkyLaunchlabSourceCoverage,
} from "../src/raydium-launchlab.mjs";

const FIXTURE_NAMES = [
  "initialize-v2-transaction.json",
  "migrate-to-cpswap-transaction.json",
  "migrate-to-amm-transaction.json",
  "platform-config-instructions.json",
  "curve-accounts.json",
  "graduation-accounts.json",
];

const SDK_REPOSITORY = "https://github.com/raydium-io/raydium-sdk-V2";
const SDK_COMMIT = "fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c";
const IDL_REPOSITORY = "https://github.com/raydium-io/raydium-idl";
const IDL_COMMIT = "e7e0c96fe77bcf6a020b84a44c47a722aac8e359";
const SPL_REPOSITORY = "https://github.com/solana-program/token-2022";
const SPL_COMMIT = "27c359d1c7d38afdec293720dba4b768aa61aeb7";

const FIXED_ID_REFERENCES = [
  { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/common/programId.ts", lineRange: "14-38", purpose: "Raydium OpenBook, AMM-v4, CPMM, CPMM lock, LaunchLab, and fixed authority identities" },
  { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/common/pubKey.ts", lineRange: "64-68", purpose: "Rent, Metadata, and System program identities" },
  { repository: SPL_REPOSITORY, commit: SPL_COMMIT, path: "clients/js-legacy/src/constants.ts", lineRange: "4-10", purpose: "classic SPL Token, Token-2022, and Associated Token program identities" },
];

const ROOT_SOURCES = {
  "initialize-v2-transaction.json": { sourceRepository: SDK_REPOSITORY, sourceCommit: SDK_COMMIT, sourcePath: "src/raydium/launchpad/instrument.ts", sourceLineRange: "130-234" },
  "migrate-to-cpswap-transaction.json": { sourceRepository: IDL_REPOSITORY, sourceCommit: IDL_COMMIT, sourcePath: "raydium_launchpad/raydium_launchpad.json", sourceLineRange: "3377-3806" },
  "migrate-to-amm-transaction.json": { sourceRepository: IDL_REPOSITORY, sourceCommit: IDL_COMMIT, sourcePath: "raydium_launchpad/raydium_launchpad.json", sourceLineRange: "2783-3375" },
  "platform-config-instructions.json": { sourceRepository: SDK_REPOSITORY, sourceCommit: SDK_COMMIT, sourcePath: "src/raydium/launchpad/instrument.ts", sourceLineRange: "747-972" },
  "curve-accounts.json": { sourceRepository: SDK_REPOSITORY, sourceCommit: SDK_COMMIT, sourcePath: "src/raydium/launchpad/layout.ts", sourceLineRange: "34-71,83-128" },
  "graduation-accounts.json": { sourceRepository: SDK_REPOSITORY, sourceCommit: SDK_COMMIT, sourcePath: "src/raydium/cpmm/layout.ts;src/raydium/liquidity/layout.ts", sourceLineRange: "20-59;9-70" },
};

const EXPECTED_SOURCE_REFERENCES = {
  "initialize-v2-transaction.json": [
    ...FIXED_ID_REFERENCES,
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/launchpad/pda.ts", lineRange: "3-35,52-54,76-81", purpose: "LaunchLab authority, pool, vault, platform, event-authority, and optional platform-global-access PDA derivations" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/clmm/libraries/pda.ts", lineRange: "8-9", purpose: "literal pool and pool-vault seeds imported by the LaunchLab PDA helpers" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/launchpad/instrument.ts", lineRange: "9-28,130-234", purpose: "InitializeV2 discriminator, data layout, exact account order, fixed programs, and sole optional account" },
  ],
  "migrate-to-cpswap-transaction.json": [
    ...FIXED_ID_REFERENCES,
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/launchpad/pda.ts", lineRange: "3-35,52-54", purpose: "LaunchLab authority, pool, vault, event-authority, and platform PDA derivations used by migration accounts" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/clmm/libraries/pda.ts", lineRange: "8-9", purpose: "literal pool and pool-vault seeds imported by the LaunchLab PDA helpers" },
    { repository: IDL_REPOSITORY, commit: IDL_COMMIT, path: "raydium_launchpad/raydium_launchpad.json", lineRange: "3377-3806", purpose: "migrate_to_cpswap discriminator, exact account order, signer and writable flags" },
    { repository: IDL_REPOSITORY, commit: IDL_COMMIT, path: "raydium_cpmm/raydium_cp_swap.json", lineRange: "949-1350", purpose: "CPMM initialize discriminator, exact account order, signer and writable flags used by migration CPI" },
  ],
  "migrate-to-amm-transaction.json": [
    ...FIXED_ID_REFERENCES,
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/launchpad/pda.ts", lineRange: "3-35,52-54", purpose: "LaunchLab authority, pool, vault, event-authority, and platform PDA derivations used by migration accounts" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/clmm/libraries/pda.ts", lineRange: "8-9", purpose: "literal pool and pool-vault seeds imported by the LaunchLab PDA helpers" },
    { repository: IDL_REPOSITORY, commit: IDL_COMMIT, path: "raydium_launchpad/raydium_launchpad.json", lineRange: "2783-3375", purpose: "migrate_to_amm discriminator, exact account order, signer and writable flags, and instruction arguments" },
  ],
  "platform-config-instructions.json": [
    ...FIXED_ID_REFERENCES,
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/launchpad/pda.ts", lineRange: "8,52-54", purpose: "PlatformConfig seed and administrator-derived PDA" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/launchpad/instrument.ts", lineRange: "9-28,747-972", purpose: "create and update discriminators, exact SDK metas, data layouts, and mutable variant indices" },
    { repository: IDL_REPOSITORY, commit: IDL_COMMIT, path: "raydium_launchpad/raydium_launchpad.json", lineRange: "1514-1614,4313-4386,5403-5473", purpose: "create and update IDL account flags, PDA seeds, discriminators, and PlatformConfigParam variants" },
  ],
  "curve-accounts.json": [
    ...FIXED_ID_REFERENCES,
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/launchpad/pda.ts", lineRange: "3-35,52-54", purpose: "LaunchLab authority, pool, vault, event-authority, and platform PDA derivations" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/clmm/libraries/pda.ts", lineRange: "8-9", purpose: "literal pool and pool-vault seeds imported by the LaunchLab PDA helpers" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/launchpad/layout.ts", lineRange: "34-71,83-128", purpose: "LaunchpadPool and PlatformConfig raw layouts including nested curve parameters" },
    { repository: IDL_REPOSITORY, commit: IDL_COMMIT, path: "raydium_launchpad/raydium_launchpad.json", lineRange: "4497-4508,4523-4534", purpose: "PlatformConfig and PoolState account discriminator bytes" },
    { repository: SPL_REPOSITORY, commit: SPL_COMMIT, path: "clients/js-legacy/src/state/account.ts", lineRange: "54-84", purpose: "classic SPL raw token AccountLayout and exact 165-byte account size" },
  ],
  "graduation-accounts.json": [
    ...FIXED_ID_REFERENCES,
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/launchpad/pda.ts", lineRange: "3-35,52-54", purpose: "LaunchLab authority, pool, vault, event-authority, and platform PDA derivations" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/clmm/libraries/pda.ts", lineRange: "8-9", purpose: "literal pool and pool-vault seeds imported by the LaunchLab PDA helpers" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/launchpad/layout.ts", lineRange: "34-71,83-128", purpose: "LaunchpadPool and PlatformConfig raw layouts including nested curve parameters" },
    { repository: IDL_REPOSITORY, commit: IDL_COMMIT, path: "raydium_launchpad/raydium_launchpad.json", lineRange: "4497-4508,4523-4534,5190-5345,5677-5914", purpose: "PlatformConfig and PoolState discriminators and complete account type layouts" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/cpmm/layout.ts", lineRange: "20-59", purpose: "CPMM PoolState raw byte layout" },
    { repository: IDL_REPOSITORY, commit: IDL_COMMIT, path: "raydium_cpmm/raydium_cp_swap.json", lineRange: "2395-2408,2817-3011", purpose: "CPMM PoolState discriminator, field meanings, creator-fee flag, and padding" },
    { repository: SDK_REPOSITORY, commit: SDK_COMMIT, path: "src/raydium/liquidity/layout.ts", lineRange: "9-70", purpose: "AMM-v4 liquidityStateV4 raw byte layout" },
  ],
};

function assertPinnedFixtureSources(name, value) {
  for (const [key, expected] of Object.entries(ROOT_SOURCES[name])) assert.equal(value[key], expected);
  assert.deepEqual(value.sourceReferences, EXPECTED_SOURCE_REFERENCES[name]);
}

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`../test-support/fixtures/launchlab/${name}`, import.meta.url), "utf8"));
}

function bytes(value) {
  return Buffer.from(value, "base64");
}

function account(value) {
  return { address: value.address, owner: value.owner, data: bytes(value.dataBase64) };
}

function normalize(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalize(child)]));
  }
  return value;
}

function clone(value) {
  return structuredClone(value);
}

function assertRecursivelyFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertRecursivelyFrozen(child);
}

function decodeCreation(input) {
  return decodeLaunchlabCreationTransaction({
    transactionBytes: bytes(input.instructionBase64),
    accountKeys: input.orderedAccountKeys,
  });
}

function decodeGraduation(input) {
  return decodeLaunchlabGraduationTransaction({
    transactionBytes: bytes(input.instructionBase64),
    accountKeys: input.orderedAccountKeys,
  });
}

test("all six fixtures carry exact drift-reviewable source references, not live responses", async () => {
  for (const name of FIXTURE_NAMES) {
    const value = await fixture(name);
    assertPinnedFixtureSources(name, value);
    assert.ok(value.fixedProgramIdentities);
    assert.equal("rpcResponse" in value, false);
    assert.equal("branch" in value, false);

    for (let index = 0; index < value.sourceReferences.length; index += 1) {
      for (const [field, garbage] of Object.entries({
        repository: "https://github.com/raydium-io/syntactically-valid-garbage",
        commit: "0000000000000000000000000000000000000000",
        path: "src/syntactically-valid-garbage.ts",
        lineRange: "1-2",
        purpose: "syntactically valid garbage purpose",
      })) {
        const mutated = clone(value);
        mutated.sourceReferences[index][field] = garbage;
        assert.throws(() => assertPinnedFixtureSources(name, mutated));
      }
    }
  }
});

test("source pins and the LaunchLab authority PDA are exact and frozen", () => {
  assert.equal(RAYDIUM_LAUNCHLAB_PROGRAM_ID, "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj");
  assert.deepEqual(RAYDIUM_SOURCE_PROVEN\u0041NCE, {
    repository: "https://github.com/raydium-io/raydium-sdk-V2",
    commit: "fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c",
    launchlabProgramId: RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  });
  assert.deepEqual(RAYDIUM_IDL_SOURCE_PROVEN\u0041NCE, {
    repository: "https://github.com/raydium-io/raydium-idl",
    commit: "e7e0c96fe77bcf6a020b84a44c47a722aac8e359",
    launchpadPath: "raydium_launchpad/raydium_launchpad.json",
    cpmmPath: "raydium_cpmm/raydium_cp_swap.json",
  });
  assert.deepEqual(SPL_TOKEN_SOURCE_PROVEN\u0041NCE, {
    package: "@solana/spl-token",
    version: "0.4.15",
    mintLayoutPath: "src/state/mint.ts",
    accountLayoutPath: "src/state/account.ts",
  });
  const authority = deriveLaunchlabAuthorityPda();
  assert.deepEqual(authority, { publicKey: "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh", bump: 250 });
  assertRecursivelyFrozen(authority);
  assert.equal(Object.isFrozen(RAYDIUM_SOURCE_PROVEN\u0041NCE), true);
  assert.equal(Object.isFrozen(RAYDIUM_IDL_SOURCE_PROVEN\u0041NCE), true);
  assert.equal(Object.isFrozen(SPL_TOKEN_SOURCE_PROVEN\u0041NCE), true);
});

test("platform config PDA uses only the canonical administrator and fixed seed", async () => {
  const source = await fixture("platform-config-instructions.json");
  const result = derivePlatformConfigPda(source.create.accountMetas[0].publicKey);
  assert.deepEqual(result, { publicKey: source.create.expected.platformConfig, bump: 253 });
  assert.throws(() => derivePlatformConfigPda("not-a-public-key"), /public key/i);
  assert.throws(() => derivePlatformConfigPda(source.create.accountMetas[0].publicKey, "override"), /argument/i);
});

test("initialize-v2 decoding returns only the frozen instruction contract", async () => {
  const source = await fixture("initialize-v2-transaction.json");
  const result = decodeCreation(source);
  assert.deepEqual(normalize(result), source.expected);
  assert.deepEqual(Object.keys(result), [
    "instruction", "discriminatorHex", "accounts", "decimals", "name", "symbol", "uri", "curve", "vesting", "cpmmCreatorFeeOn",
  ]);
  assert.deepEqual(Object.keys(result.curve), ["type", "supply", "totalSell", "totalFundraising", "migrationType"]);
  assert.deepEqual(Object.keys(result.vesting), ["lockedAmount", "cliffPeriod", "unlockPeriod"]);
  for (const forbidden of ["threshold", "firstBuy", "fees", "cost", "creatorDebit", "lpDisposition"]) {
    assert.equal(forbidden in result, false);
  }
  assertRecursivelyFrozen(result);
});

test("initialize-v2 validates classic programs, PDAs, exact bytes, and the sole optional account", async () => {
  const source = await fixture("initialize-v2-transaction.json");
  for (const index of [4, 5, 8, 9, 11, 12, 13, 14, 15, 16, 17]) {
    const accountKeys = [...source.orderedAccountKeys];
    accountKeys[index] = source.orderedAccountKeys[0];
    assert.throws(() => decodeLaunchlabCreationTransaction({ transactionBytes: bytes(source.instructionBase64), accountKeys }), /account|program|PDA|authority/i);
  }
  const token2022 = [...source.orderedAccountKeys];
  token2022[11] = source.fixedProgramIdentities.token2022Program;
  assert.throws(() => decodeLaunchlabCreationTransaction({ transactionBytes: bytes(source.instructionBase64), accountKeys: token2022 }), /classic|Token-2022|program/i);

  assert.equal(source.expectedOptionalPlatformGlobalAccess, "6YoW87cRqaHBXPU7ZRshGMHzQt81p9XkQDWL864krv8Z");
  const optionalResult = decodeLaunchlabCreationTransaction({
    transactionBytes: bytes(source.instructionBase64),
    accountKeys: [...source.orderedAccountKeys, source.expectedOptionalPlatformGlobalAccess],
  });
  assert.deepEqual(normalize(optionalResult), source.expected);
  assert.throws(() => decodeLaunchlabCreationTransaction({
    transactionBytes: bytes(source.instructionBase64),
    accountKeys: [...source.orderedAccountKeys, source.orderedAccountKeys[0]],
  }), /optional|PDA|account/i);
  assert.throws(() => decodeLaunchlabCreationTransaction({
    transactionBytes: Buffer.concat([bytes(source.instructionBase64), Buffer.from([0])]),
    accountKeys: source.orderedAccountKeys,
  }), /trailing|length/i);
  assert.throws(() => decodeLaunchlabCreationTransaction({ transactionBytes: Buffer.alloc(7), accountKeys: source.orderedAccountKeys }), /short|length|discriminator/i);
  assert.throws(() => decodeLaunchlabCreationTransaction({ transactionBytes: bytes(source.instructionBase64), accountKeys: source.orderedAccountKeys.slice(0, 17) }), /arity|account/i);

  const enumOffsets = bytes(source.instructionBase64);
  let curveOffset = 9;
  for (let index = 0; index < 3; index += 1) {
    const length = enumOffsets.readUInt32LE(curveOffset);
    curveOffset += 4 + length;
  }
  for (const [offset, value, pattern] of [
    [curveOffset, 3, /curve|enum/i],
    [curveOffset + 25, 2, /migration|enum/i],
    [enumOffsets.length - 1, 2, /creator-fee|enum/i],
  ]) {
    const malformed = Buffer.from(enumOffsets);
    malformed[offset] = value;
    assert.throws(() => decodeLaunchlabCreationTransaction({ transactionBytes: malformed, accountKeys: source.orderedAccountKeys }), pattern);
  }
});

test("graduation decoder keeps CPMM and AMM-v4 as exact disjoint unions", async () => {
  const cpmmSource = await fixture("migrate-to-cpswap-transaction.json");
  const ammSource = await fixture("migrate-to-amm-transaction.json");
  const cpmm = decodeGraduation(cpmmSource);
  const amm = decodeGraduation(ammSource);
  assert.deepEqual(normalize(cpmm), cpmmSource.expected);
  assert.deepEqual(normalize(amm), ammSource.expected);
  assert.deepEqual(Object.keys(cpmm), ["instruction", "discriminatorHex", "migrationType", "accounts"]);
  assert.deepEqual(Object.keys(amm), [
    "instruction", "discriminatorHex", "migrationType", "accounts", "baseLotSize", "quoteLotSize", "marketVaultSignerNonce",
  ]);
  assert.equal("baseLotSize" in cpmm, false);
  assert.equal("lockProgram" in amm.accounts, false);
  assertRecursivelyFrozen(cpmm);
  assertRecursivelyFrozen(amm);
});

test("graduation decoder rejects short/trailing data and every fixed-program drift", async () => {
  const cpmm = await fixture("migrate-to-cpswap-transaction.json");
  const amm = await fixture("migrate-to-amm-transaction.json");
  for (const [source, fixedIndexes] of [[cpmm, [4, 13, 14, 16, 22, 23, 24, 25, 26, 27]], [amm, [3, 12, 22, 28, 29, 30, 31]]]) {
    for (const index of fixedIndexes) {
      const accountKeys = [...source.orderedAccountKeys];
      accountKeys[index] = source.orderedAccountKeys[0];
      assert.throws(() => decodeLaunchlabGraduationTransaction({ transactionBytes: bytes(source.instructionBase64), accountKeys }), /account|program|authority/i);
    }
  }
  const wrongOpenBook = [...amm.orderedAccountKeys];
  wrongOpenBook[3] = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
  assert.throws(() => decodeLaunchlabGraduationTransaction({ transactionBytes: bytes(amm.instructionBase64), accountKeys: wrongOpenBook }), /OpenBook|program/i);
  assert.throws(() => decodeLaunchlabGraduationTransaction({ transactionBytes: Buffer.alloc(7), accountKeys: cpmm.orderedAccountKeys }), /short|length|discriminator/i);
  assert.throws(() => decodeLaunchlabGraduationTransaction({ transactionBytes: Buffer.concat([bytes(cpmm.instructionBase64), Buffer.from([0])]), accountKeys: cpmm.orderedAccountKeys }), /trailing|length/i);
  assert.throws(() => decodeLaunchlabGraduationTransaction({ transactionBytes: Buffer.concat([bytes(amm.instructionBase64), Buffer.from([0])]), accountKeys: amm.orderedAccountKeys }), /trailing|length/i);
  assert.throws(() => decodeLaunchlabGraduationTransaction({ transactionBytes: bytes(cpmm.instructionBase64), accountKeys: cpmm.orderedAccountKeys.slice(0, 27) }), /arity|account/i);
  const unknown = bytes(cpmm.instructionBase64);
  unknown[0] ^= 0xff;
  assert.throws(() => decodeLaunchlabGraduationTransaction({ transactionBytes: unknown, accountKeys: cpmm.orderedAccountKeys }), /discriminator|unsupported/i);
});

test("platform create decoder enforces exact SDK message privileges and hashes only params", async () => {
  const source = await fixture("platform-config-instructions.json");
  const create = source.create;
  const result = decodePlatformConfigAuthorityInstruction({
    instructionBytes: bytes(create.instructionBase64),
    accountMetas: create.accountMetas,
    feePayer: create.feePayer,
  });
  assert.deepEqual(result, create.expected);
  assert.deepEqual(Object.keys(result), ["instruction", "discriminatorHex", "platformAdmin", "platformConfig", "accounts", "paramsSha256"]);
  for (let index = 0; index < create.accountMetas.length; index += 1) {
    for (const flag of ["isSigner", "isWritable"]) {
      const accountMetas = clone(create.accountMetas);
      accountMetas[index][flag] = !accountMetas[index][flag];
      assert.throws(() => decodePlatformConfigAuthorityInstruction({ instructionBytes: bytes(create.instructionBase64), accountMetas, feePayer: create.feePayer }), /meta|privilege|signer|writable/i);
    }
  }
  const extraShape = clone(create.accountMetas);
  extraShape[0].source = "operator";
  assert.throws(() => decodePlatformConfigAuthorityInstruction({ instructionBytes: bytes(create.instructionBase64), accountMetas: extraShape, feePayer: create.feePayer }), /meta|key|property/i);
});

test("platform update decoder covers indices 0..11 and only the documented fee-payer promotion", async () => {
  const source = await fixture("platform-config-instructions.json");
  assert.deepEqual(source.updates.map((value) => value.index), [...Array(12).keys()]);
  for (const update of source.updates) {
    const result = decodePlatformConfigAuthorityInstruction({
      instructionBytes: bytes(update.instructionBase64),
      accountMetas: update.accountMetas,
      feePayer: update.feePayer,
    });
    assert.deepEqual(result, update.expected);
    assertRecursivelyFrozen(result);
  }

  const promoted = source.updates[3];
  assert.equal(promoted.accountMetas[0].isWritable, true);
  assert.equal(promoted.feePayer, promoted.accountMetas[0].publicKey);
  assert.throws(() => decodePlatformConfigAuthorityInstruction({
    instructionBytes: bytes(promoted.instructionBase64),
    accountMetas: promoted.accountMetas,
    feePayer: source.updates[0].feePayer,
  }), /fee payer|writable|privilege/i);

  const normal = source.updates[0];
  const unauthorizedPromotion = clone(normal.accountMetas);
  unauthorizedPromotion[0].isWritable = true;
  assert.throws(() => decodePlatformConfigAuthorityInstruction({ instructionBytes: bytes(normal.instructionBase64), accountMetas: unauthorizedPromotion, feePayer: normal.feePayer }), /fee payer|writable|privilege/i);
  assert.throws(() => decodePlatformConfigAuthorityInstruction({ instructionBytes: bytes(normal.instructionBase64), accountMetas: normal.accountMetas, feePayer: normal.accountMetas[0].publicKey }), /fee payer|writable|privilege/i);

  for (const index of [7, 8]) {
    const update = source.updates[index];
    assert.equal(update.accountMetas.length, 3);
    assert.throws(() => decodePlatformConfigAuthorityInstruction({ instructionBytes: bytes(update.instructionBase64), accountMetas: update.accountMetas.slice(0, 2), feePayer: update.feePayer }), /arity|cpmm|meta/i);
    const writableCpmm = clone(update.accountMetas);
    writableCpmm[2].isWritable = true;
    assert.throws(() => decodePlatformConfigAuthorityInstruction({ instructionBytes: bytes(update.instructionBase64), accountMetas: writableCpmm, feePayer: update.feePayer }), /cpmm|writable|privilege/i);
  }

  assert.throws(() => decodePlatformConfigAuthorityInstruction({
    instructionBytes: Buffer.concat([bytes(normal.instructionBase64), Buffer.from([0])]),
    accountMetas: normal.accountMetas,
    feePayer: normal.feePayer,
  }), /trailing|length/i);
  const unknownVariant = bytes(normal.instructionBase64).subarray(0, 9);
  unknownVariant[8] = 12;
  assert.throws(() => decodePlatformConfigAuthorityInstruction({ instructionBytes: unknownVariant, accountMetas: normal.accountMetas, feePayer: normal.feePayer }), /variant|unsupported/i);
});

test("curve account decoder returns exact raw launch, vault, and platform state", async () => {
  const source = await fixture("curve-accounts.json");
  const result = decodeLaunchlabAccounts({
    launchAccount: account(source.accounts.launch),
    vaultAccount: {
      baseVault: account(source.accounts.baseVault),
      quoteVault: account(source.accounts.quoteVault),
    },
    platformConfigAccount: account(source.accounts.platformConfig),
  });
  assert.deepEqual(normalize(result), source.expected);
  assert.deepEqual(Object.keys(result), ["launch", "baseVault", "quoteVault", "platformConfig"]);
  assertRecursivelyFrozen(result);

  const token2022Vault = account(source.accounts.baseVault);
  token2022Vault.owner = source.fixedProgramIdentities.token2022Program;
  assert.throws(() => decodeLaunchlabAccounts({
    launchAccount: account(source.accounts.launch),
    vaultAccount: { baseVault: token2022Vault, quoteVault: account(source.accounts.quoteVault) },
    platformConfigAccount: account(source.accounts.platformConfig),
  }), /classic|Token-2022|owner|program/i);

  const extendedVault = account(source.accounts.baseVault);
  extendedVault.data = Buffer.concat([extendedVault.data, Buffer.from([0])]);
  assert.throws(() => decodeLaunchlabAccounts({
    launchAccount: account(source.accounts.launch),
    vaultAccount: { baseVault: extendedVault, quoteVault: account(source.accounts.quoteVault) },
    platformConfigAccount: account(source.accounts.platformConfig),
  }), /165|length|extension/i);
});

test("account decoders reject unknown enums, nonzero reserved bytes, and semantic LP input", async () => {
  const curve = await fixture("curve-accounts.json");
  const badLaunch = account(curve.accounts.launch);
  badLaunch.data[17] = 9;
  assert.throws(() => decodeLaunchlabAccounts({
    launchAccount: badLaunch,
    vaultAccount: { baseVault: account(curve.accounts.baseVault), quoteVault: account(curve.accounts.quoteVault) },
    platformConfigAccount: account(curve.accounts.platformConfig),
  }), /status|enum/i);
  const reservedLaunch = account(curve.accounts.launch);
  reservedLaunch.data[428] = 1;
  assert.throws(() => decodeLaunchlabAccounts({
    launchAccount: reservedLaunch,
    vaultAccount: { baseVault: account(curve.accounts.baseVault), quoteVault: account(curve.accounts.quoteVault) },
    platformConfigAccount: account(curve.accounts.platformConfig),
  }), /reserved|padding/i);
  const reservedPlatform = account(curve.accounts.platformConfig);
  reservedPlatform.data[832] = 1;
  assert.throws(() => decodeLaunchlabAccounts({
    launchAccount: account(curve.accounts.launch),
    vaultAccount: { baseVault: account(curve.accounts.baseVault), quoteVault: account(curve.accounts.quoteVault) },
    platformConfigAccount: reservedPlatform,
  }), /reserved|padding/i);

  const graduation = await fixture("graduation-accounts.json");
  assert.throws(() => decodeGraduationAccounts({
    launchAccount: account(graduation.cpmm.accounts.launch),
    poolAccount: account(graduation.cpmm.accounts.pool),
    platformConfigAccount: account(graduation.cpmm.accounts.platformConfig),
    lpAccounts: [],
  }), /lpAccounts|property|unsupported/i);
});

test("graduation accounts decode CPMM and AMM-v4 raw pools without semantic conclusions", async () => {
  const source = await fixture("graduation-accounts.json");
  for (const branch of [source.cpmm, source.ammV4]) {
    const result = decodeGraduationAccounts({
      launchAccount: account(branch.accounts.launch),
      poolAccount: account(branch.accounts.pool),
      platformConfigAccount: account(branch.accounts.platformConfig),
    });
    assert.deepEqual(normalize(result), branch.expected);
    assert.deepEqual(Object.keys(result), ["launch", "pool", "platformConfig"]);
    assert.deepEqual(Object.keys(result.pool), ["address", "programId", "baseMint", "quoteMint", "baseVault", "quoteVault", "accountSha256"]);
    for (const forbidden of ["lpDisposition", "burnedAmount", "lockedAmount", "feeRights", "withdrawalAuthority", "recoverableLpBaseUnits"]) {
      assert.equal(forbidden in result, false);
      assert.equal(forbidden in result.pool, false);
    }
    assertRecursivelyFrozen(result);
  }

  const wrongOwner = account(source.cpmm.accounts.pool);
  wrongOwner.owner = source.fixedProgramIdentities.ammV4;
  assert.throws(() => decodeGraduationAccounts({
    launchAccount: account(source.cpmm.accounts.launch),
    poolAccount: wrongOwner,
    platformConfigAccount: account(source.cpmm.accounts.platformConfig),
  }), /owner|program|migration/i);
  for (const [branch, reservedOffset] of [[source.cpmm, 636], [source.ammV4, 751]]) {
    const reservedPool = account(branch.accounts.pool);
    reservedPool.data[reservedOffset] = 1;
    assert.throws(() => decodeGraduationAccounts({
      launchAccount: account(branch.accounts.launch),
      poolAccount: reservedPool,
      platformConfigAccount: account(branch.accounts.platformConfig),
    }), /reserved|padding/i);
  }
});

test("the approved Raydium docs pin covers only the exact HAKKY CPMM disposition", () => {
  assert.deepEqual(RAYDIUM_PLATFORM_CONFIG_SOURCE_PROVEN\u0041NCE, {
    repository: "https://github.com/raydium-io/raydium-docs-v1",
    commit: "10dd5f7d9f23f0be7daabd571fc9e7c65ce269dc",
    path: "products/launchlab/platform-config.mdx",
    gitBlobSha256: "e048a0b3caf3cd8b543a8fd143897b4cdb5ea2de2f8ad58fb93d0837f6486b92",
    distributionLineRange: "68-72",
    cpmmDispositionLineRange: "110-117",
  });
  assertRecursivelyFrozen(RAYDIUM_PLATFORM_CONFIG_SOURCE_PROVEN\u0041NCE);
  assert.deepEqual(HAKKY_SOURCE_COVERAGE_VERIFIED, {
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
  assertRecursivelyFrozen(HAKKY_SOURCE_COVERAGE_VERIFIED);
  const result = evaluateHakkyLaunchlabSourceCoverage({
    migrationType: "cpmm",
    platformScaleRaw: 0n,
    creatorScaleRaw: 0n,
    burnScaleRaw: 1_000_000n,
  });
  assert.equal(result, HAKKY_SOURCE_COVERAGE_VERIFIED);
  assert.equal(result.ok, true);
  for (const unsupported of [
    { migrationType: "amm-v4", platformScaleRaw: 0n, creatorScaleRaw: 0n, burnScaleRaw: 1_000_000n },
    { migrationType: "cpmm", platformScaleRaw: 1n, creatorScaleRaw: 0n, burnScaleRaw: 999_999n },
    { migrationType: "cpmm", platformScaleRaw: 0n, creatorScaleRaw: 0n, burnScaleRaw: 1_000_000n, override: true },
  ]) {
    assert.throws(() => evaluateHakkyLaunchlabSourceCoverage(unsupported), /unsupported|coverage|property/i);
  }
});

test("decoder tests do not import schema-shape-only launch fixtures", async () => {
  const source = await readFile(fileURLToPath(import.meta.url), "utf8");
  assert.doesNotMatch(source, /from\s+["'][^"']*test-support\/launch-fixtures\.mjs["']/);
});
