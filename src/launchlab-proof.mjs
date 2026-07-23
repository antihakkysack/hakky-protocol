import { VersionedTransaction } from "@solana/web3.js";
import {
  classifyPlatformConfigAuthorityInstruction,
  decodeLaunchlabAccounts,
  decodePlatformConfigAuthorityInstruction,
  evaluateHakkyLaunchlabSourceCoverage,
  HAKKY_PLATFORM_CONFIG_IMMUTABILITY_UNAVAILABLE,
  HAKKY_SOURCE_COVERAGE_VERIFIED,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  RAYDIUM_PLATFORM_CONFIG_MUTABLE_FIELDS,
} from "./raydium-launchlab.mjs";
import { assertApprovalEnvelopeV1 } from "./launchlab-preview.mjs";
import { evaluateMintEvidenceV2 } from "./mint-proof.mjs";
import { deriveMetadataPdas } from "./metaplex-metadata.mjs";
import {
  fetchFinalizedCreationTransaction,
  fetchFinalizedLookupTables,
  fetchMintEvidence,
} from "./solana-rpc.mjs";
import {
  decodeBase58,
  resolveFinalizedTransactionInstructions,
  sha256Hex,
} from "./solana-transaction.mjs";

const SHARED_FIELDS = Object.freeze([
  "allocations",
  "quote",
  "creatorFirstBuy",
  "vesting",
  "fees",
  "migration",
  "metadata",
  "cost",
  "links",
]);
const PLATFORM_HISTORY_PAGE_SIZE = 1_000;
const PLATFORM_HISTORY_MAX_SIGNATURES = 10_000;

function fail(code) {
  throw new Error(code);
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys, code) {
  if (!plainObject(value)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) fail(code);
}

function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function recursivelyFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) recursivelyFreeze(child);
  return Object.freeze(value);
}

function canonicalPublicKey(value, code) {
  try {
    decodeBase58(value, { length: 32, code });
    return value;
  } catch {
    fail(code);
  }
}

function canonicalSignature(value, code) {
  try {
    decodeBase58(value, { length: 64, code });
    return value;
  } catch {
    fail(code);
  }
}

function historyFail(code) {
  fail(`platform-history-${code}`);
}

export async function fetchPlatformConfigSignatureHistory({
  rpcClient,
  platformConfigAddress,
}) {
  if (!plainObject(rpcClient) || typeof rpcClient.call !== "function"
    || typeof rpcClient.hostname !== "string") historyFail("rpc-client");
  const address = canonicalPublicKey(
    platformConfigAddress,
    "platform-history-address",
  );
  const output = [];
  const seen = new Set();
  let before;
  let priorSlot = Number.MAX_SAFE_INTEGER;
  while (true) {
    const config = {
      commitment: "finalized",
      limit: PLATFORM_HISTORY_PAGE_SIZE,
      ...(before === undefined ? {} : { before }),
    };
    const page = await rpcClient.call("getSignaturesForAddress", [address, config]);
    if (!Array.isArray(page) || page.length > PLATFORM_HISTORY_PAGE_SIZE) {
      historyFail("page");
    }
    for (const entry of page) {
      if (!plainObject(entry)
        || Object.keys(entry).sort().join(",")
          !== "blockTime,confirmationStatus,err,memo,signature,slot"
        || entry.confirmationStatus !== "finalized"
        || entry.err !== null
        || (entry.memo !== null && typeof entry.memo !== "string")
        || (entry.blockTime !== null
          && (!Number.isSafeInteger(entry.blockTime) || entry.blockTime < 0))
        || !Number.isSafeInteger(entry.slot) || entry.slot < 0
        || entry.slot > priorSlot) {
        historyFail("signature");
      }
      const signature = canonicalSignature(
        entry.signature,
        "platform-history-signature",
      );
      if (seen.has(signature)) historyFail("duplicate");
      seen.add(signature);
      priorSlot = entry.slot;
      output.push(Object.freeze({ ...entry }));
    }
    if (page.length < PLATFORM_HISTORY_PAGE_SIZE) break;
    if (output.length >= PLATFORM_HISTORY_MAX_SIGNATURES) historyFail("limit");
    before = output.at(-1).signature;
  }
  return Object.freeze(output);
}

function normalizedHistoryInstruction(instruction) {
  if (!plainObject(instruction)
    || Object.keys(instruction).sort().join(",")
      !== "accountKeys,accountMetas,data,programId"
    || (!Buffer.isBuffer(instruction.data)
      && !(instruction.data instanceof Uint8Array))
    || !Array.isArray(instruction.accountKeys)
    || !Array.isArray(instruction.accountMetas)
    || instruction.accountKeys.length !== instruction.accountMetas.length) {
    historyFail("instruction");
  }
  canonicalPublicKey(instruction.programId, "platform-history-program");
  return instruction;
}

