import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildLiveRecord,
  buildLiveRecordFile,
} from "../scripts/build-live-record.mjs";
import { validateCanonicalProofBinding } from "../src/canonical-proof.mjs";
import { LIVE_PROOF_FIELDS } from "../web/lib/launch-policy.js";
import {
  createCanonicalLaunchlabProof,
  createCanonicalMintProof,
  createValidLiveRecord,
  WEB_VERIFIED_AT,
} from "../test-support/launch-fixtures.mjs";

const prelaunch = JSON.parse(await readFile("web/data/launch.json", "utf8"));

test("builds the exact live schema entirely from prelaunch policy and canonical artifacts", () => {
  const mintProof = createCanonicalMintProof();
  const launchlabProof = createCanonicalLaunchlabProof();
  const live = buildLiveRecord({
    prelaunchRecord: prelaunch,
    mintProof,
    launchlabProof,
    verifiedAt: WEB_VERIFIED_AT,
  });

  assert.deepEqual(live, createValidLiveRecord(prelaunch));
  assert.deepEqual(Object.keys(live), ["schemaVersion", "status", "network", "project", "token", "launch", "proof"]);
  assert.deepEqual(Object.keys(live.project), ["name", "symbol", "personalProject"]);
  assert.deepEqual(Object.keys(live.token), [
    "mint",
    "program",
    "decimals",
    "supplyUi",
    "supplyBaseUnits",
    "mintAuthority",
    "freezeAuthority",
    "transferFeeBps",
    "transferHook",
    "blacklistControl",
    "permanentDelegate",
    "metadataImmutable",
    "metadataImage",
    "metadataWebsite",
    "metadataX",
  ]);
  assert.deepEqual(Object.keys(live.launch), [
    "platform",
    "quoteAsset",
    "curveAllocationBps",
    "liquidityAllocationBps",
    "teamAllocationBps",
    "presale",
    "vesting",
    "graduationTargetSol",
    "creatorFirstBuySol",
    "creatorFeeEnabled",
    "lpPolicy",
    "creatorSpendCapSol",
  ]);
  assert.deepEqual(Object.keys(live.proof), LIVE_PROOF_FIELDS);
  assert.deepEqual(validateCanonicalProofBinding(live, mintProof, launchlabProof), []);
});

test("requires the operator-supplied promotion timestamp and rejects non-exact source schemas", () => {
  const arguments_ = {
    prelaunchRecord: prelaunch,
    mintProof: createCanonicalMintProof(),
    launchlabProof: createCanonicalLaunchlabProof(),
  };
  assert.throws(() => buildLiveRecord(arguments_), /verifiedAt/);

  const changed = structuredClone(prelaunch);
  changed.operatorNote = "not part of schema";
  assert.throws(
    () => buildLiveRecord({ ...arguments_, prelaunchRecord: changed, verifiedAt: WEB_VERIFIED_AT }),
    /launch record has unexpected field operatorNote/,
  );
});

test("copies variable public evidence exactly instead of inventing live values", () => {
  const launchlabProof = createCanonicalLaunchlabProof();
  launchlabProof.metadataUri = "https://example.test/exact-runtime-metadata.json";
  launchlabProof.creatorSpendSol = 0.75;
  const live = buildLiveRecord({
    prelaunchRecord: prelaunch,
    mintProof: createCanonicalMintProof(),
    launchlabProof,
    verifiedAt: WEB_VERIFIED_AT,
  });
  assert.equal(live.proof.metadataUri, launchlabProof.metadataUri);
  assert.equal(live.proof.creatorSpendSol, launchlabProof.creatorSpendSol);
  assert.equal(live.proof.verifiedAt, WEB_VERIFIED_AT);
});

test("writes only after both canonical artifacts pass validation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-live-record-"));
  await mkdir(path.join(root, "web", "data"), { recursive: true });
  await mkdir(path.join(root, "proof"), { recursive: true });
  const source = `${JSON.stringify(prelaunch, null, 2)}\n`;
  await writeFile(path.join(root, "web", "data", "launch.json"), source);
  await writeFile(
    path.join(root, "proof", "mainnet-mint.json"),
    `${JSON.stringify(createCanonicalMintProof(), null, 2)}\n`,
  );
  const launchlabProof = createCanonicalLaunchlabProof();
  launchlabProof.ok = false;
  await writeFile(
    path.join(root, "proof", "mainnet-launchlab.json"),
    `${JSON.stringify(launchlabProof, null, 2)}\n`,
  );

  await assert.rejects(buildLiveRecordFile({ root, verifiedAt: WEB_VERIFIED_AT }), /ok must equal true/);
  assert.equal(await readFile(path.join(root, "web", "data", "launch.json"), "utf8"), source);

  launchlabProof.ok = true;
  await writeFile(
    path.join(root, "proof", "mainnet-launchlab.json"),
    `${JSON.stringify(launchlabProof, null, 2)}\n`,
  );
  const live = await buildLiveRecordFile({ root, verifiedAt: WEB_VERIFIED_AT });
  assert.deepEqual(
    JSON.parse(await readFile(path.join(root, "web", "data", "launch.json"), "utf8")),
    live,
  );
  assert.deepEqual(validateCanonicalProofBinding(
    live,
    createCanonicalMintProof(),
    createCanonicalLaunchlabProof(),
  ), []);
});

test("documents and exposes the deterministic operator command", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const livePlan = await readFile("docs/superpowers/plans/2026-07-22-hakky-live-launch.md", "utf8");
  const webReadme = await readFile("web/README.md", "utf8");
  assert.equal(packageJson.scripts["build:live-record"], "node scripts/build-live-record.mjs");
  assert.match(livePlan, /npm run build:live-record -- --verified-at/);
  assert.match(webReadme, /npm run build:live-record -- --verified-at/);
});
