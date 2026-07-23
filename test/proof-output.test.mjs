import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  publishJsonProof,
  resolveCanonicalGraduationProofPath,
  resolveCanonicalLaunchlabProofPath,
  resolveCanonicalMintProofPath,
} from "../src/proof-output.mjs";

test("canonical proof publisher supports only the three lifecycle artifact paths", async () => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-proof-output-"));
  await mkdir(path.join(repositoryRoot, "proof"));
  try {
    const targets = [
      resolveCanonicalMintProofPath({ repositoryRoot }),
      resolveCanonicalLaunchlabProofPath({ repositoryRoot }),
      resolveCanonicalGraduationProofPath({ repositoryRoot }),
    ];
    for (const [index, outputPath] of targets.entries()) {
      const proof = { index, ok: true };
      const receipt = await publishJsonProof(outputPath, proof, { repositoryRoot });
      assert.equal(receipt.published, true);
      assert.equal(receipt.outputPath, outputPath);
      assert.deepEqual(receipt.warnings, []);
      assert.equal(await readFile(outputPath, "utf8"), `${JSON.stringify(proof, null, 2)}\n`);
    }
    await assert.rejects(
      publishJsonProof(path.join(repositoryRoot, "proof", "other.json"), { ok: true }, { repositoryRoot }),
      /PUBLICATION_ERROR/,
    );
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
});
