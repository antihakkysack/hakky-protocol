import { createHash } from "node:crypto";
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  assertMetadataManifestV1,
  assertMetadataReadbackV1,
} from "./metadata-integrity.mjs";
import {
  decodeCreateMetadataAccountV3,
  METAPLEX_METADATA_PROGRAM_ID,
} from "./metaplex-metadata.mjs";
import {
  HAKKY_SOURCE_COVERAGE_VERIFIED,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  decodeLaunchlabCreationTransaction,
  decodePlatformConfigAccount,
  evaluateHakkyLaunchlabSourceCoverage,
} from "./raydium-launchlab.mjs";
import {
  serializeMainnetSessionJson,
} from "./mainnet-session-artifact.mjs";
import {
  MAINNET_BETA_GENESIS_HASH,
} from "./solana-rpc.mjs";
import { decodeBase58 } from "./solana-transaction.mjs";

const ALT_PROGRAM_ID = "AddressLookupTab1e1111111111111111111111111";
const CLASSIC_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
const REQUIRED_LAMPORTS = 1_000_000_000;
const FEE_RATE_DENOMINATOR = "1000000";
const ORIGIN_MAX_AGE_MS = 30 * 60 * 1000;
const WALLET_MAX_AGE_MS = 5 * 60 * 1000;
const ALLOWED_OUTER_PROGRAMS = new Set([
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  ComputeBudgetProgram.programId.toBase58(),
  SystemProgram.programId.toBase58(),
]);

function fail(code) {
  throw new Error(`launch-preview-${code}`);
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) fail(code);
}

function recursivelyFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) recursivelyFreeze(child);
  return Object.freeze(value);
}

function canonicalKey(value, code) {
  try {
    if (typeof value !== "string") fail(code);
    const key = new PublicKey(value);
    if (key.toBase58() !== value || key.toBytes().length !== 32) fail(code);
    return value;
  } catch {
    fail(code);
  }
}

function safeInteger(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  return value;
}

function canonicalBase64(value, code) {
  if (typeof value !== "string" || value.length === 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
    fail(code);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== value) fail(code);
  return bytes;
}

