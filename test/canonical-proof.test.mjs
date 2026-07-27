import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  rm,
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
import { checkSite } from "../scripts/check-site.mjs";
import {
  createCanonicalLaunchlabProofV2,
  createCanonicalMintProofV2,
  createCurveLiveRecordV2,
  createPrelaunchRecordV2,
} from "../test-support/launch-fixtures.mjs";

const PUBLISHED_AT = "2026-07-23T00:03:00.000Z";

function bytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function descriptor(pathname, value) {
  return {
    path: pathname,
    sha256: createHash("sha256").update(bytes(value)).digest("hex"),
    value,
  };
}

async function siteRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-site-proof-"));
  await cp("web", path.join(root, "web"), { recursive: true });
  return root;
}

test("immutable prelaunch never reads retired canonical LaunchLab artifacts", async () => {
  const root = await siteRoot();
  await mkdir(path.join(root, "proof"));
  await writeFile(
    path.join(root, "proof", "mainnet-mint.json"),
    bytes(createCanonicalMintProofV2()),
  );
  await writeFile(
    path.join(root, "proof", "mainnet-launchlab.json"),
    bytes(createCanonicalLaunchlabProofV2()),
  );

  const result = await checkSite({ root });

  assert.deepEqual(result, {
    ok: true,
    missing: [],
    issues: [],
    safetyIssues: [],
  });
  assert.equal(Object.hasOwn(result, "canonicalProofs"), false);
  assert.equal(Object.hasOwn(result, "canonicalIssues"), false);
});

test("retired v2 curve records cannot reactivate the immutable public site", async () => {
  const root = await siteRoot();
  await mkdir(path.join(root, "proof"));
  await writeFile(
    path.join(root, "web", "data", "launch.json"),
    bytes(createCurveLiveRecordV2({ availability: "verified" })),
  );
  await writeFile(
    path.join(root, "proof", "mainnet-mint.json"),
    bytes(createCanonicalMintProofV2()),
  );
  await writeFile(
    path.join(root, "proof", "mainnet-launchlab.json"),
    bytes(createCanonicalLaunchlabProofV2()),
  );

  const result = await checkSite({ root });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => (
    issue.startsWith("web/data/launch.json:")
  )));
  assert.equal(Object.hasOwn(result, "canonicalProofs"), false);
  assert.equal(Object.hasOwn(result, "canonicalIssues"), false);
});

test("retired curve builder remains exactly artifact-bound until deletion", async () => {
  const root = await siteRoot();
  await mkdir(path.join(root, "proof"));
  const mint = createCanonicalMintProofV2();
  const launchlab = createCanonicalLaunchlabProofV2();
  const mintArtifact = descriptor("proof/mainnet-mint.json", mint);
  const launchlabArtifact = descriptor("proof/mainnet-launchlab.json", launchlab);
  const record = buildCurveLiveRecord({
    sourceRecord: createPrelaunchRecordV2(),
    mintArtifact,
    launchlabArtifact,
    publishedAt: PUBLISHED_AT,
  });

  assert.deepEqual(validateCurveProofBinding({
    record,
    mintArtifact,
    launchlabArtifact,
  }), []);

  await writeFile(path.join(root, mintArtifact.path), bytes(mint));
  await writeFile(path.join(root, launchlabArtifact.path), bytes(launchlab));
  const loaded = await loadCurveProofArtifacts({ root });
  assert.deepEqual(validateCurveProofBinding({
    record,
    mintArtifact: loaded.mintArtifact,
    launchlabArtifact: loaded.launchlabArtifact,
  }), []);

  await rm(path.join(root, launchlabArtifact.path));
  await assert.rejects(
    loadCurveProofArtifacts({ root }),
    /canonical-artifact-read-failed: proof\/mainnet-launchlab\.json/u,
  );
});
