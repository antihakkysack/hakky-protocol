import { constants as fsConstants } from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  realpath,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AuthorityType,
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  transfer,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export const DEVNET_RPC_URL = "https://api.devnet.solana.com";
export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const FULL_SUPPLY = 1_000_000_000_000n;
export const EXTERNAL_FUNDING_MINIMUM_LAMPORTS = 2_000_000_000n;

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN_PROGRAM_ADDRESS = TOKEN_PROGRAM_ID.toBase58();
const CONFIRM_OPTIONS = {
  commitment: "finalized",
  preflightCommitment: "finalized",
  maxRetries: 5,
};
const DEFAULT_OPERATIONS = {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  transfer,
};
const DEFAULT_FILE_SYSTEM = { link, lstat, mkdir, open, realpath, unlink };
const CHECK_IDS = [
  "devnet-genesis",
  "classic-token-program",
  "canonical-identities",
  "fixed-supply",
  "six-decimals",
  "mint-authority-revoked",
  "freeze-authority-none",
  "payer-token-balance-zero",
  "vault-token-balance-full",
  "finalized-observation",
];

function stageError(code) {
  return new Error(code);
}

function isFunction(value) {
  return typeof value === "function";
}

function assertFunction(value) {
  if (!isFunction(value)) throw stageError("OPTION_ERROR");
}

function assertPositiveSafeInteger(value, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw stageError("OPTION_ERROR");
  }
}

function assertNonnegativeSafeInteger(value, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw stageError("OPTION_ERROR");
  }
}

function assertExactKeys(value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isCanonicalPublicKey(value) {
  if (typeof value !== "string") return false;
  try {
    return new PublicKey(value).toBase58() === value;
  } catch {
    return false;
  }
}

function isUtcMillisecondTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function publicStage(error, fallback) {
  const safe = new Set([
    "OPTION_ERROR",
    "CLEANUP_ERROR",
    "IDENTITY_ERROR",
    "FUNDING_ERROR",
    "CONFIRMATION_ERROR",
    "TOKEN_OPERATION_ERROR",
    "EVIDENCE_ERROR",
    "PUBLICATION_ERROR",
    "PUBLICATION_CONFLICT",
    "DEADLINE_TIMEOUT",
    "DEADLINE_OPERATION_FAILED",
  ]);
  return error instanceof Error && safe.has(error.message)
    ? stageError(error.message)
    : stageError(fallback);
}

export function parseRehearsalOptions(argv) {
  if (!Array.isArray(argv)) {
    throw new Error("Usage: npm run rehearsal:devnet -- [--external-funding]");
  }
  if (argv.length === 0) return { fundingMode: "faucet" };
  if (argv.length === 1 && argv[0] === "--external-funding") {
    return { fundingMode: "external" };
  }
  throw new Error("Usage: npm run rehearsal:devnet -- [--external-funding]");
}

export async function withDeadline(operationFactory, remainingMs) {
  assertFunction(operationFactory);
  assertPositiveSafeInteger(remainingMs);
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => operationFactory(controller.signal)).catch(() => {
        throw stageError("DEADLINE_OPERATION_FAILED");
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(stageError("DEADLINE_TIMEOUT"));
          controller.abort();
        }, remainingMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function abortableSleep(duration, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(stageError("DEADLINE_TIMEOUT"));
      return;
    }
    let timer;
    const onAbort = () => {
      if (timer !== undefined) clearTimeout(timer);
      reject(stageError("DEADLINE_TIMEOUT"));
    };
    timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, duration);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function waitUntilScheduled({ scheduledAt, deadline, monotonicNow, sleepImpl, deadlineImpl }) {
  const now = monotonicNow();
  if (!Number.isFinite(now) || now >= deadline) throw stageError("DEADLINE_TIMEOUT");
  const delay = Math.max(0, scheduledAt - now);
  if (delay === 0) return;
  const remaining = Math.floor(deadline - now);
  if (remaining <= 0) throw stageError("DEADLINE_TIMEOUT");
  await deadlineImpl((signal) => sleepImpl(delay, signal), remaining);
}

export async function waitForExternalFunding({
  connection,
  address,
  minimumLamports,
  maxAttempts = 120,
  delayMs = 5_000,
  maxWaitMs = 600_000,
  monotonicNow = () => performance.now(),
  sleepImpl = abortableSleep,
  withDeadline: deadlineImpl = withDeadline,
}) {
  if (!connection || typeof connection !== "object" || !isFunction(connection.getBalance)) {
    throw stageError("OPTION_ERROR");
  }
  if (!(address instanceof PublicKey)) throw stageError("OPTION_ERROR");
  if (typeof minimumLamports !== "bigint" || minimumLamports <= 0n) {
    throw stageError("OPTION_ERROR");
  }
  assertPositiveSafeInteger(maxAttempts, 120);
  assertNonnegativeSafeInteger(delayMs, 5_000);
  assertPositiveSafeInteger(maxWaitMs, 600_000);
  assertFunction(monotonicNow);
  assertFunction(sleepImpl);
  assertFunction(deadlineImpl);

  const start = monotonicNow();
  if (!Number.isFinite(start)) throw stageError("FUNDING_ERROR");
  const deadline = start + maxWaitMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await waitUntilScheduled({
        scheduledAt: start + ((attempt - 1) * delayMs),
        deadline,
        monotonicNow,
        sleepImpl,
        deadlineImpl,
      });
      const now = monotonicNow();
      const remaining = Math.floor(deadline - now);
      if (!Number.isFinite(now) || remaining <= 0) throw stageError("DEADLINE_TIMEOUT");
      const balance = await deadlineImpl(
        () => connection.getBalance(address, "finalized"),
        remaining,
      );
      const observedAt = monotonicNow();
      if (!Number.isFinite(observedAt) || observedAt >= deadline) continue;
      if (Number.isSafeInteger(balance) && balance >= 0 && BigInt(balance) >= minimumLamports) {
        return BigInt(balance);
      }
    } catch {
      // A low balance or transient failure consumes exactly one attempt.
    }
  }
  throw stageError("FUNDING_ERROR");
}

