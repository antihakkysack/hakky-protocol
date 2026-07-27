import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildCurveLiveRecord,
  loadCurveProofArtifacts,
  validateCurveProofBinding,
} from "../src/canonical-proof.mjs";
import {
  buildCurveLiveRecordFile,
  parseArguments,
} from "../scripts/build-curve-live-record.mjs";
import {
  createCanonicalLaunchlabProofV2,
  createCanonicalMintProofV2,
  createCurveLiveRecordV2,
  createPrelaunchRecordV2,
} from "../test-support/launch-fixtures.mjs";
import { validateLaunchRecord } from "../src/legacy-launch-v2-policy.mjs";

const PUBLISHED_AT = "2026-07-23T00:03:00.000Z";

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function artifact(pathname, value) {
  const bytes = canonicalBytes(value);
  return {
    path: pathname,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    value,
  };
}

function curveArtifacts() {
  return {
    mintArtifact: artifact("proof/mainnet-mint.json", createCanonicalMintProofV2()),
    launchlabArtifact: artifact("proof/mainnet-launchlab.json", createCanonicalLaunchlabProofV2()),
  };
}

test("loads exact canonical bytes, validates schemas, and rejects a stale curve stage", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-curve-artifacts-"));
  await mkdir(path.join(root, "proof"));
  const mint = createCanonicalMintProofV2();
  const launchlab = createCanonicalLaunchlabProofV2();
  await writeFile(path.join(root, "proof", "mainnet-mint.json"), canonicalBytes(mint));
  await writeFile(path.join(root, "proof", "mainnet-launchlab.json"), canonicalBytes(launchlab));

  const loaded = await loadCurveProofArtifacts({ root });
  assert.deepEqual(loaded.mintArtifact, artifact("proof/mainnet-mint.json", mint));
  assert.deepEqual(loaded.launchlabArtifact, artifact("proof/mainnet-launchlab.json", launchlab));

  const opaqueFragment = ["operator", "credential", "fragment"].join("-");
  await writeFile(path.join(root, "proof", "mainnet-mint.json"), `${opaqueFragment}{`);
  await assert.rejects(
    loadCurveProofArtifacts({ root }),
    (error) => {
      assert.equal(error.message, "canonical-artifact-invalid-json: proof/mainnet-mint.json");
      assert.equal(error.message.includes(opaqueFragment), false);
      return true;
    },
  );

  await writeFile(path.join(root, "proof", "mainnet-mint.json"), canonicalBytes(mint));
  await writeFile(path.join(root, "proof", "mainnet-graduation.json"), "{}\n");
  await assert.rejects(loadCurveProofArtifacts({ root }), /curve-stage-stale/);
});

test("builds a schema-valid verified curve record entirely from artifact facts", () => {
  const sourceRecord = createPrelaunchRecordV2();
  const sourceBefore = structuredClone(sourceRecord);
  const artifacts = curveArtifacts();
  const record = buildCurveLiveRecord({
    sourceRecord,
    ...artifacts,
    publishedAt: PUBLISHED_AT,
  });
  assert.deepEqual(sourceRecord, sourceBefore);
  assert.equal(record.status, "curve-live");
  assert.equal(record.token.mint, artifacts.mintArtifact.value.identities.mint);
  assert.equal(record.proof.availability, "verified");
  assert.deepEqual(record.proof.sourceArtifacts, {
    mint: {
      path: artifacts.mintArtifact.path,
      sha256: artifacts.mintArtifact.sha256,
      schemaVersion: 2,
    },
    launchlab: {
      path: artifacts.launchlabArtifact.path,
      sha256: artifacts.launchlabArtifact.sha256,
      schemaVersion: 2,
    },
  });
  assert.deepEqual(record.proof.supply, artifacts.mintArtifact.value.supply);
  assert.deepEqual(record.proof.authorities, artifacts.mintArtifact.value.authorities);
  assert.deepEqual(record.proof.creatorBalance, artifacts.mintArtifact.value.creatorBalance);
  assert.deepEqual(record.proof.allocations, artifacts.launchlabArtifact.value.allocations);
  assert.deepEqual(record.proof.metadata, artifacts.launchlabArtifact.value.metadata);
  assert.equal(JSON.stringify(record).includes(PUBLISHED_AT), false);
  assert.deepEqual(validateLaunchRecord(record), []);
  assert.deepEqual(validateCurveProofBinding({ record, ...artifacts }), []);

  const unavailableSource = createCurveLiveRecordV2({ availability: "unavailable" });
  const promoted = buildCurveLiveRecord({
    sourceRecord: unavailableSource,
    ...artifacts,
    publishedAt: PUBLISHED_AT,
  });
  assert.equal(promoted.proof.availability, "verified");
  assert.equal(promoted.token.mint, artifacts.mintArtifact.value.identities.mint);
});

