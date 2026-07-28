import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildApprovalEnvelope,
  decodeUnsignedLaunchTransaction,
  evaluateLaunchPreview,
} from "../src/launchlab-preview.mjs";
import { assertSchema } from "../src/schema-validation.mjs";
import { encodeBase58 } from "../src/solana-transaction.mjs";
import {
  assertNoInnerPlatformConfigAuthority,
  buildLaunchlabEvidenceSources,
  evaluatePlatformConfigHistory,
  fetchLaunchlabEvidence,
  fetchFinalizedLaunchlabAccounts,
  fetchPlatformConfigSignatureHistory,
  reconcileLaunchlabEvidence,
  runLaunchlabVerifier,
} from "../src/launchlab-proof.mjs";
import {
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  RAYDIUM_PLATFORM_CONFIG_MUTABLE_FIELDS,
} from "../src/raydium-launchlab.mjs";
import {
  createLaunchlabReconciliationFixture,
} from "../test-support/launchlab-proof-fixtures.mjs";
import {
  createLaunchlabPreviewFixture,
} from "../test-support/launchlab-preview-fixtures.mjs";
import {
  main as launchlabMain,
  readOptions,
  runFromCli,
} from "../scripts/verify-launchlab.mjs";

const CLI_VALUES = Object.freeze({
  mint: "11111111111111111111111111111111",
  creator: "SysvarC1ock11111111111111111111111111111111",
  launchId: "SysvarRent111111111111111111111111111111111",
  platformConfig: "Config1111111111111111111111111111111111111",
  creation: "1".repeat(64),
  recovery: encodeBase58(Buffer.alloc(64, 2)),
});

function validArgv() {
  return [
    "--mint", CLI_VALUES.mint,
    "--creator", CLI_VALUES.creator,
    "--launch-id", CLI_VALUES.launchId,
    "--platform-config", CLI_VALUES.platformConfig,
    "--creation-transaction", CLI_VALUES.creation,
    "--metadata-manifest", "artifacts/metadata/manifest.json",
    "--metadata-readback", "artifacts/metadata/readback.json",
    "--recovery-transaction", CLI_VALUES.recovery,
    "--rpc", "https://api.mainnet-beta.solana.com/",
  ];
}

function setPath(root, dottedPath, value) {
  const parts = dottedPath.split(".");
  let cursor = root;
  for (const part of parts.slice(0, -1)) cursor = cursor[part];
  cursor[parts.at(-1)] = value;
}

async function platformInstructionFixture() {
  return JSON.parse(await readFile(new URL(
    "../test-support/fixtures/launchlab/platform-config-instructions.json",
    import.meta.url,
  ), "utf8"));
}

async function curveAccountFixture() {
  return JSON.parse(await readFile(new URL(
    "../test-support/fixtures/launchlab/curve-accounts.json",
    import.meta.url,
  ), "utf8"));
}

function historyTransaction({
  signature,
  slot,
  instruction,
  feePayer,
}) {
  return {
    signature,
    slot,
    feePayer,
    instructions: [{
      programId: RAYDIUM_LAUNCHLAB_PROGRAM_ID,
      data: Buffer.from(instruction.instructionBase64, "base64"),
      accountKeys: instruction.accountMetas.map((meta) => meta.publicKey),
      accountMetas: structuredClone(instruction.accountMetas),
    }],
  };
}

