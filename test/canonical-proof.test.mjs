import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  loadCanonicalProofsForLaunch,
  validateCanonicalProofBinding,
} from "../src/canonical-proof.mjs";
import { checkSite } from "../scripts/check-site.mjs";
import {
  createCanonicalLaunchlabProof,
  createCanonicalMintProof,
  createValidLiveRecord,
} from "../test-support/launch-fixtures.mjs";

const prelaunch = JSON.parse(await readFile("web/data/launch.json", "utf8"));

test("site checker keeps current prelaunch valid without canonical proof artifacts", async () => {
  const result = await checkSite({ root: process.cwd() });
  assert.equal(result.ok, true);
  assert.deepEqual(result.canonicalProofs, { mintProof: null, launchlabProof: null });
});

test("accepts strict canonical mint and LaunchLab proofs bound to the live web record", () => {
  const issues = validateCanonicalProofBinding(
    createValidLiveRecord(prelaunch),
    createCanonicalMintProof(),
    createCanonicalLaunchlabProof(),
  );
  assert.deepEqual(issues, []);
});

test("requires exact supported schemas, ok true, and no unversioned fields", () => {
  const mintProof = createCanonicalMintProof();
  const launchlabProof = createCanonicalLaunchlabProof();
  mintProof.schemaVersion = 2;
  mintProof.ok = false;
  launchlabProof.extraClaim = true;
  delete launchlabProof.metadataImage;
  const issues = validateCanonicalProofBinding(
    createValidLiveRecord(prelaunch),
    mintProof,
    launchlabProof,
  );
  assert.ok(issues.includes("mainnet mint proof schemaVersion must equal 1"));
  assert.ok(issues.includes("mainnet mint proof ok must equal true"));
  assert.ok(issues.includes("mainnet LaunchLab proof has unexpected field extraClaim"));
  assert.ok(issues.includes("mainnet LaunchLab proof requires metadataImage"));
});

test("cross-checks every published launch fact against its canonical proof", () => {
  const cases = [
    ["mint", (mint) => { mint.observed.mint = "SysvarRent111111111111111111111111111111111"; }],
    ["creator", (mint) => { mint.creator = "11111111111111111111111111111111"; }],
    ["supplyBaseUnits", (mint) => { mint.observed.supplyBaseUnits = "999"; }],
    ["decimals", (mint) => { mint.observed.decimals = 5; }],
    ["mintAuthority", (mint) => { mint.observed.mintAuthority = "11111111111111111111111111111111"; }],
    ["freezeAuthority", (mint) => { mint.observed.freezeAuthority = "11111111111111111111111111111111"; }],
    ["creatorBalanceBaseUnits", (mint) => { mint.observed.creatorBalanceBaseUnits = "1"; }],
    ["mintVerifiedAt", (mint) => { mint.checkedAt = "2026-07-22T00:00:01.000Z"; }],
    ["launchId", (_mint, launch) => { launch.launchId = "11111111111111111111111111111111"; }],
    ["launchTransaction", (_mint, launch) => { launch.launchTransaction = "2".repeat(64); }],
    ["raydiumUrl", (_mint, launch) => { launch.raydiumUrl += "&unexpected=1"; }],
    ["solscanUrl", (_mint, launch) => { launch.solscanUrl += "?unexpected=1"; }],
    ["solscanTransactionUrl", (_mint, launch) => { launch.solscanTransactionUrl += "?unexpected=1"; }],
    ["metadataUri", (_mint, launch) => { launch.metadataUri = "https://example.test/metadata.json"; }],
    ["metadataImage", (_mint, launch) => { launch.metadataImage = "https://example.test/token.png"; }],
    ["metadataImmutable", (_mint, launch) => { launch.metadataImmutable = false; }],
    ["curveAllocationBps", (_mint, launch) => { launch.curveAllocationBps = 7999; }],
    ["liquidityAllocationBps", (_mint, launch) => { launch.liquidityAllocationBps = 2001; }],
    ["teamAllocationBps", (_mint, launch) => { launch.teamAllocationBps = 1; }],
    ["creatorFeeEnabled", (_mint, launch) => { launch.creatorFeeEnabled = true; }],
    ["lpPolicy", (_mint, launch) => { launch.lpPolicy = "retain"; }],
    ["graduationTargetSol", (_mint, launch) => { launch.graduationTargetSol = 25; }],
    ["quoteAsset", (_mint, launch) => { launch.quoteAsset = "USDC"; }],
    ["creatorSpendSol", (_mint, launch) => { launch.creatorSpendSol = 1.01; }],
    ["launchVerifiedAt", (_mint, launch) => { launch.checkedAt = "2026-07-22T00:01:01.000Z"; }],
  ];

  for (const [field, mutate] of cases) {
    const mintProof = createCanonicalMintProof();
    const launchlabProof = createCanonicalLaunchlabProof();
    mutate(mintProof, launchlabProof);
    const issues = validateCanonicalProofBinding(
      createValidLiveRecord(prelaunch),
      mintProof,
      launchlabProof,
    );
    assert.ok(issues.some((issue) => issue.includes(field)), `${field} was not cross-checked`);
  }
});

