import assert from "node:assert/strict";
import test from "node:test";
import { buildLaunchView } from "../web/lib/launch-view.js";
import {
  createPrelaunchRecordV2,
  createCurveLiveRecordV2,
  createGraduatedRecordV2,
} from "../test-support/launch-fixtures.mjs";

const EMPTY_DESTINATIONS = Object.freeze({
  solscanMint: null,
  solscanCreationTransaction: null,
  solscanGraduationTransaction: null,
  raydiumLaunchlab: null,
  raydiumPool: null,
});

test("prelaunch publishes no evidence or destination", () => {
  const view = buildLaunchView(createPrelaunchRecordV2());
  assert.equal(view.state, "prelaunch");
  assert.equal(view.verified, false);
  assert.equal(view.mint, null);
  assert.equal(view.heading, "PRE-LAUNCH: No official mint address exists yet - ignore impostors.");
  assert.equal(view.proof, null);
  assert.deepEqual(view.destinations, EMPTY_DESTINATIONS);
});

test("curve-live unavailable remains deployable without exposing evidence", () => {
  const record = createCurveLiveRecordV2({ availability: "unavailable" });
  const view = buildLaunchView(record);
  assert.equal(view.state, "unavailable");
  assert.equal(view.declaredStatus, "curve-live");
  assert.equal(view.heading, "VERIFICATION UNAVAILABLE");
  assert.equal(view.verified, false);
  assert.equal(view.proof, null);
  assert.deepEqual(view.destinations, EMPTY_DESTINATIONS);
});

test("verified curve-live retains its exact proof and canonical destinations", () => {
  const record = createCurveLiveRecordV2({ availability: "verified" });
  const view = buildLaunchView(record);
  assert.equal(view.state, "curve-live");
  assert.equal(view.heading, "CURVE LIVE - PROGRAM AUTHORITY ACTIVE");
  assert.equal(view.verified, true);
  assert.equal(view.mint, record.token.mint);
  assert.deepEqual(view.proof, record.proof);
  assert.notStrictEqual(view.proof, record.proof);
  assert.deepEqual(Object.keys(view.destinations), [
    "solscanMint",
    "solscanCreationTransaction",
    "solscanGraduationTransaction",
    "raydiumLaunchlab",
    "raydiumPool",
  ]);
  assert.deepEqual(Object.values(view.destinations), [
    record.proof.links.solscanMint,
    record.proof.links.solscanCreationTransaction,
    null,
    record.proof.links.raydiumLaunchlab,
    null,
  ]);
});

test("graduated unavailable never falls back to an apparently valid curve", () => {
  const view = buildLaunchView(createGraduatedRecordV2({ availability: "unavailable" }));
  assert.equal(view.state, "unavailable");
  assert.equal(view.declaredStatus, "graduated");
  assert.equal(view.heading, "VERIFICATION UNAVAILABLE");
  assert.equal(view.proof, null);
  assert.deepEqual(view.destinations, EMPTY_DESTINATIONS);
});

test("verified graduated exposes the canonical pool destination", () => {
  const record = createGraduatedRecordV2({ availability: "verified" });
  const view = buildLaunchView(record);
  assert.equal(view.state, "graduated");
  assert.equal(view.heading, "GRADUATED - FINAL STATE VERIFIED");
  assert.equal(view.verified, true);
  assert.equal(view.mint, record.token.mint);
  assert.deepEqual(view.proof, record.proof);
  assert.notStrictEqual(view.proof, record.proof);
  assert.equal(view.destinations.solscanMint, record.proof.links.solscanMint);
  assert.equal(view.destinations.solscanCreationTransaction, record.proof.links.solscanCreationTransaction);
  assert.equal(view.destinations.solscanGraduationTransaction, record.proof.links.solscanGraduationTransaction);
  assert.equal(view.destinations.raydiumPool, record.proof.links.raydiumPool);
});

test("schema-invalid input is rejected before presentation", () => {
  const record = createCurveLiveRecordV2({ availability: "verified" });
  record.proof.extra = true;
  assert.throws(() => buildLaunchView(record), /Invalid launch record/);
});

test("views are immutable snapshots of validated input", () => {
  const record = createCurveLiveRecordV2({ availability: "verified" });
  const view = buildLaunchView(record);
  const originalMintLink = view.destinations.solscanMint;
  record.proof.links.solscanMint = "https://example.invalid/mutated";
  assert.equal(view.destinations.solscanMint, originalMintLink);
  assert.notEqual(view.proof.links.solscanMint, record.proof.links.solscanMint);
  assert.throws(() => { view.destinations.solscanMint = "https://example.invalid/other"; }, TypeError);
  assert.throws(() => { view.proof.links.solscanMint = "https://example.invalid/other"; }, TypeError);
  assert.throws(() => { view.heading = "changed"; }, TypeError);
});