function canonicalTimestamp(value) {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeLookupTables(message, values, lookupBarrierSlot) {
  if (!Array.isArray(values)) fail("lookup-tables");
  safeInteger(lookupBarrierSlot, "lookup-barrier-slot");
  const lookups = message.version === 0 ? message.addressTableLookups : [];
  if (values.length !== lookups.length || (message.version === "legacy" && values.length !== 0)) {
    fail("lookup-tables");
  }
  return values.map((value, index) => {
    exactKeys(value, ["address", "owner", "contextSlot", "dataBase64"], "lookup-table");
    const address = canonicalKey(value.address, "lookup-address");
    if (address !== lookups[index].accountKey.toBase58() || value.owner !== ALT_PROGRAM_ID) {
      fail("lookup-table-identity");
    }
    const contextSlot = safeInteger(value.contextSlot, "lookup-context-slot");
    if (contextSlot > lookupBarrierSlot) fail("lookup-barrier-slot");
    const bytes = canonicalBase64(value.dataBase64, "lookup-base64");
    try {
      return new AddressLookupTableAccount({
        key: new PublicKey(address),
        state: AddressLookupTableAccount.deserialize(bytes),
      });
    } catch {
      fail("lookup-layout");
    }
  });
}

function allMessageKeys(message, lookupTables) {
  try {
    const keys = message.getAccountKeys({
      addressLookupTableAccounts: lookupTables,
    });
    return Array.from({ length: keys.length }, (_, index) => {
      const key = keys.get(index);
      if (!key) fail("message-account-index");
      return key.toBase58();
    });
  } catch (error) {
    if (error?.message?.startsWith("launch-preview-")) throw error;
    fail("message-account-resolution");
  }
}

function decodeSystemTransfer(data, accountKeys) {
  if (data.length !== 12 || data.readUInt32LE(0) !== 2 || accountKeys.length !== 2) {
    fail("unclassified-system-instruction");
  }
  return Object.freeze({
    from: accountKeys[0],
    to: accountKeys[1],
    lamports: data.readBigUInt64LE(4).toString(),
  });
}

export function decodeUnsignedLaunchTransaction(input) {
  exactKeys(input, ["serialized", "lookupTableAccounts", "lookupBarrierSlot"], "input");
  const wire = canonicalBase64(input.serialized, "transaction-base64");
  let transaction;
  try {
    transaction = VersionedTransaction.deserialize(wire);
  } catch {
    fail("transaction-wire");
  }
  let canonicalWire;
  try {
    canonicalWire = Buffer.from(transaction.serialize());
  } catch {
    fail("transaction-wire");
  }
  if (!canonicalWire.equals(wire)) fail("transaction-wire");
  if (!Array.isArray(transaction.signatures)
    || transaction.signatures.length !== transaction.message.header.numRequiredSignatures
    || transaction.signatures.some((signature) => (
      !(signature instanceof Uint8Array)
      || signature.length !== 64
      || signature.some((byte) => byte !== 0)
    ))) {
    fail("transaction-must-be-unsigned");
  }
  const lookupTables = normalizeLookupTables(
    transaction.message,
    input.lookupTableAccounts,
    input.lookupBarrierSlot,
  );
  const accountKeys = allMessageKeys(transaction.message, lookupTables);
  const signers = accountKeys.slice(0, transaction.message.header.numRequiredSignatures);
  const instructions = [];
  const transfers = [];
  const launchInstructions = [];
  for (let index = 0; index < transaction.message.compiledInstructions.length; index += 1) {
    const compiled = transaction.message.compiledInstructions[index];
    const programId = accountKeys[compiled.programIdIndex];
    if (!programId || !ALLOWED_OUTER_PROGRAMS.has(programId)) fail("unknown-outer-program");
    const instructionAccountKeys = [...compiled.accountKeyIndexes].map((accountIndex) => {
      const value = accountKeys[accountIndex];
      if (!value) fail("instruction-account-index");
      return value;
    });
    const accountMetas = [...compiled.accountKeyIndexes].map((accountIndex) => Object.freeze({
      publicKey: accountKeys[accountIndex],
      isSigner: transaction.message.isAccountSigner(accountIndex),
      isWritable: transaction.message.isAccountWritable(accountIndex),
    }));
    const data = Buffer.from(compiled.data);
    const normalized = Object.freeze({
      index,
      programId,
      dataBase64: data.toString("base64"),
      dataSha256: sha256(data),
      accountKeys: Object.freeze(instructionAccountKeys),
      accountMetas: Object.freeze(accountMetas),
    });
    instructions.push(normalized);
    if (programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID) {
      launchInstructions.push({ index, data, accountKeys: instructionAccountKeys });
    } else if (programId === SystemProgram.programId.toBase58()) {
      transfers.push(decodeSystemTransfer(data, instructionAccountKeys));
    }
  }
  if (launchInstructions.length !== 1) fail("launch-instruction-count");
  let launch;
  try {
    launch = decodeLaunchlabCreationTransaction({
      transactionBytes: launchInstructions[0].data,
      accountKeys: launchInstructions[0].accountKeys,
    });
  } catch {
    fail("launch-instruction");
  }
  if (launch.instruction !== "initialize-v2") fail("launch-instruction");
  if (launch.accounts.payer !== launch.accounts.creator
    || signers.length !== 2
    || signers[0] !== launch.accounts.creator
    || signers[1] !== launch.accounts.mint
    || transfers.length !== 0) {
    fail("signer-or-transfer-policy");
  }
  const requiredAccounts = Object.freeze([
    Object.freeze({
      address: launch.accounts.creator,
      role: "creator",
      expectedOwner: SystemProgram.programId.toBase58(),
    }),
    Object.freeze({
      address: launch.accounts.platformId,
      role: "platform-config",
      expectedOwner: RAYDIUM_LAUNCHLAB_PROGRAM_ID,
    }),
  ]);
  return recursivelyFreeze({
    schemaVersion: "launchlab-preview-v1",
    canonicalBase64: input.serialized,
    transactionSha256: sha256(wire),
    version: transaction.message.version,
    recentBlockhash: transaction.message.recentBlockhash,
    lookupBarrierSlot: input.lookupBarrierSlot,
    feePayer: accountKeys[0],
    signers,
    programs: [...new Set(instructions.map((instruction) => instruction.programId))],
    transfers,
    launchInstructionIndex: launchInstructions[0].index,
    launch,
    accountKeys,
    instructions,
    requiredAccounts,
    requiredAccountAddresses: requiredAccounts.map((account) => account.address),
  });
}

function addCheck(checks, code, ok, reason = null) {
  checks.push(Object.freeze({
    code,
    ok: ok === true,
    ...(reason === null ? {} : { reason }),
  }));
}

function receiptAgeOk(checkedAt, evaluatedAt, maxAge) {
  if (!canonicalTimestamp(checkedAt) || !canonicalTimestamp(evaluatedAt)) return false;
  const age = Date.parse(evaluatedAt) - Date.parse(checkedAt);
  return age >= 0 && age <= maxAge;
}

function receiptBinding(receipt, maxAge) {
  try {
    if (!canonicalTimestamp(receipt.checkedAt)) return null;
    return Object.freeze({
      sha256: sha256(serializeMainnetSessionJson(receipt)),
      checkedAt: receipt.checkedAt,
      expiresAt: new Date(Date.parse(receipt.checkedAt) + maxAge).toISOString(),
    });
  } catch {
    return null;
  }
}

function originReceiptOk(receipt, evaluatedAt) {
  try {
    exactKeys(receipt, [
      "schemaVersion", "checkedAt", "uiUrl", "uiOrigin", "docsUrl", "docsSha256",
      "documentedProgramId", "pinnedProgramId", "checks", "ok",
    ], "origin-receipt");
    exactKeys(receipt.checks, [
      "officialUiOrigin", "officialDocumentation",
      "launchlabProgramDocumented", "pinnedProgramMatches",
    ], "origin-checks");
    const parsed = new URL(receipt.uiUrl);
    return receipt.schemaVersion === "official-raydium-origin-v1"
      && receipt.uiOrigin === "https://raydium.io"
      && parsed.origin === "https://raydium.io"
      && !parsed.username && !parsed.password && !parsed.hash
      && receipt.docsUrl === "https://docs.raydium.io/reference/program-addresses"
      && /^[0-9a-f]{64}$/u.test(receipt.docsSha256)
      && receipt.documentedProgramId === RAYDIUM_LAUNCHLAB_PROGRAM_ID
      && receipt.pinnedProgramId === RAYDIUM_LAUNCHLAB_PROGRAM_ID
      && Object.values(receipt.checks).every((value) => value === true)
      && receipt.ok === true
      && receiptAgeOk(receipt.checkedAt, evaluatedAt, ORIGIN_MAX_AGE_MS);
  } catch {
    return false;
  }
}

function walletReceiptOk(receipt, creator, evaluatedAt) {
  try {
    exactKeys(receipt, [
      "schemaVersion", "network", "creator", "genesisHash", "finalizedBalanceLamports",
      "requiredLamports", "finalizedSlot", "checkedAt", "rpcHost", "checks", "ok",
    ], "wallet-receipt");
    exactKeys(receipt.checks, [
      "mainnetGenesis", "creatorMatches", "finalizedBalance", "sufficientBalance",
    ], "wallet-checks");
    canonicalKey(receipt.creator, "wallet-creator");
    const balance = BigInt(receipt.finalizedBalanceLamports);
    return receipt.schemaVersion === "wallet-readiness-v1"
      && receipt.network === "mainnet-beta"
      && receipt.creator === creator
      && receipt.genesisHash === MAINNET_BETA_GENESIS_HASH
      && receipt.requiredLamports === String(REQUIRED_LAMPORTS)
      && balance >= BigInt(REQUIRED_LAMPORTS)
      && Number.isSafeInteger(receipt.finalizedSlot) && receipt.finalizedSlot >= 0
      && typeof receipt.rpcHost === "string" && receipt.rpcHost.length > 0
      && Object.values(receipt.checks).every((value) => value === true)
      && receipt.ok === true
      && receiptAgeOk(receipt.checkedAt, evaluatedAt, WALLET_MAX_AGE_MS);
  } catch {
    return false;
  }
}

function metadataEvidenceOk(manifest, readback) {
  try {
    assertMetadataManifestV1(manifest);
    assertMetadataReadbackV1({ manifest, readback });
    return true;
  } catch {
    return false;
  }
}

function stateEvidence(state, preview) {
  try {
    exactKeys(state, ["contextSlot", "accounts"], "state");
    safeInteger(state.contextSlot, "state-slot");
    if (!Array.isArray(state.accounts)
      || state.accounts.length !== preview.requiredAccounts.length) return null;
    for (let index = 0; index < state.accounts.length; index += 1) {
      const account = state.accounts[index];
      exactKeys(account, [
        "address", "role", "expectedOwner", "owner", "lamports",
        "dataBase64", "dataSha256", "contextSlot",
      ], "state-account");
      const required = preview.requiredAccounts[index];
      if (account.address !== required.address || account.role !== required.role
        || account.expectedOwner !== required.expectedOwner || account.owner !== required.expectedOwner
        || account.contextSlot !== state.contextSlot || !/^[0-9a-f]{64}$/u.test(account.dataSha256)) {
        return null;
      }
      const data = Buffer.from(account.dataBase64, "base64");
      if (data.toString("base64") !== account.dataBase64 || sha256(data) !== account.dataSha256
        || !/^(?:0|[1-9][0-9]*)$/u.test(account.lamports)) return null;
    }
    const platform = state.accounts.find((account) => account.role === "platform-config");
    const creator = state.accounts.find((account) => account.role === "creator");
    if (!platform || !creator) return null;
    const decodedPlatform = decodePlatformConfigAccount({
      address: platform.address,
      owner: platform.owner,
      data: Buffer.from(platform.dataBase64, "base64"),
    });
    return { platform: decodedPlatform, creator };
  } catch {
    return null;
  }
}

function simulationEvidence(simulation, preview, state, creator, metadataManifest) {
  try {
    exactKeys(simulation, [
      "context", "value", "checkedAt", "canonicalBase64", "replaceRecentBlockhash",
    ], "simulation");
    if (!canonicalTimestamp(simulation.checkedAt)
      || simulation.canonicalBase64 !== preview.canonicalBase64
      || simulation.replaceRecentBlockhash !== false
      || !simulation.context || !Number.isSafeInteger(simulation.context.slot)
      || simulation.context.slot < state.contextSlot
      || !simulation.value || simulation.value.err !== null
      || !Array.isArray(simulation.value.innerInstructions)
      || !Array.isArray(simulation.value.accounts)
      || simulation.value.accounts.length !== state.accounts.length
      || !Array.isArray(simulation.value.logs)
      || !simulation.value.logs.every((entry) => typeof entry === "string" && entry.length <= 1_000)
      || !Number.isSafeInteger(simulation.value.unitsConsumed)
      || simulation.value.unitsConsumed < 0
      || simulation.value.replacementBlockhash !== null) return null;
    const creatorIndex = state.accounts.findIndex((account) => account.role === "creator");
    if (creatorIndex < 0) return null;
    const postCreator = simulation.value.accounts[creatorIndex];
    if (!postCreator || postCreator.owner !== SystemProgram.programId.toBase58()
      || !Number.isSafeInteger(postCreator.lamports) || postCreator.lamports < 0) return null;
    const before = BigInt(state.accounts[creatorIndex].lamports);
    const after = BigInt(postCreator.lamports);
    if (after > before) return null;
    const creationDebitLamports = before - after;
    const innerGroup = simulation.value.innerInstructions.filter((group) => (
      group?.index === preview.launchInstructionIndex
    ));
    if (innerGroup.length !== 1 || !Array.isArray(innerGroup[0].instructions)) return null;
    const metadataInstructions = innerGroup[0].instructions.filter((instruction) => (
      Number.isInteger(instruction?.programIdIndex)
      && preview.accountKeys[instruction.programIdIndex] === METAPLEX_METADATA_PROGRAM_ID
    ));
    if (metadataInstructions.length !== 1) return null;
    const raw = metadataInstructions[0];
    if (raw.stackHeight !== 2 || !Array.isArray(raw.accounts)
      || !raw.accounts.every((index) => Number.isInteger(index) && preview.accountKeys[index])
      || typeof raw.data !== "string") return null;
    const metadataCpi = decodeCreateMetadataAccountV3({
      instructionData: decodeBase58(raw.data, { maxLength: 1_024, code: "metadata-cpi-data" }),
      accountKeys: raw.accounts.map((index) => preview.accountKeys[index]),
    });
    const data = metadataCpi.data;
    const accounts = metadataCpi.accounts;
    if (data.name !== metadataManifest.metadata.name
      || data.symbol !== metadataManifest.metadata.symbol
      || data.uri !== metadataManifest.metadata.uri
      || data.sellerFeeBasisPoints !== 0
      || data.creators !== null || data.collection !== null || data.uses !== null
      || data.isMutable !== false || data.collectionDetails !== null
      || accounts.metadata !== preview.launch.accounts.metadataAccount
      || accounts.mint !== preview.launch.accounts.mint
      || accounts.mintAuthority !== preview.launch.accounts.authority
      || accounts.payer !== creator || accounts.updateAuthority !== creator
      || accounts.systemProgram !== SystemProgram.programId.toBase58()) return null;
    return {
      creationDebitLamports,
      metadataCpi,
      simulationSlot: simulation.context.slot,
    };
  } catch {
    return null;
  }
}

function observedValues({ preview, platform, metadataReadback }) {
  return Object.freeze({
    launchlabProgramId: preview.launch.accounts.launchlabProgram,
    tokenProgramId: preview.launch.accounts.tokenProgramBase,
    quoteMint: preview.launch.accounts.quoteMint,
    supply: preview.launch.curve.supply.toString(),
    totalSell: preview.launch.curve.totalSell.toString(),
    totalFundraising: preview.launch.curve.totalFundraising.toString(),
    lockedAmount: preview.launch.vesting.lockedAmount.toString(),
    decimals: preview.launch.decimals,
    creatorFeeRateMillionths: platform.creatorFeeRate.toString(),
    protocolBuyFeeRateMillionths: platform.feeRate.toString(),
    protocolSellFeeRateMillionths: platform.feeRate.toString(),
    feeRateDenominator: FEE_RATE_DENOMINATOR,
    firstBuyInstructionCount: 0,
    creatorTokenCredit: "0",
    metadataUploadLamports: metadataReadback?.creatorPayment?.debitLamports ?? "invalid",
    maximumCreationDebitLamports: String(REQUIRED_LAMPORTS),
    cumulativeCreatorDebitCapLamports: String(REQUIRED_LAMPORTS),
    migrationType: preview.launch.curve.migrationType,
    platformScaleRaw: platform.platformScale.toString(),
    creatorScaleRaw: platform.creatorScale.toString(),
    burnScaleRaw: platform.burnScale.toString(),
  });
}

const TARGET = Object.freeze({
  launchlabProgramId: RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  tokenProgramId: CLASSIC_TOKEN_PROGRAM_ID,
  quoteMint: WRAPPED_SOL_MINT,
  supply: "1000000000000",
  totalSell: "800000000000",
  totalFundraising: "24000000000",
  lockedAmount: "0",
  decimals: 6,
  creatorFeeRateMillionths: "0",
  protocolBuyFeeRateMillionths: "10000",
  protocolSellFeeRateMillionths: "10000",
  feeRateDenominator: FEE_RATE_DENOMINATOR,
  firstBuyInstructionCount: 0,
  creatorTokenCredit: "0",
  metadataUploadLamports: "0",
  maximumCreationDebitLamports: String(REQUIRED_LAMPORTS),
  cumulativeCreatorDebitCapLamports: String(REQUIRED_LAMPORTS),
  migrationType: "cpmm",
  platformScaleRaw: "0",
  creatorScaleRaw: "0",
  burnScaleRaw: "1000000",
});

export function evaluateLaunchPreview(input) {
  exactKeys(input, [
    "preview", "state", "simulation", "metadataManifest", "metadataReadback",
    "officialOriginReceipt", "walletReadinessReceipt", "creator",
  ], "input");
  const checks = [];
  const creatorIsCanonical = (() => {
    try {
      canonicalKey(input.creator, "creator");
      return true;
    } catch {
      return false;
    }
  })();
  const identityOk = creatorIsCanonical
    && input.preview?.launch?.accounts?.creator === input.creator
    && input.preview?.launch?.accounts?.payer === input.creator
    && input.preview?.feePayer === input.creator
    && Array.isArray(input.preview?.signers)
    && input.preview.signers.length === 2
    && input.preview.signers[0] === input.creator
    && input.preview.signers[1] === input.preview.launch.accounts.mint;
  addCheck(checks, "selected-wallet-identity", identityOk);
  const metadataOk = metadataEvidenceOk(input.metadataManifest, input.metadataReadback);
  addCheck(checks, "metadata-readback", metadataOk);
  const evaluatedAt = input.simulation?.checkedAt;
  const originOk = originReceiptOk(input.officialOriginReceipt, evaluatedAt);
  addCheck(checks, "official-raydium-origin", originOk);
  const walletOk = walletReceiptOk(input.walletReadinessReceipt, input.creator, evaluatedAt);
  addCheck(checks, "wallet-readiness", walletOk);
  const state = stateEvidence(input.state, input.preview);
  const stateOk = state !== null
    && Number.isSafeInteger(input.walletReadinessReceipt?.finalizedSlot)
    && input.state.contextSlot >= input.walletReadinessReceipt.finalizedSlot
    && input.state.contextSlot >= input.preview.lookupBarrierSlot;
  addCheck(checks, "finalized-pre-state", stateOk);
  const simulation = stateOk && metadataOk && identityOk
    ? simulationEvidence(
      input.simulation,
      input.preview,
      input.state,
      input.creator,
      input.metadataManifest,
    )
    : null;
  const simulationOk = simulation !== null;
  addCheck(checks, "raw-simulation", simulationOk);
  const fallbackPlatform = {
    feeRate: "invalid",
    creatorFeeRate: "invalid",
    platformScale: "invalid",
    creatorScale: "invalid",
    burnScale: "invalid",
  };
  const observed = observedValues({
    preview: input.preview,
    platform: state?.platform ?? fallbackPlatform,
    metadataReadback: input.metadataReadback,
  });
  const policyOk = Object.keys(TARGET).every((key) => observed[key] === TARGET[key]);
  addCheck(checks, "exact-hakky-policy", policyOk);
  const debitOk = simulationOk
    && simulation.creationDebitLamports <= BigInt(REQUIRED_LAMPORTS)
    && BigInt(observed.metadataUploadLamports) + simulation.creationDebitLamports
      <= BigInt(REQUIRED_LAMPORTS);
  addCheck(checks, "creator-debit-cap", debitOk);
  let coverage = Object.freeze({
    ok: false,
    code: "source-coverage-query-rejected",
    reason: "decoded-policy-does-not-match-reviewed-hakky-query",
  });
  try {
    coverage = evaluateHakkyLaunchlabSourceCoverage({
      migrationType: observed.migrationType,
      platformScaleRaw: BigInt(observed.platformScaleRaw),
      creatorScaleRaw: BigInt(observed.creatorScaleRaw),
      burnScaleRaw: BigInt(observed.burnScaleRaw),
    });
  } catch {
    // The decoder supplied a policy outside the sole reviewed HAKKY query.
  }
  if (coverage === HAKKY_SOURCE_COVERAGE_VERIFIED) {
    addCheck(checks, coverage.code, true);
  } else {
    addCheck(checks, coverage.code, false, coverage.reason);
  }
  return recursivelyFreeze({
    schemaVersion: "launchlab-preview-evaluation-v1",
    transactionSha256: input.preview.transactionSha256,
    creator: input.creator,
    identities: {
      mint: input.preview?.launch?.accounts?.mint ?? null,
      launchId: input.preview?.launch?.accounts?.launchId ?? null,
    },
    observed,
    diagnostic: {
      creationDebitLamports: simulation?.creationDebitLamports?.toString() ?? null,
      cumulativeCreatorDebitLamports: simulation
        ? (simulation.creationDebitLamports + BigInt(observed.metadataUploadLamports)).toString()
        : null,
      protocolFeeRateMillionths: observed.protocolBuyFeeRateMillionths,
      simulationSlot: simulation?.simulationSlot ?? null,
    },
    approvalEvidence: {
      signers: Array.isArray(input.preview?.signers) ? [...input.preview.signers] : [],
      programs: Array.isArray(input.preview?.programs) ? [...input.preview.programs] : [],
      transfers: Array.isArray(input.preview?.transfers)
        ? input.preview.transfers.map((transfer) => ({ ...transfer }))
        : [],
      walletReadiness: walletOk ? {
        finalizedBalanceLamports: input.walletReadinessReceipt.finalizedBalanceLamports,
        finalizedSlot: input.walletReadinessReceipt.finalizedSlot,
      } : null,
      platformConfig: stateOk ? {
        address: state.platform.address,
        accountSha256: state.platform.accountSha256,
        finalizedSlot: input.state.contextSlot,
      } : null,
      receipts: {
        officialOrigin: originOk
          ? receiptBinding(input.officialOriginReceipt, ORIGIN_MAX_AGE_MS)
          : null,
        walletReadiness: walletOk
          ? receiptBinding(input.walletReadinessReceipt, WALLET_MAX_AGE_MS)
          : null,
      },
    },
    coverage,
    checks,
    ok: checks.every((check) => check.ok),
  });
}

function approvalEnvelopeFail(code) {
  throw new Error(`approval-envelope-${code}`);
}

function approvalEnvelopeKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) {
    approvalEnvelopeFail(code);
  }
}

