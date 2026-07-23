import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { VersionedTransaction } from "@solana/web3.js";
import {
  parsePreviewOptions,
  runPreviewVerifier,
} from "../scripts/verify-launchlab-preview.mjs";
import {
  assertApprovalEnvelopeV1,
  buildApprovalEnvelope,
  decodeUnsignedLaunchTransaction,
  evaluateLaunchPreview,
} from "../src/launchlab-preview.mjs";
import {
  serializeMetadataManifest,
  serializeMetadataReadback,
} from "../src/metadata-integrity.mjs";
import {
  MAINNET_SESSION_PATHS,
  serializeMainnetSessionJson,
} from "../src/mainnet-session-artifact.mjs";
import {
  HAKKY_TARGET_RAW_VALUES,
  createLaunchlabPreviewFixture,
} from "../test-support/launchlab-preview-fixtures.mjs";

function decodedFixture(options) {
  const fixture = createLaunchlabPreviewFixture(options);
  const preview = decodeUnsignedLaunchTransaction({
    serialized: fixture.serialized,
    lookupTableAccounts: fixture.lookupTableAccounts,
    lookupBarrierSlot: fixture.lookupBarrierSlot,
  });
  return { ...fixture, preview };
}

function evaluate(fixture) {
  return evaluateLaunchPreview({
    preview: fixture.preview,
    state: fixture.state,
    simulation: fixture.simulation,
    metadataManifest: fixture.metadataManifest,
    metadataReadback: fixture.metadataReadback,
    officialOriginReceipt: fixture.officialOriginReceipt,
    walletReadinessReceipt: fixture.walletReadinessReceipt,
    creator: fixture.creator,
  });
}

test("decodes the exact unsigned HAKKY legacy and v0 transactions", () => {
  for (const version of ["legacy", "v0"]) {
    const fixture = decodedFixture({ version });
    assert.equal(fixture.preview.schemaVersion, "launchlab-preview-v1");
    assert.equal(fixture.preview.version, version === "legacy" ? "legacy" : 0);
    assert.equal(fixture.preview.launch.instruction, "initialize-v2");
    assert.equal(fixture.preview.launch.accounts.creator, fixture.creator);
    assert.equal(fixture.preview.launch.accounts.payer, fixture.creator);
    assert.equal(fixture.preview.launch.accounts.mint, fixture.identities.mint);
    assert.equal(fixture.preview.launch.curve.supply.toString(), HAKKY_TARGET_RAW_VALUES.supply);
    assert.deepEqual(fixture.preview.signers, [fixture.creator, fixture.identities.mint]);
    assert.deepEqual(fixture.preview.transfers, []);
    assert.match(fixture.preview.transactionSha256, /^[0-9a-f]{64}$/u);
  }
});

test("rejects signed bytes, base64 drift, lookup drift, and extra input", () => {
  const fixture = createLaunchlabPreviewFixture();
  const signed = VersionedTransaction.deserialize(Buffer.from(fixture.serialized, "base64"));
  signed.signatures[0][0] = 1;
  for (const input of [
    {
      serialized: Buffer.from(signed.serialize()).toString("base64"),
      lookupTableAccounts: [],
      lookupBarrierSlot: fixture.lookupBarrierSlot,
    },
    {
      serialized: `${fixture.serialized}\n`,
      lookupTableAccounts: [],
      lookupBarrierSlot: fixture.lookupBarrierSlot,
    },
    {
      serialized: fixture.serialized,
      lookupTableAccounts: [{}],
      lookupBarrierSlot: fixture.lookupBarrierSlot,
    },
    {
      serialized: fixture.serialized,
      lookupTableAccounts: [],
      lookupBarrierSlot: fixture.lookupBarrierSlot,
      override: true,
    },
  ]) {
    assert.throws(() => decodeUnsignedLaunchTransaction(input), /launch-preview-/u);
  }
});

test("exact target semantics are covered but remain non-approvable while PlatformConfig is mutable", () => {
  const fixture = decodedFixture();
  const evaluation = evaluate(fixture);
  assert.equal(evaluation.ok, false);
  assert.deepEqual(evaluation.observed, HAKKY_TARGET_RAW_VALUES);
  assert.equal(evaluation.coverage.ok, true);
  assert.equal(evaluation.coverage.code, "source-coverage-verified");
  assert.deepEqual(evaluation.checks.find((check) => check.code === "source-coverage-verified"), {
    code: "source-coverage-verified",
    ok: true,
  });
  assert.deepEqual(evaluation.identities, {
    mint: fixture.identities.mint,
    launchId: fixture.identities.launchId,
  });
  assert.equal(evaluation.observed.protocolBuyFeeRateMillionths, "10000");
  assert.deepEqual(
    evaluation.checks.find((check) => check.code === "platform-config-immutability-unavailable"),
    {
      code: "platform-config-immutability-unavailable",
      ok: false,
      reason: "platform-admin-can-update-graduation-economics",
    },
  );
  assert.throws(
    () => buildApprovalEnvelope(evaluation),
    /launch-preview-platform-config-immutability-unavailable/u,
  );
});