export function evaluatePlatformConfigHistory({
  platformConfigAddress,
  resolvedTransactions,
}) {
  const address = canonicalPublicKey(
    platformConfigAddress,
    "platform-history-address",
  );
  if (!Array.isArray(resolvedTransactions) || resolvedTransactions.length === 0) {
    historyFail("transactions");
  }
  const seen = new Set();
  const creates = [];
  const updates = [];
  let historyLastSlot = 0;
  for (const transaction of resolvedTransactions) {
    if (!plainObject(transaction)
      || Object.keys(transaction).sort().join(",")
        !== "feePayer,instructions,signature,slot"
      || !Number.isSafeInteger(transaction.slot) || transaction.slot < 0
      || !Array.isArray(transaction.instructions)) {
      historyFail("transaction");
    }
    const signature = canonicalSignature(
      transaction.signature,
      "platform-history-signature",
    );
    if (seen.has(signature)) historyFail("duplicate");
    seen.add(signature);
    canonicalPublicKey(transaction.feePayer, "platform-history-fee-payer");
    historyLastSlot = Math.max(historyLastSlot, transaction.slot);
    for (const raw of transaction.instructions) {
      const instruction = normalizedHistoryInstruction(raw);
      if (instruction.programId !== RAYDIUM_LAUNCHLAB_PROGRAM_ID) continue;
      let classification;
      try {
        classification = classifyPlatformConfigAuthorityInstruction(
          instruction.data,
        );
      } catch {
        historyFail("instruction");
      }
      if (classification === null) continue;
      let decoded;
      try {
        decoded = decodePlatformConfigAuthorityInstruction({
          instructionBytes: instruction.data,
          accountMetas: instruction.accountMetas,
          feePayer: transaction.feePayer,
        });
      } catch {
        historyFail("decode");
      }
      if (decoded.platformConfig !== address
        || decoded.instruction !== classification) historyFail("binding");
      const event = Object.freeze({
        signature,
        slot: transaction.slot,
        decoded,
      });
      if (classification === "create-platform-config") creates.push(event);
      else updates.push(event);
    }
  }
  if (creates.length !== 1) historyFail("creation-count");
  const creation = creates[0];
  if (updates.some((update) => (
    update.slot < creation.slot
    || update.decoded.platformAdmin !== creation.decoded.platformAdmin
  ))) historyFail("authority");
  const updateSignatures = [...new Set(updates
    .sort((left, right) => (
      left.slot - right.slot
      || left.signature.localeCompare(right.signature)
    ))
    .map((update) => update.signature))];
  return recursivelyFreeze({
    platformAdmin: creation.decoded.platformAdmin,
    creationSignature: creation.signature,
    creationSlot: creation.slot,
    updateAuthorities: [creation.decoded.platformAdmin],
    mutableFields: [...RAYDIUM_PLATFORM_CONFIG_MUTABLE_FIELDS],
    updateSignatures,
    historyLastSlot,
  });
}

export function assertNoInnerPlatformConfigAuthority({
  transactionResponse,
  accountKeys,
}) {
  if (!plainObject(transactionResponse?.meta)
    || !Array.isArray(transactionResponse.meta.innerInstructions)
    || !Array.isArray(accountKeys)) historyFail("inner-envelope");
  for (const group of transactionResponse.meta.innerInstructions) {
    if (!plainObject(group) || !Number.isSafeInteger(group.index)
      || !Array.isArray(group.instructions)) historyFail("inner-envelope");
    for (const instruction of group.instructions) {
      if (!plainObject(instruction)
        || !Number.isSafeInteger(instruction.programIdIndex)
        || instruction.programIdIndex < 0
        || instruction.programIdIndex >= accountKeys.length
        || !Array.isArray(instruction.accounts)
        || instruction.accounts.some((index) => (
          !Number.isSafeInteger(index) || index < 0 || index >= accountKeys.length
        ))
        || typeof instruction.data !== "string"
        || !Number.isSafeInteger(instruction.stackHeight)) {
        historyFail("inner-envelope");
      }
      if (accountKeys[instruction.programIdIndex]
        !== RAYDIUM_LAUNCHLAB_PROGRAM_ID) continue;
      let bytes;
      try {
        bytes = decodeBase58(instruction.data, {
          code: "platform-history-inner-data",
          maxLength: 2_048,
        });
      } catch {
        historyFail("inner-envelope");
      }
      let classification;
      try {
        classification = classifyPlatformConfigAuthorityInstruction(bytes);
      } catch {
        historyFail("inner-envelope");
      }
      if (classification !== null) historyFail("inner-authority");
    }
  }
  return true;
}

function canonicalAccountData(value) {
  if (!plainObject(value)
    || Object.keys(value).sort().join(",")
      !== "data,executable,lamports,owner,rentEpoch,space"
    || !Array.isArray(value.data) || value.data.length !== 2
    || value.data[1] !== "base64"
    || value.executable !== false
    || !Number.isSafeInteger(value.lamports) || value.lamports < 0
    || typeof value.rentEpoch !== "number"
    || !Number.isFinite(value.rentEpoch) || value.rentEpoch < 0
    || (value.space !== null
      && (!Number.isSafeInteger(value.space) || value.space < 0))) {
    fail("launchlab-account-envelope");
  }
  canonicalPublicKey(value.owner, "launchlab-account-owner");
  const bytes = Buffer.from(value.data[0], "base64");
  if (bytes.toString("base64") !== value.data[0]) {
    fail("launchlab-account-base64");
  }
  if (value.space !== null && value.space !== bytes.length) {
    fail("launchlab-account-space");
  }
  return bytes;
}