test("PlatformConfig history derives one administrator and exhaustive mutable fields", async () => {
  const source = await platformInstructionFixture();
  const createSignature = encodeBase58(Buffer.alloc(64, 4));
  const updateSignature = encodeBase58(Buffer.alloc(64, 5));
  const result = evaluatePlatformConfigHistory({
    platformConfigAddress: source.create.expected.platformConfig,
    resolvedTransactions: [
      historyTransaction({
        signature: updateSignature,
        slot: 101,
        instruction: source.updates[8],
        feePayer: source.updates[8].feePayer,
      }),
      historyTransaction({
        signature: createSignature,
        slot: 100,
        instruction: source.create,
        feePayer: source.create.feePayer,
      }),
    ],
  });
  assert.deepEqual(result, {
    platformAdmin: source.create.expected.platformAdmin,
    creationSignature: createSignature,
    creationSlot: 100,
    updateAuthorities: [source.create.expected.platformAdmin],
    mutableFields: [...RAYDIUM_PLATFORM_CONFIG_MUTABLE_FIELDS],
    updateSignatures: [updateSignature],
    historyLastSlot: 101,
  });
  assert.equal(Object.isFrozen(result), true);

  for (const mutate of [
    (transactions) => transactions.push(structuredClone(transactions[1])),
    (transactions) => {
      transactions[0].instructions[0].accountMetas[1].publicKey =
        source.create.accountMetas[1].publicKey;
    },
    (transactions) => { transactions[0].signature = transactions[1].signature; },
  ]) {
    const transactions = [
      historyTransaction({
        signature: updateSignature,
        slot: 101,
        instruction: source.updates[8],
        feePayer: source.updates[8].feePayer,
      }),
      historyTransaction({
        signature: createSignature,
        slot: 100,
        instruction: source.create,
        feePayer: source.create.feePayer,
      }),
    ];
    mutate(transactions);
    assert.throws(
      () => evaluatePlatformConfigHistory({
        platformConfigAddress: source.create.expected.platformConfig,
        resolvedTransactions: transactions,
      }),
      /platform-history-/u,
    );
  }
});

test("PlatformConfig history rejects authority changes hidden in CPI", async () => {
  const source = await platformInstructionFixture();
  const accountKeys = [
    RAYDIUM_LAUNCHLAB_PROGRAM_ID,
    source.create.expected.platformConfig,
  ];
  assert.throws(
    () => assertNoInnerPlatformConfigAuthority({
      transactionResponse: {
        meta: {
          innerInstructions: [{
            index: 0,
            instructions: [{
              accounts: [1],
              data: encodeBase58(Buffer.from(
                source.updates[0].instructionBase64,
                "base64",
              )),
              programIdIndex: 0,
              stackHeight: 2,
            }],
          }],
        },
      },
      accountKeys,
    }),
    /platform-history-inner-authority/u,
  );
  assert.doesNotThrow(() => assertNoInnerPlatformConfigAuthority({
    transactionResponse: {
      meta: {
        innerInstructions: [{
          index: 0,
          instructions: [{
            accounts: [1],
            data: encodeBase58(Buffer.alloc(8)),
            programIdIndex: 0,
            stackHeight: 2,
          }],
        }],
      },
    },
    accountKeys,
  }));
});

test("PlatformConfig signature history is complete, finalized, unique, and paginated", async () => {
  const address = CLI_VALUES.platformConfig;
  const entries = Array.from({ length: 1001 }, (_, index) => ({
    blockTime: 1_700_000_000 + index,
    confirmationStatus: "finalized",
    err: null,
    memo: null,
    signature: encodeBase58(Buffer.concat([
      Buffer.alloc(60),
      Buffer.from([
        (index >>> 24) & 255,
        (index >>> 16) & 255,
        (index >>> 8) & 255,
        index & 255,
      ]),
    ])),
    slot: 2000 - index,
  }));
  const calls = [];
  const rpcClient = {
    hostname: "api.mainnet-beta.solana.com",
    call: async (method, params) => {
      calls.push([method, params]);
      assert.equal(method, "getSignaturesForAddress");
      const before = params[1].before;
      return before === undefined ? entries.slice(0, 1000) : entries.slice(1000);
    },
  };
  const result = await fetchPlatformConfigSignatureHistory({
    rpcClient,
    platformConfigAddress: address,
  });
  assert.equal(result.length, 1001);
  assert.equal(result[0].signature, entries[0].signature);
  assert.equal(result.at(-1).signature, entries.at(-1).signature);
  assert.deepEqual(calls[0], [
    "getSignaturesForAddress",
    [address, { commitment: "finalized", limit: 1000 }],
  ]);
  assert.deepEqual(calls[1], [
    "getSignaturesForAddress",
    [address, {
      commitment: "finalized",
      limit: 1000,
      before: entries[999].signature,
    }],
  ]);

  const badClient = {
    ...rpcClient,
    call: async () => [{ ...entries[0], confirmationStatus: "confirmed" }],
  };
  await assert.rejects(
    fetchPlatformConfigSignatureHistory({
      rpcClient: badClient,
      platformConfigAddress: address,
    }),
    /platform-history-signature/u,
  );
});