async function runBoundedStage({
  operation,
  accept,
  maxAttempts,
  delayMs,
  maxWaitMs,
  monotonicNow,
  sleepImpl,
  deadlineImpl,
  failureCode,
}) {
  const start = monotonicNow();
  if (!Number.isFinite(start)) throw stageError(failureCode);
  const deadline = start + maxWaitMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await waitUntilScheduled({
        scheduledAt: start + ((attempt - 1) * delayMs),
        deadline,
        monotonicNow,
        sleepImpl,
        deadlineImpl,
      });
      const remaining = Math.floor(deadline - monotonicNow());
      if (remaining <= 0) throw stageError("DEADLINE_TIMEOUT");
      const result = await deadlineImpl(operation, remaining);
      const observedAt = monotonicNow();
      if (!Number.isFinite(observedAt) || observedAt >= deadline) continue;
      if (!accept || accept(result)) return result;
    } catch (error) {
      if (error instanceof Error && error.message === failureCode) throw stageError(failureCode);
      // Every dependency failure consumes exactly one attempt and is sanitized below.
    }
  }
  throw stageError(failureCode);
}

export async function confirmSignature(
  connection,
  signature,
  {
    maxAttempts = 120,
    delayMs = 1_000,
    maxWaitMs = 120_000,
    monotonicNow = () => performance.now(),
    sleepImpl = abortableSleep,
    withDeadline: deadlineImpl = withDeadline,
  } = {},
) {
  if (!connection || !isFunction(connection.getSignatureStatuses) || typeof signature !== "string" || signature.length === 0) {
    throw stageError("OPTION_ERROR");
  }
  assertPositiveSafeInteger(maxAttempts, 120);
  assertNonnegativeSafeInteger(delayMs, 1_000);
  assertPositiveSafeInteger(maxWaitMs, 120_000);
  assertFunction(monotonicNow);
  assertFunction(sleepImpl);
  assertFunction(deadlineImpl);

  const status = await runBoundedStage({
    operation: () => connection.getSignatureStatuses([signature], { searchTransactionHistory: true }),
    accept(response) {
      const candidate = response?.value?.[0];
      if (candidate?.err) throw stageError("CONFIRMATION_ERROR");
      return candidate?.confirmationStatus === "finalized";
    },
    maxAttempts,
    delayMs,
    maxWaitMs,
    monotonicNow,
    sleepImpl,
    deadlineImpl,
    failureCode: "CONFIRMATION_ERROR",
  });
  return status.value[0];
}