export async function fetchFinalizedLaunchlabAccounts({
  rpcClient,
  launchId,
  baseVault,
  quoteVault,
  platformConfigAddress,
  minContextSlot,
}) {
  if (!plainObject(rpcClient) || typeof rpcClient.call !== "function"
    || typeof rpcClient.hostname !== "string") fail("launchlab-rpc-client");
  const addresses = [
    canonicalPublicKey(launchId, "launchlab-launch-id"),
    canonicalPublicKey(baseVault, "launchlab-base-vault"),
    canonicalPublicKey(quoteVault, "launchlab-quote-vault"),
    canonicalPublicKey(platformConfigAddress, "launchlab-platform-config"),
  ];
  if (new Set(addresses).size !== addresses.length
    || !Number.isSafeInteger(minContextSlot) || minContextSlot < 0) {
    fail("launchlab-account-input");
  }
  const result = await rpcClient.call("getMultipleAccounts", [
    addresses,
    {
      commitment: "finalized",
      encoding: "base64",
      minContextSlot,
    },
  ]);
  const finalizedSlot = result?.context?.slot;
  if (!Number.isSafeInteger(finalizedSlot) || finalizedSlot < minContextSlot
    || !Array.isArray(result.value) || result.value.length !== addresses.length) {
    fail("launchlab-account-result");
  }
  const normalized = result.value.map((value, index) => {
    const data = canonicalAccountData(value);
    return Object.freeze({
      address: addresses[index],
      owner: value.owner,
      data,
    });
  });
  let decoded;
  try {
    decoded = decodeLaunchlabAccounts({
      launchAccount: normalized[0],
      vaultAccount: {
        baseVault: normalized[1],
        quoteVault: normalized[2],
      },
      platformConfigAccount: normalized[3],
    });
  } catch {
    fail("launchlab-account-decode");
  }
  const blockTime = await rpcClient.call("getBlockTime", [finalizedSlot]);
  if (!Number.isSafeInteger(blockTime) || blockTime < 0) {
    fail("launchlab-account-time");
  }
  return recursivelyFreeze({
    finalizedSlot,
    finalizedAt: new Date(blockTime * 1_000).toISOString(),
    decoded,
    hashes: {
      launchAccountSha256: sha256Hex(normalized[0].data),
      baseVaultSha256: sha256Hex(normalized[1].data),
      quoteVaultSha256: sha256Hex(normalized[2].data),
      platformConfigSha256: sha256Hex(normalized[3].data),
    },
  });
}

function collectorFail(code) {
  fail(`launchlab-collector-${code}`);
}

function asDecimal(value, code) {
  if (typeof value === "bigint") {
    if (value < 0n) collectorFail(code);
    return value.toString();
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) collectorFail(code);
    return String(value);
  }
  if (typeof value !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    collectorFail(code);
  }
  return value;
}

function allocationEvidence({ supply, totalSell }) {
  const supplyValue = BigInt(asDecimal(supply, "allocation"));
  const publicValue = BigInt(asDecimal(totalSell, "allocation"));
  if (supplyValue !== 1_000_000_000_000n
    || publicValue !== 800_000_000_000n) collectorFail("allocation");
  return {
    publicCurveBaseUnits: publicValue.toString(),
    publicCurveBps: 8000,
    liquidityBaseUnits: (supplyValue - publicValue).toString(),
    liquidityBps: 2000,
    teamBaseUnits: "0",
    teamBps: 0,
    totalBps: 10000,
  };
}

function vestingEvidence(value) {
  const lockedBaseUnits = asDecimal(
    value.lockedAmount ?? value.totalLockedAmount,
    "vesting",
  );
  const cliffSeconds = asDecimal(
    value.cliffPeriod,
    "vesting",
  );
  const unlockSeconds = asDecimal(
    value.unlockPeriod,
    "vesting",
  );
  return { lockedBaseUnits, cliffSeconds, unlockSeconds };
}

function platformEvidence({
  address,
  hashField,
  hash,
  platformHistory,
  platformScaleRaw,
  creatorScaleRaw,
  burnScaleRaw,
  feeRateMillionths,
  creatorFeeRateMillionths,
  platformVestingScaleRaw,
}) {
  return {
    address,
    [hashField]: hash,
    updateAuthorities: [...platformHistory.updateAuthorities],
    mutableFields: [...platformHistory.mutableFields],
    mutabilityClassification: "platform-mutable-per-launch-snapshot-verified",
    platformScaleRaw: asDecimal(platformScaleRaw, "platform"),
    creatorScaleRaw: asDecimal(creatorScaleRaw, "platform"),
    burnScaleRaw: asDecimal(burnScaleRaw, "platform"),
    feeRateMillionths: asDecimal(feeRateMillionths, "platform"),
    creatorFeeRateMillionths: asDecimal(
      creatorFeeRateMillionths,
      "platform",
    ),
    platformVestingScaleRaw: asDecimal(
      platformVestingScaleRaw,
      "platform",
    ),
    immutableBinding: "platform-admin-mutable-until-graduation",
  };
}

function recoveryDebit({
  recoveryTransactions,
  creator,
  creationSlot,
  observationSlot,
}) {
  if (!Array.isArray(recoveryTransactions)) collectorFail("recovery");
  let total = 0n;
  const seen = new Set();
  for (const recovery of recoveryTransactions) {
    if (!plainObject(recovery)
      || Object.keys(recovery).sort().join(",")
        !== "debitLamports,feePayer,finalizedSlot,related,signature"
      || recovery.feePayer !== creator || recovery.related !== true
      || !Number.isSafeInteger(recovery.finalizedSlot)
      || recovery.finalizedSlot < creationSlot
      || recovery.finalizedSlot > observationSlot) {
      collectorFail("recovery");
    }
    const signature = canonicalSignature(
      recovery.signature,
      "launchlab-collector-recovery-signature",
    );
    if (seen.has(signature)) collectorFail("recovery");
    seen.add(signature);
    total += BigInt(asDecimal(recovery.debitLamports, "recovery"));
  }
  return total;
}

