import { createHash } from "node:crypto";
import path from "node:path";
import { PublicKey } from "@solana/web3.js";
import {
  assertMetadataManifestV1,
  assertMetadataReadbackV1,
  serializeMetadataManifest,
  serializeMetadataReadback,
} from "./metadata-integrity.mjs";
import { writeBytesAtomic } from "./record-output.mjs";
import { decodeBase58 } from "./solana-transaction.mjs";

const SESSION_KEYS = Object.freeze([
  "schemaVersion",
  "network",
  "creator",
  "mint",
  "launchId",
  "previewTransactionSha256",
  "metadataManifestSha256",
  "metadataReadbackSha256",
  "costBaseline",
  "debitCapLamports",
  "events",
]);
const EVENT_KEYS = Object.freeze([
  "sequence",
  "operationId",
  "operationKind",
  "state",
  "purpose",
  "signature",
  "slot",
  "observedAt",
  "transactionSha256",
  "debitLamports",
  "visibleStatus",
]);
const COST_BASELINE_KEYS = Object.freeze([
  "metadataPaymentSignature",
  "metadataPaymentLamports",
  "verifiedAt",
]);
const EVENT_STATES = new Set([
  "prepared",
  "submitted",
  "visible-failed",
  "visible-pending",
  "finalized-success",
  "finalized-failed",
]);
const EVENT_KINDS = new Set(["creation", "recovery", "graduation"]);
const VISIBLE_STATUS = Object.freeze({
  prepared: "not-submitted",
  submitted: "submitted",
  "visible-failed": "failed",
  "visible-pending": "pending",
  "finalized-success": "finalized-success",
  "finalized-failed": "finalized-failed",
});
const TERMINAL_STATES = new Set(["visible-failed", "finalized-success", "finalized-failed"]);
const TRANSITIONS = Object.freeze({
  prepared: new Set(["submitted", "visible-failed"]),
  submitted: new Set(["visible-pending", "finalized-success", "finalized-failed"]),
  "visible-pending": new Set(["visible-pending", "finalized-success", "finalized-failed"]),
  "visible-failed": new Set(),
  "finalized-success": new Set(),
  "finalized-failed": new Set(),
});
const DEBIT_CAP = 1_000_000_000n;
const HEX_64 = /^[0-9a-f]{64}$/u;
const DECIMAL = /^(?:0|[1-9][0-9]*)$/u;
const OPERATION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PURPOSE = /^[A-Za-z0-9 .,:;()/_-]+$/u;

export const SUPPORTED_RECOVERY_DECODERS = Object.freeze({});

function sessionFail(code) {
  throw new Error(`session-receipt-${code}`);
}

function recoveryFail(code) {
  throw new Error(`recovery-envelope-${code}`);
}

function exactKeys(value, keys, fail, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) fail(code);
}

function canonicalTimestamp(value, fail, code) {
  if (typeof value !== "string") fail(code);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) fail(code);
  return parsed;
}

function canonicalKey(value, fail, code) {
  try {
    if (typeof value !== "string") fail(code);
    const key = new PublicKey(value);
    if (key.toBase58() !== value || key.toBytes().length !== 32) fail(code);
    return value;
  } catch {
    fail(code);
  }
}

function canonicalSignature(value, fail, code) {
  try {
    decodeBase58(value, { length: 64, code });
    return value;
  } catch {
    fail(code);
  }
}

