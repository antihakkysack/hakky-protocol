import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

import {
  CREATOR_FUNDED_CAP_LAMPORTS,
  DEVNET_GENESIS_HASH,
  buildCostLedger,
  evaluateCostLedger,
  evaluateOperationGraph,
} from "../src/cost-ledger.mjs";

const COLLECTED_AT = "2026-07-27T12:00:00.000Z";
const EVALUATED_AT = "2026-07-27T12:01:00.000Z";

export function costSnapshot(overrides = {}) {
  return {
    schemaVersion: "hakky-cost-snapshot-v1",
    network: "devnet",
    genesisHash: DEVNET_GENESIS_HASH,
    commitment: "finalized",
    rpcHost: "api.devnet.solana.com",
    collectedAt: COLLECTED_AT,
    feeProbe: {
      latestBlockhash: "11111111111111111111111111111111",
      latestBlockhashSlot: 123,
      lastValidBlockHeight: 456,
      feeSlot: 124,
    },
    build: {
      recordPath: "artifacts/build/candidate/local-a/build-record.json",
      recordSha256: "1".repeat(64),
      executablePath: "artifacts/build/candidate/local-a/hakky_market.so",
      executableByteLength: 120_000,
      executableSha256: "2".repeat(64),
    },
    rent: {
      program36: "1141440",
      programData: {
        byteLength: 120_045,
        lamports: "836404080",
      },
      mint82: "1461600",
      state384: "3563520",
      token165: "2039280",
      metadata679: "5616720",
    },
    fees: {
      lamportsPerSignature: "5000",
      priorityMicroLamportsPerComputeUnit: "100000",
      computeUnitLimits: {
        deployCreateBuffer: 200_000,
        deployCreateProgram: 200_000,
        deployWrite: 200_000,
        deployFinalize: 200_000,
        initializeMarket: 1_400_000,
      },
    },
    deployment: {
      writeChunkBytes: 900,
      writeTransactionCount: 134,
    },
    policy: {
      automaticRetries: 0,
      refundsNettedBeforeFinality: false,
      externalBuyerWsolIncluded: false,
    },
    ...overrides,
  };
}

test("120KB permanent rent and maximum success prefix stay below one SOL", () => {
  const ledger = buildCostLedger(costSnapshot(), {
    evaluatedAt: EVALUATED_AT,
  });
  assert.equal(CREATOR_FUNDED_CAP_LAMPORTS, 1_000_000_000n);
  assert.equal(ledger.permanentRentLamports, "852265920");
  assert.equal(ledger.deploymentWriteTransactionCount, 134);
  assert.equal(ledger.maximumPrefixLamports, "855850920");
  assert.equal(ledger.capLamports, "1000000000");
  assert.equal(ledger.withinCap, true);
  assert.equal(
    evaluateCostLedger(ledger, { now: EVALUATED_AT }).ok,
    true,
  );
});

test("operation graph expands every failure/abandonment path without cycles or credits", () => {
  const ledger = buildCostLedger(costSnapshot(), {
    evaluatedAt: EVALUATED_AT,
  });
  const graph = evaluateOperationGraph(ledger.operationGraph);
  assert.equal(graph.ok, true);
  assert.equal(ledger.paths.length, 141);
  assert.equal(
    ledger.paths.filter((entry) =>
      /^deploy-write-[0-9]+-failure$/u.test(entry.terminalId),
    ).length,
    134,
  );
  assert.ok(
    ledger.paths.some((entry) => entry.terminalId === "abandon-buffer"),
  );
  assert.ok(
    ledger.paths.some((entry) => entry.terminalId === "abandon-program"),
  );
  assert.ok(
    ledger.paths.some((entry) => entry.terminalId === "initialize-failure"),
  );

  const cycle = structuredClone(ledger.operationGraph);
  cycle.nodes[0].parentId = cycle.nodes.at(-1).id;
  assert.equal(evaluateOperationGraph(cycle).ok, false);
  const unclassified = structuredClone(ledger.operationGraph);
  unclassified.nodes[1].debitClass = "mystery";
  assert.equal(evaluateOperationGraph(unclassified).ok, false);
});

test("one lamport over cap, duplicate retry, refund netting, and buyer funding fail", () => {
  const overCap = costSnapshot();
  overCap.rent.programData.lamports = "980553161";
  const overCapLedger = buildCostLedger(overCap, {
    evaluatedAt: EVALUATED_AT,
  });
  assert.equal(overCapLedger.maximumPrefixLamports, "1000000001");
  assert.equal(
    evaluateCostLedger(
      overCapLedger,
      { now: EVALUATED_AT },
    ).ok,
    false,
  );
  for (const mutate of [
    (value) => {
      value.policy.automaticRetries = 1;
    },
    (value) => {
      value.policy.refundsNettedBeforeFinality = true;
    },
    (value) => {
      value.policy.externalBuyerWsolIncluded = true;
    },
    (value) => {
      value.rpcHost = "api.mainnet-beta.solana.com";
    },
    (value) => {
      value.feeProbe.feeSlot = value.feeProbe.latestBlockhashSlot - 1;
    },
  ]) {
    const snapshot = costSnapshot();
    mutate(snapshot);
    assert.throws(() => buildCostLedger(snapshot), /cost-snapshot-invalid/u);
  }
});

test("failed initialization charges only its fee while success adds permanent market rent", () => {
  const ledger = buildCostLedger(costSnapshot(), {
    evaluatedAt: EVALUATED_AT,
  });
  const failed = ledger.paths.find(
    (entry) => entry.terminalId === "initialize-failure",
  );
  const succeeded = ledger.paths.find(
    (entry) => entry.terminalId === "initialize-success",
  );
  assert.ok(failed);
  assert.ok(succeeded);
  const postDeployPermanentRent =
    1_141_440n + 836_404_080n;
  const initializationPermanentRent =
    1_461_600n + 3_563_520n + 2n * 2_039_280n + 5_616_720n;
  assert.equal(
    BigInt(succeeded.cumulativeDebitLamports) -
      BigInt(failed.cumulativeDebitLamports),
    initializationPermanentRent,
  );
  assert.ok(
    BigInt(failed.cumulativeDebitLamports) > postDeployPermanentRent,
  );
});

test("cost evidence expires after the fixed finalized-read freshness window", () => {
  const ledger = buildCostLedger(costSnapshot(), {
    evaluatedAt: EVALUATED_AT,
  });
  assert.equal(
    evaluateCostLedger(ledger, {
      now: "2026-07-27T12:14:59.999Z",
    }).ok,
    true,
  );
  assert.equal(
    evaluateCostLedger(ledger, {
      now: "2026-07-27T12:15:00.001Z",
    }).ok,
    false,
  );
});

test("cost-ledger schema accepts only the closed non-authorizing report", async () => {
  const schema = JSON.parse(
    await readFile(
      new URL(
        "../schemas/release/cost-ledger-v1.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
    schema,
  );
  const ledger = buildCostLedger(costSnapshot(), {
    evaluatedAt: EVALUATED_AT,
  });
  assert.equal(validate(ledger), true, JSON.stringify(validate.errors));
  for (const mutate of [
    (value) => {
      value.mainnetActionsAuthorized = true;
    },
    (value) => {
      value.payment = "not-allowed";
    },
    (value) => {
      value.paths[0].creditLamports = "1";
    },
  ]) {
    const candidate = structuredClone(ledger);
    mutate(candidate);
    assert.equal(validate(candidate), false);
  }
});