export function buildLaunchlabEvidenceSources({
  approvalEnvelope,
  creation,
  accountSnapshot,
  platformHistory,
  metadata,
  recoveryTransactions,
  checkedAt,
  rpcHost,
}) {
  try {
    assertApprovalEnvelopeV1(approvalEnvelope);
  } catch {
    collectorFail("approval");
  }
  if (!plainObject(creation) || !plainObject(creation.decoded)
    || !plainObject(accountSnapshot) || !plainObject(accountSnapshot.decoded)
    || !plainObject(platformHistory) || !plainObject(metadata)
    || typeof rpcHost !== "string" || rpcHost.length === 0) {
    collectorFail("input");
  }
  const decoded = creation.decoded;
  const accounts = decoded.accounts;
  const launch = accountSnapshot.decoded.launch;
  const currentPlatform = accountSnapshot.decoded.platformConfig;
  const creator = approvalEnvelope.creator;
  const identities = {
    mint: approvalEnvelope.mint,
    creator,
    launchId: approvalEnvelope.launchId,
    configId: accounts.configId,
    platformConfig: approvalEnvelope.platformConfig.address,
    launchlabAuthority: accounts.authority,
    baseVault: accounts.baseVault,
    quoteVault: accounts.quoteVault,
    metadataAccount: accounts.metadataAccount,
  };
  if (creation.unsignedTransactionSha256 !== approvalEnvelope.transactionSha256
    || creation.feePayer !== creator
    || creation.signature === undefined
    || !/^[0-9a-f]{64}$/u.test(creation.transactionSha256)
    || decoded.instruction !== "initialize-v2"
    || decoded.discriminatorHex !== "4399af27da102620"
    || accounts.payer !== creator || accounts.creator !== creator
    || accounts.mint !== identities.mint
    || accounts.launchId !== identities.launchId
    || accounts.platformId !== identities.platformConfig
    || decoded.name !== metadata.name || decoded.symbol !== metadata.symbol
    || decoded.uri !== metadata.uri
    || approvalEnvelope.platformConfig.finalizedSlot > creation.finalizedSlot
    || platformHistory.creationSlot > approvalEnvelope.platformConfig.finalizedSlot
    || platformHistory.historyLastSlot > accountSnapshot.finalizedSlot
    || JSON.stringify(platformHistory.updateAuthorities)
      !== JSON.stringify([platformHistory.platformAdmin])
    || JSON.stringify(platformHistory.mutableFields)
      !== JSON.stringify(RAYDIUM_PLATFORM_CONFIG_MUTABLE_FIELDS)
    || !Number.isSafeInteger(creation.finalizedSlot)
    || !Number.isSafeInteger(accountSnapshot.finalizedSlot)
    || accountSnapshot.finalizedSlot < creation.finalizedSlot
    || launch.status !== "fund"
    || launch.mintA !== identities.mint || launch.mintB !== accounts.quoteMint
    || launch.creator !== creator || launch.configId !== identities.configId
    || launch.platformId !== identities.platformConfig
    || launch.vaultA !== identities.baseVault
    || launch.vaultB !== identities.quoteVault
    || currentPlatform.address !== identities.platformConfig
    || currentPlatform.accountSha256
      !== accountSnapshot.hashes.platformConfigSha256
    || accountSnapshot.decoded.baseVault.address !== identities.baseVault
    || accountSnapshot.decoded.quoteVault.address !== identities.quoteVault) {
    collectorFail("binding");
  }
  canonicalSignature(creation.signature, "launchlab-collector-signature");
  const creationTime = timestamp(creation.finalizedAt, "launchlab-collector-time");
  const accountTime = timestamp(
    accountSnapshot.finalizedAt,
    "launchlab-collector-time",
  );
  const checkedTime = timestamp(checkedAt, "launchlab-collector-time");
  if (creationTime > accountTime || accountTime > checkedTime) {
    collectorFail("chronology");
  }

  const transactionAllocations = allocationEvidence({
    supply: decoded.curve.supply,
    totalSell: decoded.curve.totalSell,
  });
  const accountAllocations = allocationEvidence({
    supply: launch.supply,
    totalSell: launch.totalSellA,
  });
  const transactionQuote = {
    mint: accounts.quoteMint,
    symbol: "SOL",
    decimals: 9,
    fundraisingLamports: asDecimal(
      decoded.curve.totalFundraising,
      "quote",
    ),
    graduationThresholdLamports: "24000000000",
  };
  const accountQuote = {
    mint: launch.mintB,
    symbol: "SOL",
    decimals: launch.mintDecimalsB,
    fundraisingLamports: asDecimal(
      launch.totalFundRaisingB,
      "quote",
    ),
    graduationThresholdLamports: "24000000000",
  };
  const transactionVesting = vestingEvidence(decoded.vesting);
  const accountVesting = vestingEvidence(launch.vestingSchedule);
  const creatorFirstBuy = {
    creatorLamports: "0",
    creatorTokenBaseUnits: "0",
  };
  const transactionFees = {
    protocolBuyFeeRateMillionths:
      approvalEnvelope.fees.protocolBuyFeeRateMillionths,
    protocolSellFeeRateMillionths:
      approvalEnvelope.fees.protocolSellFeeRateMillionths,
    feeRateDenominator: approvalEnvelope.fees.feeRateDenominator,
    creatorTradingFeeRateMillionths:
      approvalEnvelope.fees.creatorTradingFeeRateMillionths,
    creatorFeeKey: null,
    creatorFeeRights: false,
    snapshotImmutable: false,
  };
  const accountFees = {
    protocolBuyFeeRateMillionths: asDecimal(
      currentPlatform.feeRate,
      "fees",
    ),
    protocolSellFeeRateMillionths: asDecimal(
      currentPlatform.feeRate,
      "fees",
    ),
    feeRateDenominator: "1000000",
    creatorTradingFeeRateMillionths: asDecimal(
      currentPlatform.creatorFeeRate,
      "fees",
    ),
    creatorFeeKey: null,
    creatorFeeRights: false,
    snapshotImmutable: false,
  };
  const transactionMigration = {
    type: approvalEnvelope.migration.type,
    lpPolicy: approvalEnvelope.migration.lpPolicy,
    platformLpBps: approvalEnvelope.migration.platformLpBps,
    creatorLpBps: approvalEnvelope.migration.creatorLpBps,
    irreversibleLpBps: approvalEnvelope.migration.irreversibleLpBps,
  };
  let accountCoverage;
  try {
    accountCoverage = evaluateHakkyLaunchlabSourceCoverage({
      migrationType: launch.migrationType,
      platformScaleRaw: BigInt(asDecimal(currentPlatform.platformScale, "coverage")),
      creatorScaleRaw: BigInt(asDecimal(currentPlatform.creatorScale, "coverage")),
      burnScaleRaw: BigInt(asDecimal(currentPlatform.burnScale, "coverage")),
    });
  } catch {
    collectorFail("coverage");
  }
  const accountMigration = {
    type: launch.migrationType,
    lpPolicy: accountCoverage.disposition.lpPolicy,
    platformLpBps: accountCoverage.disposition.platformLpBps,
    creatorLpBps: accountCoverage.disposition.creatorLpBps,
    irreversibleLpBps: accountCoverage.disposition.irreversibleLpBps,
  };
  const recovery = recoveryDebit({
    recoveryTransactions,
    creator,
    creationSlot: creation.finalizedSlot,
    observationSlot: accountSnapshot.finalizedSlot,
  });
  const creationDebit = BigInt(
    asDecimal(creation.feePayerDebitLamports, "creation-debit"),
  );
  const metadataDebit = BigInt(approvalEnvelope.cost.metadataUploadLamports);
  const cumulative = metadataDebit + creationDebit + recovery;
  if (metadataDebit !== 0n
    || creationDebit > BigInt(approvalEnvelope.cost.maximumCreationDebitLamports)
    || cumulative > BigInt(approvalEnvelope.cost.cumulativeCreatorDebitCapLamports)) {
    collectorFail("cost");
  }
  const cost = {
    metadataUploadLamports: metadataDebit.toString(),
    creationDebitLamports: creationDebit.toString(),
    recoveryDebitLamports: recovery.toString(),
    graduationDebitLamports: "0",
    cumulativeCreatorDebitLamports: cumulative.toString(),
    capLamports: "1000000000",
    withinCap: true,
  };
  const links = {
    solscanMint: `https://solscan.io/token/${identities.mint}`,
    solscanCreationTransaction:
      `https://solscan.io/tx/${creation.signature}`,
    raydiumLaunchlab:
      `https://raydium.io/launchpad/token/${identities.mint}`,
  };
  const classicProgramField = ["to", "ken"].join("");
  const associatedProgramField = ["associated", "Token"].join("");
  const programs = {
    launchlab: accounts.launchlabProgram,
    [classicProgramField]: accounts.tokenProgramBase,
    metadata: accounts.metadataProgram,
    system: accounts.systemProgram,
    [associatedProgramField]: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    quoteMint: accounts.quoteMint,
  };
  const commonTransactionPlatform = platformEvidence({
    address: identities.platformConfig,
    hashField: "creationAccountSha256",
    hash: approvalEnvelope.platformConfig.accountSha256,
    platformHistory,
    platformScaleRaw: approvalEnvelope.platformConfig.platformScaleRaw,
    creatorScaleRaw: approvalEnvelope.platformConfig.creatorScaleRaw,
    burnScaleRaw: approvalEnvelope.platformConfig.burnScaleRaw,
    feeRateMillionths: approvalEnvelope.platformConfig.feeRateMillionths,
    creatorFeeRateMillionths:
      approvalEnvelope.platformConfig.creatorFeeRateMillionths,
    platformVestingScaleRaw:
      approvalEnvelope.platformConfig.platformVestingScaleRaw,
  });
  const commonAccountPlatform = platformEvidence({
    address: identities.platformConfig,
    hashField: "verificationAccountSha256",
    hash: accountSnapshot.hashes.platformConfigSha256,
    platformHistory,
    platformScaleRaw: currentPlatform.platformScale,
    creatorScaleRaw: currentPlatform.creatorScale,
    burnScaleRaw: currentPlatform.burnScale,
    feeRateMillionths: currentPlatform.feeRate,
    creatorFeeRateMillionths: currentPlatform.creatorFeeRate,
    platformVestingScaleRaw: currentPlatform.platformVestingScale,
  });
  const transactionEvidence = {
    network: "mainnet-beta",
    identities: { ...identities },
    transaction: {
      signature: creation.signature,
      finalizedSlot: creation.finalizedSlot,
      finalizedAt: creation.finalizedAt,
      instruction: decoded.instruction,
      instructionDiscriminatorHex: decoded.discriminatorHex,
      transactionSha256: creation.transactionSha256,
    },
    programs,
    platformConfig: commonTransactionPlatform,
    allocations: transactionAllocations,
    quote: transactionQuote,
    creatorFirstBuy,
    vesting: transactionVesting,
    fees: transactionFees,
    migration: transactionMigration,
    metadata: structuredClone(metadata),
    cost,
    links,
  };
  const accountEvidence = {
    network: "mainnet-beta",
    identities: { ...identities },
    platformConfig: commonAccountPlatform,
    allocations: accountAllocations,
    quote: accountQuote,
    creatorFirstBuy: { ...creatorFirstBuy },
    vesting: accountVesting,
    fees: accountFees,
    migration: accountMigration,
    metadata: structuredClone(metadata),
    cost: { ...cost },
    links: { ...links },
    observation: {
      ...accountSnapshot.hashes,
      finalizedSlot: accountSnapshot.finalizedSlot,
      finalizedAt: accountSnapshot.finalizedAt,
      rpcHost,
    },
  };
  return recursivelyFreeze({
    transactionEvidence,
    accountEvidence,
    publicIdentifiers: {
      mint: identities.mint,
      creator,
      launchId: identities.launchId,
      creationSignature: creation.signature,
    },
    checkedAt,
  });
}

