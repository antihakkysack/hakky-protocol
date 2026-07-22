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

test("active public copy uses HakkyAgent and the approved risk boundary", async () => {
  const entries = await Promise.all(
    ACTIVE_IDENTITY_FILES.map(async (file) => [file, await readFile(file, "utf8")])
  );
  const combined = entries.map(([file, source]) => `\n--- ${file} ---\n${source}`).join("");

  assert.match(combined, /HakkyAgent verifies the facts\. You decide the risk\./);
  assert.doesNotMatch(combined, /AntiHakkySack|ANTIHAKKYSACK|Sack Sentinel|Agent 001/);
  assert.doesNotMatch(
    combined,
    /(?:verif(?:y|ies|ied).{0,50}(?:all|every|good|bad|safe) transactions?|guaranteed? scam detector|guaranteed? safe)/i
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
