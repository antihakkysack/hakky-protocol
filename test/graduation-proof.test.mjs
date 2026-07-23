import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  fetchGraduationEvidence,
  runGraduationVerifier,
} from "../src/graduation-proof.mjs";
import {
  readOptions,
  runFromCli,
} from "../scripts/verify-graduation.mjs";
import {
  createCanonicalLaunchlabProofV2,
  createCanonicalMintProofV2,
} from "../test-support/launch-fixtures.mjs";

function canonicalBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function validArgv() {
  const mint = createCanonicalMintProofV2();
  return [
    "--mint", mint.identities.mint,
    "--creator", mint.identities.creator,
    "--launch-id", mint.identities.launchId,
  ];
}

async function fixtureRoot({
  mint = createCanonicalMintProofV2(),
  launchlab = createCanonicalLaunchlabProofV2(),
  mintBytes = canonicalBytes(mint),
  launchlabBytes = canonicalBytes(launchlab),
} = {}) {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-graduation-proof-"));
  await mkdir(path.join(repositoryRoot, "proof"));
  await writeFile(path.join(repositoryRoot, "proof", "mainnet-mint.json"), mintBytes);
  await writeFile(path.join(repositoryRoot, "proof", "mainnet-launchlab.json"), launchlabBytes);
  return repositoryRoot;
}

test("graduation verifier returns source coverage unavailable and never publishes", async () => {
  let evidenceCalls = 0;
  let publications = 0;
  const options = readOptions(validArgv());
  const result = await runGraduationVerifier({
    argv: validArgv(),
    options,
    fetchEvidence: async (input) => {
      evidenceCalls += 1;
      assert.deepEqual(input.options, options);
      return Object.freeze({});
    },
    publishProof: async () => {
      publications += 1;
      throw new Error("publish must not be called");
    },
  });
  assert.deepEqual(result, {
    ok: false,
    code: "source-coverage-unavailable",
    reason: "cpmm-burn-scale-lp-rights-unmapped",
  });
  assert.equal(evidenceCalls, 1);
  assert.equal(publications, 0);
});

test("canonical graduation loader rejects absence and noncanonical proof bytes", async () => {
  const absentRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-graduation-absent-"));
  await mkdir(path.join(absentRoot, "proof"));
  try {
    await assert.rejects(
      fetchGraduationEvidence({
        repositoryRoot: absentRoot,
        options: readOptions(validArgv()),
      }),
      /canonical-artifact-read-failed/u,
    );
  } finally {
    await rm(absentRoot, { recursive: true, force: true });
  }

  const mint = createCanonicalMintProofV2();
  const noncanonicalRoot = await fixtureRoot({
    mint,
    mintBytes: JSON.stringify(mint),
  });
  try {
    await assert.rejects(
      fetchGraduationEvidence({
        repositoryRoot: noncanonicalRoot,
        options: readOptions(validArgv()),
      }),
      /canonical-artifact-noncanonical/u,
    );
  } finally {
    await rm(noncanonicalRoot, { recursive: true, force: true });
  }
});

test("canonical graduation loader binds exact artifact bytes, identities, and creation", async () => {
  const repositoryRoot = await fixtureRoot();
  try {
    const evidence = await fetchGraduationEvidence({
      repositoryRoot,
      options: readOptions(validArgv()),
    });
    assert.equal(evidence.mintArtifact.path, "proof/mainnet-mint.json");
    assert.equal(evidence.launchlabArtifact.path, "proof/mainnet-launchlab.json");
    assert.match(evidence.mintArtifact.sha256, /^[0-9a-f]{64}$/u);
    assert.match(evidence.launchlabArtifact.sha256, /^[0-9a-f]{64}$/u);

    const wrongOptions = {
      ...readOptions(validArgv()),
      mintAddress: "So11111111111111111111111111111111111111112",
    };
    await assert.rejects(
      fetchGraduationEvidence({ repositoryRoot, options: wrongOptions }),
      /canonical-proof-mismatch/u,
    );
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }

  const launchlab = createCanonicalLaunchlabProofV2();
  launchlab.transaction.signature = `${"1".repeat(63)}2`;
  const mismatchedRoot = await fixtureRoot({ launchlab });
  try {
    await assert.rejects(
      fetchGraduationEvidence({
        repositoryRoot: mismatchedRoot,
        options: readOptions(validArgv()),
      }),
      /canonical-proof-mismatch/u,
    );
  } finally {
    await rm(mismatchedRoot, { recursive: true, force: true });
  }
});

test("graduation CLI accepts only the three canonical artifact identities", async () => {
  const expected = createCanonicalMintProofV2().identities;
  assert.deepEqual(readOptions(validArgv()), {
    mintAddress: expected.mint,
    creatorAddress: expected.creator,
    launchId: expected.launchId,
  });
  for (const argv of [
    [...validArgv(), "--migration-transaction", "1".repeat(64)],
    [...validArgv(), "--pool", "11111111111111111111111111111111"],
    [...validArgv(), "--rpc", "https://api.mainnet-beta.solana.com/"],
    [...validArgv(), "--mint", expected.mint],
    validArgv().with(0, `--mint=${expected.mint}`),
  ]) {
    assert.throws(() => readOptions(argv), /cli-/u);
  }
});

test("graduation CLI validates the canonical pair and never publishes unavailable proof", async () => {
  const repositoryRoot = await fixtureRoot();
  let publications = 0;
  try {
    const result = await runFromCli({
      argv: validArgv(),
      repositoryRoot,
      publishProofImpl: async () => {
        publications += 1;
        throw new Error("publish must not be called");
      },
    });
    assert.deepEqual(result, {
      ok: false,
      code: "source-coverage-unavailable",
      reason: "cpmm-burn-scale-lp-rights-unmapped",
    });
    assert.equal(publications, 0);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
});
