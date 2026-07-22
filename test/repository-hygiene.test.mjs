import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanRepository } from "../scripts/check-repo.mjs";

async function scanFixture(files, { trackedFiles = Object.keys(files) } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-hygiene-"));
  for (const [relative, contents] of Object.entries(files)) {
    const file = path.join(root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, contents);
  }
  return scanRepository(root, { trackedFiles });
}

test("detects disallowed agency attribution without storing the name in source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-hygiene-"));
  const disallowed = Buffer.from("ZnJlc2hkaWdpdGFs", "base64").toString("utf8");
  await writeFile(path.join(root, "README.md"), `Built by ${disallowed}`);
  const violations = await scanRepository(root, { trackedFiles: ["README.md"] });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "personal-project-only");
});

test("detects an active legacy product marker without storing it in source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-hygiene-"));
  const legacyMarker = Buffer.from("c29saWRpdHk=", "base64").toString("utf8");
  await writeFile(path.join(root, "README.md"), `Built with ${legacyMarker}`);
  const violations = await scanRepository(root, { trackedFiles: ["README.md"] });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "legacy-product-active");
});

test("detects expanded active legacy vocabulary while excluding historical design records", async () => {
  const decodedMarkers = [
    "Yml0Y29pbg==",
    "ZXRoZXJldW0=",
    "cHJvb2Ygb2YgcmVzZXJ2ZXM=",
    "UmVzZXJ2ZVZhdWx0",
    "cHJvdmVuYW5jZQ==",
    "Y29tcGxpYW5jZQ==",
  ].map((value) => Buffer.from(value, "base64").toString("utf8"));
  const contents = decodedMarkers.join(" | ");
  const violations = await scanFixture({
    "README.md": contents,
    "docs/superpowers/specs/history.md": contents,
  });
  assert.deepEqual(violations, [{ file: "README.md", rule: "legacy-product-active" }]);
});

test("detects credential assignments, private-key material, mnemonic phrases, wallet arrays, and service tokens", async () => {
  const credentialName = ["API", "KEY"].join("_");
  const headerFixture = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
  const footerFixture = ["-----END ", "PRIVATE KEY-----"].join("");
  const phraseAssignmentName = ["seed", "phrase"].join("_");
  const phraseFixture = Array.from({ length: 12 }, (_, index) => `fixtureword${String.fromCharCode(97 + index)}`).join(" ");
  const serviceFixture = ["ghp", "_", "A".repeat(36)].join("");
  const fixtures = {
    ".env.production": `${credentialName}=${"a".repeat(32)}\n`,
    "signing.pem": `${headerFixture}\n${"A".repeat(48)}\n${footerFixture}\n`,
    "recovery.txt": `${phraseAssignmentName}=${phraseFixture}\n`,
    "wallet-key.json": JSON.stringify(Array.from({ length: 64 }, (_, index) => index)),
    "service.txt": `token=${serviceFixture}\n`,
  };
  const violations = await scanFixture(fixtures);
  const rules = new Set(violations.map(({ rule }) => rule));
  for (const rule of [
    "secret-credential-assignment",
    "secret-private-key-material",
    "secret-mnemonic-phrase",
    "secret-wallet-key-array",
    "secret-service-token",
  ]) {
    assert.ok(rules.has(rule), `${rule} was not detected`);
  }
});

test("credential assignments cannot hide behind names, uppercase literals, or public URLs", async () => {
  const assignmentName = ["API", "KEY"].join("_");
  const colonAssignmentName = ["API", "KEY"].join(":");
  const definitionLikeAssignmentName = [assignmentName, "PATTERN"].join("_");
  const opaqueUppercase = "A".repeat(32);
  const opaqueLowercase = ["lowercase", "opaque", "value"].join("-");
  const opaqueUrl = ["https://example.com", "opaque-secret-path"].join("/");

  assert.deepEqual(await scanFixture({
    "colon.env": `${colonAssignmentName}=${opaqueLowercase}\n`,
    "lowercase-pattern.env": `${definitionLikeAssignmentName}=${opaqueLowercase}\n`,
    "uppercase.env": `${assignmentName}=${opaqueUppercase}\n`,
    "url.env": `token=${opaqueUrl}\n`,
  }), [
    { file: "colon.env", rule: "secret-credential-assignment" },
    { file: "lowercase-pattern.env", rule: "secret-credential-assignment" },
    { file: "uppercase.env", rule: "secret-credential-assignment" },
    { file: "url.env", rule: "secret-credential-assignment" },
  ]);
});

test("explicit placeholder and environment-reference allowlist avoids false positives", async () => {
  const environmentName = ["API", "KEY"].join("_");
  const boundReferenceName = ["RUNTIME", "CREDENTIAL", "REFERENCE"].join("_");
  const githubReference = ["${{", "secrets.DEPLOY_TOKEN", "}}"].join(" ");
  const safe = [
    `const apiKey = process.env.${environmentName};`,
    `const ${boundReferenceName} = process.env.${environmentName};`,
    `apiKey=${boundReferenceName}`,
    `${environmentName}=REDACTED`,
    ["password", "change-me"].join("="),
    ["client_secret", "${SECRET_FROM_ENV}"].join("="),
    `token=${githubReference}`,
    `${environmentName}=<API_KEY>`,
  ].join("\n");
  assert.deepEqual(await scanFixture({ "safe-fixtures.txt": safe }), []);
});

test("repository scan is deterministic and ignores untracked files", async () => {
  const credentialName = ["API", "KEY"].join("_");
  const violations = await scanFixture({
    "tracked.txt": "public information\n",
    "untracked.env": `${credentialName}=${"b".repeat(32)}\n`,
  }, { trackedFiles: ["tracked.txt"] });
  assert.deepEqual(violations, []);
});

test("Pages deployment has no manual dispatch and still depends on reusable quality", async () => {
  const workflow = await readFile(".github/workflows/pages.yml", "utf8");
  assert.doesNotMatch(workflow, /workflow_dispatch/);
  assert.match(workflow, /quality:\s+[\s\S]*uses: \.\/\.github\/workflows\/quality\.yml/);
  assert.match(workflow, /deploy:\s+[\s\S]*needs: quality/);
});

test("legacy contracts and services ignore remnants are not tracked", async () => {
  for (const file of ["contracts/.gitignore", "services/.gitignore", "services/.dockerignore"]) {
    await assert.rejects(access(file), { code: "ENOENT" });
  }
});

test("the repository contains no disallowed attribution or active legacy product", async () => {
  assert.deepEqual(await scanRepository(process.cwd()), []);
});
