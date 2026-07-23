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

test("prelaunch and unavailable states require no canonical artifact reads", async () => {
  const current = await checkSite({ root: process.cwd() });
  assert.equal(current.ok, true);
  assert.deepEqual(current.canonicalProofs, {
    mintArtifact: null,
    launchlabArtifact: null,
    graduationArtifact: null,
  });

  const root = await siteRoot();
  await writeFile(
    path.join(root, "web", "data", "launch.json"),
    bytes(createCurveLiveRecordV2({ availability: "unavailable" })),
  );
  const unavailable = await checkSite({ root });
  assert.equal(unavailable.ok, true);
  assert.deepEqual(unavailable.canonicalProofs, {
    mintArtifact: null,
    launchlabArtifact: null,
    graduationArtifact: null,
  });
});

test("verified curve site is bound to exact canonical artifact bytes", async () => {
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
  await writeFile(path.join(root, "web", "data", "launch.json"), bytes(record));
  await writeFile(path.join(root, mintArtifact.path), bytes(mint));
  await writeFile(path.join(root, launchlabArtifact.path), bytes(launchlab));

  const verified = await checkSite({ root });
  assert.equal(verified.ok, true);
  assert.deepEqual(validateCurveProofBinding({
    record,
    mintArtifact: verified.canonicalProofs.mintArtifact,
    launchlabArtifact: verified.canonicalProofs.launchlabArtifact,
  }), []);

  await rm(path.join(root, launchlabArtifact.path));
  const missing = await checkSite({ root });
  assert.equal(missing.ok, false);
  assert.ok(missing.canonicalIssues.some((issue) => (
    issue === "canonical-artifact-read-failed: proof/mainnet-launchlab.json"
  )));
});