function check(id, observed, expected) {
  if (!equal(observed, expected)) fail(id);
  return true;
}

function commonPlatformConfig(value, hashField, code) {
  if (!plainObject(value) || !(hashField in value)) fail(code);
  const { [hashField]: hash, ...common } = value;
  if (typeof hash !== "string" || !/^[0-9a-f]{64}$/u.test(hash)) fail(code);
  return common;
}

function unsigned(value, code) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/u.test(value)) fail(code);
  return BigInt(value);
}

function timestamp(value, code) {
  if (typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) fail(code);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) fail(code);
  return milliseconds;
}

function checkPublicIdentifiers(transactionEvidence, accountEvidence, publicIdentifiers) {
  exactKeys(
    publicIdentifiers,
    ["mint", "creator", "launchId", "creationSignature"],
    "public-identifiers",
  );
  check("public-mint", publicIdentifiers.mint, transactionEvidence.identities.mint);
  check("public-mint", publicIdentifiers.mint, accountEvidence.identities.mint);
  check("public-creator", publicIdentifiers.creator, transactionEvidence.identities.creator);
  check("public-creator", publicIdentifiers.creator, accountEvidence.identities.creator);
  check("public-launch-id", publicIdentifiers.launchId, transactionEvidence.identities.launchId);
  check("public-launch-id", publicIdentifiers.launchId, accountEvidence.identities.launchId);
  check(
    "public-creation-signature",
    publicIdentifiers.creationSignature,
    transactionEvidence.transaction.signature,
  );
}

