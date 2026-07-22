import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ACTIVE_IDENTITY_FILES = [
  "README.md",
  "SECURITY.md",
  "package.json",
  "launch/README.md",
  "launch/prelaunch-post.md",
  "launch/x-profile.md",
  "web/index.html"
];

const PROHIBITED_CLAIM_PATTERN = /(?:(?<!not )\bverif(?:y|ies|ied)\b.{0,50}\b(?:all|every|good|bad|safe)\b(?:\s+[\p{L}\p{N}-]+){0,4}\s+transactions?\b(?!\?)|guaranteed?\s+scam\s+detector\b|guaranteed?\s+safe\b)/iu;

function assertNoProhibitedClaims(source) {
  assert.doesNotMatch(
    source,
    PROHIBITED_CLAIM_PATTERN,
    "public copy must not contain a prohibited universal or guaranteed claim"
  );
}

test("active public copy uses HakkyAgent and the approved risk boundary", async () => {
  const entries = await Promise.all(
    ACTIVE_IDENTITY_FILES.map(async (file) => [file, await readFile(file, "utf8")])
  );
  const combined = entries.map(([file, source]) => `\n--- ${file} ---\n${source}`).join("");

  assert.match(combined, /HakkyAgent verifies the facts\. You decide the risk\./);
  assert.doesNotMatch(combined, /AntiHakkySack|ANTIHAKKYSACK|Sack Sentinel|Agent 001/);
  assertNoProhibitedClaims(combined);
});

test("claim boundary rejects universal Solana transaction language", () => {
  for (const claim of [
    "HakkyAgent verifies every Solana transaction.",
    "HakkyAgent verifies every transaction.",
    "HakkyAgent verifies all public Solana transactions.",
    "HakkyAgent verifies good Solana transactions.",
    "HakkyAgent verifies bad transactions.",
    "HakkyAgent verifies safe on-chain transactions.",
    "HakkyAgent is a guarantee scam detector.",
    "HakkyAgent is a guaranteed scam detector.",
    "HakkyAgent is guaranteed safe."
  ]) {
    assert.throws(() => assertNoProhibitedClaims(claim), /prohibited universal or guaranteed claim/);
  }

  assertNoProhibitedClaims("HakkyAgent does not verify every Solana transaction.");
  assertNoProhibitedClaims("HakkyAgent verifies only published HAKKY launch facts.");
});

test("prelaunch README identifies policy values as planned commitments", async () => {
  const readme = await readFile("README.md", "utf8");

  assert.match(readme, /## Planned fair-launch commitments/);
  assert.match(
    readme,
    /Until canonical proof is published, these policy values are planned commitments:/
  );
});

test("account addresses stay unchanged during the identity rename", async () => {
  const profile = await readFile("launch/x-profile.md", "utf8");
  const site = await readFile("web/index.html", "utf8");
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  assert.match(profile, /Handle: `@antihakkysack`/);
  assert.match(site, /https:\/\/x\.com\/antihakkysack/);
  assert.equal(pkg.repository.url, "https://github.com/antihakkysack/hakky-protocol.git");
});
