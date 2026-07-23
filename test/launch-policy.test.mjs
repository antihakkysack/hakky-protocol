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

test("public graduation correlates pool programs with both LP mechanisms", () => {
  const cpmmWithAmmPool = createGraduatedRecordV2();
  cpmmWithAmmPool.proof.pool.programId = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
  assert.notDeepEqual(validateLaunchRecord(cpmmWithAmmPool), []);

  const ammWithCpmmPool = createGraduatedRecordV2({ migrationType: "amm-v4" });
  ammWithCpmmPool.proof.pool.programId = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
  assert.notDeepEqual(validateLaunchRecord(ammWithCpmmPool), []);
});

test("public proof identities require canonical Solana decoded lengths", () => {
  const badPublicKey = "2".repeat(32);
  const invalidOwner = createCurveLiveRecordV2();
  invalidOwner.proof.creatorBalance.owner = badPublicKey;
  invalidOwner.proof.metadata.updateAuthority = badPublicKey;
  for (const account of invalidOwner.proof.creatorBalance.accounts) account.owner = badPublicKey;
  assert.notDeepEqual(validateLaunchRecord(invalidOwner), []);

  const invalidSignature = createCurveLiveRecordV2();
  invalidSignature.proof.transactions.creation.signature = "2".repeat(64);
  invalidSignature.proof.links.solscanCreationTransaction = `https://solscan.io/tx/${"2".repeat(64)}`;
  assert.notDeepEqual(validateLaunchRecord(invalidSignature), []);

  const invalidAlphabet = createCurveLiveRecordV2();
  invalidAlphabet.proof.metadata.updateAuthority = "0".repeat(32);
  assert.notDeepEqual(validateLaunchRecord(invalidAlphabet), []);
});

test("public observations reject impossible dates and creator-balance chronology gaps", () => {
  const impossible = createCurveLiveRecordV2();
  impossible.proof.observation.checkedAt = "2026-02-30T00:01:01.000Z";
  assert.notDeepEqual(validateLaunchRecord(impossible), []);

  const stale = createCurveLiveRecordV2();
  stale.proof.creatorBalance.finalizedSlot = stale.proof.transactions.creation.finalizedSlot - 1;
  stale.proof.creatorBalance.finalizedAt = "2026-07-23T00:00:59.000Z";
  assert.notDeepEqual(validateLaunchRecord(stale), []);

  const afterCheck = createGraduatedRecordV2();
  afterCheck.proof.creatorBalance.finalizedAt = "2026-07-23T00:02:02.000Z";
  assert.notDeepEqual(validateLaunchRecord(afterCheck), []);
});

test("public graduation threshold is exact and duplicate creator accounts fail closed", () => {
  const threshold = createGraduatedRecordV2();
  threshold.proof.graduation.configuredThresholdLamports = "23999999999";
  assert.notDeepEqual(validateLaunchRecord(threshold), []);

  const duplicate = createCurveLiveRecordV2();
  duplicate.proof.creatorBalance.accounts.push(structuredClone(duplicate.proof.creatorBalance.accounts[0]));
  duplicate.proof.creatorBalance.accounts.sort((left, right) => left.address.localeCompare(right.address));
  assert.notDeepEqual(validateLaunchRecord(duplicate), []);
});

test("generated public validation accepts canonical Arweave and rejects DAG-PB metadata identities", () => {
  const arweave = createCurveLiveRecordV2();
  arweave.proof.metadata.uri = "https://arweave.net/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  arweave.proof.metadata.imageUri = "https://arweave.net/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  assert.deepEqual(validateLaunchRecord(arweave), []);

  const dagPb = createCurveLiveRecordV2();
  dagPb.proof.metadata.uri = "ipfs://bafybeigdyrzt5sfp7udm7hu76n2xrv3zku7eao4n6x7j5rjmw2b5uvzq4";
  assert.notDeepEqual(validateLaunchRecord(dagPb), []);
});
