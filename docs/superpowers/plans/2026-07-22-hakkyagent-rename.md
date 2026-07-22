# HakkyAgent Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the active HAKKY proof-agent identity to HakkyAgent while preserving existing account URLs and limiting every verification claim to facts the repository actually checks.

**Architecture:** Treat identity copy, deterministic visual assets, and repository enforcement as three reviewable units. Public copy and tests establish the claim boundary first; deterministic SVG/PNG sources then adopt the name; the final gate prevents the retired identity or universal-safety claims from returning to active surfaces.

**Tech Stack:** Node.js 22+, Node test runner, static HTML/CSS/ES modules, Sharp, deterministic SVG vector typography, GitHub Actions.

## Global Constraints

- The exact public agent name is `HakkyAgent`, as one word.
- The project remains `Hakky Protocol`; the token remains `HAKKY` with the already-approved launch policy.
- The exact tagline is `HakkyAgent verifies the facts. You decide the risk.`
- HakkyAgent may verify only HAKKY facts backed by the existing deterministic checks and canonical evidence.
- The capability tagline may appear in prelaunch; state-specific labels that say this launch is verified remain hidden until the canonical live proof gate passes.
- Never claim that HakkyAgent verifies every transaction, decides good or bad transactions, guarantees safety, or guarantees scam detection.
- Keep `https://x.com/antihakkysack` and `https://github.com/antihakkysack/hakky-protocol` unchanged; these are account addresses.
- Keep the existing orange proof-sentinel visual direction and approved six-color palette.
- No push, deployment, X edit, wallet connection, signature, SOL spend, mainnet transaction, or Hetzner action belongs in this plan.
- Use RTK for every shell command and `apply_patch` for file edits.
- Preserve the separate main checkout's dirty HyperEVM patch and its external backup.

---

### Task 1: Rename the Active Public Identity and Bound Its Claims

**Files:**
- Create: `test/hakkyagent-identity.test.mjs`
- Modify: `README.md`
- Modify: `SECURITY.md`
- Modify: `package.json`
- Modify: `launch/x-profile.md`
- Modify: `launch/prelaunch-post.md`
- Modify: `launch/README.md`
- Modify: `web/index.html`
- Modify: `test/site.test.mjs`
- Modify: `scripts/check-site.mjs`

**Interfaces:**
- Consumes: approved identity spec and existing HAKKY proof/launch policy.
- Produces: active public copy that consistently names `HakkyAgent` and the local `ACTIVE_IDENTITY_FILES` test boundary.

- [ ] **Step 1: Write the failing identity and claim-boundary tests**

Create `test/hakkyagent-identity.test.mjs` with the active-text boundary and exact assertions:

```js
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
```

Extend `test/site.test.mjs` and `scripts/check-site.mjs` to require the exact tagline, the `HakkyAgent` title/hero/FAQ identity, and unchanged X/GitHub destinations.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
rtk node --test test/hakkyagent-identity.test.mjs test/site.test.mjs
```

Expected: failure because active copy still contains the retired identity and does not contain the exact HakkyAgent tagline.

- [ ] **Step 3: Replace active identity copy with exact approved language**

Use this root positioning:

```markdown
HAKKY is a personal, transparent Solana fair-launch meme coin whose launch facts
are checked by HakkyAgent.

**HakkyAgent verifies the facts. You decide the risk.**

HakkyAgent checks the HAKKY mint, supply, authorities, creator balance, and the
canonical LaunchLab proof bundle. It does not verify every Solana transaction,
guarantee safety, or guarantee scam detection.
```

Use these exact public identity values:

```text
Website title: HAKKY — HakkyAgent
Navigation brand: HAKKY! / HAKKYAGENT
Hero kicker: HAKKYAGENT IS ONLINE
X display name: HakkyAgent 🧼
Tagline: HakkyAgent verifies the facts. You decide the risk.
Footer: HAKKYAGENT © 2026 · KEEP CRYPTO CLEAN
```

Use this FAQ claim boundary:

```html
<details>
  <summary>Does HakkyAgent verify every Solana transaction?</summary>
  <p>No. HakkyAgent verifies only the published HAKKY launch facts backed by this repository's deterministic checks and canonical evidence. It does not guarantee that a token or transaction is safe.</p>