function sumBalances(accounts, owner, mintAddress, seen) {
  let total = 0n;
  for (const entry of accounts) {
    const address = entry.pubkey instanceof PublicKey ? entry.pubkey : new PublicKey(entry.pubkey);
    const canonicalAddress = address.toBase58();
    if (seen.has(canonicalAddress)) throw stageError("EVIDENCE_ERROR");
    seen.add(canonicalAddress);
    if (!entry.account || !entry.account.owner?.equals?.(TOKEN_PROGRAM_ID)) {
      throw stageError("EVIDENCE_ERROR");
    }
    let decoded;
    try {
      decoded = unpackAccount(address, entry.account, TOKEN_PROGRAM_ID);
    } catch {
      throw stageError("EVIDENCE_ERROR");
    }
    if (!decoded.isInitialized || decoded.isFrozen || !decoded.owner.equals(owner)) {
      throw stageError("EVIDENCE_ERROR");
    }
    if (!decoded.mint.equals(mintAddress)) continue;
    total += decoded.amount;
  }
  return total;
}

function assertContext(response, barrierSlot) {
  if (!response || !response.context || !Number.isSafeInteger(response.context.slot) || response.context.slot < barrierSlot) {
    throw stageError("EVIDENCE_ERROR");
  }
}

export async function fetchDevnetRehearsalEvidence({
  connection,
  genesisHash,
  mintAddress,
  payerAddress,
  vaultOwnerAddress,
  checkedAt = () => new Date().toISOString(),
}) {
  if (!connection || !isFunction(connection.getSlot)
    || !isFunction(connection.getAccountInfoAndContext)
    || !isFunction(connection.getTokenAccountsByOwner)
    || !isFunction(checkedAt)) {
    throw stageError("EVIDENCE_ERROR");
  }
  let mintKey;
  let payerKey;
  let vaultOwnerKey;
  try {
    mintKey = new PublicKey(mintAddress);
    payerKey = new PublicKey(payerAddress);
    vaultOwnerKey = new PublicKey(vaultOwnerAddress);
  } catch {
    throw stageError("EVIDENCE_ERROR");
  }

  try {
    const barrierSlot = await connection.getSlot("finalized");
    if (!Number.isSafeInteger(barrierSlot) || barrierSlot < 0) throw stageError("EVIDENCE_ERROR");
    const config = { commitment: "finalized", minContextSlot: barrierSlot };
    const mintResponse = await connection.getAccountInfoAndContext(mintKey, config);
    const payerResponse = await connection.getTokenAccountsByOwner(
      payerKey,
      { programId: TOKEN_PROGRAM_ID },
      config,
    );
    const vaultResponse = await connection.getTokenAccountsByOwner(
      vaultOwnerKey,
      { programId: TOKEN_PROGRAM_ID },
      config,
    );
    assertContext(mintResponse, barrierSlot);
    assertContext(payerResponse, barrierSlot);
    assertContext(vaultResponse, barrierSlot);
    if (!mintResponse.value || !mintResponse.value.owner?.equals?.(TOKEN_PROGRAM_ID)) {
      throw stageError("EVIDENCE_ERROR");
    }
    const decodedMint = unpackMint(mintKey, mintResponse.value, TOKEN_PROGRAM_ID);
    if (!decodedMint.isInitialized) throw stageError("EVIDENCE_ERROR");
    if (!Array.isArray(payerResponse.value) || !Array.isArray(vaultResponse.value)) {
      throw stageError("EVIDENCE_ERROR");
    }
    const seen = new Set();
    const timestamp = checkedAt();
    return {
      cluster: "devnet",
      genesisHash,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      mint: mintKey.toBase58(),
      payer: payerKey.toBase58(),
      vaultOwner: vaultOwnerKey.toBase58(),
      supplyBaseUnits: decodedMint.supply.toString(),
      decimals: decodedMint.decimals,
      mintAuthority: decodedMint.mintAuthority?.toBase58() ?? null,
      freezeAuthority: decodedMint.freezeAuthority?.toBase58() ?? null,
      payerTokenBalanceBaseUnits: sumBalances(payerResponse.value, payerKey, mintKey, seen).toString(),
      vaultTokenBalanceBaseUnits: sumBalances(vaultResponse.value, vaultOwnerKey, mintKey, seen).toString(),
      observation: {
        commitment: "finalized",
        slot: Math.min(mintResponse.context.slot, payerResponse.context.slot, vaultResponse.context.slot),
        checkedAt: timestamp,
      },
    };
  } catch (error) {
    throw publicStage(error, "EVIDENCE_ERROR");
  }
}