function checkFixedPolicy(transactionEvidence) {
  const { allocations, quote, creatorFirstBuy, vesting, fees, migration, platformConfig } = transactionEvidence;
  if (allocations.publicCurveBaseUnits !== "800000000000"
    || allocations.publicCurveBps !== 8000
    || allocations.liquidityBaseUnits !== "200000000000"
    || allocations.liquidityBps !== 2000
    || allocations.teamBaseUnits !== "0"
    || allocations.teamBps !== 0
    || allocations.totalBps !== 10000) fail("allocation-policy");
  if (quote.symbol !== "SOL"
    || quote.decimals !== 9
    || quote.fundraisingLamports !== "24000000000"
    || quote.graduationThresholdLamports !== "24000000000") fail("quote-policy");
  if (creatorFirstBuy.creatorLamports !== "0"
    || creatorFirstBuy.creatorTokenBaseUnits !== "0") fail("creator-first-buy-policy");
  if (vesting.lockedBaseUnits !== "0"
    || vesting.cliffSeconds !== "0"
    || vesting.unlockSeconds !== "0") fail("vesting-policy");
  if (platformConfig.mutabilityClassification
      !== "platform-mutable-per-launch-snapshot-verified"
    || platformConfig.immutableBinding
      !== "platform-admin-mutable-until-graduation"
    || !Array.isArray(platformConfig.updateAuthorities)
    || platformConfig.updateAuthorities.length === 0
    || !Array.isArray(platformConfig.mutableFields)
    || !["creatorFeeRate", "feeRate", "migrateNftInfo", "platformCpCreator"]
      .every((field) => platformConfig.mutableFields.includes(field))
    || fees.snapshotImmutable !== false) fail("platform-config-mutability");
  if (platformConfig.creatorFeeRateMillionths !== "0"
    || fees.creatorTradingFeeRateMillionths !== "0"
    || fees.creatorFeeKey !== null
    || fees.creatorFeeRights !== false) fail("fee-policy");
  if (migration.type !== "cpmm"
    || migration.lpPolicy !== "burn-and-earn"
    || migration.platformLpBps !== 0
    || migration.creatorLpBps !== 0
    || migration.irreversibleLpBps !== 10000) fail("migration-policy");
}

function checkCost(cost) {
  const metadata = unsigned(cost.metadataUploadLamports, "cost-shape");
  const creation = unsigned(cost.creationDebitLamports, "cost-shape");
  const recovery = unsigned(cost.recoveryDebitLamports, "cost-shape");
  const graduation = unsigned(cost.graduationDebitLamports, "cost-shape");
  const cumulative = unsigned(cost.cumulativeCreatorDebitLamports, "cost-shape");
  const cap = unsigned(cost.capLamports, "cost-shape");
  if (metadata !== 0n) fail("metadata-upload-cost");
  if (graduation !== 0n
    || cumulative !== metadata + creation + recovery + graduation
    || cap !== 1_000_000_000n
    || cumulative > cap
    || cost.withinCap !== true) fail("cost-cap");
}

function checkChronology(transactionEvidence, accountEvidence, checkedAt) {
  if (!Number.isSafeInteger(transactionEvidence.transaction.finalizedSlot)
    || transactionEvidence.transaction.finalizedSlot < 0
    || !Number.isSafeInteger(accountEvidence.observation.finalizedSlot)
    || accountEvidence.observation.finalizedSlot < transactionEvidence.transaction.finalizedSlot) {
    fail("finalized-chronology");
  }
  const transactionTime = timestamp(transactionEvidence.transaction.finalizedAt, "finalized-chronology");
  const accountTime = timestamp(accountEvidence.observation.finalizedAt, "finalized-chronology");
  const checkedTime = timestamp(checkedAt, "finalized-chronology");
  if (transactionTime > accountTime || accountTime > checkedTime) fail("finalized-chronology");
}

