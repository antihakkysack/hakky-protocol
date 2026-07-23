# HAKKY Public-Surface Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render HAKKY's `prelaunch`, `curve-live`, `graduated`, and deployable verification-unavailable public states with exact lifecycle copy, fail-closed destinations, certified responsive behavior, and stage-correct social artifacts.

**Architecture:** This plan consumes, but does not redefine, the proof plan's executable `schemas/web/launch-v2.schema.json`, `validateLaunchRecord(record)` implementation, and `proof.availability: "verified" | "unavailable"` discriminated union. A pure `buildLaunchView(record)` adapter turns a schema-valid record into one of four presentation states; `web/app.js` remains a thin DOM adapter that always clears the page before applying verified evidence. Static contract checks and live browser certification cover different risks and remain separate gates.

**Tech Stack:** Node.js 22, native `node:test`, ECMAScript modules, static HTML/CSS/JavaScript, GitHub Pages, deterministic PNG/SVG assets.

## Global Constraints

- This plan starts only after the proof plan commits `schemas/web/launch-v2.schema.json`, upgrades `web/lib/launch-policy.js`, and provides schema-valid v2 fixtures for `prelaunch`, verified/unavailable `curve-live`, and verified/unavailable `graduated` records.
- Do not duplicate the v2 schema, canonical-artifact validators, chronology checks, or evidence binding in the browser presentation layer.
- `proof.availability: "unavailable"` is a valid, deployable v2 state for `curve-live` and `graduated`; it must render `VERIFICATION UNAVAILABLE` rather than block the Pages deployment.
- `proof.availability: "verified"` is the only condition that permits an official mint, proof value, or trading destination to render.
- `prelaunch` publishes no mint, Solscan, Raydium, copy-address, pool, or buy destination.
- The complete mobile warning is exactly `PRE-LAUNCH: No official mint address exists yet - ignore impostors.` and is the first hero child in document and mobile visual order.
- Curve-live heading is exactly `CURVE LIVE - PROGRAM AUTHORITY ACTIVE`.
- Graduated heading is exactly `GRADUATED - FINAL STATE VERIFIED`.
- Unavailable heading is exactly `VERIFICATION UNAVAILABLE`.
- Every mutable observation is historical evidence and includes its finalized slot and UTC time in the visible value.
- The configured threshold copy is exactly `24 SOL configured minimum graduation threshold`; an observed graduation balance is a separate value.
- Curve-live must display the exact LaunchLab program PDA, state that the creator cannot sign for it, and state that final null mint authority and LP disposition remain unobserved until graduation.
- Graduated copy names the observed mechanism: `Burn & Earn permanent lock` for `burn-and-earn`, and `LP tokens irreversibly burned` for `lp-burn`.
- `0% team` means the launch encodes no team allocation; it is not a claim that associated people can never buy.
- HAKKY remains a high-risk meme coin with no promised utility, safety, scam detection, or returns.
- The browser receives no Solana dependency graph and performs no RPC, wallet, signing, tracking, or backend request.
- Existing `launch/assets/x-avatar.png`, `launch/assets/x-banner.png`, `launch/assets/og-card.png`, and `web/assets/og-card.png` remain unchanged unless an independently approved creative task changes them.
- Every RED step must fail for the named missing behavior before production code is written; every GREEN step must pass before refactoring or committing.
- Use RTK for every shell command.

---

### Task 1: Add the Pure Lifecycle Presentation Adapter

**Files:**
- Create: `web/lib/launch-view.js`
- Create: `test/launch-view.test.mjs`
- Read: `schemas/web/launch-v2.schema.json`
- Read: `web/lib/launch-policy.js`
- Read: proof-plan v2 fixture module

**Interfaces:**
- Consumes: `validateLaunchRecord(record): string[]` and schema-valid v2 records whose non-prelaunch `proof.availability` is exactly `"verified"` or `"unavailable"`.
- Produces: `buildLaunchView(record): LaunchView`, where `LaunchView.state` is exactly `"prelaunch"`, `"curve-live"`, `"graduated"`, or `"unavailable"`; `LaunchView.verified` is boolean; `LaunchView.mint` and `LaunchView.proof` are `null` unless availability is verified; `LaunchView.heading` is exact public copy; and `LaunchView.destinations` always has exact keys `solscanMint`, `solscanCreationTransaction`, `solscanGraduationTransaction`, `raydiumLaunchlab`, and `raydiumPool`, each string or `null`. The adapter never aliases caller-owned mutable data: it creates a browser-compatible deep JSON snapshot of verified `proof`, recursively freezes that snapshot, freezes `destinations`, and freezes the root `LaunchView`; hidden views are frozen to the same depth. It never freezes or mutates the input record.

- [ ] **Step 1: Write the failing lifecycle-discrimination tests**

Create `test/launch-view.test.mjs` with tests that import the exact fixture builders supplied by the proof plan and assert the presentation contract:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { buildLaunchView } from "../web/lib/launch-view.js";
import {
  createPrelaunchRecordV2,
  createCurveLiveRecordV2,
  createGraduatedRecordV2,
} from "../test-support/launch-fixtures.mjs";

const EMPTY_DESTINATIONS = Object.freeze({
  solscanMint: null,
  solscanCreationTransaction: null,
  solscanGraduationTransaction: null,
  raydiumLaunchlab: null,
  raydiumPool: null,
});

test("prelaunch publishes no evidence or destination", () => {
  const view = buildLaunchView(createPrelaunchRecordV2());
  assert.equal(view.state, "prelaunch");
  assert.equal(view.verified, false);
  assert.equal(view.mint, null);
  assert.equal(view.heading, "PRE-LAUNCH: No official mint address exists yet - ignore impostors.");
  assert.equal(view.proof, null);
  assert.deepEqual(view.destinations, EMPTY_DESTINATIONS);
});

test("curve-live unavailable remains deployable without exposing evidence", () => {
  const record = createCurveLiveRecordV2({ availability: "unavailable" });
  const view = buildLaunchView(record);
  assert.equal(view.state, "unavailable");
  assert.equal(view.declaredStatus, "curve-live");
  assert.equal(view.heading, "VERIFICATION UNAVAILABLE");
  assert.equal(view.verified, false);
  assert.equal(view.proof, null);
  assert.deepEqual(view.destinations, EMPTY_DESTINATIONS);
});

test("verified curve-live retains its exact proof and canonical destinations", () => {
  const record = createCurveLiveRecordV2({ availability: "verified" });
  const view = buildLaunchView(record);
  assert.equal(view.state, "curve-live");
  assert.equal(view.heading, "CURVE LIVE - PROGRAM AUTHORITY ACTIVE");
  assert.equal(view.verified, true);
  assert.equal(view.mint, record.token.mint);
  assert.deepEqual(view.proof, record.proof);
  assert.notStrictEqual(view.proof, record.proof);
  assert.deepEqual(Object.keys(view.destinations), [
    "solscanMint",
    "solscanCreationTransaction",
    "solscanGraduationTransaction",
    "raydiumLaunchlab",
    "raydiumPool",
  ]);
  assert.deepEqual(Object.values(view.destinations), [
    record.proof.links.solscanMint,
    record.proof.links.solscanCreationTransaction,
    null,
    record.proof.links.raydiumLaunchlab,
    null,
  ]);
});