export function evaluateDevnetRehearsalEvidence(evidence) {
  const evidenceKeys = [
    "cluster", "genesisHash", "tokenProgram", "mint", "payer", "vaultOwner",
    "supplyBaseUnits", "decimals", "mintAuthority", "freezeAuthority",
    "payerTokenBalanceBaseUnits", "vaultTokenBalanceBaseUnits", "observation",
  ];
  if (!assertExactKeys(evidence, evidenceKeys)
    || !assertExactKeys(evidence.observation, ["commitment", "slot", "checkedAt"])) {
    throw stageError("EVIDENCE_ERROR");
  }
  const identitiesCanonical = [evidence.mint, evidence.payer, evidence.vaultOwner]
    .every(isCanonicalPublicKey);
  const checkValues = [
    evidence.cluster === "devnet" && evidence.genesisHash === DEVNET_GENESIS_HASH,
    evidence.tokenProgram === TOKEN_PROGRAM_ADDRESS,
    identitiesCanonical,
    evidence.supplyBaseUnits === FULL_SUPPLY.toString(),
    evidence.decimals === 6,
    evidence.mintAuthority === null,
    evidence.freezeAuthority === null,
    evidence.payerTokenBalanceBaseUnits === "0",
    evidence.vaultTokenBalanceBaseUnits === FULL_SUPPLY.toString(),
    evidence.observation.commitment === "finalized"
      && Number.isSafeInteger(evidence.observation.slot)
      && evidence.observation.slot >= 0
      && isUtcMillisecondTimestamp(evidence.observation.checkedAt),
  ];
  const checks = CHECK_IDS.map((id, index) => ({ id, ok: checkValues[index] === true }));
  return {
    schemaVersion: "devnet-rehearsal-v2",
    cluster: "devnet",
    checkedAt: evidence.observation.checkedAt,
    identities: {
      mint: evidence.mint,
      payer: evidence.payer,
      vaultOwner: evidence.vaultOwner,
      tokenProgram: evidence.tokenProgram,
    },
    supply: { baseUnits: evidence.supplyBaseUnits, decimals: evidence.decimals },
    authorities: {
      mintAuthority: evidence.mintAuthority,
      freezeAuthority: evidence.freezeAuthority,
    },
    balances: {
      payerBaseUnits: evidence.payerTokenBalanceBaseUnits,
      vaultBaseUnits: evidence.vaultTokenBalanceBaseUnits,
    },
    observation: {
      genesisHash: evidence.genesisHash,
      commitment: evidence.observation.commitment,
      slot: evidence.observation.slot,
      checkedAt: evidence.observation.checkedAt,
    },
    checks,
    ok: checks.every((check) => check.ok === true),
  };
}

export function assertDevnetRehearsalProofV2(proof) {
  const fail = () => { throw stageError("EVIDENCE_ERROR"); };
  if (!assertExactKeys(proof, [
    "schemaVersion", "cluster", "checkedAt", "identities", "supply", "authorities",
    "balances", "observation", "checks", "ok",
  ])) fail();
  if (!assertExactKeys(proof.identities, ["mint", "payer", "vaultOwner", "tokenProgram"])) fail();
  if (!assertExactKeys(proof.supply, ["baseUnits", "decimals"])) fail();
  if (!assertExactKeys(proof.authorities, ["mintAuthority", "freezeAuthority"])) fail();
  if (!assertExactKeys(proof.balances, ["payerBaseUnits", "vaultBaseUnits"])) fail();
  if (!assertExactKeys(proof.observation, ["genesisHash", "commitment", "slot", "checkedAt"])) fail();
  if (proof.schemaVersion !== "devnet-rehearsal-v2" || proof.cluster !== "devnet" || proof.ok !== true) fail();
  if (!isUtcMillisecondTimestamp(proof.checkedAt) || proof.checkedAt !== proof.observation.checkedAt) fail();
  if (!isCanonicalPublicKey(proof.identities.mint)
    || !isCanonicalPublicKey(proof.identities.payer)
    || !isCanonicalPublicKey(proof.identities.vaultOwner)
    || proof.identities.tokenProgram !== TOKEN_PROGRAM_ADDRESS) fail();
  if (proof.supply.baseUnits !== FULL_SUPPLY.toString() || proof.supply.decimals !== 6) fail();
  if (proof.authorities.mintAuthority !== null || proof.authorities.freezeAuthority !== null) fail();
  if (proof.balances.payerBaseUnits !== "0" || proof.balances.vaultBaseUnits !== FULL_SUPPLY.toString()) fail();
  if (proof.observation.genesisHash !== DEVNET_GENESIS_HASH
    || proof.observation.commitment !== "finalized"
    || !Number.isSafeInteger(proof.observation.slot)
    || proof.observation.slot < 0) fail();
  if (!Array.isArray(proof.checks) || proof.checks.length !== CHECK_IDS.length) fail();
  proof.checks.forEach((check, index) => {
    if (!assertExactKeys(check, ["id", "ok"]) || check.id !== CHECK_IDS[index] || check.ok !== true) fail();
  });
  return proof;
}