test("every economic target mutation is non-approvable and coverage cannot be injected", () => {
  const fixture = decodedFixture();
  const paths = [
    ["preview", "launch", "accounts", "tokenProgramBase"],
    ["preview", "launch", "accounts", "quoteMint"],
    ["preview", "launch", "curve", "supply"],
    ["preview", "launch", "curve", "totalSell"],
    ["preview", "launch", "curve", "totalFundraising"],
    ["preview", "launch", "vesting", "lockedAmount"],
    ["preview", "launch", "decimals"],
    ["preview", "launch", "curve", "migrationType"],
  ];
  for (const path of paths) {
    const mutated = structuredClone(fixture);
    let target = mutated;
    for (const part of path.slice(0, -1)) target = target[part];
    const key = path.at(-1);
    target[key] = typeof target[key] === "bigint"
      ? target[key] + 1n
      : typeof target[key] === "number" ? target[key] + 1 : "11111111111111111111111111111111";
    assert.equal(evaluate(mutated).ok, false, path.join("."));
  }
  assert.throws(() => evaluateLaunchPreview({
    preview: fixture.preview,
    state: fixture.state,
    simulation: fixture.simulation,
    metadataManifest: fixture.metadataManifest,
    metadataReadback: fixture.metadataReadback,
    officialOriginReceipt: fixture.officialOriginReceipt,
    walletReadinessReceipt: fixture.walletReadinessReceipt,
    creator: fixture.creator,
    sourceCoverageOverride: { ok: true },
  }), /launch-preview-input/u);
});

test("metadata, receipt, selected-wallet, simulation, and debit drift all fail closed", () => {
  const mutations = [
    (value) => { value.simulation.value.err = { InstructionError: [0, "Custom"] }; },
    (value) => { value.simulation.value.innerInstructions = null; },
    (value) => { value.simulation.value.innerInstructions[0].instructions[0].stackHeight = 3; },
    (value) => { value.simulation.canonicalBase64 = "AAAA"; },
    (value) => { value.simulation.replaceRecentBlockhash = true; },
    (value) => { value.simulation.checkedAt = "2026-07-23T02:00:00.000Z"; },
    (value) => { value.officialOriginReceipt.uiOrigin = "https://example.com"; },
    (value) => { value.walletReadinessReceipt.creator = value.identities.mint; },
    (value) => { value.walletReadinessReceipt.ok = false; },
    (value) => { value.creator = value.identities.mint; },
    (value) => { value.metadataReadback.creatorPayment.debitLamports = "1"; },
    (value) => { value.state.accounts[0].lamports = "3000000000"; value.simulation.value.accounts[0].lamports = 1999999999; },
  ];
  for (const mutate of mutations) {
    const fixture = decodedFixture();
    mutate(fixture);
    assert.equal(evaluate(fixture).ok, false);
  }
  const mutableFixture = decodedFixture({ isMutable: true });
  assert.equal(evaluate(mutableFixture).ok, false);
});

test("the operator CLI writes no preview or envelope while PlatformConfig is mutable", async () => {
  const fixture = createLaunchlabPreviewFixture();
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-preview-cli-"));
  try {
    await mkdir(path.join(repositoryRoot, "artifacts", "metadata"), { recursive: true });
    await mkdir(path.join(repositoryRoot, "artifacts", "mainnet-session"), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, "artifacts", "metadata", "manifest.json"),
      serializeMetadataManifest(fixture.metadataManifest),
    );
    await writeFile(
      path.join(repositoryRoot, "artifacts", "metadata", "readback.json"),
      serializeMetadataReadback(fixture.metadataReadback),
    );
    await writeFile(
      path.join(repositoryRoot, ...MAINNET_SESSION_PATHS.officialOrigin.split("/")),
      serializeMainnetSessionJson(fixture.officialOriginReceipt),
    );
    await writeFile(
      path.join(repositoryRoot, ...MAINNET_SESSION_PATHS.walletReadiness.split("/")),
      serializeMainnetSessionJson(fixture.walletReadinessReceipt),
    );
    await writeFile(
      path.join(repositoryRoot, ...MAINNET_SESSION_PATHS.unsignedTransaction.split("/")),
      fixture.serialized,
    );
    const client = {
      hostname: "api.mainnet-beta.solana.com",
      async call(method) {
        if (method === "getSlot") return fixture.lookupBarrierSlot;
        if (method === "getMultipleAccounts") {
          return {
            context: { slot: fixture.state.contextSlot },
            value: fixture.state.accounts.map((account) => ({
              owner: account.owner,
              lamports: Number(account.lamports),
              data: [account.dataBase64, "base64"],
              executable: false,
              rentEpoch: 0,
            })),
          };
        }
        if (method === "simulateTransaction") {
          return {
            context: fixture.simulation.context,
            value: fixture.simulation.value,
          };
        }
        throw new Error("unexpected-rpc-method");
      },
    };
    const writes = [];
    await assert.rejects(
      runPreviewVerifier({
        argv: [
          "--transaction", MAINNET_SESSION_PATHS.unsignedTransaction,
          "--creator", fixture.creator,
          "--metadata-manifest", "artifacts/metadata/manifest.json",
          "--metadata-readback", "artifacts/metadata/readback.json",
          "--official-origin", MAINNET_SESSION_PATHS.officialOrigin,
          "--wallet-readiness", MAINNET_SESSION_PATHS.walletReadiness,
          "--out", MAINNET_SESSION_PATHS.preview,
        ],
        repositoryRoot,
        createRpcClient: () => client,
        now: () => new Date("2026-07-23T01:02:00.000Z"),
        writeImpl: async (input) => {
          writes.push(input);
          return { outputPath: input.relativePath, warning: null };
        },
      }),
      /launch-preview-platform-config-immutability-unavailable/u,
    );
    assert.deepEqual(writes, []);
    assert.throws(() => parsePreviewOptions([
      "--transaction", MAINNET_SESSION_PATHS.unsignedTransaction,
      "--creator", fixture.creator,
      "--metadata-manifest", "artifacts/metadata/manifest.json",
      "--metadata-readback", "artifacts/metadata/readback.json",
      "--official-origin", MAINNET_SESSION_PATHS.officialOrigin,
      "--wallet-readiness", MAINNET_SESSION_PATHS.walletReadiness,
      "--out", MAINNET_SESSION_PATHS.preview,
      "--approve", "true",
    ]), /Usage:/u);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
});