test("graduated unavailable never falls back to an apparently valid curve", () => {
  const view = buildLaunchView(createGraduatedRecordV2({ availability: "unavailable" }));
  assert.equal(view.state, "unavailable");
  assert.equal(view.declaredStatus, "graduated");
  assert.equal(view.heading, "VERIFICATION UNAVAILABLE");
  assert.equal(view.proof, null);
  assert.deepEqual(view.destinations, EMPTY_DESTINATIONS);
});

test("verified graduated exposes the canonical pool destination", () => {
  const record = createGraduatedRecordV2({ availability: "verified" });
  const view = buildLaunchView(record);
  assert.equal(view.state, "graduated");
  assert.equal(view.heading, "GRADUATED - FINAL STATE VERIFIED");
  assert.equal(view.verified, true);
  assert.equal(view.mint, record.token.mint);
  assert.deepEqual(view.proof, record.proof);
  assert.notStrictEqual(view.proof, record.proof);
  assert.equal(view.destinations.solscanMint, record.proof.links.solscanMint);
  assert.equal(view.destinations.solscanCreationTransaction, record.proof.links.solscanCreationTransaction);
  assert.equal(view.destinations.solscanGraduationTransaction, record.proof.links.solscanGraduationTransaction);
  assert.equal(view.destinations.raydiumPool, record.proof.links.raydiumPool);
});

test("schema-invalid input is rejected before presentation", () => {
  const record = createCurveLiveRecordV2({ availability: "verified" });
  record.proof.extra = true;
  assert.throws(() => buildLaunchView(record), /Invalid launch record/);
});

test("views are immutable snapshots of validated input", () => {
  const record = createCurveLiveRecordV2({ availability: "verified" });
  const view = buildLaunchView(record);
  const originalMintLink = view.destinations.solscanMint;
  record.proof.links.solscanMint = "https://example.invalid/mutated";
  assert.equal(view.destinations.solscanMint, originalMintLink);
  assert.notEqual(view.proof.links.solscanMint, record.proof.links.solscanMint);
  assert.throws(() => { view.destinations.solscanMint = "https://example.invalid/other"; }, TypeError);
  assert.throws(() => { view.proof.links.solscanMint = "https://example.invalid/other"; }, TypeError);
  assert.throws(() => { view.heading = "changed"; }, TypeError);
});
```

- [ ] **Step 2: Run the adapter test and verify RED**

Run:

```powershell
rtk npm test -- test/launch-view.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `web/lib/launch-view.js`; if it fails in fixture setup, align the import names with the proof plan's committed fixture exports before continuing and keep all seven lifecycle/immutability tests and their assertions unchanged.

- [ ] **Step 3: Implement the minimal lifecycle adapter**

Create `web/lib/launch-view.js`:

```js
import { validateLaunchRecord } from "./launch-policy.js";

const EMPTY_DESTINATIONS = Object.freeze({
  solscanMint: null,
  solscanCreationTransaction: null,
  solscanGraduationTransaction: null,
  raydiumLaunchlab: null,
  raydiumPool: null,
});

function cloneAndFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneAndFreeze));
  if (value && typeof value === "object") {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, cloneAndFreeze(nested)]),
    ));
  }
  return value;
}

function hiddenView({ state, declaredStatus, heading }) {
  return Object.freeze({
    state,
    declaredStatus,
    verified: false,
    heading,
    mint: null,
    proof: null,
    destinations: Object.freeze({ ...EMPTY_DESTINATIONS }),
  });
}

export function buildLaunchView(record) {
  const issues = validateLaunchRecord(record);
  if (issues.length) throw new Error(`Invalid launch record: ${issues.join("; ")}`);

  if (record.status === "prelaunch") {
    return hiddenView({
      state: "prelaunch",
      declaredStatus: "prelaunch",
      heading: "PRE-LAUNCH: No official mint address exists yet - ignore impostors.",
    });
  }

  if (record.proof.availability === "unavailable") {
    return hiddenView({
      state: "unavailable",
      declaredStatus: record.status,
      heading: "VERIFICATION UNAVAILABLE",
    });
  }

  const proof = cloneAndFreeze(record.proof);
  const destinations = Object.freeze(Object.fromEntries([
    ["solscanMint", proof.links.solscanMint],
    ["solscanCreationTransaction", proof.links.solscanCreationTransaction],
    ["solscanGraduationTransaction", record.status === "graduated" ? proof.links.solscanGraduationTransaction : null],
    ["raydiumLaunchlab", proof.links.raydiumLaunchlab],
    ["raydiumPool", record.status === "graduated" ? proof.links.raydiumPool : null],
  ]));

  return Object.freeze({
    state: record.status,
    declaredStatus: record.status,
    verified: true,
    heading: record.status === "curve-live"
      ? "CURVE LIVE - PROGRAM AUTHORITY ACTIVE"
      : "GRADUATED - FINAL STATE VERIFIED",
    mint: record.token.mint,
    proof,
    destinations,
  });
}
```

- [ ] **Step 4: Run the adapter test and verify GREEN**

Run:

```powershell
rtk npm test -- test/launch-view.test.mjs
```

Expected: all seven tests pass with no warning or skipped test.

- [ ] **Step 5: Refactor only duplicated immutable constants and rerun**

Keep `EMPTY_DESTINATIONS` private, keep all four exact headings in this module, and do not move schema validation into the DOM adapter.

Run:

```powershell
rtk npm test -- test/launch-view.test.mjs
```

Expected: all seven tests pass.

- [ ] **Step 6: Commit the presentation adapter**

```powershell
rtk git add web/lib/launch-view.js test/launch-view.test.mjs
rtk git commit -m "site: add lifecycle presentation adapter"
```

---

### Task 2: Render Verified Evidence and Clear Unavailable State Exhaustively

**Files:**
- Modify: `web/app.js`
- Modify: `web/index.html`
- Modify: `test/site.test.mjs`
- Read: `schemas/web/launch-v2.schema.json`
- Read: `web/lib/launch-view.js`

**Interfaces:**
- Consumes: `buildLaunchView(record): LaunchView` from Task 1 and the proof plan's exact v2 nested names for `observation`, `authorities`, `creatorBalance`, `transactions`, `links`, `graduation`, `pool`, and `lpDisposition`.
- Produces: `renderLaunchState(documentRef, fetchImpl): Promise<void>`; before fetch and after every failure it leaves `data-launch-status` at `VERIFICATION UNAVAILABLE`, clears every public proof value to `Not available`, removes every dynamic `href`, and hides `data-live-actions`.