function sameFilesystemPath(actual, expected) {
  const normalize = (value) => {
    const normalized = path.normalize(path.resolve(value));
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  };
  return normalize(actual) === normalize(expected);
}

function isUnsafeFilesystemObject(stats) {
  return !stats
    || stats.isSymbolicLink()
    || (isFunction(stats.isReparsePoint) && stats.isReparsePoint());
}

async function assertExactDirectory(candidate, fileSystem, failureCode = "PUBLICATION_ERROR") {
  const stats = await fileSystem.lstat(candidate);
  if (isUnsafeFilesystemObject(stats) || !stats.isDirectory()) throw stageError(failureCode);
  const resolved = await fileSystem.realpath(candidate);
  if (!sameFilesystemPath(resolved, candidate)) throw stageError(failureCode);
}

async function assertExactFile(candidate, fileSystem) {
  const stats = await fileSystem.lstat(candidate);
  if (isUnsafeFilesystemObject(stats) || !stats.isFile()) throw stageError("PUBLICATION_ERROR");
  const resolved = await fileSystem.realpath(candidate);
  if (!sameFilesystemPath(resolved, candidate)) throw stageError("PUBLICATION_ERROR");
}

async function assertLeafAbsent(candidate, fileSystem) {
  try {
    await fileSystem.lstat(candidate);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw stageError("PUBLICATION_ERROR");
  }
  throw stageError("PUBLICATION_CONFLICT");
}

async function assertPublicationParents({ outputRoot, artifactDirectory, fileSystem }) {
  const root = path.resolve(outputRoot);
  const artifactsRoot = path.join(root, "artifacts");
  if (path.dirname(artifactDirectory) !== artifactsRoot) throw stageError("PUBLICATION_ERROR");
  await assertExactDirectory(root, fileSystem);
  await assertExactDirectory(artifactsRoot, fileSystem);
  await assertExactDirectory(artifactDirectory, fileSystem);
}