</details>
```

Keep the X and GitHub `href` values unchanged. Update their accessible labels to identify HakkyAgent without renaming either account address.

- [ ] **Step 4: Run focused and site checks and verify GREEN**

Run:

```powershell
rtk node --test test/hakkyagent-identity.test.mjs test/site.test.mjs
rtk npm run check:site
rtk node --check web/app.js
```

Expected: all focused tests pass, the site checker reports `ok: true`, and syntax validation exits 0.

- [ ] **Step 5: Commit the public identity slice**

```powershell
rtk git add README.md SECURITY.md package.json launch/README.md launch/prelaunch-post.md launch/x-profile.md web/index.html scripts/check-site.mjs test/site.test.mjs test/hakkyagent-identity.test.mjs
rtk git commit -m "brand: rename the proof agent to HakkyAgent"
```

---

### Task 2: Rename and Regenerate the Deterministic Asset System

**Files:**
- Create: `brand/hakkyagent.svg`
- Create: `web/assets/hakkyagent.svg`
- Delete: `brand/sack-sentinel.svg`
- Delete: `web/assets/sack-sentinel.svg`
- Modify: `brand/x-banner.svg`
- Modify: `scripts/render-assets.mjs`
- Modify: `web/index.html`
- Modify: `test/assets.test.mjs`
- Regenerate: `launch/assets/x-avatar.png`
- Regenerate: `launch/assets/x-banner.png`
- Regenerate: `launch/assets/og-card.png`
- Regenerate: `web/assets/token.png`
- Regenerate: `web/assets/og-card.png`

**Interfaces:**
- Consumes: `vectorText(text, options)` from `scripts/vector-type.mjs` and the approved palette.
- Produces: deterministic HakkyAgent SVG sources and byte-stable PNG exports.

- [ ] **Step 1: Write failing asset-source assertions**

Update `test/assets.test.mjs` so the canonical source list is:

```js
const AGENT_SOURCES = [
  "brand/hakkyagent.svg",
  "web/assets/hakkyagent.svg",
  "brand/x-banner.svg",
  "scripts/render-assets.mjs"
];
```

Require exact source copy:

```js
for (const copy of [
  "HAKKYAGENT // PROOF SENTINEL",
  "RUGS HATE THIS",
  "LITTLE GUY.",
  "1,000,000 HAKKY · 0% TEAM · NO PRESALE",
  "KEEP CRYPTO CLEAN."
]) {
  assert.ok(banner.includes(copy), `banner is missing exact copy: ${copy}`);
  assert.ok(renderer.includes(copy), `renderer is missing exact copy: ${copy}`);
}
```

Add an assertion that the four SVG/renderer sources do not contain `AntiHakkySack`, `ANTIHAKKYSACK`, `Sack Sentinel`, or `Agent 001`.

- [ ] **Step 2: Run the asset tests and verify RED**

Run:

```powershell
rtk node --test test/assets.test.mjs
```

Expected: failure because the new SVG paths and copy do not exist and golden hashes still describe the retired exports.

- [ ] **Step 3: Rename SVG sources and update deterministic copy**

Use these accessible source strings:

```xml
<title id="title">HakkyAgent proof sentinel</title>
<desc id="desc">An orange AI blockchain proof agent with a dark visor and bright eyes.</desc>
```

Use `HAKKYAGENT // PROOF SENTINEL` for the banner and Open Graph label. Preserve all geometry except the vector glyph group required to fit the new label, and preserve the exact approved palette:

```js
const ogLabel = vectorText("HAKKYAGENT // PROOF SENTINEL", {
  x: 108, y: 98, height: 16, letterSpacing: 1.4, color: "#FFFFFF"
}).svg;
```

Point `scripts/render-assets.mjs` and `web/index.html` at `brand/hakkyagent.svg` / `web/assets/hakkyagent.svg`. Apply file creation/deletion with `apply_patch`.

- [ ] **Step 4: Regenerate assets and record intentional golden hashes**

Run:

```powershell
rtk npm run assets
rtk node --test test/assets.test.mjs
```

Expected: the first test run fails only at old SHA-256 expectations. Compute the five new hashes with Node, replace the exact expected values in `test/assets.test.mjs`, then rerun:

```powershell
rtk node --test test/assets.test.mjs
rtk npm run assets
rtk git diff --exit-code -- launch/assets web/assets brand scripts/render-assets.mjs test/assets.test.mjs web/index.html
```

Expected: asset tests pass and the second render produces no diff.

- [ ] **Step 5: Visually inspect the regenerated avatar, banner, and OG card**

Open the three PNG exports and confirm that `HAKKYAGENT // PROOF SENTINEL` is legible, no glyph is clipped, the mascot remains recognizable, and the approved palette/dimensions are unchanged.

- [ ] **Step 6: Commit the deterministic asset slice**

```powershell
rtk git add brand web/assets launch/assets scripts/render-assets.mjs web/index.html test/assets.test.mjs
rtk git commit -m "brand: regenerate HakkyAgent launch assets"
```

---

### Task 3: Enforce the Retired-Identity and Honest-Claims Boundary