test("fails closed on unsupported source, extra input, bad publication time, or binding drift", () => {
  const artifacts = curveArtifacts();
  const base = {
    sourceRecord: createPrelaunchRecordV2(),
    ...artifacts,
    publishedAt: PUBLISHED_AT,
  };
  for (const mutate of [
    (input) => { input.extra = true; },
    (input) => { input.publishedAt = "not-a-time"; },
    (input) => { input.publishedAt = "2026-07-23T00:00:00.000Z"; },
    (input) => { input.sourceRecord = createCurveLiveRecordV2(); },
    (input) => { input.mintArtifact.sha256 = "0".repeat(64); },
    (input) => { input.launchlabArtifact.value.ok = false; },
  ]) {
    const input = structuredClone(base);
    mutate(input);
    assert.throws(() => buildCurveLiveRecord(input), /curve-/);
  }

  const record = buildCurveLiveRecord(base);
  record.proof.links.solscanMint += "?drift=1";
  assert.ok(validateCurveProofBinding({ record, ...artifacts })
    .some((issue) => issue.includes("links")));
});

test("operator command is exact and file promotion preserves the source until validation passes", async () => {
  assert.deepEqual(parseArguments(["--published-at", PUBLISHED_AT]), {
    publishedAt: PUBLISHED_AT,
  });
  for (const argv of [
    [],
    ["--published-at"],
    ["--published-at", PUBLISHED_AT, "--extra"],
    ["--verified-at", PUBLISHED_AT],
  ]) {
    assert.throws(() => parseArguments(argv), /Usage:/);
  }

  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-curve-record-"));
  await mkdir(path.join(root, "web", "data"), { recursive: true });
  await mkdir(path.join(root, "proof"));
  const launchPath = path.join(root, "web", "data", "launch.json");
  const sourceBytes = canonicalBytes(createPrelaunchRecordV2());
  await writeFile(launchPath, sourceBytes);
  await writeFile(
    path.join(root, "proof", "mainnet-mint.json"),
    canonicalBytes(createCanonicalMintProofV2()),
  );
  const invalidLaunchlab = createCanonicalLaunchlabProofV2();
  invalidLaunchlab.ok = false;
  await writeFile(
    path.join(root, "proof", "mainnet-launchlab.json"),
    canonicalBytes(invalidLaunchlab),
  );
  await assert.rejects(
    buildCurveLiveRecordFile({ root, publishedAt: PUBLISHED_AT }),
    /canonical-artifact-schema-invalid/,
  );
  assert.deepEqual(await readFile(launchPath), sourceBytes);

  await writeFile(
    path.join(root, "proof", "mainnet-launchlab.json"),
    canonicalBytes(createCanonicalLaunchlabProofV2()),
  );
  const record = await buildCurveLiveRecordFile({ root, publishedAt: PUBLISHED_AT });
  assert.deepEqual(JSON.parse(await readFile(launchPath, "utf8")), record);
  assert.deepEqual(validateLaunchRecord(record), []);
});