async function validateArtifactRoot(outputRoot, fileSystem) {
  if (typeof outputRoot !== "string" || outputRoot.length === 0 || !path.isAbsolute(outputRoot)) {
    throw stageError("OPTION_ERROR");
  }
  try {
    const root = path.resolve(outputRoot);
    await assertExactDirectory(root, fileSystem, "CLEANUP_ERROR");
    const artifactsRoot = path.join(root, "artifacts");
    try {
      await fileSystem.mkdir(artifactsRoot);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    const artifactDirectory = path.join(artifactsRoot, "devnet-rehearsal");
    await assertExactDirectory(artifactsRoot, fileSystem, "CLEANUP_ERROR");
    try {
      await fileSystem.mkdir(artifactDirectory);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    await assertExactDirectory(artifactDirectory, fileSystem, "CLEANUP_ERROR");
    return { artifactDirectory, proofPath: path.join(artifactDirectory, "proof.json") };
  } catch (error) {
    throw publicStage(error, "CLEANUP_ERROR");
  }
}

async function removeStaleProof(proofPath, fileSystem) {
  try {
    await fileSystem.unlink(proofPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw stageError("CLEANUP_ERROR");
  }
}

async function cleanupOwnedTemp(tempPath, fileSystem) {
  try {
    await fileSystem.unlink(tempPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function publishProof({
  proof,
  outputRoot,
  artifactDirectory,
  proofPath,
  fileSystem,
  onPublicationWarning,
}) {
  const tempSuffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tempPath = path.join(artifactDirectory, `.proof-${tempSuffix}.tmp`);
  const bytes = `${JSON.stringify(proof, null, 2)}\n`;
  let handle;
  let committed = false;
  let linking = false;
  try {
    await assertPublicationParents({ outputRoot, artifactDirectory, fileSystem });
    await assertLeafAbsent(proofPath, fileSystem);
    handle = await fileSystem.open(tempPath, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL, 0o600);
    await handle.writeFile(bytes, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await assertPublicationParents({ outputRoot, artifactDirectory, fileSystem });
    await assertExactFile(tempPath, fileSystem);
    await assertLeafAbsent(proofPath, fileSystem);
    linking = true;
    await fileSystem.link(tempPath, proofPath);
    committed = true;
    await assertPublicationParents({ outputRoot, artifactDirectory, fileSystem });
    await assertExactFile(tempPath, fileSystem);
    await assertExactFile(proofPath, fileSystem);
  } catch (error) {
    try {
      if (handle) await handle.close();
      if (!committed) {
        await assertPublicationParents({ outputRoot, artifactDirectory, fileSystem });
        await assertExactFile(tempPath, fileSystem);
        await cleanupOwnedTemp(tempPath, fileSystem);
      }
    } catch {
      // The public failure remains fixed and never includes dependency text.
    }
    if ((linking && error?.code === "EEXIST") || error?.message === "PUBLICATION_CONFLICT") {
      throw stageError("PUBLICATION_CONFLICT");
    }
    throw stageError("PUBLICATION_ERROR");
  }
  let tempUnlinkFailed = false;
  try {
    await cleanupOwnedTemp(tempPath, fileSystem);
  } catch {
    tempUnlinkFailed = true;
  }
  try {
    await assertPublicationParents({ outputRoot, artifactDirectory, fileSystem });
    await assertExactFile(proofPath, fileSystem);
    if (tempUnlinkFailed) await assertExactFile(tempPath, fileSystem);
    else await assertLeafAbsent(tempPath, fileSystem);
  } catch {
    throw stageError("PUBLICATION_ERROR");
  }
  if (committed && tempUnlinkFailed) {
    try {
      await onPublicationWarning("TEMP_UNLINK_FAILED");
    } catch {
      process.stderr.write("Devnet rehearsal warning: TEMP_UNLINK_FAILED\n");
    }
  }
}

function validateRunnerOptions(options) {
  const {
    fundingMode,
    connection,
    createConnection,
    generateKeypair,
    onExternalAddress,
    onPublicationWarning,
    operations,
    fetchEvidence,
    checkedAt,
    monotonicNow,
    sleepImpl,
    deadlineImpl,
    fileSystem,
    identityMaxAttempts,
    identityDelayMs,
    identityMaxWaitMs,
    faucetMaxAttempts,
    faucetDelayMs,
    faucetMaxWaitMs,
    fundingMaxAttempts,
    fundingDelayMs,
    fundingMaxWaitMs,
    confirmationMaxAttempts,
    confirmationDelayMs,
    confirmationMaxWaitMs,
  } = options;
  if (fundingMode !== "faucet" && fundingMode !== "external") throw stageError("OPTION_ERROR");
  if (connection !== undefined) {
    if (connection === null || typeof connection !== "object" || !isFunction(connection.getGenesisHash)) {
      throw stageError("OPTION_ERROR");
    }
    if (fundingMode === "external" && !isFunction(connection.getBalance)) {
      throw stageError("OPTION_ERROR");
    }
    if (fundingMode === "faucet"
      && (!isFunction(connection.requestAirdrop) || !isFunction(connection.getSignatureStatuses))) {
      throw stageError("OPTION_ERROR");
    }
  }
  for (const dependency of [createConnection, generateKeypair, onPublicationWarning, fetchEvidence, checkedAt, monotonicNow, sleepImpl, deadlineImpl]) {
    assertFunction(dependency);
  }
  if (fundingMode === "external") assertFunction(onExternalAddress);
  else if (onExternalAddress !== undefined) assertFunction(onExternalAddress);
  if (!operations || typeof operations !== "object") throw stageError("OPTION_ERROR");
  for (const operation of ["createMint", "getOrCreateAssociatedTokenAccount", "mintTo", "transfer", "setAuthority"]) {
    assertFunction(operations[operation]);
  }
  if (!fileSystem || typeof fileSystem !== "object") throw stageError("OPTION_ERROR");
  for (const method of ["link", "lstat", "mkdir", "open", "realpath", "unlink"]) assertFunction(fileSystem[method]);
  assertPositiveSafeInteger(identityMaxAttempts, 3);
  assertNonnegativeSafeInteger(identityDelayMs, 500);
  assertPositiveSafeInteger(identityMaxWaitMs, 15_000);
  assertPositiveSafeInteger(faucetMaxAttempts, 3);
  assertNonnegativeSafeInteger(faucetDelayMs, 500);
  assertPositiveSafeInteger(faucetMaxWaitMs, 30_000);
  assertPositiveSafeInteger(fundingMaxAttempts, 120);
  assertNonnegativeSafeInteger(fundingDelayMs, 5_000);
  assertPositiveSafeInteger(fundingMaxWaitMs, 600_000);
  assertPositiveSafeInteger(confirmationMaxAttempts, 120);
  assertNonnegativeSafeInteger(confirmationDelayMs, 1_000);
  assertPositiveSafeInteger(confirmationMaxWaitMs, 120_000);
}

export async function runDevnetRehearsal(options = {}) {
  const config = {
    fundingMode: "faucet",
    connection: undefined,
    createConnection: () => new Connection(DEVNET_RPC_URL, "finalized"),
    outputRoot: PROJECT_ROOT,
    generateKeypair: () => Keypair.generate(),
    onExternalAddress: undefined,
    onPublicationWarning: () => {},
    operations: DEFAULT_OPERATIONS,
    fetchEvidence: fetchDevnetRehearsalEvidence,
    checkedAt: () => new Date().toISOString(),
    monotonicNow: () => performance.now(),
    sleepImpl: abortableSleep,
    deadlineImpl: withDeadline,
    fileSystem: DEFAULT_FILE_SYSTEM,
    identityMaxAttempts: 3,
    identityDelayMs: 500,
    identityMaxWaitMs: 15_000,
    faucetMaxAttempts: 3,
    faucetDelayMs: 500,
    faucetMaxWaitMs: 30_000,
    fundingMaxAttempts: 120,
    fundingDelayMs: 5_000,
    fundingMaxWaitMs: 600_000,
    confirmationMaxAttempts: 120,
    confirmationDelayMs: 1_000,
    confirmationMaxWaitMs: 120_000,
    ...options,
  };
  validateRunnerOptions(config);
  const { artifactDirectory, proofPath } = await validateArtifactRoot(config.outputRoot, config.fileSystem);
  await removeStaleProof(proofPath, config.fileSystem);

  let connection;
  try {
    connection = config.connection ?? await config.createConnection();
  } catch {
    throw stageError("IDENTITY_ERROR");
  }
  if (!connection || typeof connection !== "object" || !isFunction(connection.getGenesisHash)) {
    throw stageError("IDENTITY_ERROR");
  }

  let genesisHash;
  try {
    genesisHash = await runBoundedStage({
      operation: () => connection.getGenesisHash(),
      accept: (value) => typeof value === "string",
      maxAttempts: config.identityMaxAttempts,
      delayMs: config.identityDelayMs,
      maxWaitMs: config.identityMaxWaitMs,
      monotonicNow: config.monotonicNow,
      sleepImpl: config.sleepImpl,
      deadlineImpl: config.deadlineImpl,
      failureCode: "IDENTITY_ERROR",
    });
  } catch (error) {
    throw publicStage(error, "IDENTITY_ERROR");
  }
  if (genesisHash !== DEVNET_GENESIS_HASH) throw stageError("IDENTITY_ERROR");

  let payer;
  let vaultOwner;
  try {
    payer = config.generateKeypair();
    vaultOwner = config.generateKeypair();
    if (!(payer instanceof Keypair) || !(vaultOwner instanceof Keypair)) throw stageError("TOKEN_OPERATION_ERROR");
  } catch {
    throw stageError("TOKEN_OPERATION_ERROR");
  }

  if (config.fundingMode === "external") {
    try {
      await config.onExternalAddress({
        address: payer.publicKey.toBase58(),
        minimumLamports: EXTERNAL_FUNDING_MINIMUM_LAMPORTS.toString(),
      });
      await waitForExternalFunding({
        connection,
        address: payer.publicKey,
        minimumLamports: EXTERNAL_FUNDING_MINIMUM_LAMPORTS,
        maxAttempts: config.fundingMaxAttempts,
        delayMs: config.fundingDelayMs,
        maxWaitMs: config.fundingMaxWaitMs,
        monotonicNow: config.monotonicNow,
        sleepImpl: config.sleepImpl,
        withDeadline: config.deadlineImpl,
      });
    } catch {
      throw stageError("FUNDING_ERROR");
    }
  } else {
    if (!isFunction(connection.requestAirdrop)) throw stageError("FUNDING_ERROR");
    let airdropSignature;
    try {
      airdropSignature = await runBoundedStage({
        operation: () => connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL),
        accept: (value) => typeof value === "string" && value.length > 0,
        maxAttempts: config.faucetMaxAttempts,
        delayMs: config.faucetDelayMs,
        maxWaitMs: config.faucetMaxWaitMs,
        monotonicNow: config.monotonicNow,
        sleepImpl: config.sleepImpl,
        deadlineImpl: config.deadlineImpl,
        failureCode: "FUNDING_ERROR",
      });
    } catch {
      throw stageError("FUNDING_ERROR");
    }
    await confirmSignature(connection, airdropSignature, {
      maxAttempts: config.confirmationMaxAttempts,
      delayMs: config.confirmationDelayMs,
      maxWaitMs: config.confirmationMaxWaitMs,
      monotonicNow: config.monotonicNow,
      sleepImpl: config.sleepImpl,
      withDeadline: config.deadlineImpl,
    });
  }

  let mint;
  try {
    mint = await config.deadlineImpl(() => config.operations.createMint(
      connection, payer, payer.publicKey, null, 6, undefined, CONFIRM_OPTIONS, TOKEN_PROGRAM_ID,
    ), 120_000);
    const payerAccount = await config.deadlineImpl(() => config.operations.getOrCreateAssociatedTokenAccount(
      connection, payer, mint, payer.publicKey, false, "finalized", CONFIRM_OPTIONS,
      TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
    ), 120_000);
    const vaultAccount = await config.deadlineImpl(() => config.operations.getOrCreateAssociatedTokenAccount(
      connection, payer, mint, vaultOwner.publicKey, false, "finalized", CONFIRM_OPTIONS,
      TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
    ), 120_000);
    await config.deadlineImpl(() => config.operations.mintTo(
      connection, payer, mint, payerAccount.address, payer, FULL_SUPPLY, [], CONFIRM_OPTIONS, TOKEN_PROGRAM_ID,
    ), 120_000);
    await config.deadlineImpl(() => config.operations.transfer(
      connection, payer, payerAccount.address, vaultAccount.address, payer, FULL_SUPPLY, [], CONFIRM_OPTIONS,
      TOKEN_PROGRAM_ID,
    ), 120_000);
    await config.deadlineImpl(() => config.operations.setAuthority(
      connection, payer, mint, payer, AuthorityType.MintTokens, null, [], CONFIRM_OPTIONS, TOKEN_PROGRAM_ID,
    ), 120_000);
  } catch {
    throw stageError("TOKEN_OPERATION_ERROR");
  }

  let proof;
  try {
    const evidence = await config.deadlineImpl(() => config.fetchEvidence({
      connection,
      genesisHash,
      mintAddress: mint.toBase58(),
      payerAddress: payer.publicKey.toBase58(),
      vaultOwnerAddress: vaultOwner.publicKey.toBase58(),
      checkedAt: config.checkedAt,
    }), 120_000);
    proof = evaluateDevnetRehearsalEvidence(evidence);
    assertDevnetRehearsalProofV2(proof);
  } catch {
    throw stageError("EVIDENCE_ERROR");
  }

  await publishProof({
    proof,
    outputRoot: config.outputRoot,
    artifactDirectory,
    proofPath,
    fileSystem: config.fileSystem,
    onPublicationWarning: config.onPublicationWarning,
  });
  return proof;
}

export async function main({
  argv = process.argv.slice(2),
  runRehearsal = runDevnetRehearsal,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  let parsed;
  try {
    parsed = parseRehearsalOptions(argv);
    assertFunction(runRehearsal);
  } catch {
    stderr.write("Devnet rehearsal failed: OPTION_ERROR\n");
    return 1;
  }
  try {
    const proof = await runRehearsal({
      ...parsed,
      onExternalAddress: async ({ address }) => stdout.write(`${address}\n`),
      onPublicationWarning: async () => stderr.write("Devnet rehearsal warning: TEMP_UNLINK_FAILED\n"),
    });
    stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`Devnet rehearsal failed: ${publicStage(error, "TOKEN_OPERATION_ERROR").message}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  process.exitCode = await main();
}