**Files:**
- Modify: `scripts/check-repo.mjs`
- Modify: `test/repository-hygiene.test.mjs`
- Modify: `test/hakkyagent-identity.test.mjs`
- Modify: `docs/LAUNCH.md`
- Modify: `proof/README.md`
- Modify: `docs/superpowers/plans/2026-07-22-hakky-live-launch.md`

**Interfaces:**
- Consumes: tracked-file enumeration and existing historical-document exclusions in `scripts/check-repo.mjs`.
- Produces: deterministic active-surface identity/claim violations in the repository hygiene result.

- [ ] **Step 1: Add failing synthetic hygiene tests**

Add synthetic tracked-file fixtures that must be rejected:

```js
test("repository checker rejects retired agent labels on active surfaces", async () => {
  const result = await inspectTrackedEntries([
    { path: "web/fake.html", content: "ANTIHAKKYSACK // AGENT 001" }
  ]);
  assert.ok(result.violations.some((violation) => violation.rule === "retired-agent-identity"));
});

test("repository checker rejects universal transaction-safety claims", async () => {
  const result = await inspectTrackedEntries([
    { path: "README.md", content: "HakkyAgent verifies every good transaction and guarantees safety." }
  ]);
  assert.ok(result.violations.some((violation) => violation.rule === "unsupported-agent-claim"));
});
```

Keep lowercase `antihakkysack` allowed only when it is part of the exact approved X or GitHub account URL/handle.

- [ ] **Step 2: Run the hygiene tests and verify RED**

Run:

```powershell
rtk node --test test/repository-hygiene.test.mjs test/hakkyagent-identity.test.mjs
```

Expected: the synthetic retired-identity and unsupported-claim fixtures are not yet rejected.

- [ ] **Step 3: Implement exact active-surface rules and update operator docs**

Add case-sensitive retired labels:

```js
const RETIRED_AGENT_MARKERS = [
  "AntiHakkySack",
  "ANTIHAKKYSACK",
  "Sack Sentinel",
  "Agent 001"
];
```

Add bounded unsupported-claim expressions:

```js
const UNSUPPORTED_AGENT_CLAIMS = [
  /HakkyAgent.{0,80}verif(?:y|ies|ied).{0,40}(?:all|every|good|bad|safe) transactions?/i,
  /HakkyAgent.{0,80}guarantee(?:s|d)?.{0,40}(?:safe|safety|scam detection|returns?)/i
];
```

Apply these only to active public/code surfaces. Preserve historical superpowers specifications and plans as project records; do not weaken secret scanning in those paths. Update `docs/LAUNCH.md`, `proof/README.md`, and the live plan so operator language uses HakkyAgent and the exact claim boundary.

- [ ] **Step 4: Run all active scans and the complete quality gate**

Run:

```powershell
rtk node --test test/repository-hygiene.test.mjs test/hakkyagent-identity.test.mjs
rtk npm ci
rtk npm run assets
rtk npm run check
rtk npm run assets
rtk git diff --check
rtk git status --short --branch
```

Expected: all tests pass; repository and site checkers return `ok: true`; the second asset render is diff-free; the tracked worktree contains only the intended uncommitted task changes before commit.

- [ ] **Step 5: Run the explicit active-surface retirement scan**

Run a case-sensitive scan over `README.md`, `SECURITY.md`, `package.json`, `brand`, `launch`, `proof`, `scripts`, `src`, `test`, `test-support`, and `web`, excluding account-address-only lowercase `antihakkysack` occurrences.

Expected: no retired display label appears on active surfaces; the remaining lowercase occurrences are the unchanged approved X/GitHub addresses or policy assertions for those addresses.

- [ ] **Step 6: Commit the enforcement and operator-doc slice**

```powershell
rtk git add scripts/check-repo.mjs test/repository-hygiene.test.mjs test/hakkyagent-identity.test.mjs docs/LAUNCH.md proof/README.md docs/superpowers/plans/2026-07-22-hakky-live-launch.md
rtk git commit -m "ci: enforce the HakkyAgent claim boundary"
```

---

## Final Review and External Gates

- [ ] Request a whole-range read-only review against `docs/superpowers/specs/2026-07-22-hakkyagent-naming-design.md`.
- [ ] Fix all Critical and Important findings and rerun the full gate.
- [ ] Keep browser certification pending until the user enables the ChatGPT Chrome Extension; once enabled, inspect 1440x1000 and 390x844.
- [ ] Keep devnet certification pending until the public faucet permits the bounded rehearsal; never substitute mainnet.
- [ ] Do not push, deploy, edit X, sign, spend SOL, or access Hetzner without the existing action-time approvals.