function canonicalDecimal(value, fail, code) {
  if (typeof value !== "string" || !DECIMAL.test(value)) fail(code);
  return BigInt(value);
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function assertEventShape(value) {
  exactKeys(value, EVENT_KEYS, sessionFail, "event-keys");
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 1) sessionFail("event-sequence");
  if (typeof value.operationId !== "string" || value.operationId.length > 64
    || !OPERATION_ID.test(value.operationId)) sessionFail("event-operation-id");
  if (!EVENT_KINDS.has(value.operationKind) || !EVENT_STATES.has(value.state)) {
    sessionFail("event-enum");
  }
  if (typeof value.purpose !== "string" || value.purpose.length < 1
    || value.purpose.length > 120 || !PURPOSE.test(value.purpose)) sessionFail("event-purpose");
  canonicalTimestamp(value.observedAt, sessionFail, "event-observed-at");
  canonicalDecimal(value.debitLamports, sessionFail, "event-debit");
  if (value.visibleStatus !== VISIBLE_STATUS[value.state]) sessionFail("event-visible-status");
  if (value.state === "prepared" || value.state === "visible-failed") {
    if (value.signature !== null || value.slot !== null || value.transactionSha256 !== null) {
      sessionFail("event-pre-submission-evidence");
    }
  } else if (value.state === "submitted" || value.state === "visible-pending") {
    canonicalSignature(value.signature, sessionFail, "event-signature");
    if (value.slot !== null || value.transactionSha256 !== null) {
      sessionFail("event-pending-evidence");
    }
  } else {
    canonicalSignature(value.signature, sessionFail, "event-signature");
    if (!Number.isSafeInteger(value.slot) || value.slot < 0
      || typeof value.transactionSha256 !== "string"
      || !HEX_64.test(value.transactionSha256)) sessionFail("event-finalized-evidence");
  }
  return value;
}

function validateEventHistory(receipt) {
  const chains = new Map();
  let priorTime = canonicalTimestamp(
    receipt.costBaseline.verifiedAt,
    sessionFail,
    "baseline-verified-at",
  );
  let creationOperationId = null;
  for (let index = 0; index < receipt.events.length; index += 1) {
    const event = assertEventShape(receipt.events[index]);
    if (event.sequence !== index + 1) sessionFail("event-sequence");
    const eventTime = canonicalTimestamp(event.observedAt, sessionFail, "event-observed-at");
    if (eventTime <= priorTime) sessionFail("event-time-order");
    priorTime = eventTime;
    const chain = chains.get(event.operationId);
    if (!chain) {
      if (event.state !== "prepared") sessionFail("operation-start");
      if ([...chains.values()].some((value) => !TERMINAL_STATES.has(value.state))) {
        sessionFail("operation-overlap");
      }
      if (event.operationKind === "creation") {
        if (creationOperationId !== null) sessionFail("creation-repeat");
        creationOperationId = event.operationId;
      }
      chains.set(event.operationId, {
        operationKind: event.operationKind,
        purpose: event.purpose,
        state: event.state,
        signature: null,
        debitLamports: BigInt(event.debitLamports),
      });
    } else {
      if (chain.operationKind !== event.operationKind || chain.purpose !== event.purpose) {
        sessionFail("operation-identity");
      }
      if (!TRANSITIONS[chain.state].has(event.state)) sessionFail("operation-transition");
      if (event.state === "submitted") {
        chain.signature = event.signature;
      } else if (event.state !== "visible-failed" && event.signature !== chain.signature) {
        sessionFail("operation-signature");
      }
      const debit = BigInt(event.debitLamports);
      if (debit < chain.debitLamports) sessionFail("operation-debit-regression");
      chain.debitLamports = debit;
      chain.state = event.state;
    }
    const cumulative = BigInt(receipt.costBaseline.metadataPaymentLamports)
      + [...chains.values()].reduce((sum, value) => sum + value.debitLamports, 0n);
    if (cumulative > BigInt(receipt.debitCapLamports)) sessionFail("debit-cap");
  }
}

export function assertSessionReceiptV1(value) {
  exactKeys(value, SESSION_KEYS, sessionFail, "root-keys");
  if (value.schemaVersion !== "mainnet-session-v1" || value.network !== "mainnet-beta") {
    sessionFail("root-version");
  }
  canonicalKey(value.creator, sessionFail, "creator");
  canonicalKey(value.mint, sessionFail, "mint");
  canonicalKey(value.launchId, sessionFail, "launch-id");
  if (new Set([value.creator, value.mint, value.launchId]).size !== 3) sessionFail("identity-alias");
  for (const digest of [
    value.previewTransactionSha256,
    value.metadataManifestSha256,
    value.metadataReadbackSha256,
  ]) {
    if (typeof digest !== "string" || !HEX_64.test(digest)) sessionFail("digest");
  }
  exactKeys(value.costBaseline, COST_BASELINE_KEYS, sessionFail, "cost-baseline-keys");
  if (value.costBaseline.metadataPaymentSignature !== null
    || value.costBaseline.metadataPaymentLamports !== "0") sessionFail("cost-baseline");
  canonicalTimestamp(value.costBaseline.verifiedAt, sessionFail, "baseline-verified-at");
  if (value.debitCapLamports !== DEBIT_CAP.toString() || !Array.isArray(value.events)) {
    sessionFail("root-cost");
  }
  validateEventHistory(value);
  return value;
}

