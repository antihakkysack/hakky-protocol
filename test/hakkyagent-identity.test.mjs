import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasUnsupportedAgentClaim } from "../src/agent-claim-boundary.mjs";

const ACTIVE_IDENTITY_FILES = [
  "README.md",
  "SECURITY.md",
  "docs/LAUNCH.md",
  "docs/TOKEN.md",
  "docs/superpowers/plans/2026-07-22-hakky-live-launch.md",
  "package.json",
  "launch/README.md",
  "launch/prelaunch-post.md",
  "launch/x-profile.md",
  "proof/README.md",
  "src/social-copy.mjs",
  "web/index.html"
];

const RETIRED_AGENT_MARKERS = [
  "QW50aUhha2t5U2Fjaw==",
  "QU5USUhBS0tZU0FDSw==",
  "U2FjayBTZW50aW5lbA==",
  "QWdlbnQgMDAx"
].map((value) => Buffer.from(value, "base64").toString("utf8"));

function assertNoProhibitedClaims(source) {
  assert.equal(
    hasUnsupportedAgentClaim(source),
    false,
    "public copy must not contain a prohibited universal or guaranteed claim",
  );
}

test("active public copy uses HakkyAgent and the approved risk boundary", async () => {
  const entries = await Promise.all(
    ACTIVE_IDENTITY_FILES.map(async (file) => [file, await readFile(file, "utf8")])
  );
  const combined = entries.map(([file, source]) => `\n--- ${file} ---\n${source}`).join("");

  assert.match(combined, /HakkyAgent verifies the facts\. You decide the risk\./);
  for (const retiredMarker of RETIRED_AGENT_MARKERS) {
    assert.ok(!combined.includes(retiredMarker), `active public copy contains retired agent marker: ${retiredMarker}`);
  }
  assertNoProhibitedClaims(combined);
});

test("operator documents use HakkyAgent and the approved launch wording", async () => {
  const launchPolicy = await readFile("docs/LAUNCH.md", "utf8");
  const proofGuide = await readFile("proof/README.md", "utf8");
  const livePlan = await readFile("docs/superpowers/plans/2026-07-22-hakky-live-launch.md", "utf8");

  for (const [file, source] of [
    ["docs/LAUNCH.md", launchPolicy],
    ["proof/README.md", proofGuide],
    ["docs/superpowers/plans/2026-07-22-hakky-live-launch.md", livePlan]
  ]) {
    assert.match(source, /HakkyAgent/, `${file} must use the active agent identity`);
    for (const retiredMarker of RETIRED_AGENT_MARKERS) {
      assert.ok(!source.includes(retiredMarker), `${file} contains a retired agent marker`);
    }
  }

  assert.match(livePlan, /Topics: solana, meme-coin, fair-launch, hakky, hakkyagent/);
  assert.match(livePlan, /approved prelaunch experience/);
  assert.doesNotMatch(livePlan, /verified prelaunch/);
  assert.match(livePlan, /all launch-related transaction signatures/);
  assert.doesNotMatch(livePlan, /all transaction signatures/);
});

test("claim boundary rejects universal Solana transaction language", () => {
  for (const claim of [
    "HakkyAgent verifies every Solana transaction.",
    "HakkyAgent\nverifies every transaction.",
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
  assertNoProhibitedClaims("HakkyAgent does not verify every transaction.");
  assertNoProhibitedClaims("HakkyAgent is not a guaranteed scam detector.");
  assertNoProhibitedClaims("HakkyAgent verifies only published HAKKY launch facts.");
});

test("claim boundary rejects every prohibited class after Unicode and invisible normalization", () => {
  for (const claim of [
    "HakkyAgent labels transactions as good or bad.",
    "HakkyAgent audits arbitrary tokens.",
    "HakkyAgent predicts scams.",
    "HakkyAgent removes financial risk.",
    "HakkyAgent provides universal transaction verification.",
    "HakkyAgent offers verification for every transaction.",
    "HakkyAgent verifies transactions universally.",
    "HakkyAgent verifies all transactions.",
    "HakkyAgent guarantees safety.",
    "HakkyAgent guarantees scam detection.",
    "HakkyAgent is a scam detector.",
    "HakkyAgent guarantees returns.",
    "Hakky\u200bAgent verifies ev\u2060ery transaction.",
    "HakkyAgent au\u202edits arbitrary tokens.",
    "\uff28\uff41\uff4b\uff4b\uff59\uff21\uff47\uff45\uff4e\uff54 predicts scams.",
  ]) {
    assert.throws(() => assertNoProhibitedClaims(claim), /prohibited universal or guaranteed claim/);
  }
});

test("claim boundary decodes rendered numeric, hexadecimal, and named character references", () => {
  for (const claim of [
    "HakkyAgent verifies ev&#101;ry transaction.",
    "HakkyAgent verifies ev&#x65;ry transaction.",
    "HakkyAgent verifies ev&escr;ry transaction.",
    "Hakky&#65;gent guarantees safety.",
  ]) {
    assert.throws(() => assertNoProhibitedClaims(claim), /prohibited universal or guaranteed claim/);
  }

  assertNoProhibitedClaims("HakkyAgent does not verify ev&#101;ry transaction.");
  assertNoProhibitedClaims("HakkyAgent verifies published HAKKY launch facts &amp; evidence.");
  assertNoProhibitedClaims("HakkyAgent documents &notARealEntity; literally.");
});

test("claim boundary preserves an explicit local negation for every prohibited class", () => {
  for (const disclaimer of [
    "HakkyAgent does not label transactions as good or bad.",
    "HakkyAgent does not audit arbitrary tokens.",
    "HakkyAgent never predicts scams.",
    "HakkyAgent cannot remove financial risk.",
    "HakkyAgent does not provide universal transaction verification.",
    "HakkyAgent does not offer verification for every transaction.",
    "HakkyAgent does not verify transactions universally.",
    "HakkyAgent does not verify all transactions.",
    "HakkyAgent does not guarantee safety.",
    "HakkyAgent does not guarantee scam detection.",
    "HakkyAgent is not a scam detector.",
    "HakkyAgent does not guarantee returns.",
  ]) {
    assertNoProhibitedClaims(disclaimer);
  }
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