test("finalized LaunchLab account collection decodes and hashes one atomic snapshot", async () => {
  const source = await curveAccountFixture();
  const ordered = [
    source.accounts.launch,
    source.accounts.baseVault,
    source.accounts.quoteVault,
    source.accounts.platformConfig,
  ];
  const calls = [];
  const rpcClient = {
    hostname: "api.mainnet-beta.solana.com",
    call: async (method, params) => {
      calls.push([method, params]);
      if (method === "getMultipleAccounts") {
        return {
          context: { slot: 300_000_020 },
          value: ordered.map((account) => ({
            data: [account.dataBase64, "base64"],
            executable: false,
            lamports: 1,
            owner: account.owner,
            rentEpoch: 1,
            space: Buffer.from(account.dataBase64, "base64").length,
          })),
        };
      }
      assert.equal(method, "getBlockTime");
      assert.deepEqual(params, [300_000_020]);
      return 1_700_000_020;
    },
  };
  const result = await fetchFinalizedLaunchlabAccounts({
    rpcClient,
    launchId: source.accounts.launch.address,
    baseVault: source.accounts.baseVault.address,
    quoteVault: source.accounts.quoteVault.address,
    platformConfigAddress: source.accounts.platformConfig.address,
    minContextSlot: 300_000_010,
  });
  assert.equal(result.finalizedSlot, 300_000_020);
  assert.equal(result.finalizedAt, "2023-11-14T22:13:40.000Z");
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      result.decoded,
      (_key, value) => typeof value === "bigint" ? value.toString() : value,
    )),
    source.expected,
  );
  assert.deepEqual(Object.keys(result.hashes), [
    "launchAccountSha256",
    "baseVaultSha256",
    "quoteVaultSha256",
    "platformConfigSha256",
  ]);
  assert.equal(result.hashes.platformConfigSha256, source.expected.platformConfig.accountSha256);
  assert.deepEqual(calls[0], [
    "getMultipleAccounts",
    [
      ordered.map((account) => account.address),
      {
        commitment: "finalized",
        encoding: "base64",
        minContextSlot: 300_000_010,
      },
    ],
  ]);
  assert.equal(Object.isFrozen(result), true);
});