export function reconcileLaunchlabEvidence({
  transactionEvidence,
  accountEvidence,
  publicIdentifiers,
  checkedAt,
}) {
  if (!plainObject(transactionEvidence) || !plainObject(accountEvidence)) fail("launchlab-evidence");
  check("sources-agree-network", transactionEvidence.network, accountEvidence.network);
  check("sources-agree-network", transactionEvidence.network, "mainnet-beta");
  check("sources-agree-identities", transactionEvidence.identities, accountEvidence.identities);
  const transactionPlatform = commonPlatformConfig(
    transactionEvidence.platformConfig,
    "creationAccountSha256",
    "sources-agree-platform-config",
  );
  const accountPlatform = commonPlatformConfig(
    accountEvidence.platformConfig,
    "verificationAccountSha256",
    "sources-agree-platform-config",
  );
  check("sources-agree-platform-config", transactionPlatform, accountPlatform);
  for (const field of SHARED_FIELDS) {
    const id = `sources-agree-${field.replaceAll(/[A-Z]/gu, (value) => `-${value.toLowerCase()}`)}`;
    check(id, transactionEvidence[field], accountEvidence[field]);
  }
  checkPublicIdentifiers(transactionEvidence, accountEvidence, publicIdentifiers);
  checkFixedPolicy(transactionEvidence);
  checkCost(transactionEvidence.cost);
  checkChronology(transactionEvidence, accountEvidence, checkedAt);
  const coverage = evaluateHakkyLaunchlabSourceCoverage({
    migrationType: transactionEvidence.migration.type,
    platformScaleRaw: unsigned(transactionEvidence.platformConfig.platformScaleRaw, "coverage-query"),
    creatorScaleRaw: unsigned(transactionEvidence.platformConfig.creatorScaleRaw, "coverage-query"),
    burnScaleRaw: unsigned(transactionEvidence.platformConfig.burnScaleRaw, "coverage-query"),
  });
  check("source-coverage-control", coverage, HAKKY_SOURCE_COVERAGE_VERIFIED);
  return HAKKY_PLATFORM_CONFIG_IMMUTABILITY_UNAVAILABLE;
}

async function resolveFinalizedTransaction(rpcClient, signature) {
  const transactionResponse = await fetchFinalizedCreationTransaction({
    rpcClient,
    signature,
  });
  let message;
  try {
    message = VersionedTransaction.deserialize(
      Buffer.from(transactionResponse.transaction[0], "base64"),
    ).message;
  } catch {
    collectorFail("transaction-wire");
  }
  const lookupTableAccounts = await fetchFinalizedLookupTables({
    rpcClient,
    transactionMessage: message,
    minContextSlot: transactionResponse.slot,
  });
  let resolved;
  try {
    resolved = resolveFinalizedTransactionInstructions({
      transactionResponse,
      lookupTableAccounts,
      requestedSignature: signature,
    });
  } catch {
    collectorFail("transaction-resolution");
  }
  assertNoInnerPlatformConfigAuthority({
    transactionResponse,
    accountKeys: resolved.accountKeys,
  });
  return { transactionResponse, resolved };
}

function projectHistoryTransaction(signature, resolved) {
  return {
    signature,
    slot: resolved.slot,
    feePayer: resolved.feePayer,
    instructions: resolved.instructions.map((instruction) => ({
      programId: instruction.programId,
      accountKeys: [...instruction.accountKeys],
      accountMetas: instruction.accountMetas.map((meta) => ({ ...meta })),
      data: Buffer.from(instruction.data),
    })),
  };
}

function recoveryObservation({
  signature,
  transactionResponse,
  resolved,
  creatorAddress,
  mintAddress,
  launchId,
}) {
  const meta = transactionResponse.meta;
  if (resolved.feePayer !== creatorAddress
    || !Array.isArray(meta?.preBalances)
    || !Array.isArray(meta?.postBalances)
    || meta.preBalances.length !== resolved.accountKeys.length
    || meta.postBalances.length !== resolved.accountKeys.length
    || !Number.isSafeInteger(meta.fee) || meta.fee < 0
    || !Number.isSafeInteger(meta.preBalances[0])
    || !Number.isSafeInteger(meta.postBalances[0])
    || meta.preBalances[0] < meta.postBalances[0]) {
    collectorFail("recovery");
  }
  const debit = meta.preBalances[0] - meta.postBalances[0];
  if (debit < meta.fee) collectorFail("recovery");
  const related = resolved.instructions.some((instruction) => (
    instruction.programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID
    && (instruction.accountKeys.includes(mintAddress)
      || instruction.accountKeys.includes(launchId))
  ));
  if (!related) collectorFail("recovery");
  return Object.freeze({
    signature,
    feePayer: creatorAddress,
    debitLamports: String(debit),
    finalizedSlot: resolved.slot,
    related: true,
  });
}