- [ ] **Step 1: Extend the fake DOM and write failing state-transition tests**

In `test/site.test.mjs`, replace the old single-live assertions with selectors for the complete v2 surface:

```js
const LIFECYCLE_SELECTORS = [
  "[data-launch-status]",
  "[data-proof-qualifier]",
  "[data-live-actions]",
  "[data-mint]",
  "[data-supply]",
  "[data-decimals]",
  "[data-token-program]",
  "[data-mint-authority]",
  "[data-authority-explanation]",
  "[data-freeze-authority]",
  "[data-creator-balance]",
  "[data-allocation]",
  "[data-team-allocation]",
  "[data-quote-asset]",
  "[data-creator-first-buy]",
  "[data-vesting]",
  "[data-creator-fee]",
  "[data-protocol-fee]",
  "[data-creator-spend]",
  "[data-curve-phase]",
  "[data-observation-slot]",
  "[data-observation-time]",
  "[data-graduation-threshold]",
  "[data-graduation-pending]",
  "[data-graduation-balance]",
  "[data-graduation-transaction]",
  "[data-pool]",
  "[data-lp-disposition]",
  "[data-fee-rights]",
  "[data-metadata-uri]",
  "[data-metadata-name]",
  "[data-metadata-symbol]",
  "[data-metadata-update-authority]",
  "[data-metadata-hashes]",
  "[data-launch-transaction]",
  "[data-solscan]",
  "[data-raydium]",
  "[data-pool-link]",
];
```

Add these tests using the proof plan's committed v2 fixture builders:

```js
test("verified curve-live renders the PDA and pending-graduation boundary", async () => {
  const record = createCurveLiveRecordV2({ availability: "verified" });
  const documentRef = createDocument();
  await renderLaunchState(documentRef, responseFor(record));
  const element = (selector) => documentRef.elements.get(selector);
  assert.equal(element("[data-launch-status]").textContent, "CURVE LIVE - PROGRAM AUTHORITY ACTIVE");
  assert.equal(element("[data-mint-authority]").textContent, record.proof.authorities.mintAuthority);
  assert.match(element("[data-authority-explanation]").textContent, /creator cannot sign for this LaunchLab program PDA/i);
  assert.equal(element("[data-graduation-threshold]").textContent, "24 SOL configured minimum graduation threshold");
  assert.match(element("[data-curve-phase]").textContent, /curve-live at finalized slot .+ \(.+Z\)/i);
  assert.match(element("[data-protocol-fee]").textContent, /buy \/ .+% sell \(equal; denominator 1,000,000\)/);
  assert.match(element("[data-graduation-pending]").textContent, /not yet observed/i);
  assert.equal(element("[data-pool-link]").getAttribute("href"), null);
  assert.equal(element("[data-live-actions]").hidden, false);
});

test("verified graduated names the observed LP mechanism and final authorities", async () => {
  const record = createGraduatedRecordV2({ availability: "verified", migrationType: "cpmm" });
  const documentRef = createDocument();
  await renderLaunchState(documentRef, responseFor(record));
  const element = (selector) => documentRef.elements.get(selector);
  assert.equal(element("[data-launch-status]").textContent, "GRADUATED - FINAL STATE VERIFIED");
  assert.equal(element("[data-mint-authority]").textContent, "null");
  assert.equal(element("[data-freeze-authority]").textContent, "null");
  assert.match(element("[data-lp-disposition]").textContent, /Burn & Earn permanent lock/);
  assert.equal(element("[data-launch-transaction]").getAttribute("href"), record.proof.links.solscanCreationTransaction);
  assert.equal(element("[data-graduation-transaction]").getAttribute("href"), record.proof.links.solscanGraduationTransaction);
  assert.equal(element("[data-pool-link]").getAttribute("href"), record.proof.links.raydiumPool);
});

test("unavailable after verified graduation clears every value and destination", async () => {
  const documentRef = createDocument();
  await renderLaunchState(documentRef, responseFor(createGraduatedRecordV2({ availability: "verified" })));
  await renderLaunchState(documentRef, responseFor(createGraduatedRecordV2({ availability: "unavailable" })));
  assertUnavailable(documentRef);
});

test("invalid chronology never silently renders prelaunch or curve-live", async () => {
  const record = createGraduatedRecordV2({ availability: "verified" });
  record.proof.observation.finalizedSlot = record.proof.transactions.graduation.finalizedSlot - 1;
  const documentRef = createDocument();
  await assert.rejects(renderLaunchState(documentRef, responseFor(record)), /Invalid launch record/);
  assertUnavailable(documentRef);
});
```

Define `assertUnavailable(documentRef)` exactly as follows:

```js
function assertUnavailable(documentRef) {
  const element = (selector) => documentRef.elements.get(selector);
  assert.equal(element("[data-launch-status]").textContent, "VERIFICATION UNAVAILABLE");
  assert.equal(element("[data-proof-qualifier]").textContent, "Verification unavailable; no proof values or trading links are shown.");
  for (const selector of LIFECYCLE_SELECTORS.filter((value) => ![
    "[data-launch-status]",
    "[data-proof-qualifier]",
    "[data-live-actions]",
    "[data-solscan]",
    "[data-raydium]",
    "[data-pool-link]",
  ].includes(value))) {
    assert.equal(element(selector).textContent, "Not available", `${selector} retained stale text`);
  }
  for (const selector of [
    "[data-solscan]",
    "[data-raydium]",
    "[data-pool-link]",
    "[data-launch-transaction]",
    "[data-graduation-transaction]",
  ]) {
    assert.equal(element(selector).getAttribute("href"), null, `${selector} retained a stale href`);
  }
  assert.equal(element("[data-live-actions]").hidden, true);
}
```

- [ ] **Step 2: Run the site tests and verify RED**

Run:

```powershell
rtk npm test -- test/site.test.mjs
```

Expected: FAIL because the new selectors and four lifecycle behaviors are absent.

- [ ] **Step 3: Add the complete lifecycle markup**

Replace the old proof grid in `web/index.html` with markup that contains every selector in `LIFECYCLE_SELECTORS`, initializes every proof value to `Not available`, has no static dynamic `href`, and retains the high-risk disclaimer outside the dynamic region:

```html
<p data-proof-qualifier aria-live="polite">Verification unavailable; no proof values or trading links are shown.</p>
<div class="proof">
  <div><span>Mint</span><strong data-mint>Not available</strong></div>
  <div><span>Supply</span><strong data-supply>Not available</strong></div>
  <div><span>Decimals</span><strong data-decimals>Not available</strong></div>
  <div><span>Token program</span><strong data-token-program>Not available</strong></div>
  <div><span>Mint authority</span><strong data-mint-authority>Not available</strong></div>
  <div><span>Authority context</span><strong data-authority-explanation>Not available</strong></div>
  <div><span>Freeze authority</span><strong data-freeze-authority>Not available</strong></div>
  <div><span>Creator balance observation</span><strong data-creator-balance>Not available</strong></div>
  <div><span>Distribution</span><strong data-allocation>Not available</strong></div>
  <div><span>Team allocation encoded in launch</span><strong data-team-allocation>Not available</strong></div>
  <div><span>Quote asset</span><strong data-quote-asset>Not available</strong></div>
  <div><span>Creator first-buy</span><strong data-creator-first-buy>Not available</strong></div>
  <div><span>Vesting</span><strong data-vesting>Not available</strong></div>
  <div><span>Creator fee rights</span><strong data-creator-fee>Not available</strong></div>
  <div><span>Protocol curve trading fee</span><strong data-protocol-fee>Not available</strong></div>
  <div><span>Creator-funded cost</span><strong data-creator-spend>Not available</strong></div>
  <div><span>Lifecycle observation</span><strong data-curve-phase>Not available</strong></div>
  <div><span>Finalized slot</span><strong data-observation-slot>Not available</strong></div>
  <div><span>Observed at</span><strong data-observation-time>Not available</strong></div>
  <div><span>Graduation threshold</span><strong data-graduation-threshold>Not available</strong></div>
  <div><span>Graduation status</span><strong data-graduation-pending>Not available</strong></div>
  <div><span>Graduation balance</span><strong data-graduation-balance>Not available</strong></div>
  <div><span>Graduation transaction</span><a class="proof-value" data-graduation-transaction target="_blank" rel="noopener noreferrer">Not available</a></div>
  <div><span>Pool</span><strong data-pool>Not available</strong></div>
  <div><span>LP disposition</span><strong data-lp-disposition>Not available</strong></div>
  <div><span>Remaining fee rights</span><strong data-fee-rights>Not available</strong></div>
  <div><span>Metadata URI</span><strong data-metadata-uri>Not available</strong></div>
  <div><span>Metadata name</span><strong data-metadata-name>Not available</strong></div>
  <div><span>Metadata symbol</span><strong data-metadata-symbol>Not available</strong></div>
  <div><span>Metadata update authority</span><strong data-metadata-update-authority>Not available</strong></div>
  <div><span>Metadata hashes</span><strong data-metadata-hashes>Not available</strong></div>
  <div><span>Launch transaction</span><a class="proof-value" data-launch-transaction target="_blank" rel="noopener noreferrer">Not available</a></div>
</div>
<div class="live-actions" data-live-actions hidden>
  <a class="button" data-solscan target="_blank" rel="noopener noreferrer">View Solscan</a>
  <a class="button button-alt" data-raydium target="_blank" rel="noopener noreferrer">Open Raydium</a>
  <a class="button button-alt" data-pool-link target="_blank" rel="noopener noreferrer">Open verified pool</a>
</div>
<p><strong>High-risk meme coin. No promised utility, safety, scam detection, or returns.</strong></p>
```

- [ ] **Step 4: Implement the minimal exhaustive reset and verified renderers**

In `web/app.js`, import `buildLaunchView` from `./lib/launch-view.js`. Preserve the existing defensive `bestEffort` approach, set the unavailable state before fetch, and branch only after the pure adapter returns:

```js
const VALUE_SELECTORS = Object.freeze([
  "[data-mint]",
  "[data-supply]",
  "[data-decimals]",
  "[data-token-program]",
  "[data-mint-authority]",
  "[data-authority-explanation]",
  "[data-freeze-authority]",
  "[data-creator-balance]",
  "[data-allocation]",
  "[data-team-allocation]",
  "[data-quote-asset]",
  "[data-creator-first-buy]",
  "[data-vesting]",
  "[data-creator-fee]",
  "[data-protocol-fee]",
  "[data-creator-spend]",
  "[data-curve-phase]",
  "[data-observation-slot]",
  "[data-observation-time]",
  "[data-graduation-threshold]",
  "[data-graduation-pending]",
  "[data-graduation-balance]",
  "[data-graduation-transaction]",
  "[data-pool]",
  "[data-lp-disposition]",
  "[data-fee-rights]",
  "[data-metadata-uri]",
  "[data-metadata-name]",
  "[data-metadata-symbol]",
  "[data-metadata-update-authority]",
  "[data-metadata-hashes]",
  "[data-launch-transaction]",
]);
const DESTINATION_SELECTORS = Object.freeze([
  "[data-solscan]",
  "[data-raydium]",
  "[data-pool-link]",
  "[data-launch-transaction]",
  "[data-graduation-transaction]",
]);

function setUnavailableState(documentRef) {
  bestEffort(() => { documentRef.querySelector("[data-launch-status]").textContent = "VERIFICATION UNAVAILABLE"; });
  bestEffort(() => { documentRef.querySelector("[data-proof-qualifier]").textContent = "Verification unavailable; no proof values or trading links are shown."; });
  bestEffort(() => { documentRef.querySelector("[data-live-actions]").hidden = true; });
  for (const selector of VALUE_SELECTORS) {
    bestEffort(() => { documentRef.querySelector(selector).textContent = "Not available"; });
  }
  for (const selector of DESTINATION_SELECTORS) {
    bestEffort(() => documentRef.querySelector(selector)?.removeAttribute("href"));
  }
}

const PROOF_QUALIFIERS = Object.freeze({
  prelaunch: "No official mint exists; no launch proof or trading link is published.",
  "curve-live": "Canonical curve evidence verified at finalized commitment.",
  graduated: "Canonical graduation evidence verified at finalized commitment.",
  unavailable: "Verification unavailable; no proof values or trading links are shown.",
});

export async function renderLaunchState(documentRef = document, fetchImpl = fetch) {
  setUnavailableState(documentRef);
  try {
    const response = await fetchImpl("./data/launch.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Launch record HTTP ${response.status}`);
    const view = buildLaunchView(await response.json());
    if (view.state === "unavailable") return;
    if (view.state === "prelaunch") {
      documentRef.querySelector("[data-launch-status]").textContent = view.heading;
      documentRef.querySelector("[data-proof-qualifier]").textContent = PROOF_QUALIFIERS.prelaunch;
      return;
    }
    renderVerifiedLifecycle(documentRef, view);
  } catch (error) {
    setUnavailableState(documentRef);
    throw error;
  }
}
```

Implement `renderVerifiedLifecycle(documentRef, view)` by mapping every visible field from the exact schema-reviewed v2 properties. Its required formatting rules are:

```js
const finalizedObservation = (value, { finalizedSlot, finalizedAt }) => (
  `${value} at finalized slot ${finalizedSlot} (${finalizedAt})`
);
const formatMillionthsPercent = (raw) => {
  const millionths = BigInt(raw);
  const whole = millionths / 10_000n;
  const fraction = (millionths % 10_000n).toString().padStart(4, "0").replace(/0+$/u, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
};
const lpDispositionText = (lpDisposition) => lpDisposition.kind === "burn-and-earn"
  ? "Burn & Earn permanent lock; creator/platform shares 0 bps; irreversible locked share 10000 bps"
  : "LP tokens irreversibly burned; creator/platform LP 0; recoverable LP 0";
```

Use this exhaustive property-to-selector mapping; these are the only allowed sources and formats:

| Selector | Exact source and formatting |
|---|---|
| `data-proof-qualifier` | curve: `Canonical curve evidence verified at finalized commitment.`; graduated: `Canonical graduation evidence verified at finalized commitment.` |
| `data-mint` | `view.mint` |
| `data-supply` | `${proof.supply.uiAmount} HAKKY (${proof.supply.baseUnits} base units)` |
| `data-decimals` | decimal text from `proof.supply.decimals` |
| `data-token-program` | exact `proof.supply.tokenProgram` plus ` (classic SPL Token)` |
| `data-mint-authority` | exact `proof.authorities.mintAuthority`; render null as literal `null` |
| `data-authority-explanation` | curve: `LaunchLab program PDA; creator cannot sign for this LaunchLab program PDA.`; graduated: `Mint authority is null after verified graduation.` |
| `data-freeze-authority` | literal `null` from `proof.authorities.freezeAuthority` |
| `data-creator-balance` | `finalizedObservation(`${proof.creatorBalance.totalAmountBaseUnits} HAKKY base units across ${proof.creatorBalance.accounts.length} account(s)`, proof.creatorBalance)` |
| `data-allocation` | `${publicCurveBps / 100}% public curve / ${liquidityBps / 100}% post-graduation liquidity` from `proof.allocations` |
| `data-team-allocation` | `${teamBps / 100}% team allocation encoded in the launch` |
| `data-quote-asset` | `${proof.quote.symbol} (${proof.quote.mint}); ${proof.quote.decimals} decimals` |
| `data-creator-first-buy` | `${creatorLamports} lamports / ${creatorTokenBaseUnits} HAKKY base units` |
| `data-vesting` | `${lockedBaseUnits} locked; cliff ${cliffSeconds}s; unlock ${unlockSeconds}s` |
| `data-creator-fee` | `${creatorTradingFeeRateMillionths}/1,000,000; Fee Key ${creatorFeeKey}; creator fee rights ${creatorFeeRights}` |
| `data-protocol-fee` | `${formatMillionthsPercent(protocolBuyFeeRateMillionths)}% buy / ${formatMillionthsPercent(protocolSellFeeRateMillionths)}% sell (equal; denominator 1,000,000)`; formatter uses decimal-string arithmetic and never rounds a nonzero rate to zero |
| `data-creator-spend` | `${cumulativeCreatorDebitLamports} lamports cumulative (${metadataUploadLamports} metadata + ${creationDebitLamports} creation + ${recoveryDebitLamports} recovery + ${graduationDebitLamports} graduation); cap ${capLamports}` |
| `data-curve-phase` | `finalizedObservation(view.state, proof.observation)` |
| `data-observation-slot` | decimal text from `proof.observation.finalizedSlot` |
| `data-observation-time` | exact `proof.observation.finalizedAt` |
| `data-graduation-threshold` | exact lamport-to-SOL conversion of `proof.quote.graduationThresholdLamports` followed by ` SOL configured minimum graduation threshold` |
| `data-graduation-pending` | curve exact: `Post-graduation pool, final null mint authority, and LP disposition are not yet observed.`; graduated: `finalizedObservation(proof.graduation.status, proof.graduation)` |
| `data-graduation-balance` | curve: `Not yet observed`; graduated: `finalizedObservation(`${observedQuoteBalanceLamports} lamports observed; ${configuredThresholdLamports} configured`, proof.graduation)` |
| `data-graduation-transaction` | curve: `Not yet observed` with no href; graduated: exact `proof.transactions.graduation.signature` and `view.destinations.solscanGraduationTransaction` |
| `data-pool` | curve: `Not yet observed`; graduated: `${proof.pool.address} (${proof.pool.programId})` |
| `data-lp-disposition` | curve: `Pending verified graduation`; graduated: `lpDispositionText(proof.lpDisposition)` |
| `data-fee-rights` | `${proof.fees.creatorFeeRights}; Fee Key ${proof.fees.creatorFeeKey}; immutable snapshot ${proof.fees.snapshotImmutable}` |
| metadata selectors | URI/name/symbol/update authority come from `proof.metadata`; update authority is displayed with `isMutable false`; hashes are `account ${metadataAccountSha256}; JSON ${jsonSha256}; image ${imageSha256}` |
| `data-launch-transaction` | exact `proof.transactions.creation.signature` and `view.destinations.solscanCreationTransaction` |
| `data-solscan` | `view.destinations.solscanMint` |
| `data-raydium` | `view.destinations.raydiumLaunchlab` |
| `data-pool-link` | absent on curve; `view.destinations.raydiumPool` only after graduation |

The renderer must use the exact PDA string as the curve mint-authority value, set graduated authority values to `null`, and expose only `view.destinations`. All transaction text and `href` values must come from their separate canonical fields. On each prelaunch/unavailable/error transition, reset the qualifier, every value selector including protocol fee and phase, every ARIA-live dynamic element, and every destination before changing the heading.

- [ ] **Step 5: Run site tests and verify GREEN**

Run:

```powershell
rtk npm test -- test/site.test.mjs test/launch-view.test.mjs
```

Expected: all lifecycle, transition, stale-clearing, and adapter tests pass.

- [ ] **Step 6: Refactor the existing qualifier tables into lifecycle-keyed constants**

Replace the old `prelaunch/live` qualifier key with the exact `PROOF_QUALIFIERS` table above and exact keys `prelaunch`, `curve-live`, `graduated`, and `unavailable`. `setUnavailableState` must use the unavailable entry and `renderVerifiedLifecycle` must select only by `view.state`. Keep all DOM mutation inside `web/app.js`; do not move it into `web/lib/launch-view.js`.

Run:

```powershell
rtk npm test -- test/site.test.mjs test/launch-view.test.mjs
```

Expected: all tests pass with no retained `status === "live"` branch in `web/app.js`.

- [ ] **Step 7: Commit lifecycle rendering**

```powershell
rtk git add web/app.js web/index.html test/site.test.mjs
rtk git commit -m "site: render verified lifecycle states"
```

---

### Task 3: Put the Mobile Prelaunch Warning First Without Moving Desktop Composition

**Files:**
- Create: `test/site-layout.test.mjs`
- Modify: `web/index.html`
- Modify: `web/styles.css`

**Interfaces:**
- Consumes: the exact prelaunch warning owned by Task 1.
- Produces: a hero whose first element child is `[data-launch-status]`; desktop retains the existing bottom safety strip; at widths up to 440px the warning is an in-flow first grid item before `.hero-copy` and the mascot.

- [ ] **Step 1: Write the failing static layout contract**

Create `test/site-layout.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile("web/index.html", "utf8");
const css = await readFile("web/styles.css", "utf8");

test("prelaunch warning is the hero's first element child with exact copy", () => {
  assert.match(
    html,
    /<section id="top"[^>]*>\s*<p class="status" data-launch-status role="alert">PRE-LAUNCH: No official mint address exists yet - ignore impostors\.<\/p>/,
  );
});

test("mobile warning enters flow before hero content while desktop strip remains absolute", () => {
  assert.match(css, /\.status\s*{[^}]*position:\s*absolute;/s);
  assert.match(
    css,
    /@media \(max-width: 440px\)[\s\S]*?\.status\s*{[^}]*position:\s*static;[^}]*grid-row:\s*1;[^}]*text-align:\s*left;/,
  );
});