test("collector projection derives both evidence sources from approval, transaction, and accounts", () => {
  const expected = createLaunchlabReconciliationFixture();
  const transaction = expected.transactionEvidence;
  const account = expected.accountEvidence;
  const identities = transaction.identities;
  const approvalEnvelope = {
    schemaVersion: "launchlab-approval-envelope-v1",
    transactionSha256: "9".repeat(64),
    creator: identities.creator,
    mint: identities.mint,
    launchId: identities.launchId,
    selectedWallet: identities.creator,
    signers: [identities.creator, identities.mint],
    programs: [transaction.programs.launchlab],
    transfers: [],
    walletReadiness: {
      finalizedBalanceLamports: "2000000000",
      finalizedSlot: 300000000,
    },
    platformConfig: {
      address: identities.platformConfig,
      accountSha256: transaction.platformConfig.creationAccountSha256,
      finalizedSlot: 300000001,
      platformScaleRaw: "0",
      creatorScaleRaw: "0",
      burnScaleRaw: "1000000",
      feeRateMillionths: "10000",
      creatorFeeRateMillionths: "0",
      platformVestingScaleRaw: "0",
    },
    cost: {
      metadataUploadLamports: "0",
      maximumCreationDebitLamports: "1000000000",
      cumulativeCreatorDebitCapLamports: "1000000000",
      simulatedCreationDebitLamports: "2000",
      simulatedCumulativeCreatorDebitLamports: "2000",
    },
    fees: {
      protocolBuyFeeRateMillionths: "10000",
      protocolSellFeeRateMillionths: "10000",
      feeRateDenominator: "1000000",
      creatorTradingFeeRateMillionths: "0",
      creatorFeeRights: false,
    },
    migration: {
      type: "cpmm",
      lpPolicy: "burn-and-earn",
      platformLpBps: 0,
      creatorLpBps: 0,
      irreversibleLpBps: 10000,
      platformFeeKey: false,
      creatorFeeKey: false,
      withdrawalRights: false,
      feeRecipients: [],
    },
    receipts: {
      officialOrigin: {
        sha256: "7".repeat(64),
        checkedAt: "2026-07-23T00:00:00.000Z",
        expiresAt: "2026-07-23T00:30:00.000Z",
      },
      walletReadiness: {
        sha256: "8".repeat(64),
        checkedAt: "2026-07-23T00:00:00.000Z",
        expiresAt: "2026-07-23T00:10:00.000Z",
      },
    },
    authorization:
      `Authorize only serialized transaction SHA-256 ${"9".repeat(64)} with maximum creation debit 1000000000 lamports.`,
  };
  const creation = {
    signature: transaction.transaction.signature,
    finalizedSlot: transaction.transaction.finalizedSlot,
    finalizedAt: transaction.transaction.finalizedAt,
    unsignedTransactionSha256: approvalEnvelope.transactionSha256,
    transactionSha256: transaction.transaction.transactionSha256,
    feePayer: identities.creator,
    feePayerDebitLamports: transaction.cost.creationDebitLamports,
    decoded: {
      instruction: "initialize-v2",
      discriminatorHex: "4399af27da102620",
      accounts: {
        payer: identities.creator,
        creator: identities.creator,
        configId: identities.configId,
        platformId: identities.platformConfig,
        authority: identities.launchlabAuthority,
        launchId: identities.launchId,
        mint: identities.mint,
        quoteMint: transaction.programs.quoteMint,
        baseVault: identities.baseVault,
        quoteVault: identities.quoteVault,
        metadataAccount: identities.metadataAccount,
        tokenProgramBase: transaction.programs.token,
        tokenProgramQuote: transaction.programs.token,
        metadataProgram: transaction.programs.metadata,
        systemProgram: transaction.programs.system,
        launchlabProgram: transaction.programs.launchlab,
      },
      decimals: 6,
      name: transaction.metadata.name,
      symbol: transaction.metadata.symbol,
      uri: transaction.metadata.uri,
      curve: {
        supply: "10000000000000",
        totalSell: "8000000000000",
        totalFundraising: "24000000000",
        migrationType: "cpmm",
      },
      vesting: {
        lockedAmount: "0",
        cliffPeriod: "0",
        unlockPeriod: "0",
      },
    },
  };
  const accountSnapshot = {
    finalizedSlot: account.observation.finalizedSlot,
    finalizedAt: account.observation.finalizedAt,
    hashes: {
      launchAccountSha256: account.observation.launchAccountSha256,
      baseVaultSha256: account.observation.baseVaultSha256,
      quoteVaultSha256: account.observation.quoteVaultSha256,
      platformConfigSha256: account.observation.platformConfigSha256,
    },
    decoded: {
      launch: {
        status: "fund",
        mintA: identities.mint,
        mintB: transaction.programs.quoteMint,
        creator: identities.creator,
        configId: identities.configId,
        platformId: identities.platformConfig,
        vaultA: identities.baseVault,
        vaultB: identities.quoteVault,
        mintDecimalsA: 6,
        mintDecimalsB: 9,
        migrationType: "cpmm",
        supply: "10000000000000",
        totalSellA: "8000000000000",
        totalFundRaisingB: "24000000000",
        vestingSchedule: {
          totalLockedAmount: "0",
          cliffPeriod: "0",
          unlockPeriod: "0",
        },
      },
      baseVault: { address: identities.baseVault },
      quoteVault: { address: identities.quoteVault },
      platformConfig: {
        address: identities.platformConfig,
        accountSha256: account.platformConfig.verificationAccountSha256,
        platformScale: "0",
        creatorScale: "0",
        burnScale: "1000000",
        feeRate: "10000",
        creatorFeeRate: "0",
        platformVestingScale: "0",
      },
    },
  };
  const platformHistory = {
    platformAdmin: identities.creator,
    creationSignature: encodeBase58(Buffer.alloc(64, 6)),
    creationSlot: 299999999,
    updateAuthorities: [identities.creator],
    mutableFields: [...RAYDIUM_PLATFORM_CONFIG_MUTABLE_FIELDS],
    updateSignatures: [],
    historyLastSlot: 299999999,
  };
  const result = buildLaunchlabEvidenceSources({
    approvalEnvelope,
    creation,
    accountSnapshot,
    platformHistory,
    metadata: transaction.metadata,
    recoveryTransactions: [],
    checkedAt: expected.checkedAt,
    rpcHost: account.observation.rpcHost,
  });
  assert.deepEqual(result, expected);
  assert.equal(Object.isFrozen(result), true);

  const drift = structuredClone(creation);
  drift.unsignedTransactionSha256 = "0".repeat(64);
  assert.throws(
    () => buildLaunchlabEvidenceSources({
      approvalEnvelope,
      creation: drift,
      accountSnapshot,
      platformHistory,
      metadata: transaction.metadata,
      recoveryTransactions: [],
      checkedAt: expected.checkedAt,
      rpcHost: account.observation.rpcHost,
    }),
    /launchlab-collector-/u,
  );
});