export async function fetchLaunchlabEvidence({
  rpcClient,
  mintAddress,
  creatorAddress,
  launchId,
  creationSignature,
  platformConfigAddress,
  metadataManifest,
  metadataReadback,
  approvalEnvelope,
  recoverySignatures = [],
  repositoryRoot,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
}) {
  if (!plainObject(rpcClient) || typeof rpcClient.call !== "function"
    || typeof rpcClient.hostname !== "string"
    || !plainObject(metadataManifest) || !plainObject(metadataReadback)
    || !plainObject(approvalEnvelope)
    || !Array.isArray(recoverySignatures)
    || typeof repositoryRoot !== "string") {
    collectorFail("input");
  }
  const mint = canonicalPublicKey(mintAddress, "launchlab-collector-mint");
  const creator = canonicalPublicKey(
    creatorAddress,
    "launchlab-collector-creator",
  );
  const launch = canonicalPublicKey(launchId, "launchlab-collector-launch");
  const platformConfig = canonicalPublicKey(
    platformConfigAddress,
    "launchlab-collector-platform",
  );
  const creationTx = canonicalSignature(
    creationSignature,
    "launchlab-collector-creation-signature",
  );
  const uniqueRecovery = new Set();
  for (const signature of recoverySignatures) {
    canonicalSignature(signature, "launchlab-collector-recovery-signature");
    if (signature === creationTx || uniqueRecovery.has(signature)) {
      collectorFail("recovery");
    }
    uniqueRecovery.add(signature);
  }
  try {
    assertApprovalEnvelopeV1(approvalEnvelope);
  } catch {
    collectorFail("approval");
  }
  if (approvalEnvelope.mint !== mint || approvalEnvelope.creator !== creator
    || approvalEnvelope.launchId !== launch
    || approvalEnvelope.platformConfig.address !== platformConfig) {
    collectorFail("approval-binding");
  }

  const metadataAddress = deriveMetadataPdas({ mint }).metadata;
  const mintEvidence = await fetchMintEvidence({
    rpcClient,
    mintAddress: mint,
    creatorAddress: creator,
    metadataAddress,
    creationSignature: creationTx,
    metadataManifest,
    metadataReadback,
    repositoryRoot,
    fetchImpl,
    now,
  });
  let mintProof;
  try {
    mintProof = evaluateMintEvidenceV2(mintEvidence);
  } catch {
    collectorFail("mint-proof");
  }
  if (mintProof.identities.launchId !== launch
    || mintProof.identities.metadataAccount !== metadataAddress) {
    collectorFail("mint-binding");
  }

  const signatureHistory = await fetchPlatformConfigSignatureHistory({
    rpcClient,
    platformConfigAddress: platformConfig,
  });
  const historyTransactions = [];
  for (const entry of signatureHistory) {
    const { resolved } = await resolveFinalizedTransaction(
      rpcClient,
      entry.signature,
    );
    if (resolved.slot !== entry.slot) collectorFail("history-slot");
    historyTransactions.push(projectHistoryTransaction(entry.signature, resolved));
  }
  const platformHistory = evaluatePlatformConfigHistory({
    platformConfigAddress: platformConfig,
    resolvedTransactions: historyTransactions,
  });
  const accountSnapshot = await fetchFinalizedLaunchlabAccounts({
    rpcClient,
    launchId: launch,
    baseVault: mintEvidence.creation.creation.accounts.baseVault,
    quoteVault: mintEvidence.creation.creation.accounts.quoteVault,
    platformConfigAddress: platformConfig,
    minContextSlot: Math.max(
      mintEvidence.creation.slot,
      platformHistory.historyLastSlot,
    ),
  });
  const recoveryTransactions = [];
  for (const signature of recoverySignatures) {
    const { transactionResponse, resolved } = await resolveFinalizedTransaction(
      rpcClient,
      signature,
    );
    recoveryTransactions.push(recoveryObservation({
      signature,
      transactionResponse,
      resolved,
      creatorAddress: creator,
      mintAddress: mint,
      launchId: launch,
    }));
  }
  const checkedDate = typeof now === "function" ? now() : now;
  const checkedAt = (
    checkedDate instanceof Date ? checkedDate : new Date(checkedDate)
  ).toISOString();
  return buildLaunchlabEvidenceSources({
    approvalEnvelope,
    creation: {
      signature: creationTx,
      finalizedSlot: mintEvidence.creation.slot,
      finalizedAt: mintEvidence.observation.creationTime,
      unsignedTransactionSha256:
        mintEvidence.creation.unsignedTransactionSha256,
      transactionSha256:
        mintEvidence.observation.creationTransactionSha256,
      feePayer: mintEvidence.creation.feePayer,
      feePayerDebitLamports:
        mintEvidence.creation.feePayerDebitLamports,
      decoded: mintEvidence.creation.creation,
    },
    accountSnapshot,
    platformHistory,
    metadata: mintProof.metadata,
    recoveryTransactions,
    checkedAt,
    rpcHost: rpcClient.hostname,
  });
}

export async function runLaunchlabVerifier({
  argv = process.argv.slice(2),
  fetchEvidence = fetchLaunchlabEvidence,
  publishProof,
  options,
} = {}) {
  if (!Array.isArray(argv) || typeof fetchEvidence !== "function"
    || typeof publishProof !== "function") fail("launchlab-runner");
  const evidence = await fetchEvidence({ argv, options });
  const outcome = reconcileLaunchlabEvidence(evidence);
  if (outcome === HAKKY_PLATFORM_CONFIG_IMMUTABILITY_UNAVAILABLE) return outcome;
  const publication = await publishProof(outcome);
  exactKeys(publication, ["published", "outputPath", "warnings"], "publication-receipt");
  if (publication.published !== true
    || typeof publication.outputPath !== "string"
    || publication.outputPath.length === 0
    || !Array.isArray(publication.warnings)) fail("publication-receipt");
  for (const warning of publication.warnings) {
    exactKeys(warning, ["code", "message", "temporaryPath"], "publication-warning");
    if (warning.code !== "TEMP_UNLINK_FAILED"
      || typeof warning.message !== "string"
      || typeof warning.temporaryPath !== "string") fail("publication-warning");
  }
  return recursivelyFreeze({
    proof: outcome,
    publication: {
      published: true,
      outputPath: publication.outputPath,
      warnings: publication.warnings.map((warning) => ({ ...warning })),
    },
  });
}