test("rejects canonical timestamp mismatch and reversed verification order", () => {
  const record = createValidLiveRecord(prelaunch);
  const mintProof = createCanonicalMintProof();
  const launchlabProof = createCanonicalLaunchlabProof();
  mintProof.checkedAt = "2026-07-22T00:03:00.000Z";
  record.proof.mintVerifiedAt = mintProof.checkedAt;
  record.proof.launchVerifiedAt = launchlabProof.checkedAt;
  record.proof.verifiedAt = "2026-07-22T00:04:00.000Z";
  const reversed = validateCanonicalProofBinding(record, mintProof, launchlabProof);
  assert.ok(reversed.includes("canonical proof timestamps must satisfy mint checkedAt <= LaunchLab checkedAt"));

  mintProof.checkedAt = "2026-07-22T00:00:01.000Z";
  const mismatched = validateCanonicalProofBinding(
    createValidLiveRecord(prelaunch),
    mintProof,
    launchlabProof,
  );
  assert.ok(mismatched.some((issue) => issue.includes("mintVerifiedAt")));
});

test("prelaunch does not read or require canonical proof files", async () => {
  let reads = 0;
  const result = await loadCanonicalProofsForLaunch(prelaunch, {
    root: "unused",
    readFileImpl: async () => {
      reads += 1;
      throw new Error("must not read proof files");
    },
  });
  assert.deepEqual(result, { mintProof: null, launchlabProof: null });
  assert.equal(reads, 0);
});

test("live loads and parses both exact canonical proof paths", async () => {
  const requested = [];
  const byName = new Map([
    ["mainnet-mint.json", createCanonicalMintProof()],
    ["mainnet-launchlab.json", createCanonicalLaunchlabProof()],
  ]);
  const result = await loadCanonicalProofsForLaunch(createValidLiveRecord(prelaunch), {
    root: "project-root",
    readFileImpl: async (file) => {
      const normalized = String(file).replaceAll("\\", "/");
      requested.push(normalized);
      return JSON.stringify(byName.get(normalized.split("/").at(-1)));
    },
  });
  assert.deepEqual(requested.map((file) => file.split("/").slice(-2).join("/")), [
    "proof/mainnet-mint.json",
    "proof/mainnet-launchlab.json",
  ]);
  assert.equal(result.mintProof.ok, true);
  assert.equal(result.launchlabProof.ok, true);
});

test("live rejects malformed canonical proof JSON", async () => {
  await assert.rejects(
    loadCanonicalProofsForLaunch(createValidLiveRecord(prelaunch), {
      root: "project-root",
      readFileImpl: async () => "{not-json",
    }),
    /Cannot parse canonical proof\/mainnet-mint.json/,
  );
});

test("live site checker requires both canonical proof files and validates their binding", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-live-site-"));
  await cp("web", path.join(root, "web"), { recursive: true });
  await mkdir(path.join(root, "proof"));
  await writeFile(
    path.join(root, "web", "data", "launch.json"),
    `${JSON.stringify(createValidLiveRecord(prelaunch), null, 2)}\n`,
  );
  await writeFile(
    path.join(root, "proof", "mainnet-mint.json"),
    `${JSON.stringify(createCanonicalMintProof(), null, 2)}\n`,
  );
  await writeFile(
    path.join(root, "proof", "mainnet-launchlab.json"),
    `${JSON.stringify(createCanonicalLaunchlabProof(), null, 2)}\n`,
  );
  assert.equal((await checkSite({ root })).ok, true);

  await rm(path.join(root, "proof", "mainnet-launchlab.json"));
  const missing = await checkSite({ root });
  assert.equal(missing.ok, false);
  assert.ok(missing.canonicalIssues.some((issue) => issue.includes("proof/mainnet-launchlab.json")));
});