test("production collector rejects the former opaque connection hook", async () => {
  let called = false;
  await assert.rejects(
    fetchLaunchlabEvidence({
      connection: {
        collectLaunchlabEvidence: async () => {
          called = true;
          return {};
        },
      },
      request: {},
    }),
    /launchlab-collector-/u,
  );
  assert.equal(called, false);
});

test("two-source reconciliation never publishes while PlatformConfig economics remain mutable", () => {
  const fixture = createLaunchlabReconciliationFixture();
  const before = structuredClone(fixture);
  const result = reconcileLaunchlabEvidence(fixture);
  assert.deepEqual(result, {
    ok: false,
    code: "platform-config-immutability-unavailable",
    reason: "platform-admin-can-update-graduation-economics",
  });
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(fixture, before);
});

test("each independent transaction/account source mismatch fails a named check", () => {
  const cases = [
    ["identities.mint", "11111111111111111111111111111112", "sources-agree-identities"],
    ["platformConfig.address", "SysvarFees111111111111111111111111111111111", "sources-agree-platform-config"],
    ["allocations.publicCurveBaseUnits", "799999999999", "sources-agree-allocations"],
    ["quote.graduationThresholdLamports", "23999999999", "sources-agree-quote"],
    ["creatorFirstBuy.creatorLamports", "1", "sources-agree-creator-first-buy"],
    ["vesting.lockedBaseUnits", "1", "sources-agree-vesting"],
    ["fees.creatorTradingFeeRateMillionths", "1", "sources-agree-fees"],
    ["migration.creatorLpBps", 1, "sources-agree-migration"],
    ["metadata.symbol", "FAKE", "sources-agree-metadata"],
    ["cost.creationDebitLamports", "2001", "sources-agree-cost"],
    ["links.raydiumLaunchlab", "https://raydium.io/launchpad/token/11111111111111111111111111111112", "sources-agree-links"],
  ];
  for (const [path, value, code] of cases) {
    const fixture = createLaunchlabReconciliationFixture();
    setPath(fixture.accountEvidence, path, value);
    assert.throws(() => reconcileLaunchlabEvidence(fixture), new RegExp(code), path);
  }
});

test("public identifiers bind the finalized transaction and both evidence sources", () => {
  const cases = [
    ["mint", "11111111111111111111111111111112", "public-mint"],
    ["creator", "SysvarFees111111111111111111111111111111111", "public-creator"],
    ["launchId", "Vote111111111111111111111111111111111111111", "public-launch-id"],
    ["creationSignature", "2".repeat(64), "public-creation-signature"],
  ];
  for (const [field, value, code] of cases) {
    const fixture = createLaunchlabReconciliationFixture();
    fixture.publicIdentifiers[field] = value;
    assert.throws(() => reconcileLaunchlabEvidence(fixture), new RegExp(code), field);
  }
});

test("immutable economics, fee rights, LP union, cost, and finality fail closed", () => {
  const mutateBoth = (path, value) => {
    const fixture = createLaunchlabReconciliationFixture();
    setPath(fixture.transactionEvidence, path, value);
    setPath(fixture.accountEvidence, path, value);
    return fixture;
  };
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("fees.snapshotImmutable", true)),
    /platform-config-mutability/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(
      mutateBoth("platformConfig.immutableBinding", "verified-per-launch-snapshot"),
    ),
    /platform-config-mutability/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("quote.fundraisingLamports", "1")),
    /quote-policy/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("fees.creatorFeeKey", "11111111111111111111111111111111")),
    /fee-policy/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("fees.creatorFeeRights", true)),
    /fee-policy/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("migration.platformLpBps", 1)),
    /migration-policy/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("migration.creatorLpBps", 1)),
    /migration-policy/,
  );
  assert.throws(
    () => reconcileLaunchlabEvidence(mutateBoth("migration.lpPolicy", "lp-burn")),
    /migration-policy/,
  );

  const expensive = mutateBoth("cost.cumulativeCreatorDebitLamports", "1000000001");
  expensive.transactionEvidence.cost.creationDebitLamports = "1000000000";
  expensive.accountEvidence.cost.creationDebitLamports = "1000000000";
  expensive.transactionEvidence.cost.withinCap = false;
  expensive.accountEvidence.cost.withinCap = false;
  assert.throws(() => reconcileLaunchlabEvidence(expensive), /cost-cap/);

  const paidMetadata = mutateBoth("cost.metadataUploadLamports", "1");
  paidMetadata.transactionEvidence.cost.cumulativeCreatorDebitLamports = "2001";
  paidMetadata.accountEvidence.cost.cumulativeCreatorDebitLamports = "2001";
  assert.throws(
    () => reconcileLaunchlabEvidence(paidMetadata),
    /cost-cap|metadata-upload-cost/u,
  );

  const stale = createLaunchlabReconciliationFixture();
  stale.checkedAt = "2026-07-23T00:01:00.000Z";
  assert.throws(() => reconcileLaunchlabEvidence(stale), /finalized-chronology/);
});