export function assertApprovalEnvelopeV1(value) {
  approvalEnvelopeKeys(value, [
    "schemaVersion", "transactionSha256", "creator", "mint", "launchId",
    "selectedWallet", "signers", "programs", "transfers", "walletReadiness",
    "platformConfig", "cost", "fees", "migration", "receipts", "authorization",
  ], "root");
  try {
    canonicalKey(value.creator, "approval-envelope-creator");
    canonicalKey(value.mint, "approval-envelope-mint");
    canonicalKey(value.launchId, "approval-envelope-launch-id");
  } catch {
    approvalEnvelopeFail("identity");
  }
  if (value.schemaVersion !== "launchlab-approval-envelope-v1"
    || !/^[0-9a-f]{64}$/u.test(value.transactionSha256)
    || value.selectedWallet !== value.creator
    || new Set([value.creator, value.mint, value.launchId]).size !== 3
    || !Array.isArray(value.signers)
    || value.signers.length !== 2
    || value.signers[0] !== value.creator
    || value.signers[1] !== value.mint
    || !Array.isArray(value.programs)
    || value.programs.length === 0
    || !value.programs.includes(RAYDIUM_LAUNCHLAB_PROGRAM_ID)
    || new Set(value.programs).size !== value.programs.length
    || !Array.isArray(value.transfers)
    || value.transfers.length !== 0) {
    approvalEnvelopeFail("transaction");
  }
  try {
    for (const program of value.programs) canonicalKey(program, "approval-envelope-program");
  } catch {
    approvalEnvelopeFail("transaction");
  }

  approvalEnvelopeKeys(
    value.walletReadiness,
    ["finalizedBalanceLamports", "finalizedSlot"],
    "wallet",
  );
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value.walletReadiness.finalizedBalanceLamports)
    || BigInt(value.walletReadiness.finalizedBalanceLamports) < BigInt(REQUIRED_LAMPORTS)
    || !Number.isSafeInteger(value.walletReadiness.finalizedSlot)
    || value.walletReadiness.finalizedSlot < 0) {
    approvalEnvelopeFail("wallet");
  }

  approvalEnvelopeKeys(
    value.platformConfig,
    ["address", "accountSha256", "finalizedSlot"],
    "platform-config",
  );
  try {
    canonicalKey(value.platformConfig.address, "approval-envelope-platform-config");
  } catch {
    approvalEnvelopeFail("platform-config");
  }
  if (!/^[0-9a-f]{64}$/u.test(value.platformConfig.accountSha256)
    || !Number.isSafeInteger(value.platformConfig.finalizedSlot)
    || value.platformConfig.finalizedSlot < value.walletReadiness.finalizedSlot) {
    approvalEnvelopeFail("platform-config");
  }

  approvalEnvelopeKeys(value.cost, [
    "metadataUploadLamports", "maximumCreationDebitLamports",
    "cumulativeCreatorDebitCapLamports", "simulatedCreationDebitLamports",
    "simulatedCumulativeCreatorDebitLamports",
  ], "cost");
  const costValues = Object.values(value.cost);
  if (!costValues.every((entry) => /^(?:0|[1-9][0-9]*)$/u.test(entry))
    || value.cost.metadataUploadLamports !== "0"
    || value.cost.maximumCreationDebitLamports !== String(REQUIRED_LAMPORTS)
    || value.cost.cumulativeCreatorDebitCapLamports !== String(REQUIRED_LAMPORTS)
    || BigInt(value.cost.simulatedCumulativeCreatorDebitLamports)
      !== BigInt(value.cost.metadataUploadLamports)
        + BigInt(value.cost.simulatedCreationDebitLamports)
    || BigInt(value.cost.simulatedCreationDebitLamports) > BigInt(REQUIRED_LAMPORTS)
    || BigInt(value.cost.simulatedCumulativeCreatorDebitLamports) > BigInt(REQUIRED_LAMPORTS)) {
    approvalEnvelopeFail("cost");
  }

  approvalEnvelopeKeys(value.fees, [
    "protocolBuyFeeRateMillionths", "protocolSellFeeRateMillionths",
    "feeRateDenominator", "creatorTradingFeeRateMillionths", "creatorFeeRights",
  ], "fees");
  if (value.fees.protocolBuyFeeRateMillionths !== TARGET.protocolBuyFeeRateMillionths
    || value.fees.protocolSellFeeRateMillionths !== TARGET.protocolSellFeeRateMillionths
    || value.fees.feeRateDenominator !== TARGET.feeRateDenominator
    || value.fees.creatorTradingFeeRateMillionths !== TARGET.creatorFeeRateMillionths
    || value.fees.creatorFeeRights !== false) {
    approvalEnvelopeFail("fees");
  }

  approvalEnvelopeKeys(value.migration, [
    "type", "lpPolicy", "platformLpBps", "creatorLpBps", "irreversibleLpBps",
    "platformFeeKey", "creatorFeeKey", "withdrawalRights", "feeRecipients",
  ], "migration");
  if (value.migration.type !== TARGET.migrationType
    || JSON.stringify({
      lpPolicy: value.migration.lpPolicy,
      platformLpBps: value.migration.platformLpBps,
      creatorLpBps: value.migration.creatorLpBps,
      irreversibleLpBps: value.migration.irreversibleLpBps,
      platformFeeKey: value.migration.platformFeeKey,
      creatorFeeKey: value.migration.creatorFeeKey,
      withdrawalRights: value.migration.withdrawalRights,
      feeRecipients: value.migration.feeRecipients,
    }) !== JSON.stringify(HAKKY_SOURCE_COVERAGE_VERIFIED.disposition)) {
    approvalEnvelopeFail("migration");
  }

  approvalEnvelopeKeys(value.receipts, ["officialOrigin", "walletReadiness"], "receipts");
  for (const [label, receipt] of Object.entries(value.receipts)) {
    approvalEnvelopeKeys(receipt, ["sha256", "checkedAt", "expiresAt"], `${label}-receipt`);
    if (!/^[0-9a-f]{64}$/u.test(receipt.sha256)
      || !canonicalTimestamp(receipt.checkedAt)
      || !canonicalTimestamp(receipt.expiresAt)
      || Date.parse(receipt.expiresAt) <= Date.parse(receipt.checkedAt)) {
      approvalEnvelopeFail(`${label}-receipt`);
    }
  }
  const expectedAuthorization = `Authorize only serialized transaction SHA-256 ${value.transactionSha256} with maximum creation debit ${value.cost.maximumCreationDebitLamports} lamports.`;
  if (value.authorization !== expectedAuthorization) approvalEnvelopeFail("authorization");
  return value;
}

