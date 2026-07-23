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
  parseSessionOptions,
  runSessionReceipt,
} from "../scripts/session-receipt.mjs";
import {
  SUPPORTED_RECOVERY_DECODERS,
  assertRecoveryEnvelopeV1,
  assertSessionReceiptV1,
  buildRecoveryEnvelope,
  createSessionReceipt,
  decodeRecoveryTransaction,
  recordPublicTransactionEvent,
  writeSessionReceiptAtomic,
} from "../src/session-receipt.mjs";
import { decodeUnsignedLaunchTransaction } from "../src/launchlab-preview.mjs";
import {
  MAINNET_SESSION_PATHS,
  serializeMainnetSessionJson,
} from "../src/mainnet-session-artifact.mjs";
import { createLaunchlabPreviewFixture } from "../test-support/launchlab-preview-fixtures.mjs";

const SIGNATURE = "1".repeat(64);
const HASH = "a".repeat(64);

function fixtureReceipt() {
  const fixture = createLaunchlabPreviewFixture();
  const preview = decodeUnsignedLaunchTransaction({
    serialized: fixture.serialized,
    lookupTableAccounts: fixture.lookupTableAccounts,
    lookupBarrierSlot: fixture.lookupBarrierSlot,
  });
  return {
    fixture,
    preview,
    receipt: createSessionReceipt({
      preview,
      metadataManifest: fixture.metadataManifest,
      metadataReadback: fixture.metadataReadback,
      checkedAt: "2026-07-23T01:02:00.000Z",
    }),
  };
}

function event({
  sequence,
  operationId = "create-hakky",
  operationKind = "creation",
  state,
  purpose = "Create the exact reviewed HAKKY launch",
  signature = null,
  slot = null,
  observedAt,
  transactionSha256 = null,
  debitLamports = "0",
}) {
  const visible = {
    prepared: "not-submitted",
    submitted: "submitted",
    "visible-pending": "pending",
    "visible-failed": "failed",
    "finalized-success": "finalized-success",
    "finalized-failed": "finalized-failed",
  };
  return {
    sequence,
    operationId,
    operationKind,
    state,
    purpose,
    signature,
    slot,
    observedAt,
    transactionSha256,
    debitLamports,
    visibleStatus: visible[state],
  };
}

function append(receipt, input) {
  return recordPublicTransactionEvent(receipt, event(input));
}

