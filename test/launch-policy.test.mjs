import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";
import {
  createCurveLiveRecordV2,
  createGraduatedRecordV2,
  createPrelaunchRecordV2,
} from "../test-support/launch-fixtures.mjs";

const committed = JSON.parse(await readFile(new URL("../web/data/launch.json", import.meta.url), "utf8"));

test("committed launch record is the canonical v2 prelaunch record", () => {
  assert.deepEqual(committed, createPrelaunchRecordV2());
  assert.deepEqual(validateLaunchRecord(committed), []);
});

test("semantic policy accepts every lifecycle and availability branch", () => {
  const records = [
    createPrelaunchRecordV2(),
    createCurveLiveRecordV2(),
    createCurveLiveRecordV2({ migrationType: "amm-v4" }),
    createCurveLiveRecordV2({ availability: "unavailable" }),
    createGraduatedRecordV2(),
    createGraduatedRecordV2({ migrationType: "amm-v4" }),
    createGraduatedRecordV2({ availability: "unavailable" }),
  ];
  for (const record of records) assert.deepEqual(validateLaunchRecord(record), []);
});

test("schema-invalid records fail closed with normalized browser-safe errors", () => {
  const changed = createCurveLiveRecordV2();
  changed.proof.metadata.extra = "claim";
  const issues = validateLaunchRecord(changed);
  assert.ok(issues.length > 0);
  assert.ok(issues.some((issue) => issue.includes("additionalProperties")));
  assert.ok(issues.every((issue) => !issue.includes("claim")));
});

test("verified records bind the stage, mint, source identities, transactions, and canonical links", () => {
  const mutations = [
    (changed) => { changed.proof.stage = "graduated"; },
    (changed) => { changed.token.mint = "SysvarRent111111111111111111111111111111111"; },
    (changed) => { changed.proof.sourceArtifacts.mint.path = "proof/other.json"; },
    (changed) => { changed.proof.transactions.creation.signature = "2".repeat(64); },
    (changed) => { changed.proof.links.solscanMint += "?cluster=devnet"; },
    (changed) => { changed.proof.fees.protocolSellFeeRateMillionths = "2"; },
    (changed) => { changed.proof.cost.cumulativeCreatorDebitLamports = "999"; },
  ];
  for (const mutate of mutations) {
    const changed = createCurveLiveRecordV2();
    mutate(changed);
    assert.notDeepEqual(validateLaunchRecord(changed), [], JSON.stringify(changed));
  }
});

test("unavailable records reject retained mint, destination, transaction, authority, balance, pool, and LP fields", () => {
  const mutations = [
    (changed) => { changed.token.mint = "11111111111111111111111111111111"; },
    (changed) => { changed.proof.links = {}; },
    (changed) => { changed.proof.transactions = {}; },
    (changed) => { changed.proof.authorities = {}; },
    (changed) => { changed.proof.creatorBalance = {}; },
    (changed) => { changed.proof.pool = {}; },
    (changed) => { changed.proof.lpDisposition = {}; },
  ];
  for (const mutate of mutations) {
    const changed = createGraduatedRecordV2({ availability: "unavailable" });
    mutate(changed);
    assert.notDeepEqual(validateLaunchRecord(changed), []);
  }
});

test("semantic policy rejects chronology, unsorted exhaustive arrays, and branch disagreement", () => {
  const chronology = createGraduatedRecordV2();
  chronology.proof.transactions.graduation.finalizedSlot = chronology.proof.transactions.creation.finalizedSlot - 1;
  assert.ok(validateLaunchRecord(chronology).some((issue) => issue.includes("chronology")));

  const staleCheck = createCurveLiveRecordV2();
  staleCheck.proof.observation.checkedAt = "2026-07-22T23:59:59.000Z";
  assert.ok(validateLaunchRecord(staleCheck).some((issue) => issue.includes("checkedAt")));

  const unsorted = createCurveLiveRecordV2();
  unsorted.proof.creatorBalance.accounts.reverse();
  assert.ok(validateLaunchRecord(unsorted).some((issue) => issue.includes("sorted")));

  const branch = createGraduatedRecordV2({ migrationType: "amm-v4" });
  branch.proof.lpDisposition.kind = "burn-and-earn";
  assert.notDeepEqual(validateLaunchRecord(branch), []);
});