export function buildApprovalEnvelope(evaluation) {
  if (!evaluation || evaluation.ok !== true) {
    const coverageCode = evaluation?.coverage?.code ?? "evaluation-not-approved";
    fail(coverageCode);
  }
  exactKeys(evaluation, [
    "schemaVersion", "transactionSha256", "creator", "identities", "observed", "diagnostic",
    "approvalEvidence", "coverage", "checks", "ok",
  ], "approval-evaluation-shape");
  if (evaluation.schemaVersion !== "launchlab-preview-evaluation-v1"
    || !/^[0-9a-f]{64}$/u.test(evaluation.transactionSha256)
    || canonicalKey(evaluation.creator, "approval-creator") !== evaluation.creator
    || !evaluation.identities
    || canonicalKey(evaluation.identities.mint, "approval-mint") !== evaluation.identities.mint
    || canonicalKey(evaluation.identities.launchId, "approval-launch-id")
      !== evaluation.identities.launchId
    || JSON.stringify(evaluation.observed) !== JSON.stringify(TARGET)
    || JSON.stringify(evaluation.coverage) !== JSON.stringify(HAKKY_SOURCE_COVERAGE_VERIFIED)
    || !Array.isArray(evaluation.checks)
    || evaluation.checks.length === 0
    || !evaluation.checks.every((entry) => entry?.ok === true)
    || !evaluation.checks.some((entry) => entry.code === HAKKY_SOURCE_COVERAGE_VERIFIED.code)) {
    fail("approval-evaluation");
  }
  exactKeys(evaluation.diagnostic, [
    "creationDebitLamports", "cumulativeCreatorDebitLamports",
    "protocolFeeRateMillionths", "simulationSlot",
  ], "approval-diagnostic");
  if (!/^(?:0|[1-9][0-9]*)$/u.test(evaluation.diagnostic.creationDebitLamports)
    || !/^(?:0|[1-9][0-9]*)$/u.test(evaluation.diagnostic.cumulativeCreatorDebitLamports)
    || evaluation.diagnostic.protocolFeeRateMillionths
      !== evaluation.observed.protocolBuyFeeRateMillionths
    || !Number.isSafeInteger(evaluation.diagnostic.simulationSlot)
    || BigInt(evaluation.diagnostic.creationDebitLamports)
      > BigInt(evaluation.observed.maximumCreationDebitLamports)
    || BigInt(evaluation.diagnostic.cumulativeCreatorDebitLamports)
      > BigInt(evaluation.observed.cumulativeCreatorDebitCapLamports)) {
    fail("approval-diagnostic");
  }
  exactKeys(evaluation.approvalEvidence, [
    "signers", "programs", "transfers", "walletReadiness", "platformConfig", "receipts",
  ], "approval-evidence");
  const {
    signers,
    programs,
    transfers,
    walletReadiness,
    platformConfig,
    receipts,
  } = evaluation.approvalEvidence;
  if (!Array.isArray(signers) || signers.length !== 2
    || signers[0] !== evaluation.creator
    || signers[1] !== evaluation.identities.mint
    || !signers.every((value) => canonicalKey(value, "approval-signer") === value)
    || !Array.isArray(programs) || programs.length === 0
    || !programs.every((value) => canonicalKey(value, "approval-program") === value)
    || !Array.isArray(transfers) || transfers.length !== 0) {
    fail("approval-transaction-evidence");
  }
  exactKeys(walletReadiness, [
    "finalizedBalanceLamports", "finalizedSlot",
  ], "approval-wallet");
  if (!/^(?:0|[1-9][0-9]*)$/u.test(walletReadiness.finalizedBalanceLamports)
    || BigInt(walletReadiness.finalizedBalanceLamports) < BigInt(REQUIRED_LAMPORTS)
    || !Number.isSafeInteger(walletReadiness.finalizedSlot)
    || walletReadiness.finalizedSlot < 0) {
    fail("approval-wallet");
  }
  exactKeys(platformConfig, [
    "address", "accountSha256", "finalizedSlot",
  ], "approval-platform-config");
  if (canonicalKey(platformConfig.address, "approval-platform-config")
      !== platformConfig.address
    || !/^[0-9a-f]{64}$/u.test(platformConfig.accountSha256)
    || !Number.isSafeInteger(platformConfig.finalizedSlot)
    || platformConfig.finalizedSlot < walletReadiness.finalizedSlot) {
    fail("approval-platform-config");
  }
  exactKeys(receipts, ["officialOrigin", "walletReadiness"], "approval-receipts");
  for (const [label, receipt] of Object.entries(receipts)) {
    exactKeys(receipt, ["sha256", "checkedAt", "expiresAt"], `approval-${label}-receipt`);
    if (!/^[0-9a-f]{64}$/u.test(receipt.sha256)
      || !canonicalTimestamp(receipt.checkedAt)
      || !canonicalTimestamp(receipt.expiresAt)
      || Date.parse(receipt.expiresAt) <= Date.parse(receipt.checkedAt)) {
      fail(`approval-${label}-receipt`);
    }
  }
  const disposition = evaluation.coverage.disposition;
  const envelope = {
    schemaVersion: "launchlab-approval-envelope-v1",
    transactionSha256: evaluation.transactionSha256,
    creator: evaluation.creator,
    mint: evaluation.identities.mint,
    launchId: evaluation.identities.launchId,
    selectedWallet: evaluation.creator,
    signers: [...signers],
    programs: [...programs],
    transfers: [],
    walletReadiness: { ...walletReadiness },
    platformConfig: { ...platformConfig },
    cost: {
      metadataUploadLamports: evaluation.observed.metadataUploadLamports,
      maximumCreationDebitLamports: evaluation.observed.maximumCreationDebitLamports,
      cumulativeCreatorDebitCapLamports: evaluation.observed.cumulativeCreatorDebitCapLamports,
      simulatedCreationDebitLamports: evaluation.diagnostic.creationDebitLamports,
      simulatedCumulativeCreatorDebitLamports:
        evaluation.diagnostic.cumulativeCreatorDebitLamports,
    },
    fees: {
      protocolBuyFeeRateMillionths: evaluation.observed.protocolBuyFeeRateMillionths,
      protocolSellFeeRateMillionths: evaluation.observed.protocolSellFeeRateMillionths,
      feeRateDenominator: evaluation.observed.feeRateDenominator,
      creatorTradingFeeRateMillionths: evaluation.observed.creatorFeeRateMillionths,
      creatorFeeRights: false,
    },
    migration: {
      type: evaluation.observed.migrationType,
      ...disposition,
    },
    receipts: {
      officialOrigin: { ...receipts.officialOrigin },
      walletReadiness: { ...receipts.walletReadiness },
    },
    authorization: `Authorize only serialized transaction SHA-256 ${evaluation.transactionSha256} with maximum creation debit ${evaluation.observed.maximumCreationDebitLamports} lamports.`,
  };
  assertApprovalEnvelopeV1(envelope);
  return recursivelyFreeze(envelope);
}