test("the page forbids horizontal overflow and has no static trading href", () => {
  assert.match(css, /body\s*{[^}]*overflow-x:\s*hidden;/s);
  assert.doesNotMatch(html, /data-(?:solscan|raydium|pool-link)[^>]*\shref=/i);
});
```

- [ ] **Step 2: Run the layout contract and verify RED**

Run:

```powershell
rtk npm test -- test/site-layout.test.mjs
```

Expected: the first two tests fail because the warning is currently the hero's last child and has no mobile in-flow rule.

- [ ] **Step 3: Move the warning and add the exact mobile CSS**

Move this element to immediately after the hero opening tag:

```html
<p class="status" data-launch-status role="alert">PRE-LAUNCH: No official mint address exists yet - ignore impostors.</p>
```

Inside the existing `@media (max-width: 440px)` block, add:

```css
.hero {
  padding-top: 0;
}

.status {
  position: static;
  z-index: 2;
  grid-row: 1;
  margin: 0 calc(clamp(24px, 6vw, 88px) * -1);
  padding: 16px clamp(24px, 6vw, 88px);
  text-align: left;
}

.hero-copy {
  grid-row: 2;
}

.hero img {
  grid-row: 3;
}
```

Do not change the base `.status { position: absolute; right: 0; bottom: 0; left: 0; }` rule, so 1440×1000 composition stays unchanged.

- [ ] **Step 4: Run layout and site tests and verify GREEN**

Run:

```powershell
rtk npm test -- test/site-layout.test.mjs test/site.test.mjs
```

Expected: all layout and site tests pass.

- [ ] **Step 5: Refactor only duplicated mobile spacing values and rerun**

If the exact `clamp(24px, 6vw, 88px)` expression already has a hero custom property after Task 2, reuse that property; otherwise retain the explicit values above.

Run:

```powershell
rtk npm test -- test/site-layout.test.mjs test/site.test.mjs
```

Expected: all tests pass.

- [ ] **Step 6: Commit the mobile warning contract**

```powershell
rtk git add web/index.html web/styles.css test/site-layout.test.mjs
rtk git commit -m "site: put mobile launch warning first"
```

---

### Task 4: Enforce Deployable Availability and Certify the Browser Surface

**Files:**
- Modify: `scripts/check-site.mjs`
- Create: `test/check-site-v2.test.mjs`
- Modify: `web/README.md`
- Runtime evidence only: `artifacts/browser-certification/prelaunch-desktop-1440x1000.png`
- Runtime evidence only: `artifacts/browser-certification/prelaunch-mobile-390x844.png`
- Runtime evidence only: `artifacts/browser-certification/prelaunch-report.json`
- Runtime evidence only: `artifacts/browser-certification/<curve-live-verified|curve-live-unavailable|graduated-verified|graduated-unavailable>-<desktop-1440x1000|mobile-390x844|report>.{png,json}`

**Interfaces:**
- Consumes: schema-valid v2 records and `proof.availability` from the proof plan, plus exact selectors/copy from Tasks 1-3.
- Produces: `checkSite({ root }): Promise<SiteCheckResult>` that accepts a schema-valid unavailable state as deployable, rejects public-copy regressions and static destinations, and continues binding verified states to canonical artifacts through the proof-plan validator.

- [ ] **Step 1: Write failing checks for available and unavailable v2 sites**

Create `test/check-site-v2.test.mjs` using temporary roots copied from the repository fixtures. Assert:

```js
test("schema-valid unavailable state passes the deployable safety contract", async () => {
  const root = await createSiteRoot(createCurveLiveRecordV2({ availability: "unavailable" }));
  const result = await checkSite({ root });
  assert.equal(result.ok, true);
  assert.deepEqual(result.canonicalIssues, []);
});

test("verified state still requires exact canonical binding", async () => {
  const root = await createSiteRoot(createCurveLiveRecordV2({ availability: "verified" }));
  await removeCanonicalArtifact(root, "proof/mainnet-launchlab.json");
  const result = await checkSite({ root });
  assert.equal(result.ok, false);
  assert.match(result.canonicalIssues.join("\n"), /mainnet-launchlab/);
});