test("creates the exact public-only session root from hashed validated evidence", () => {
  const { preview, fixture, receipt } = fixtureReceipt();
  assert.deepEqual(Object.keys(receipt), [
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
  assert.equal(receipt.schemaVersion, "mainnet-session-v1");
  assert.equal(receipt.creator, preview.launch.accounts.creator);
  assert.equal(receipt.mint, preview.launch.accounts.mint);
  assert.equal(receipt.launchId, preview.launch.accounts.launchId);
  assert.equal(receipt.previewTransactionSha256, preview.transactionSha256);
  assert.match(receipt.metadataManifestSha256, /^[0-9a-f]{64}$/u);
  assert.match(receipt.metadataReadbackSha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(receipt.costBaseline, {
    metadataPaymentSignature: null,
    metadataPaymentLamports: "0",
    verifiedAt: fixture.metadataReadback.verifiedAt,
  });
  assert.equal(receipt.debitCapLamports, "1000000000");
  assert.deepEqual(receipt.events, []);
  assert.equal(assertSessionReceiptV1(structuredClone(receipt)).schemaVersion, "mainnet-session-v1");
});

test("enforces the exact monotonic creation transition chain", () => {
  let { receipt } = fixtureReceipt();
  receipt = append(receipt, {
    sequence: 1,
    state: "prepared",
    observedAt: "2026-07-23T01:03:00.000Z",
  });
  receipt = append(receipt, {
    sequence: 2,
    state: "submitted",
    signature: SIGNATURE,
    observedAt: "2026-07-23T01:03:01.000Z",
  });
  receipt = append(receipt, {
    sequence: 3,
    state: "visible-pending",
    signature: SIGNATURE,
    observedAt: "2026-07-23T01:03:02.000Z",
  });
  receipt = append(receipt, {
    sequence: 4,
    state: "finalized-success",
    signature: SIGNATURE,
    slot: 300_000_200,
    transactionSha256: HASH,
    debitLamports: "250000000",
    observedAt: "2026-07-23T01:03:03.000Z",
  });
  assert.equal(receipt.events.length, 4);
  assert.deepEqual(receipt.events.map((value) => value.visibleStatus), [
    "not-submitted",
    "submitted",
    "pending",
    "finalized-success",
  ]);
  assert.equal(assertSessionReceiptV1(structuredClone(receipt)).events.length, 4);
});

test("allows only pre-submission visible failure and preserves submitted ambiguity", () => {
  const { receipt } = fixtureReceipt();
  const prepared = append(receipt, {
    sequence: 1,
    state: "prepared",
    observedAt: "2026-07-23T01:03:00.000Z",
  });
  const failed = append(prepared, {
    sequence: 2,
    state: "visible-failed",
    observedAt: "2026-07-23T01:03:01.000Z",
  });
  assert.equal(failed.events.at(-1).signature, null);
  assert.throws(() => append(failed, {
    sequence: 3,
    state: "prepared",
    operationId: "retry-hakky",
    observedAt: "2026-07-23T01:03:02.000Z",
  }), /session-receipt-/u);

  const submitted = append(prepared, {
    sequence: 2,
    state: "submitted",
    signature: SIGNATURE,
    observedAt: "2026-07-23T01:03:01.000Z",
  });
  assert.throws(() => append(submitted, {
    sequence: 3,
    state: "visible-failed",
    observedAt: "2026-07-23T01:03:02.000Z",
  }), /session-receipt-/u);
});

test("rejects schema drift, reverse transitions, identity drift, retries, and cap overflow", () => {
  const { receipt } = fixtureReceipt();
  const prepared = append(receipt, {
    sequence: 1,
    state: "prepared",
    observedAt: "2026-07-23T01:03:00.000Z",
  });
  const invalidEvents = [
    event({
      sequence: 3,
      state: "submitted",
      signature: SIGNATURE,
      observedAt: "2026-07-23T01:03:01.000Z",
    }),
    event({
      sequence: 2,
      state: "finalized-success",
      signature: SIGNATURE,
      slot: 1,
      transactionSha256: HASH,
      observedAt: "2026-07-23T01:03:01.000Z",
    }),
    event({
      sequence: 2,
      operationId: "different-operation",
      state: "submitted",
      signature: SIGNATURE,
      observedAt: "2026-07-23T01:03:01.000Z",
    }),
    event({
      sequence: 2,
      state: "submitted",
      signature: SIGNATURE,
      debitLamports: "1000000001",
      observedAt: "2026-07-23T01:03:01.000Z",
    }),
    {
      ...event({
        sequence: 2,
        state: "submitted",
        signature: SIGNATURE,
        observedAt: "2026-07-23T01:03:01.000Z",
      }),
      retry: true,
    },
  ];
  for (const invalid of invalidEvents) {
    assert.throws(() => recordPublicTransactionEvent(prepared, invalid), /session-receipt-/u);
  }
  for (const mutate of [
    (value) => { value.creator = value.mint; },
    (value) => { value.costBaseline.metadataPaymentLamports = "1"; },
    (value) => { value.events = [{}]; },
    (value) => { value.extra = true; },
  ]) {
    const value = structuredClone(receipt);
    mutate(value);
    assert.throws(() => assertSessionReceiptV1(value), /session-receipt-/u);
  }
});

test("writes a validated evolving receipt through the atomic public writer", async () => {
  const { receipt } = fixtureReceipt();
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakky-session-receipt-"));
  const outputPath = path.join(directory, "session-receipt.json");
  try {
    const result = await writeSessionReceiptAtomic(outputPath, receipt);
    assert.equal(result.committed, true);
    assert.deepEqual(
      JSON.parse(await readFile(outputPath, "utf8")),
      receipt,
    );
    const invalid = structuredClone(receipt);
    invalid.extra = true;
    await assert.rejects(writeSessionReceiptAtomic(outputPath, invalid), /session-receipt-/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the recovery registry is deeply frozen and every generic recovery stops", () => {
  assert.deepEqual(SUPPORTED_RECOVERY_DECODERS, {});
  assert.equal(Object.isFrozen(SUPPORTED_RECOVERY_DECODERS), true);
  for (const value of ["", "AAAA", createLaunchlabPreviewFixture().serialized]) {
    assert.throws(() => decodeRecoveryTransaction({
      serialized: value,
      addressLookupTables: [],
      simulation: {},
      feeQuote: {},
    }), /^Error: recovery-operation-unsupported$/u);
  }
  assert.throws(() => buildRecoveryEnvelope({
    receipt: fixtureReceipt().receipt,
    readback: {},
    serializedTransaction: "AAAA",
    addressLookupTables: [],
    simulation: {},
    feeQuote: {},
    checkedAt: "2026-07-23T01:02:00.000Z",
  }), /^Error: recovery-operation-unsupported$/u);
});

test("validates the exact future recovery-envelope schema in isolation", () => {
  const { receipt } = fixtureReceipt();
  const envelope = {
    schemaVersion: "recovery-envelope-v1",
    network: "mainnet-beta",
    creator: receipt.creator,
    mint: receipt.mint,
    launchId: receipt.launchId,
    sourceSessionSha256: "b".repeat(64),
    previewTransactionSha256: receipt.previewTransactionSha256,
    currentState: {
      stage: "curve-live",
      finalizedSlot: 300_000_300,
      finalizedAt: "2026-07-23T01:04:00.000Z",
      checkedAt: "2026-07-23T01:04:01.000Z",
      mintAccountSha256: "c".repeat(64),
      launchAccountSha256: "d".repeat(64),
      platformConfigAccountSha256: "e".repeat(64),
    },
    proposedOperation: {
      operationId: "recover-exact-account",
      operationKind: "recovery",
      purpose: "Recover one exact reviewed account",
      transactionSha256: "f".repeat(64),
      signers: [receipt.creator],
      programs: ["11111111111111111111111111111111"],
      transfers: [{
        source: receipt.creator,
        destination: receipt.mint,
        assetKind: "sol",
        mint: null,
        amountBaseUnits: "1",
      }],
    },
    cost: {
      cumulativeBeforeLamports: "0",
      maximumAdditionalLamports: "1",
      cumulativeMaximumLamports: "1",
      capLamports: "1000000000",
      withinCap: true,
    },
    expiresAt: "2026-07-23T01:09:01.000Z",
    requiresFreshActionTimeApproval: true,
  };
  assert.equal(assertRecoveryEnvelopeV1(structuredClone(envelope)).schemaVersion, "recovery-envelope-v1");
  for (const mutate of [
    (value) => { value.proposedOperation.operationKind = "creation"; },
    (value) => { value.proposedOperation.signers.push(value.creator); },
    (value) => { value.proposedOperation.transfers[0].mint = value.mint; },
    (value) => { value.cost.cumulativeMaximumLamports = "2"; },
    (value) => { value.expiresAt = "2026-07-23T01:09:01.001Z"; },
    (value) => { value.requiresFreshActionTimeApproval = false; },
    (value) => { value.extra = true; },
  ]) {
    const value = structuredClone(envelope);
    mutate(value);
    assert.throws(() => assertRecoveryEnvelopeV1(value), /recovery-envelope-/u);
  }
});

test("the session CLI has no approval, signing, sending, or retry surface", async () => {
  const buildRecoveryArguments = [
    "build-recovery",
    "--receipt", MAINNET_SESSION_PATHS.sessionReceipt,
    "--readback", "artifacts/metadata/readback.json",
    "--transaction", MAINNET_SESSION_PATHS.recoveryTransaction,
    "--address-lookup-tables", MAINNET_SESSION_PATHS.recoveryLookupTables,
    "--simulation", MAINNET_SESSION_PATHS.recoverySimulation,
    "--fee-quote", MAINNET_SESSION_PATHS.recoveryFeeQuote,
    "--out", MAINNET_SESSION_PATHS.recoveryEnvelope,
  ];
  assert.equal(parseSessionOptions(buildRecoveryArguments).command, "build-recovery");
  await assert.rejects(runSessionReceipt({
    argv: buildRecoveryArguments,
    repositoryRoot: "C:\\path-that-must-not-be-read",
  }), /^Error: recovery-operation-unsupported$/u);
  for (const command of ["approve", "sign", "send", "retry"]) {
    assert.throws(() => parseSessionOptions([command]), /Usage:/u);
  }
  assert.throws(() => parseSessionOptions([
    ...buildRecoveryArguments,
    "--approve", "true",
  ]), /Usage:/u);
});

test("record-status reads one fixed public event and atomically appends it", async () => {
  const { receipt } = fixtureReceipt();
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-session-cli-"));
  try {
    const sessionDirectory = path.join(repositoryRoot, "artifacts", "mainnet-session");
    await mkdir(sessionDirectory, { recursive: true });
    const nextEvent = event({
      sequence: 1,
      state: "prepared",
      observedAt: "2026-07-23T01:03:00.000Z",
    });
    await writeFile(
      path.join(sessionDirectory, "session-receipt.json"),
      serializeMainnetSessionJson(receipt),
    );
    await writeFile(
      path.join(sessionDirectory, "status-event.json"),
      serializeMainnetSessionJson(nextEvent),
    );
    const writes = [];
    const result = await runSessionReceipt({
      argv: [
        "record-status",
        "--receipt", MAINNET_SESSION_PATHS.sessionReceipt,
        "--event", MAINNET_SESSION_PATHS.statusEvent,
        "--out", MAINNET_SESSION_PATHS.sessionReceipt,
      ],
      repositoryRoot,
      writeImpl: async (outputPath, value) => {
        writes.push({ outputPath, value });
        return { committed: true };
      },
    });
    assert.equal(result.events.length, 1);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].outputPath, path.join(sessionDirectory, "session-receipt.json"));
    assert.deepEqual(writes[0].value, result);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
});
