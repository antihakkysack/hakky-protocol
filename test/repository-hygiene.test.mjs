import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanRepository } from "../scripts/check-repo.mjs";

test("detects disallowed agency attribution without storing the name in source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-hygiene-"));
  const disallowed = Buffer.from("ZnJlc2hkaWdpdGFs", "base64").toString("utf8");
  await writeFile(path.join(root, "README.md"), `Built by ${disallowed}`);
  const violations = await scanRepository(root);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "personal-project-only");
});

test("the repository contains no disallowed attribution or active legacy product", async () => {
  assert.deepEqual(await scanRepository(process.cwd()), []);
});