export function createSessionReceipt(input) {
  exactKeys(
    input,
    ["preview", "metadataManifest", "metadataReadback", "checkedAt"],
    sessionFail,
    "create-input",
  );
  const checkedAt = canonicalTimestamp(input.checkedAt, sessionFail, "checked-at");
  assertMetadataManifestV1(input.metadataManifest);
  assertMetadataReadbackV1({
    manifest: input.metadataManifest,
    readback: input.metadataReadback,
  });
  if (checkedAt < Date.parse(input.metadataReadback.verifiedAt)
    || input.preview?.schemaVersion !== "launchlab-preview-v1"
    || typeof input.preview.canonicalBase64 !== "string"
    || hash(Buffer.from(input.preview.canonicalBase64, "base64")) !== input.preview.transactionSha256
    || input.preview.launch?.instruction !== "initialize-v2") {
    sessionFail("create-evidence");
  }
  const receipt = {
    schemaVersion: "mainnet-session-v1",
    network: "mainnet-beta",
    creator: input.preview.launch.accounts.creator,
    mint: input.preview.launch.accounts.mint,
    launchId: input.preview.launch.accounts.launchId,
    previewTransactionSha256: input.preview.transactionSha256,
    metadataManifestSha256: hash(serializeMetadataManifest(input.metadataManifest)),
    metadataReadbackSha256: hash(serializeMetadataReadback(input.metadataReadback)),
    costBaseline: {
      metadataPaymentSignature: input.metadataReadback.creatorPayment.signature,
      metadataPaymentLamports: input.metadataReadback.creatorPayment.debitLamports,
      verifiedAt: input.metadataReadback.verifiedAt,
    },
    debitCapLamports: DEBIT_CAP.toString(),
    events: [],
  };
  assertSessionReceiptV1(receipt);
  return freeze(receipt);
}

export function recordPublicTransactionEvent(receipt, event) {
  assertSessionReceiptV1(receipt);
  assertEventShape(event);
  const next = {
    ...structuredClone(receipt),
    events: [
      ...structuredClone(receipt.events),
      structuredClone(event),
    ],
  };
  assertSessionReceiptV1(next);
  return freeze(next);
}