test("retired authority and LP claims fail the public-copy gate", async () => {
  const root = await createSiteRoot(createPrelaunchRecordV2());
  await appendToIndex(root, "Mint revoked. LP burned.");
  const result = await checkSite({ root });
  assert.equal(result.ok, false);
  assert.match(result.safetyIssues.join("\n"), /retired lifecycle claim/);
});
```

The helper functions create only temporary test files and copy the real `web/` tree; they do not mutate repository files.

- [ ] **Step 2: Run the v2 site-check test and verify RED**

Run:

```powershell
rtk npm test -- test/check-site-v2.test.mjs
```

Expected: FAIL because `checkSite` still recognizes only `status === "live"` and has no unavailable deployment rule or retired-lifecycle scan.

- [ ] **Step 3: Update the static and canonical gates**

In `scripts/check-site.mjs`:

```js
const REQUIRED_EXACT_HTML = Object.freeze([
  "PRE-LAUNCH: No official mint address exists yet - ignore impostors.",
  "Verification unavailable; no proof values or trading links are shown.",
  "High-risk meme coin. No promised utility, safety, scam detection, or returns.",
  "data-authority-explanation",
  "data-graduation-threshold",
  "data-graduation-pending",
  "data-graduation-balance",
  "data-pool-link",
  "data-lp-disposition",
  "data-fee-rights",
  "data-protocol-fee",
  "data-curve-phase",
  "data-metadata-update-authority",
]);
const RETIRED_LIFECYCLE_COPY = Object.freeze([
  /Mint revoked/iu,
  /Complete canonical proof is published; every launch property below is verified\./iu,
  /Required: null/iu,
]);
```

Use the proof plan's binding entry point only for `proof.availability === "verified"`. For `"unavailable"`, require schema validity and skip verified-value binding so the safety page remains deployable. Reject any retired phrase found in `web/index.html`, `web/app.js`, `launch/*.md`, or `src/social-copy.mjs` with `retired lifecycle claim: <phrase>`.

- [ ] **Step 4: Run site checks and verify GREEN**

Run:

```powershell
rtk npm test -- test/check-site-v2.test.mjs
rtk npm run check:site
```

Expected: v2 check tests pass and `check:site` prints JSON with `"ok": true` for the committed prelaunch record.

- [ ] **Step 5: Document and perform local browser certification**

Add this exact checklist to `web/README.md`:

```markdown
## Browser certification

1. Run `rtk npm run preview -- --listen 4173` for the committed prelaunch record.
2. Open `http://127.0.0.1:4173` at 1440 x 1000 and 390 x 844.
3. Capture `artifacts/browser-certification/prelaunch-desktop-1440x1000.png` and `artifacts/browser-certification/prelaunch-mobile-390x844.png`.
4. Confirm no console errors, no horizontal overflow, correct X/GitHub links, and no mint, Solscan, Raydium, pool, copy-address, or buy action.
5. At 390 x 844, confirm the complete text `PRE-LAUNCH: No official mint address exists yet - ignore impostors.` is visible above the fold.
6. Before launch, repeat locally from temporary site roots for `curve-live-verified`, `curve-live-unavailable`, `graduated-verified`, and `graduated-unavailable` fixture records. For verified states check every exact field/link and both independent transaction links; for unavailable states check the warning, hidden actions, no href, and no stale value after a verified-to-unavailable transition.
7. After each separately approved lifecycle deployment, repeat against `https://hakky.xyz` and record stage, availability, deployed main SHA, Pages run URL, both viewport results, console/network results, and exact visible destinations in the matching ignored report.
```

Run the preview with:

```powershell
rtk npm run preview -- --listen 4173
```

Expected: the local server reports port 4173. Prelaunch certification is not complete until both screenshots and the report exist; implementation certification is not complete until all five lifecycle/availability states have local evidence. Each production transition remains incomplete until its matching deployed report passes.

- [ ] **Step 6: Run the complete site slice after browser inspection**

Run:

```powershell
rtk npm test -- test/launch-view.test.mjs test/site.test.mjs test/site-layout.test.mjs test/check-site-v2.test.mjs
rtk npm run check:site
```

Expected: every test passes and `check:site` reports `"ok": true`.

- [ ] **Step 7: Commit site enforcement and certification instructions**

```powershell
rtk git add scripts/check-site.mjs test/check-site-v2.test.mjs web/README.md
rtk git commit -m "site: enforce deployable verification states"
```

---

### Task 5: Publish Stage-Correct Social Copy and Templates

**Files:**
- Modify: `src/social-copy.mjs`
- Modify: `test/social-copy.test.mjs`
- Modify: `launch/prelaunch-post.md`
- Create: `launch/curve-live-post.template.md`
- Create: `launch/graduated-post.template.md`
- Create: `launch/unavailable-post.template.md`
- Modify: `launch/README.md`
- Modify: `launch/content-calendar.md`
- Modify: `test/hakkyagent-identity.test.mjs`
- Verify unchanged: `launch/x-profile.md`
- Verify unchanged: `launch/assets/x-avatar.png`
- Verify unchanged: `launch/assets/x-banner.png`

**Interfaces:**
- Consumes: a canonical Solana mint and the graduated `lpDisposition.kind` discriminator from the proof plan.
- Produces: `buildCurveLiveProofPost({ mint }): string`, `buildGraduatedProofPost({ mint, lpDispositionKind }): string`, and `buildUnavailableWarningPost({ stage }): string`. Verified builders validate input, contain the mint exactly once, and name only observed mechanisms. The unavailable builder accepts only `curve-live` or `graduated`, contains no mint/trading destination/verified fact, and states that verification and official trading links are hidden. Every post remains at most 280 Unicode code points and contains no safety or return promise.

- [ ] **Step 1: Write failing exact-copy tests**

Replace `test/social-copy.test.mjs` with stage-specific expectations:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCurveLiveProofPost,
  buildGraduatedProofPost,
  buildUnavailableWarningPost,
} from "../src/social-copy.mjs";
import { FIXTURE_MINT } from "../test-support/launch-fixtures.mjs";

test("curve-live post names PDA control and pending graduation", () => {
  const post = buildCurveLiveProofPost({ mint: FIXTURE_MINT });
  assert.equal(post.match(new RegExp(FIXTURE_MINT, "gu"))?.length, 1);
  assert.match(post, /LaunchLab PDA; creator cannot sign/);
  assert.match(post, /pending graduation/);
  assert.match(post, /Freeze authority: null/);
  assert.doesNotMatch(post, /Mint revoked|LP burned/iu);
  assert.ok([...post].length <= 280);
});

test("graduated post names Burn & Earn without calling it an SPL burn", () => {
  const post = buildGraduatedProofPost({ mint: FIXTURE_MINT, lpDispositionKind: "burn-and-earn" });
  assert.match(post, /Burn & Earn permanent lock/);
  assert.doesNotMatch(post, /LP tokens irreversibly burned/);
  assert.ok([...post].length <= 280);
});

test("graduated post names literal LP burn only for amm-v4", () => {
  const post = buildGraduatedProofPost({ mint: FIXTURE_MINT, lpDispositionKind: "lp-burn" });
  assert.match(post, /LP tokens irreversibly burned/);
  assert.doesNotMatch(post, /Burn & Earn permanent lock/);
  assert.ok([...post].length <= 280);
});

test("social builders reject invalid mint and LP kind", () => {
  assert.throws(() => buildCurveLiveProofPost({ mint: "attacker\nFake mint" }), /valid Solana mint/);
  assert.throws(
    () => buildGraduatedProofPost({ mint: FIXTURE_MINT, lpDispositionKind: "creator-fee-key" }),
    /lpDispositionKind must equal burn-and-earn or lp-burn/,
  );
});

test("unavailable warning publishes no mint, destination, or verified fact", () => {
  const post = buildUnavailableWarningPost({ stage: "curve-live" });
  assert.match(post, /curve-live stage observed/i);
  assert.match(post, /verification is unavailable/i);
  assert.match(post, /official trading links are hidden/i);
  assert.doesNotMatch(post, /Mint:|Solscan|Raydium|verified/);
  assert.ok([...post].length <= 280);
  assert.throws(() => buildUnavailableWarningPost({ stage: "prelaunch" }), /curve-live or graduated/);
});
```

- [ ] **Step 2: Run social tests and verify RED**

Run:

```powershell
rtk npm test -- test/social-copy.test.mjs
```

Expected: FAIL because the three lifecycle builders are not exported.

- [ ] **Step 3: Implement exact verified and unavailable lifecycle posts**

Retain the current canonical `PublicKey` validation and replace `buildProofPost` with:

```js
export function buildCurveLiveProofPost({ mint } = {}) {
  assertCanonicalMint(mint);
  return [
    "$HAKKY curve live.",
    "",
    `Mint: ${mint}`,
    "Supply: 1,000,000 | team allocation encoded: 0%",
    "Mint authority: LaunchLab PDA; creator cannot sign.",
    "Freeze authority: null",
    "Final null authority and LP proof: pending graduation.",
    "",
    "Verify: https://hakky.xyz",
  ].join("\n");
}

export function buildGraduatedProofPost({ mint, lpDispositionKind } = {}) {
  assertCanonicalMint(mint);
  if (!["burn-and-earn", "lp-burn"].includes(lpDispositionKind)) {
    throw new Error("lpDispositionKind must equal burn-and-earn or lp-burn");
  }
  const lpLine = lpDispositionKind === "burn-and-earn"
    ? "LP: Burn & Earn permanent lock"
    : "LP tokens irreversibly burned";
  return [
    "$HAKKY graduation verified.",
    "",
    `Mint: ${mint}`,
    "Mint/freeze authorities: null",
    "Supply unchanged: 1,000,000",
    "Creator/platform LP rights: zero",
    lpLine,
    "",
    "Verify: https://hakky.xyz",
  ].join("\n");
}

export function buildUnavailableWarningPost({ stage } = {}) {
  if (!["curve-live", "graduated"].includes(stage)) {
    throw new Error("stage must equal curve-live or graduated");
  }
  return [
    `$HAKKY ${stage} stage observed.`,
    "",
    "HakkyAgent verification is unavailable.",
    "Official trading links are hidden while evidence is reconciled.",
    "",
    "Status: https://hakky.xyz",
  ].join("\n");
}
```

Use one private `assertCanonicalMint(mint)` helper; do not keep the ambiguous `buildProofPost` alias.

- [ ] **Step 4: Replace the prelaunch post and add exact lifecycle templates**

Set `launch/prelaunch-post.md` to:

```text
HakkyAgent is online.

Planned: 1,000,000 $HAKKY; 80% public curve, 20% liquidity, 0% team allocation encoded, no presale.
Authority lifecycle: LaunchLab PDA on curve; null after verified graduation.

No official mint yet. Ignore impostors.

https://hakky.xyz
```

Set `launch/curve-live-post.template.md` to the exact output of `buildCurveLiveProofPost`, replacing the runtime mint with `{{VERIFIED_MINT}}`. Set `launch/graduated-post.template.md` to both exact graduated variants under headings `burn-and-earn` and `lp-burn`, each using `{{VERIFIED_MINT}}`. Set `launch/unavailable-post.template.md` to both exact `buildUnavailableWarningPost` stage variants and include no mint placeholder.

Update `launch/README.md` and `launch/content-calendar.md` so the sequence is:

```text
prelaunch profile and post
curve-live verified mint post, pinned after separate approval
curve-live unavailable warning, pinned after separate approval if verified publication cannot complete
graduated proof post, replacing the pin after separate approval
graduated unavailable warning, replacing the pin after separate approval if graduated proof cannot complete
earlier posts remain published
```

Remove `revoked-authority configuration`, unqualified `null authorities`, and unqualified `LP burned` from those files. Keep the exact profile values in `launch/x-profile.md` unchanged.

- [ ] **Step 5: Extend the identity/public-claim scan**

Add all three new template files to `ACTIVE_IDENTITY_FILES` in `test/hakkyagent-identity.test.mjs` and add assertions that the exact prelaunch post is at most 280 Unicode code points, curve copy contains `LaunchLab PDA`, graduated copy contains both mechanism-specific phrases, unavailable copy contains no mint/destination/verified fact, and no active public file claims universal verification, guaranteed safety, or returns.

- [ ] **Step 6: Run social and identity tests and verify GREEN**

Run:

```powershell
rtk npm test -- test/social-copy.test.mjs test/hakkyagent-identity.test.mjs test/assets.test.mjs
```

Expected: all social, claim-boundary, dimension, and golden-hash tests pass; asset hashes remain unchanged.

- [ ] **Step 7: Refactor only duplicate post validation and rerun**

Keep one `assertCanonicalMint` helper, one `graduatedLpLine` mapping, and one two-value observed-stage guard. Do not generalize to arbitrary social networks, arbitrary tokens, or arbitrary LP mechanisms.

Run:

```powershell
rtk npm test -- test/social-copy.test.mjs test/hakkyagent-identity.test.mjs
```

Expected: all tests pass and each post remains at most 280 Unicode code points.

- [ ] **Step 8: Commit social lifecycle artifacts**

```powershell
rtk git add src/social-copy.mjs test/social-copy.test.mjs test/hakkyagent-identity.test.mjs launch/prelaunch-post.md launch/curve-live-post.template.md launch/graduated-post.template.md launch/unavailable-post.template.md launch/README.md launch/content-calendar.md
rtk git commit -m "social: align posts with launch lifecycle"
```

---

## Final Verification

- [ ] **Step 1: Run fresh dependency and deterministic asset gates**

```powershell
rtk npm ci
rtk npm run assets
rtk git diff --exit-code -- launch/assets web/assets
```

Expected: install succeeds, deterministic assets render, and the asset diff is empty.

- [ ] **Step 2: Run the complete automated gate**

```powershell
rtk npm run check
rtk git diff --check
```

Expected: every test and repository/site check passes; `git diff --check` emits no output.

- [ ] **Step 3: Scan for retired lifecycle language and placeholders**

```powershell
rtk git grep -n -i -E 'status[[:space:]]*(===|==|:)[[:space:]]*[\x27\x22]live[\x27\x22]|Mint revoked|revoked-authority configuration|Complete canonical proof is published; every launch property below is verified|Required: null' -- web launch README.md SECURITY.md docs/LAUNCH.md proof/README.md
```

Expected: the command returns no matches. Mechanism-qualified text such as `LP tokens irreversibly burned` remains allowed only in the `lp-burn` branch.

- [ ] **Step 4: Verify the worktree and reviewed change range**

```powershell
rtk git status --short
rtk git log --oneline --decorate origin/main..HEAD
rtk git diff --stat origin/main..HEAD
```

Expected: only the approved lifecycle/proof/public-surface work and its plan are present; no ignored browser evidence, secret, wallet material, external URL credential, or dirty-main Hardhat change appears.

- [ ] **Step 5: Complete deployed browser certification after approved merge**

Verify `https://hakky.xyz` at 1440×1000 and 390×844, save the two screenshots and `prelaunch-report.json` under ignored `artifacts/browser-certification/`, and require: no console errors, no horizontal overflow, correct X/GitHub links, the complete warning above the mobile fold, and no mint or trading destination.

Expected: the report binds the deployed main SHA and successful Pages run URL to both passing viewport captures.