test("the verifier returns the mutability control and never publishes", async () => {
  const fixture = createLaunchlabReconciliationFixture();
  let publications = 0;
  const result = await runLaunchlabVerifier({
    argv: [],
    fetchEvidence: async () => fixture,
    publishProof: async () => {
      publications += 1;
      throw new Error("publish must not be called");
    },
    options: Object.freeze({ fixtureMode: true }),
  });
  assert.deepEqual(result, {
    ok: false,
    code: "platform-config-immutability-unavailable",
    reason: "platform-admin-can-update-graduation-economics",
  });
  assert.equal(publications, 0);
});

test("CLI accepts only exact public launch inputs and repeated recovery signatures", () => {
  const parsed = readOptions([
    ...validArgv(),
    "--recovery-transaction", encodeBase58(Buffer.alloc(64, 3)),
  ]);
  assert.deepEqual(parsed, {
    mintAddress: CLI_VALUES.mint,
    creatorAddress: CLI_VALUES.creator,
    launchId: CLI_VALUES.launchId,
    platformConfigAddress: CLI_VALUES.platformConfig,
    creationSignature: CLI_VALUES.creation,
    recoverySignatures: [CLI_VALUES.recovery, encodeBase58(Buffer.alloc(64, 3))],
    metadataManifestPath: "artifacts/metadata/manifest.json",
    metadataReadbackPath: "artifacts/metadata/readback.json",
    rpcUrl: "https://api.mainnet-beta.solana.com/",
    rpcHost: "api.mainnet-beta.solana.com",
  });
  for (const mutation of [
    [...validArgv(), "--out", "proof/other.json"],
    [...validArgv(), "--mint", CLI_VALUES.mint],
    validArgv().with(0, `--mint=${CLI_VALUES.mint}`),
    validArgv().with(11, "artifacts/metadata/other.json"),
    validArgv().with(15, ["https://user", "example@rpc.example.com/"].join(":")),
  ]) {
    assert.throws(() => readOptions(mutation), /cli-|rpc-url-/);
  }
});

test("CLI returns the mutability control before RPC, artifact reads, or publication", async () => {
  const result = await runFromCli({
    argv: validArgv(),
    repositoryRoot: path.resolve("test-support"),
    createRpcClient: () => {
      throw new Error("RPC must not be created");
    },
    fetchEvidence: async () => {
      throw new Error("evidence must not be fetched");
    },
    publishProofImpl: async () => {
      throw new Error("proof must not be published");
    },
    runVerifier: async () => {
      throw new Error("verifier must not run");
    },
  });
  assert.deepEqual(result, {
    ok: false,
    code: "platform-config-immutability-unavailable",
    reason: "platform-admin-can-update-graduation-economics",
  });
});

test("CLI main emits only the public mutability control", async () => {
  let stdout = "";
  let stderr = "";
  const exitCode = await launchlabMain({
    runVerifier: async () => ({
      ok: false,
      code: "platform-config-immutability-unavailable",
      reason: "platform-admin-can-update-graduation-economics",
    }),
    stdout: { write: (value) => { stdout += value; } },
    stderr: { write: (value) => { stderr += value; } },
  });
  assert.equal(exitCode, 1);
  assert.equal(stdout, "");
  assert.equal(stderr, "platform-config-immutability-unavailable\n");
});