export function serializeSessionReceipt(receipt) {
  assertSessionReceiptV1(receipt);
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

export async function writeSessionReceiptAtomic(
  outputPath,
  receipt,
  dependencies = {},
) {
  if (typeof outputPath !== "string" || !path.isAbsolute(outputPath)
    || path.basename(outputPath) !== "session-receipt.json") {
    sessionFail("output-path");
  }
  assertSessionReceiptV1(receipt);
  return writeBytesAtomic(outputPath, serializeSessionReceipt(receipt), dependencies);
}

function assertSortedUniqueKeys(values, code) {
  if (!Array.isArray(values) || values.length === 0) recoveryFail(code);
  const normalized = values.map((value) => canonicalKey(value, recoveryFail, code));
  if (new Set(normalized).size !== normalized.length
    || [...normalized].sort().join(",") !== normalized.join(",")) recoveryFail(code);
}

function assertRecoveryTransfer(value) {
  exactKeys(
    value,
    ["source", "destination", "assetKind", "mint", "amountBaseUnits"],
    recoveryFail,
    "transfer-keys",
  );
  canonicalKey(value.source, recoveryFail, "transfer-source");
  canonicalKey(value.destination, recoveryFail, "transfer-destination");
  if (value.assetKind === "sol") {
    if (value.mint !== null) recoveryFail("transfer-union");
  } else if (value.assetKind === "spl-token") {
    canonicalKey(value.mint, recoveryFail, "transfer-mint");
  } else {
    recoveryFail("transfer-union");
  }
  canonicalDecimal(value.amountBaseUnits, recoveryFail, "transfer-amount");
}

export function assertRecoveryEnvelopeV1(value) {
  exactKeys(value, [
    "schemaVersion",
    "network",
    "creator",
    "mint",
    "launchId",
    "sourceSessionSha256",
    "previewTransactionSha256",
    "currentState",
    "proposedOperation",
    "cost",
    "expiresAt",
    "requiresFreshActionTimeApproval",
  ], recoveryFail, "root-keys");
  if (value.schemaVersion !== "recovery-envelope-v1" || value.network !== "mainnet-beta") {
    recoveryFail("root-version");
  }
  canonicalKey(value.creator, recoveryFail, "creator");
  canonicalKey(value.mint, recoveryFail, "mint");
  canonicalKey(value.launchId, recoveryFail, "launch-id");
  if (new Set([value.creator, value.mint, value.launchId]).size !== 3
    || !HEX_64.test(value.sourceSessionSha256)
    || !HEX_64.test(value.previewTransactionSha256)) recoveryFail("root-identity");
  exactKeys(value.currentState, [
    "stage",
    "finalizedSlot",
    "finalizedAt",
    "checkedAt",
    "mintAccountSha256",
    "launchAccountSha256",
    "platformConfigAccountSha256",
  ], recoveryFail, "state-keys");
  if (!["curve-live", "graduated"].includes(value.currentState.stage)
    || !Number.isSafeInteger(value.currentState.finalizedSlot)
    || value.currentState.finalizedSlot < 0) recoveryFail("state");
  const finalizedAt = canonicalTimestamp(
    value.currentState.finalizedAt,
    recoveryFail,
    "state-finalized-at",
  );
  const checkedAt = canonicalTimestamp(
    value.currentState.checkedAt,
    recoveryFail,
    "state-checked-at",
  );
  if (finalizedAt > checkedAt
    || !HEX_64.test(value.currentState.mintAccountSha256)
    || !HEX_64.test(value.currentState.launchAccountSha256)
    || !HEX_64.test(value.currentState.platformConfigAccountSha256)) recoveryFail("state");
  exactKeys(value.proposedOperation, [
    "operationId",
    "operationKind",
    "purpose",
    "transactionSha256",
    "signers",
    "programs",
    "transfers",
  ], recoveryFail, "operation-keys");
  if (typeof value.proposedOperation.operationId !== "string"
    || value.proposedOperation.operationId.length > 64
    || !OPERATION_ID.test(value.proposedOperation.operationId)
    || value.proposedOperation.operationKind !== "recovery"
    || typeof value.proposedOperation.purpose !== "string"
    || value.proposedOperation.purpose.length < 1
    || value.proposedOperation.purpose.length > 120
    || !PURPOSE.test(value.proposedOperation.purpose)
    || !HEX_64.test(value.proposedOperation.transactionSha256)) recoveryFail("operation");
  assertSortedUniqueKeys(value.proposedOperation.signers, "operation-signers");
  assertSortedUniqueKeys(value.proposedOperation.programs, "operation-programs");
  if (!Array.isArray(value.proposedOperation.transfers)) recoveryFail("operation-transfers");
  for (const transfer of value.proposedOperation.transfers) assertRecoveryTransfer(transfer);
  exactKeys(value.cost, [
    "cumulativeBeforeLamports",
    "maximumAdditionalLamports",
    "cumulativeMaximumLamports",
    "capLamports",
    "withinCap",
  ], recoveryFail, "cost-keys");
  const before = canonicalDecimal(
    value.cost.cumulativeBeforeLamports,
    recoveryFail,
    "cost-before",
  );
  const additional = canonicalDecimal(
    value.cost.maximumAdditionalLamports,
    recoveryFail,
    "cost-additional",
  );
  const maximum = canonicalDecimal(
    value.cost.cumulativeMaximumLamports,
    recoveryFail,
    "cost-maximum",
  );
  if (value.cost.capLamports !== DEBIT_CAP.toString()
    || maximum !== before + additional || maximum > DEBIT_CAP
    || value.cost.withinCap !== true) recoveryFail("cost");
  const expiresAt = canonicalTimestamp(value.expiresAt, recoveryFail, "expires-at");
  if (expiresAt <= checkedAt || expiresAt - checkedAt > 5 * 60 * 1000
    || value.requiresFreshActionTimeApproval !== true) recoveryFail("expiry-or-approval");
  return value;
}

export function decodeRecoveryTransaction() {
  throw new Error("recovery-operation-unsupported");
}

export function buildRecoveryEnvelope() {
  throw new Error("recovery-operation-unsupported");
}
