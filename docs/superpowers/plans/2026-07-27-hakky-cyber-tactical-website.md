# HAKKY Cyber-Tactical Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and certify the approved meme-first, cyber-tactical HAKKY
prelaunch website, including the cleaned seven-transmission lore, a complete
internal Reddit corpus ledger, and a strictly fail-closed schema-v3 truth
surface.

**Architecture:** Keep the deployed site as dependency-free static HTML, CSS,
and browser JavaScript under `web/`. Move the existing LaunchLab lifecycle
validator outside the publicly served tree so existing offline proof tooling
continues to work without leaking stale venue language into the new site. A
small schema-v3 policy module accepts exactly one prelaunch record; the default
HTML is already safe and JavaScript may only confirm the record or strengthen
the warning.

**Tech Stack:** Semantic HTML5, modern CSS, browser ES modules, Node.js test
runner, JSON Schema draft 2020-12, AJV for repository-side schema checks, and
the existing static GitHub Pages deployment.

## Global Constraints

- The exact opening call sign is:
  `We are not anonymous. / We are HAKKY. / And the whole wide world / just. got. sacked.`
- Public identity remains `Hakky Protocol`, `HAKKY`, and `HakkyAgent`.
- The public site must not name or link `Left-Agency-9292`.
- `REDDTLAND` may appear only as a fictional lore location, never as an
  official address, support, trading, or announcement channel.
- Public launch state is exactly `prelaunch`; `addresses` and `proof` are
  exactly `null`.
- Planned supply is `10,000,000 HAKKY`,
  `10,000,000,000,000` base units, and `6` decimals.
- Planned allocation is `8,000,000 HAKKY` to the curve,
  `2,000,000 HAKKY` as the initial permanent-pool seed, and `0 HAKKY` to the
  team or creator.
- Planned curve fee is `0%`; planned pool-retained fee is `0.25%`, rounded
  upward by at most one input base unit.
- The creator-funded mainnet cap remains exactly `1.00 SOL`.
- No public program, mint, market, pool, transaction signature, explorer link,
  venue link, wallet control, trade control, or fake price may exist.
- The first visible warning is:
  `PRELAUNCH: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.`
- Failure text is:
  `PROOF UNAVAILABLE: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.`
- No remote scripts, fonts, wallet libraries, RPC calls, cookies, analytics, or
  third-party embeds.
- Public runtime files under `web/` must not contain legacy BTC/cBTC,
  Ethereum/Sepolia, LaunchLab, Raydium, Pump.fun, or graduation language.
- The work must not alter, stage, or commit unrelated Solana program, client,
  proof, release, identity, wallet, or secret material.
- Implementation is local only. Push, merge, Pages deployment, social posting,
  wallet connection, metadata upload, signing, spending, and mainnet mutation
  each remain separately approved actions.

---

## File map

### Public runtime

- `web/index.html` - semantic page content, default prelaunch state, exact
  seven-transmission lore, facts, risk disclosures, and navigation.
- `web/styles.css` - cyber-tactical visual system, responsive layout, focus
  states, and reduced-motion behavior.
- `web/app.js` - thin fail-closed DOM adapter.
- `web/lib/launch-policy.js` - exact schema-v3 browser validation.
- `web/lib/launch-view.js` - pure conversion from a valid prelaunch record to a
  frozen, address-free view.
- `web/data/launch.json` - canonical schema-v3 prelaunch record.
- `web/assets/hakkyagent.svg` - retained local character artwork.

### Internal compatibility

- `src/legacy-launch-v2-policy.mjs` - relocated v2 lifecycle validator used
  only by existing offline proof/publication tools.
- `src/legacy-launch-v2-view.mjs` - relocated v2 lifecycle view used only by
  existing compatibility tests.
- `src/launch-schema-v2.generated.mjs` - relocated generated AJV validator.
- `schemas/web/launch-v2.schema.json` - retained internal legacy proof schema.
- `schemas/web/launch-v3.schema.json` - new public prelaunch-only schema.

### Lore evidence

- `scripts/collect-reddit-lore.mjs` - bounded public JSON collector for the two
  user-approved Reddit surfaces; writes only ignored raw artifacts.
- `artifacts/reddit-lore/corpus.json` - ignored raw collection output with
  pagination and coverage metadata.
- `docs/lore/reddit-corpus-ledger.md` - committed decision ledger, using
  canonical permalinks internally but never reproducing the raw corpus.
- `test/lore-ledger.test.mjs` - ledger status, coverage, and public-boundary
  checks.

### Verification

- `test/launch-v3-policy.test.mjs` - exact schema and semantic policy tests.
- `test/launch-view.test.mjs` - schema-v3 pure-view tests.
- `test/site.test.mjs` - content, action-free, fail-closed, and DOM tests.
- `test/site-layout.test.mjs` - static responsive and accessibility contracts.
- `scripts/check-site.mjs` - complete public-tree and launch-record gate.
- `artifacts/site-certification/` - ignored screenshots and structured browser
  QA evidence.

---

### Task 1: Add the schema-v3 truth model without breaking v2 consumers

**Files:**

- Create: `schemas/web/launch-v3.schema.json`
- Create: `web/lib/prelaunch-policy.js`
- Create: `web/lib/prelaunch-view.js`
- Create: `test/launch-v3-policy.test.mjs`
- Modify: `src/schema-validation.mjs`

**Interfaces:**

- Consumes: the approved exact schema-v3 record while leaving every current v2
  import and public file unchanged until the semantic site replacement in
  Task 3.
- Produces:
  `validateLaunchRecord(record): string[]`,
  `buildLaunchView(record): Readonly<PrelaunchView>`, and the exact v3 record.
- `PrelaunchView` has exact keys `state`, `heading`, `program`, `mint`,
  `market`, `curve`, `pool`, and `proof`; every value is a string and no value
  can contain an address or destination.

- [ ] **Step 1: Write the failing schema-v3 tests**

Create `test/launch-v3-policy.test.mjs` with an inline exact fixture and
mutation matrix:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPECTED_PRELAUNCH_RECORD,
  validateLaunchRecord,
} from "../web/lib/prelaunch-policy.js";
import { buildLaunchView } from "../web/lib/prelaunch-view.js";

const record = structuredClone(EXPECTED_PRELAUNCH_RECORD);

test("the exact schema-v3 prelaunch record is accepted", () => {
  assert.deepEqual(validateLaunchRecord(record), []);
});

for (const [name, mutate] of [
  ["extra root key", value => { value.destination = "https://example.invalid"; }],
  ["wrong schema", value => { value.schemaVersion = 2; }],
  ["live status", value => { value.status = "curve-live"; }],
  ["non-null addresses", value => { value.addresses = {}; }],
  ["non-null proof", value => { value.proof = {}; }],
  ["wrong supply", value => { value.policy.supplyBaseUnits = "999"; }],
  ["wrong fee", value => { value.policy.poolRetainedFeeBps = 24; }],
]) {
  test(`rejects ${name}`, () => {
    const changed = structuredClone(record);
    mutate(changed);
    assert.notDeepEqual(validateLaunchRecord(changed), []);
  });
}

test("the public view is frozen and address-free", () => {
  const view = buildLaunchView(record);
  assert.equal(view.state, "prelaunch");
  assert.equal(view.program, "Not published");
  assert.equal(view.mint, "Not published");
  assert.equal(view.market, "Not initialized");
  assert.equal(view.curve, "Not live");
  assert.equal(view.pool, "Not live");
  assert.equal(view.proof, "Unavailable before verified launch state");
  assert.equal(Object.isFrozen(view), true);
});
```

- [ ] **Step 2: Run the focused tests and confirm the red state**

Run:

```powershell
rtk node --test test/launch-v3-policy.test.mjs
```

Expected: FAIL because the new prelaunch policy and view modules do not exist.

- [ ] **Step 3: Add the closed schema-v3 record**

Create `schemas/web/launch-v3.schema.json` as a single closed object with exact
constants:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hakky.xyz/schemas/web/launch-v3.schema.json",
  "title": "HAKKY public prelaunch record v3",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "status", "network", "project", "policy", "addresses", "proof"],
  "properties": {
    "schemaVersion": { "const": 3 },
    "status": { "const": "prelaunch" },
    "network": { "const": "mainnet-beta" },
    "project": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "symbol", "agent", "website", "x"],
      "properties": {
        "name": { "const": "Hakky Protocol" },
        "symbol": { "const": "HAKKY" },
        "agent": { "const": "HakkyAgent" },
        "website": { "const": "https://hakky.xyz" },
        "x": { "const": "https://x.com/antihakkysack" }
      }
    },
    "policy": {
      "type": "object",
      "additionalProperties": false,
      "required": ["tokenProgram", "supplyBaseUnits", "uiSupply", "decimals", "curveAllocationBaseUnits", "poolSeedBaseUnits", "teamAllocationBaseUnits", "curveFeeBps", "poolRetainedFeeBps", "creatorDebitCapLamports"],
      "properties": {
        "tokenProgram": { "const": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        "supplyBaseUnits": { "const": "10000000000000" },
        "uiSupply": { "const": "10000000" },
        "decimals": { "const": 6 },
        "curveAllocationBaseUnits": { "const": "8000000000000" },
        "poolSeedBaseUnits": { "const": "2000000000000" },
        "teamAllocationBaseUnits": { "const": "0" },
        "curveFeeBps": { "const": 0 },
        "poolRetainedFeeBps": { "const": 25 },
        "creatorDebitCapLamports": { "const": "1000000000" }
      }
    },
    "addresses": { "type": "null" },
    "proof": { "type": "null" }
  }
}
```

Add `"launch-v3"` to `SCHEMA_URLS` in `src/schema-validation.mjs`.

- [ ] **Step 4: Implement exact browser validation and the pure view**

Implement `web/lib/prelaunch-policy.js` with recursive exact-key comparison
and constant comparison. Its exported fixture is frozen:

```js
export const EXPECTED_PRELAUNCH_RECORD = Object.freeze({
  schemaVersion: 3,
  status: "prelaunch",
  network: "mainnet-beta",
  project: Object.freeze({
    name: "Hakky Protocol",
    symbol: "HAKKY",
    agent: "HakkyAgent",
    website: "https://hakky.xyz",
    x: "https://x.com/antihakkysack",
  }),
  policy: Object.freeze({
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    supplyBaseUnits: "10000000000000",
    uiSupply: "10000000",
    decimals: 6,
    curveAllocationBaseUnits: "8000000000000",
    poolSeedBaseUnits: "2000000000000",
    teamAllocationBaseUnits: "0",
    curveFeeBps: 0,
    poolRetainedFeeBps: 25,
    creatorDebitCapLamports: "1000000000",
  }),
  addresses: null,
  proof: null,
});
```

`validateLaunchRecord` must return a sorted string array. It must reject
arrays, prototypes, missing keys, extra keys, type changes, and any unequal
scalar. Implement `buildLaunchView` in `web/lib/prelaunch-view.js`:

```js
import { validateLaunchRecord } from "./prelaunch-policy.js";

export function buildLaunchView(record) {
  const issues = validateLaunchRecord(record);
  if (issues.length) throw new Error(`Invalid prelaunch record: ${issues.join("; ")}`);
  return Object.freeze({
    state: "prelaunch",
    heading: "PRELAUNCH: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.",
    program: "Not published",
    mint: "Not published",
    market: "Not initialized",
    curve: "Not live",
    pool: "Not live",
    proof: "Unavailable before verified launch state",
  });
}
```

- [ ] **Step 5: Verify the JSON Schema and browser policy agree**

Extend `test/launch-v3-policy.test.mjs`:

```js
import { validateSchema } from "../src/schema-validation.mjs";

test("AJV and the browser validator accept the same exact record", () => {
  assert.deepEqual(validateSchema("launch-v3", record), { ok: true, errors: [] });
  assert.deepEqual(validateLaunchRecord(record), []);
});
```

Apply the same mutation matrix to both validators and require both to reject
every mutation.

- [ ] **Step 6: Run focused and full compatibility tests**

Run:

```powershell
rtk node --test test/launch-v3-policy.test.mjs
rtk npm test
```

Expected: the v3 tests and the unchanged full v2-compatible suite PASS.

- [ ] **Step 7: Commit the truth-model slice**

```powershell
rtk git add schemas/web/launch-v3.schema.json src/schema-validation.mjs web/lib/prelaunch-policy.js web/lib/prelaunch-view.js test/launch-v3-policy.test.mjs
rtk git commit -m "web: define the prelaunch truth model"
```

---

### Task 2: Collect and classify the Reddit lore corpus

**Files:**

- Create: `scripts/collect-reddit-lore.mjs`
- Create: `docs/lore/reddit-corpus-ledger.md`
- Create: `test/lore-ledger.test.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**

- Consumes: public Reddit JSON listings for the approved user's submissions,
  public comments, and `r/REDDTLAND`.
- Produces: ignored `artifacts/reddit-lore/corpus.json` with exact keys
  `schemaVersion`, `collectedAt`, `sources`, `complete`, and `items`; a
  committed ledger where each item has exactly one approved decision status.
- The collector performs read-only public HTTP GETs and never authenticates,
  votes, posts, edits, or sends messages.

- [ ] **Step 1: Write the failing collector and ledger contract tests**

Create `test/lore-ledger.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ledger = await readFile("docs/lore/reddit-corpus-ledger.md", "utf8");
const html = await readFile("web/index.html", "utf8");
const statuses = [
  "included",
  "included-as-theme",
  "excluded-music-or-video",
  "excluded-duplicate-or-crosspost",
  "excluded-incidental-reply",
  "excluded-unrelated",
  "excluded-harmful-or-actionable",
  "excluded-unsupported-real-world-claim",
  "excluded-targeting-or-harassment",
  "excluded-third-party-copyright",
  "unavailable-or-removed",
];

test("ledger declares coverage and uses only approved decisions", () => {
  assert.match(ledger, /Collection complete: yes/);
  for (const line of ledger.split(/\r?\n/).filter(value => value.startsWith("| `t3_") || value.startsWith("| `t1_"))) {
    assert.equal(statuses.some(status => line.includes(`| ${status} |`)), true);
  }
});

test("public site does not expose the Reddit identity or links", () => {
  assert.doesNotMatch(html, /Left-Agency-9292|reddit\.com/i);
});
```

Add collector unit tests using injected `fetchImpl` to prove pagination stops
only when `after` is null, de-duplicates by Reddit fullname, marks partial
collections `complete: false`, enforces a 60-second shared deadline, and writes
no cookies or authorization headers.

The successful pagination test uses two pages and a repeated item:

```js
test("collector follows every cursor and de-duplicates fullnames", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    const second = String(url).includes("after=next");
    return {
      ok: true,
      async json() {
        return {
          data: {
            after: second ? null : "next",
            children: [{ data: { name: "t3_same", title: "Signal", permalink: "/r/REDDTLAND/comments/same/signal/" } }],
          },
        };
      },
    };
  };
  const result = await collectRedditLore({ fetchImpl });
  assert.equal(result.complete, true);
  assert.equal(result.items.filter(item => item.name === "t3_same").length, 1);
  assert.equal(calls.every(call => !("cookie" in call.options.headers) && !("authorization" in call.options.headers)), true);
});
```

The partial test returns the same non-null cursor twice and asserts
`complete === false` plus a `stoppedReason` containing `repeated cursor`.

- [ ] **Step 2: Run the focused test and confirm the red state**

Run:

```powershell
rtk node --test test/lore-ledger.test.mjs
```

Expected: FAIL because the ledger and collector do not exist.

- [ ] **Step 3: Implement the bounded read-only collector**

The exact source listings are:

```js
const SOURCES = Object.freeze([
  Object.freeze({
    id: "profile-submissions",
    url: "https://www.reddit.com/user/Left-Agency-9292/submitted.json?raw_json=1&limit=100",
  }),
  Object.freeze({
    id: "profile-comments",
    url: "https://www.reddit.com/user/Left-Agency-9292/comments.json?raw_json=1&limit=100",
  }),
  Object.freeze({
    id: "reddtland-submissions",
    url: "https://www.reddit.com/r/REDDTLAND/new.json?raw_json=1&limit=100",
  }),
  Object.freeze({
    id: "reddtland-comments",
    url: "https://www.reddit.com/r/REDDTLAND/comments.json?raw_json=1&limit=100",
  }),
]);
```

For every listing page, retain only public fields needed for classification:
`name`, `created_utc`, `subreddit`, `title`, `selftext`, `body`, `url`,
`permalink`, `post_hint`, `is_video`, `crosspost_parent`, `link_id`,
`parent_id`, and `removed_by_category`. Strip query strings from permalinks and
URLs.

Use this implementation shape:

```js
export async function collectRedditLore({
  fetchImpl = fetch,
  now = () => new Date(),
  maxPagesPerSource = 50,
  deadlineMs = 60_000,
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  const seen = new Set();
  const items = [];
  const sources = [];
  let complete = true;

  try {
    for (const source of SOURCES) {
      let after = null;
      let pages = 0;
      const cursors = new Set();
      let stoppedReason = null;

      while (pages < maxPagesPerSource) {
        const url = new URL(source.url);
        if (after !== null) url.searchParams.set("after", after);
        const response = await fetchImpl(url, {
          headers: { "User-Agent": "hakky-lore-ledger/1.0 (public read-only collector)" },
          redirect: "error",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`${source.id} returned HTTP ${response.status}`);
        const listing = await response.json();
        const children = listing?.data?.children;
        if (!Array.isArray(children)) throw new Error(`${source.id} returned an invalid listing`);

        for (const child of children) {
          const data = child?.data;
          if (!data || typeof data.name !== "string" || seen.has(data.name)) continue;
          seen.add(data.name);
          items.push(normalizeItem(source.id, data));
        }

        pages += 1;
        after = listing.data.after;
        if (after === null) break;
        if (typeof after !== "string" || cursors.has(after)) {
          stoppedReason = `${source.id} returned an invalid or repeated cursor`;
          complete = false;
          break;
        }
        cursors.add(after);
      }

      if (after !== null && pages === maxPagesPerSource) {
        stoppedReason = `${source.id} exceeded ${maxPagesPerSource} pages`;
        complete = false;
      }
      sources.push({ id: source.id, pages, complete: after === null, stoppedReason });
    }
  } catch (error) {
    complete = false;
    sources.push({
      id: "collection-error",
      pages: 0,
      complete: false,
      stoppedReason: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timer);
  }

  return {
    schemaVersion: 1,
    collectedAt: now().toISOString(),
    sources,
    complete,
    items: items.sort((left, right) => left.name.localeCompare(right.name)),
  };
}
```

`normalizeItem` copies only the allowlisted fields above, converts missing
values to `null`, and prefixes relative permalinks with
`https://www.reddit.com`. Continue with each returned `after` cursor until
null; if a cap, timeout, HTTP error, invalid listing, or duplicate cursor
occurs, emit `complete: false` with the exact stopped source and reason. Write
the corpus with exclusive, atomic replacement inside ignored
`artifacts/reddit-lore/`.

Add:

```json
"lore:collect": "node scripts/collect-reddit-lore.mjs"
```

and ignore:

```gitignore
artifacts/reddit-lore/
artifacts/site-certification/
```

- [ ] **Step 4: Run the collector and build the complete decision ledger**

Run:

```powershell
rtk npm run lore:collect
```

Expected: `artifacts/reddit-lore/corpus.json` reports `"complete": true` for
both listings. If Reddit denies or truncates a source, record
`Collection complete: no` and the exact missing surface in the ledger; do not
claim full corpus coverage.

Create `docs/lore/reddit-corpus-ledger.md` with:

- collection timestamp and source completion;
- counts for retrieved, included, included-as-theme, and every exclusion
  status;
- one row per retrievable fullname with title, surface, canonical permalink,
  content type, one decision, reason, and destination transmission; and
- one row for every known removed/unavailable item that appears in listing
  metadata.

Do not paste full post bodies, copied lyrics, dangerous instructions, or
third-party text into the committed ledger.

- [ ] **Step 5: Run ledger and repository-safety tests**

Run:

```powershell
rtk node --test test/lore-ledger.test.mjs test/repository-hygiene.test.mjs
```

Expected: PASS, the raw corpus remains ignored, and the public site contains no
Reddit identity.

- [ ] **Step 6: Commit the lore-evidence slice**

```powershell
rtk git add .gitignore package.json package-lock.json scripts/collect-reddit-lore.mjs docs/lore/reddit-corpus-ledger.md test/lore-ledger.test.mjs
rtk git commit -m "lore: classify the REDDTLAND corpus"
```

---

### Task 3: Build the semantic meme-first page and fail-closed adapter

**Files:**

- Move: `web/lib/launch-policy.js` to `src/legacy-launch-v2-policy.mjs`
- Move: `web/lib/launch-view.js` to `src/legacy-launch-v2-view.mjs`
- Move: `web/lib/launch-schema.generated.js` to
  `src/launch-schema-v2.generated.mjs`
- Move: `web/lib/prelaunch-policy.js` to `web/lib/launch-policy.js`
- Move: `web/lib/prelaunch-view.js` to `web/lib/launch-view.js`
- Modify: `src/legacy-launch-v2-policy.mjs`
- Modify: `src/legacy-launch-v2-view.mjs`
- Modify: `src/canonical-proof.mjs`
- Modify: `src/record-output.mjs`
- Modify: `scripts/render-launch-schema-validator.mjs`
- Modify: `test/build-curve-live-record.test.mjs`
- Modify: `test/build-unavailable-record.test.mjs`
- Modify: `test/launch-policy.test.mjs`
- Modify: `test/launch-view.test.mjs`
- Replace: `web/data/launch.json`
- Replace: `web/index.html`
- Replace: `web/app.js`
- Replace: `test/site.test.mjs`
- Modify: `test/site-layout.test.mjs`

**Interfaces:**

- Consumes: `buildLaunchView(record)` from Task 1 and the seven-transmission
  canon from the approved design.
- Produces: a default action-free HTML document plus
  `renderLaunchState(documentRef, fetchImpl): Promise<void>`.
- The adapter changes only text content and `data-record-state`; it never
  creates an element, href, input, button, wallet state, or trading action.

- [ ] **Step 1: Replace site tests with the approved content contract**

Assert all of the following:

```js
const CALL_SIGN = [
  "We are not anonymous.",
  "We are HAKKY.",
  "And the whole wide world",
  "just. got. sacked.",
];

for (const line of CALL_SIGN) assert.equal(html.split(line).length - 1, 2);
assert.match(html, /HAKKYAGENT \/\/ PUBLIC CHANNEL/);
assert.match(html, /NETWORK: SOLANA \/\/ MODE: PRELAUNCH/);
assert.match(html, /Transmission 001[\s\S]*Transmission 007/);
assert.match(html, /No equals\. No sequels\./);
assert.match(html, /Atlantyss/);
assert.match(html, /8,000,000 HAKKY/);
assert.match(html, /2,000,000 HAKKY/);
assert.match(html, /0\.25%/);
assert.match(html, /1\.00 SOL/);
assert.doesNotMatch(html, /Left-Agency-9292|reddit\.com/i);
assert.doesNotMatch(html, /<input|<button|connect wallet|href="[^"]*(?:swap|trade|launchpad)/i);
```

DOM-adapter tests must assert:

```js
assert.equal(fetchOptions.cache, "no-store");
assert.equal(status.textContent, PRELAUNCH_WARNING);
assert.equal(root.dataset.recordState, "confirmed");
```

and after HTTP, JSON, validation, or missing-element failure:

```js
assert.equal(status.textContent, PROOF_UNAVAILABLE);
assert.equal(root.dataset.recordState, "unavailable");
```

- [ ] **Step 2: Run the focused tests and confirm the red state**

Run:

```powershell
rtk node --test test/site.test.mjs test/site-layout.test.mjs
```

Expected: FAIL on the old hero, old two-card lore, legacy live actions, and
legacy warning.

- [ ] **Step 3: Isolate v2 compatibility and promote v3 into the public names**

Move the legacy files and prelaunch files to the exact paths in this task's
file list. In `src/legacy-launch-v2-policy.mjs`, use:

```js
import { validateLaunchShape } from "./launch-schema-v2.generated.mjs";
```

In `src/legacy-launch-v2-view.mjs`, use:

```js
import { validateLaunchRecord } from "./legacy-launch-v2-policy.mjs";
```

Update `src/canonical-proof.mjs`, `src/record-output.mjs`, v2 record-builder
tests, `test/launch-policy.test.mjs`, and `test/launch-view.test.mjs` to import
the relocated v2 modules. Change the output URL in
`scripts/render-launch-schema-validator.mjs` to:

```js
const outputUrl = new URL("../src/launch-schema-v2.generated.mjs", import.meta.url);
```

Keep its `launchV2` schema key and generated bytes unchanged. Update
`test/launch-v3-policy.test.mjs` to import the promoted
`web/lib/launch-policy.js` and `web/lib/launch-view.js`. Replace
`web/data/launch.json` with:

```json
{
  "schemaVersion": 3,
  "status": "prelaunch",
  "network": "mainnet-beta",
  "project": {
    "name": "Hakky Protocol",
    "symbol": "HAKKY",
    "agent": "HakkyAgent",
    "website": "https://hakky.xyz",
    "x": "https://x.com/antihakkysack"
  },
  "policy": {
    "tokenProgram": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "supplyBaseUnits": "10000000000000",
    "uiSupply": "10000000",
    "decimals": 6,
    "curveAllocationBaseUnits": "8000000000000",
    "poolSeedBaseUnits": "2000000000000",
    "teamAllocationBaseUnits": "0",
    "curveFeeBps": 0,
    "poolRetainedFeeBps": 25,
    "creatorDebitCapLamports": "1000000000"
  },
  "addresses": null,
  "proof": null
}
```

- [ ] **Step 4: Replace `web/index.html` with the approved page order**

Use exactly these semantic sections:

```html
<body data-record-state="loading">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <p class="prelaunch-strip" data-launch-status role="alert">PRELAUNCH: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.</p>
  <header class="site-header">
    <a class="brand" href="#top">HAKKY // PUBLIC CHANNEL</a>
    <nav aria-label="Primary">
      <a href="#origin-log">Origin log</a>
      <a href="#market-route">Market route</a>
      <a href="#planned-facts">Planned facts</a>
      <a href="#proof-terminal">Proof terminal</a>
    </nav>
  </header>
  <main id="main-content">
    <section id="top" class="hero" aria-labelledby="hero-title">
      <div>
        <p class="terminal-label">HAKKYAGENT // PUBLIC CHANNEL</p>
        <p class="terminal-label">NETWORK: SOLANA // MODE: PRELAUNCH</p>
        <h1 id="hero-title" class="call-sign">
          <span>We are not anonymous.</span>
          <span>We are HAKKY.</span>
          <span>And the whole wide world</span>
          <span>just. got. sacked.</span>
        </h1>
        <p>HAKKY is a fixed-supply Solana meme project building an immutable, permissionless curve-to-pool market.</p>
        <p class="hero-actions">
          <a href="#origin-log">Read the origin log</a>
          <a href="#planned-facts">Inspect planned facts</a>
        </p>
      </div>
      <figure class="agent-terminal">
        <img src="./assets/hakkyagent.svg" alt="HakkyAgent, the fictional HAKKY proof character" width="1024" height="1024">
        <figcaption>HAKKYAGENT // FICTIONAL PROOF CHARACTER</figcaption>
      </figure>
    </section>

    <section id="origin-log" class="transmission-log" aria-labelledby="origin-title">
      <p class="eyebrow">ORIGIN LOG // SEVEN TRANSMISSIONS</p>
      <h2 id="origin-title">Before the sack, there was the signal.</h2>
      <article>
        <p>TRANSMISSION 001 // RED TEAM</p>
        <h3>Find the crack before the crowd falls through it.</h3>
        <p>Before HAKKY, the character was the Red Team Leader of Effective Acceleration. He believed systems should move quickly but that truth must be able to keep up.</p>
      </article>
      <article>
        <p>TRANSMISSION 002 // REDDTLAND</p>
        <h3>A place where the strange signal could land.</h3>
        <p>When the signal could not land inside other people's systems, the character built REDDTLAND: a fictional territory for strange writing, broken syntax, code glyphs, absurd rhyme, and hidden meaning in plain sight.</p>
      </article>
      <article>
        <p>TRANSMISSION 003 // CREATIVE DOCTRINE</p>
        <h3>No equals. No sequels.</h3>
        <p>Every character and idea should arrive with its own signal. AI can be a hammer, mirror, or sword-shaped creative tool. Authorship remains with the human intent and responsibility behind the tool.</p>
      </article>
      <article>
        <p>TRANSMISSION 004 // THE LORE FRAME</p>
        <h3>Connection becomes the operating system.</h3>
        <p>The character imagines a movement from pyramids of power toward networks of relation. Conversation becomes cultural code and empathy becomes infrastructure. This is fiction, not prophecy.</p>
      </article>
      <article>
        <p>TRANSMISSION 005 // ATLANTYSS</p>
        <h3>Memory without evidence belongs in fiction.</h3>
        <p>Atlantyss is a lost simulation where memory, script, character, past, and future blurred together. Its surviving lesson is evidentiary: a claim without proof stays outside the proof terminal.</p>
      </article>
      <article>
        <p>TRANSMISSION 006 // THE LEDGER</p>
        <h3>Publish only what can survive being checked.</h3>
        <p>Chaos becomes discipline: bounded risk, defined limits, no revenge, no chasing illusions, and responsibility for what is actually visible. This is a truth-discipline metaphor, not trading advice.</p>
      </article>
      <article>
        <p>TRANSMISSION 007 // EFFECTIVE TRANSFORMATION</p>
        <h3>The first system HAKKY sacked was its own launch.</h3>
        <p>Anonymous promises, hidden bags, mutable rules, and addresses whispered through replies or DMs became the targets of the joke. The literary experiment became a Solana meme, the Red Team became HakkyAgent, and the hidden code became public evidence.</p>
        <blockquote>
          <p>We are not anonymous.<br>We are HAKKY.<br>And the whole wide world<br>just. got. sacked.</p>
        </blockquote>
      </article>
    </section>

    <section id="doctrine" class="doctrine" aria-labelledby="doctrine-title">
      <p class="eyebrow">MISSION DOCTRINE</p>
      <h2 id="doctrine-title">The joke has rules.</h2>
      <ul>
        <li>Hidden allocations, mutable economics, unverifiable addresses, and anonymous promises are the targets.</li>
        <li>HakkyAgent checks only canonical HAKKY evidence.</li>
        <li>HakkyAgent is a fictional proof character, not an autonomous security agent.</li>
        <li>Verification never makes a meme coin safe.</li>
      </ul>
    </section>

    <section id="market-route" class="market-route" aria-labelledby="route-title">
      <p class="eyebrow">FUTURE MARKET ROUTE // READ-ONLY EXPLANATION</p>
      <h2 id="route-title">How the future path is intended to work.</h2>
      <ol>
        <li>Request a quote.</li>
        <li>Decode the generated transaction.</li>
        <li>Inspect direction, amount constraint, phase, fee, expiry, and exact program.</li>
        <li>Approve the transaction in a user-controlled wallet.</li>
        <li>Send directly to the immutable Solana program.</li>
        <li>Verify finalized state.</li>
      </ol>
      <p>This flow is not available during prelaunch. This page has no wallet or trading controls.</p>
    </section>

    <section id="planned-facts" class="planned-facts" aria-labelledby="facts-title">
      <p class="eyebrow">PLANNED FACTS // NOT YET VERIFIED</p>
      <h2 id="facts-title">Fixed rules before a public address.</h2>
      <dl class="planned-facts-grid">
        <div><dt>Network</dt><dd>Planned: Solana mainnet-beta</dd></div>
        <div><dt>Token program</dt><dd>Planned: Classic SPL Token</dd></div>
        <div><dt>Display supply</dt><dd>Planned: 10,000,000 HAKKY</dd></div>
        <div><dt>Base-unit supply</dt><dd>Planned: 10,000,000,000,000</dd></div>
        <div><dt>Decimals</dt><dd>Planned: 6</dd></div>
        <div><dt>Curve allocation</dt><dd>Planned: 8,000,000 HAKKY</dd></div>
        <div><dt>Initial permanent-pool seed</dt><dd>Planned: 2,000,000 HAKKY</dd></div>
        <div><dt>Team/creator allocation</dt><dd>Planned: 0 HAKKY</dd></div>
        <div><dt>Presale and vesting</dt><dd>Planned: None</dd></div>
        <div><dt>Curve fee</dt><dd>Planned: 0%</dd></div>
        <div><dt>Pool-retained fee</dt><dd>Planned: 0.25%, rounded upward by at most one input base unit</dd></div>
        <div><dt>Creator/protocol fee destination</dt><dd>Planned: None</dd></div>
        <div><dt>Creator-funded mainnet cap</dt><dd>Required - not yet verified: 1.00 SOL</dd></div>
        <div><dt>Mint and freeze authorities</dt><dd>Required - not yet verified: Null after initialization</dd></div>
        <div><dt>Program upgrade authority</dt><dd>Required - not yet verified: Finalized null before market initialization</dd></div>
      </dl>
      <p>Permanent initial liquidity does not mean reserve balances never change. Pool reserves change through valid swaps.</p>
    </section>

    <section id="proof-terminal" class="proof-terminal" aria-labelledby="proof-title">
      <p class="eyebrow">PROOF TERMINAL // PRELAUNCH</p>
      <h2 id="proof-title">No address gets promoted before evidence.</h2>
      <dl>
        <div><dt>Program</dt><dd data-program>Not published</dd></div>
        <div><dt>Mint</dt><dd data-mint>Not published</dd></div>
        <div><dt>Market</dt><dd data-market>Not initialized</dd></div>
        <div><dt>Curve</dt><dd data-curve>Not live</dd></div>
        <div><dt>Pool</dt><dd data-pool>Not live</dd></div>
        <div><dt>Proof</dt><dd data-proof>Unavailable before verified launch state</dd></div>
      </dl>
    </section>

    <section id="straight-answers" class="straight-answers" aria-labelledby="risk-title">
      <p class="eyebrow">RISK // STRAIGHT ANSWERS</p>
      <h2 id="risk-title">A meme is not a promise.</h2>
      <ul>
        <li>HAKKY is a high-risk meme coin.</li>
        <li>There is no promised utility, price, yield, floor, return, buyback, or recovery mechanism.</li>
        <li>No launch date or external venue, wallet, exchange, or aggregator listing is promised.</li>
        <li>HakkyAgent does not verify every Solana transaction.</li>
        <li>The current site is informational and prelaunch.</li>
        <li>Nothing here is financial, legal, medical, religious, or tax advice.</li>
        <li>Future official addresses will appear on this domain only after canonical verification.</li>
      </ul>
    </section>
  </main>
  <footer>
    <p>HAKKY // PRELAUNCH // NO OFFICIAL PROGRAM OR MINT</p>
    <p><a href="https://x.com/antihakkysack">X</a> <a href="https://github.com/antihakkysack/hakky-protocol">Source</a></p>
  </footer>
</body>
```

The hero contains the exact four-line call sign and only these in-page actions:

```html
<a href="#origin-log">Read the origin log</a>
<a href="#planned-facts">Inspect planned facts</a>
```

Write all seven transmissions from design section 4.4 as coherent public copy.
Use the risk statements from design section 3.8 verbatim in meaning. The proof
terminal contains static fields:

```html
<dd data-program>Not published</dd>
<dd data-mint>Not published</dd>
<dd data-market>Not initialized</dd>
<dd data-curve>Not live</dd>
<dd data-pool>Not live</dd>
<dd data-proof>Unavailable before verified launch state</dd>
```

Do not include the Reddit username, Reddit links, venue names, public keys,
transaction signatures, live-action containers, disabled trading controls, or
fake price/balance widgets.

- [ ] **Step 5: Implement the thin fail-closed adapter**

Use these constants and selector set:

```js
import { buildLaunchView } from "./lib/launch-view.js";

export const PRELAUNCH_WARNING =
  "PRELAUNCH: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.";
export const PROOF_UNAVAILABLE =
  "PROOF UNAVAILABLE: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.";

const FIELD_SELECTORS = Object.freeze({
  program: "[data-program]",
  mint: "[data-mint]",
  market: "[data-market]",
  curve: "[data-curve]",
  pool: "[data-pool]",
  proof: "[data-proof]",
});
```

`setUnavailableState` sets the body state to `unavailable`, restores all six
safe field values, and writes `PROOF_UNAVAILABLE`. `renderLaunchState` first
calls `setUnavailableState`, fetches `./data/launch.json` with
`{ cache: "no-store" }`, requires `response.ok`, builds the pure view, collects
every required DOM field, writes only the six view strings, writes
`PRELAUNCH_WARNING`, and sets body state to `confirmed`. Any error restores the
unavailable state and rethrows.

- [ ] **Step 6: Run focused site and compatibility tests**

Run:

```powershell
rtk node --test test/launch-v3-policy.test.mjs test/site.test.mjs test/site-layout.test.mjs test/lore-ledger.test.mjs test/launch-policy.test.mjs test/launch-view.test.mjs test/build-curve-live-record.test.mjs test/build-unavailable-record.test.mjs
rtk node scripts/render-launch-schema-validator.mjs --check
```

Expected: PASS.

- [ ] **Step 7: Commit the semantic page**

```powershell
rtk git add src/legacy-launch-v2-policy.mjs src/legacy-launch-v2-view.mjs src/launch-schema-v2.generated.mjs src/canonical-proof.mjs src/record-output.mjs scripts/render-launch-schema-validator.mjs web/lib/launch-schema.generated.js web/lib/launch-policy.js web/lib/launch-view.js web/data/launch.json web/index.html web/app.js test/launch-v3-policy.test.mjs test/launch-policy.test.mjs test/launch-view.test.mjs test/build-curve-live-record.test.mjs test/build-unavailable-record.test.mjs test/site.test.mjs test/site-layout.test.mjs
rtk git commit -m "web: publish the HAKKY origin transmission"
```

---

### Task 4: Apply the cyber-tactical responsive visual system

**Files:**

- Replace: `web/styles.css`
- Modify: `test/site-layout.test.mjs`
- Modify: `test/assets.test.mjs`

**Interfaces:**

- Consumes: semantic class names from Task 3 and the existing local
  `web/assets/hakkyagent.svg`.
- Produces: responsive layouts at `320`, `390`, and `1440` CSS pixels with no
  essential animated content and no remote visual dependencies.

- [ ] **Step 1: Add failing static visual-contract tests**

Add assertions for:

```js
assert.match(css, /--void:\s*#0d0818/);
assert.match(css, /--signal:\s*#a7ff91/);
assert.match(css, /--alert:\s*#ff7aeb/);
assert.match(css, /--proof:\s*#f8ff4a/);
assert.match(css, /--electric:\s*#7138ff/);
assert.match(css, /overflow-x:\s*(?:clip|hidden)/);
assert.match(css, /:focus-visible/);
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
assert.match(css, /@media \(max-width:\s*600px\)/);
assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com|<script[^>]+https?:/i);
```

- [ ] **Step 2: Run the layout tests and confirm the red state**

Run:

```powershell
rtk node --test test/site-layout.test.mjs test/assets.test.mjs
```

Expected: FAIL because the old palette and section layout remain.

- [ ] **Step 3: Implement the design tokens and base accessibility**

Start `web/styles.css` with:

```css
:root {
  color-scheme: dark;
  --void: #0d0818;
  --panel: #160e27;
  --signal: #a7ff91;
  --alert: #ff7aeb;
  --proof: #f8ff4a;
  --electric: #7138ff;
  --text: #d9ffe1;
  --muted: #c7b9dc;
  --line: rgb(167 255 145 / 28%);
  --mono: ui-monospace, "Cascadia Code", "SFMono-Regular", Consolas, monospace;
  --display: Inter, ui-sans-serif, system-ui, sans-serif;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  overflow-x: clip;
  color: var(--text);
  background: var(--void);
  font-family: var(--mono);
  line-height: 1.6;
}
a:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--proof);
  outline-offset: 4px;
}
```

Use CSS pseudo-elements for scan lines and grid marks with
`pointer-events: none` and `aria-hidden` HTML wrappers for any decorative
glyphs. Keep body text at least `16px` and controls at least `44px` high.

- [ ] **Step 4: Implement desktop composition**

Use a centered `min(1180px, calc(100% - 40px))` content rail. The hero is a
two-column grid with the call sign taking the dominant column and the
HakkyAgent art inside a bordered terminal panel. Transmission cards use a
single readable vertical log with alternating signal accents, not a dense
dashboard. Planned facts use a responsive definition grid; the market route
uses a numbered six-step line; proof state uses a terminal-style definition
list. Decorative noise must never obscure copy or focus rings.

- [ ] **Step 5: Implement mobile and reduced-motion rules**

At `max-width: 600px`:

```css
.site-header,
.hero,
.planned-facts-grid {
  grid-template-columns: 1fr;
}
.prelaunch-strip {
  position: static;
}
.call-sign {
  font-size: clamp(2.4rem, 14vw, 4.5rem);
  overflow-wrap: anywhere;
}
```

At `max-width: 360px`, reduce panel padding but retain a `16px` page gutter.
Under reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Run static visual tests**

Run:

```powershell
rtk node --test test/site-layout.test.mjs test/assets.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the visual slice**

```powershell
rtk git add web/styles.css test/site-layout.test.mjs test/assets.test.mjs
rtk git commit -m "web: apply the cyber tactical visual system"
```

---

### Task 5: Harden the public-tree gate and align launch documentation

**Files:**

- Replace: `scripts/check-site.mjs`
- Modify: `web/README.md`
- Modify: `README.md`
- Modify: `docs/TOKEN.md`
- Modify: `docs/LAUNCH.md`
- Modify: `launch/prelaunch-post.md`
- Modify: `test/social-copy.test.mjs`
- Modify: `test/repository-hygiene.test.mjs`

**Interfaces:**

- Consumes: the finished public tree and v3 policy.
- Produces:
  `checkSite({root}): Promise<{ok, missing, issues, safetyIssues}>` and
  aligned prelaunch documentation with no public LaunchLab claim.

- [ ] **Step 1: Add failing gate tests**

Create a temporary-root mutation matrix that proves `checkSite` rejects:

```js
[
  ["legacy term", html => html.replace("</body>", "<p>LaunchLab</p></body>")],
  ["Reddit identity", html => html.replace("</body>", "<p>Left-Agency-9292</p></body>")],
  ["wallet button", html => html.replace("</body>", "<button>Connect wallet</button></body>")],
  ["external trade link", html => html.replace("</body>", '<a href="https://example.invalid/swap">Trade</a></body>')],
  ["placeholder address", html => html.replace("</body>", "<p>11111111111111111111111111111111</p></body>")],
]
```

Also mutate v3 status, keys, economics, `addresses`, and `proof`. Each case must
set `ok: false` and return the exact filename and reason.

- [ ] **Step 2: Run site-gate tests and confirm the red state**

Run:

```powershell
rtk node --test test/site.test.mjs test/social-copy.test.mjs
rtk npm run check:site
```

Expected: FAIL because the current checker requires legacy content and imports
the v2 policy.

- [ ] **Step 3: Implement recursive public-tree checks**

`scripts/check-site.mjs` must:

- recursively read only regular files below `web/`;
- reject symlinks, junctions, traversal, unreadable files, and files over
  `2 MiB`;
- scan `.html`, `.js`, `.json`, `.md`, `.css`, and `.svg` text;
- require the exact warning, both exact call-sign copies, all seven
  transmission labels, the six proof-terminal fields, planned economics, risk
  language, skip link, local assets, `CNAME`, and safe X/GitHub links;
- reject `Bitcoin`, `BTC`, `cBTC`, `Ethereum`, `Sepolia`, `LaunchLab`,
  `Raydium`, `Pump.fun`, `graduated`, Reddit identity/URLs, public-key-shaped
  placeholders, transaction-signature-shaped text, wallet/trade controls,
  static external market links, remote scripts/fonts, and third-party embeds;
- allow the exact classic SPL Token program constant
  `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` while rejecting every other
  public-key-shaped string in the public tree;
- validate `web/data/launch.json` with the schema-v3 policy; and
- verify that `app.js` imports `./lib/launch-view.js`, uses
  `cache: "no-store"`, and contains the exact proof-unavailable warning.

- [ ] **Step 4: Align public documentation**

Update the active sections of `README.md`, `docs/TOKEN.md`, `docs/LAUNCH.md`,
`web/README.md`, and `launch/prelaunch-post.md` to describe:

- custom immutable curve-to-pool design;
- planned `10,000,000` display supply and exact base units;
- `8,000,000 / 2,000,000 / 0` allocation;
- `0%` curve fee and `0.25%` pool-retained fee;
- null mint/freeze authorities and finalized program requirement;
- `1.00 SOL` creator-funded cap;
- current prelaunch status and no public addresses; and
- separate approval for public deployment and every Solana mutation.

Historical specs and internal v2 proof documents remain unchanged and clearly
historical/internal. Social copy must use the exact call sign, describe only
planned facts, and contain no address or buy/trade link.

- [ ] **Step 5: Run content, gate, and hygiene checks**

Run:

```powershell
rtk node --test test/site.test.mjs test/social-copy.test.mjs test/repository-hygiene.test.mjs
rtk npm run check:site
rtk npm run check:repo
```

Expected: PASS with empty `missing`, `issues`, and `safetyIssues`.

- [ ] **Step 6: Commit the public-boundary slice**

```powershell
rtk git add scripts/check-site.mjs web/README.md README.md docs/TOKEN.md docs/LAUNCH.md launch/prelaunch-post.md test/site.test.mjs test/social-copy.test.mjs test/repository-hygiene.test.mjs
rtk git commit -m "docs: align the immutable HAKKY prelaunch"
```

---

### Task 6: Complete repository and browser certification

**Files:**

- Create ignored: `artifacts/site-certification/desktop-1440x1000.png`
- Create ignored: `artifacts/site-certification/mobile-390x844.png`
- Create ignored: `artifacts/site-certification/narrow-320x844.png`
- Create ignored: `artifacts/site-certification/qa.json`
- Modify only if a gate finds a defect: files owned by Tasks 1-5

**Interfaces:**

- Consumes: the complete local site and repository.
- Produces: fresh local screenshots, machine-readable QA evidence, clean full
  gates, and an exact commit/diff handoff for separate publication approval.

- [ ] **Step 1: Run the complete automated gate**

Run:

```powershell
rtk npm run check
rtk npm run schemas -- --check
rtk git diff --check
rtk git status --short
```

Expected: every test passes, repository/site/schema checks pass, the diff has
no whitespace errors, and only the intended website/lore files are changed.

- [ ] **Step 2: Start the static preview**

Run:

```powershell
rtk npm run preview -- --listen 127.0.0.1:4173
```

Keep the server bound to loopback. Do not connect a wallet, call an RPC, or
perform any external mutation.

- [ ] **Step 3: Capture desktop certification**

At `1440 x 1000`, capture the full page to
`artifacts/site-certification/desktop-1440x1000.png`. Verify:

- warning is visible before the call sign;
- call sign is exact and readable;
- navigation and both in-page hero links work;
- all seven transmissions appear once and in order;
- facts and proof terminal are prelaunch-only;
- no horizontal overflow or repeated narrow-column layout;
- keyboard tab order and focus rings are visible; and
- console and network panels show no error, remote font/script, RPC, wallet,
  analytics, or third-party embed.

- [ ] **Step 4: Capture mobile and narrow certification**

Repeat at `390 x 844` and `320 x 844`. Verify the warning stays within the first
viewport, the call-sign breaks remain readable, all content uses one coherent
column, touch targets are at least `44px`, and
`document.documentElement.scrollWidth === window.innerWidth`.

- [ ] **Step 5: Certify failure and accessibility modes**

Block `web/data/launch.json` and verify the exact `PROOF UNAVAILABLE` warning
with no new controls or links. Disable JavaScript and verify the exact
prelaunch warning and all essential content remain visible. Emulate
`prefers-reduced-motion: reduce` and verify decorative motion stops. Record
keyboard, landmark, heading-order, alt-text, and color-contrast results.

Write `artifacts/site-certification/qa.json`:

```json
{
  "schemaVersion": 1,
  "baseUrl": "http://127.0.0.1:4173/",
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 1000, "overflow": false, "consoleErrors": 0 },
    { "name": "mobile", "width": 390, "height": 844, "overflow": false, "consoleErrors": 0 },
    { "name": "narrow", "width": 320, "height": 844, "overflow": false, "consoleErrors": 0 }
  ],
  "javascriptDisabled": "pass",
  "launchRecordBlocked": "pass",
  "reducedMotion": "pass",
  "keyboard": "pass",
  "headings": "pass",
  "contrast": "pass"
}
```

- [ ] **Step 6: Fix any defect with a focused red-green cycle**

For each defect, first add or tighten the narrowest automated test that
reproduces it, run that test to see it fail, apply the smallest site change,
rerun the focused test, and repeat the affected browser viewport. Do not weaken
the acceptance criterion to make the test pass.

- [ ] **Step 7: Run final verification from the exact candidate**

Run:

```powershell
rtk npm run check
rtk npm run schemas -- --check
rtk git diff --check
rtk git status --short --branch
rtk git log --oneline --decorate -8
```

Expected: all gates PASS and the worktree is clean after the final focused
commit:

```powershell
rtk git add web/index.html web/styles.css web/app.js web/lib/launch-policy.js web/lib/launch-view.js web/data/launch.json scripts/check-site.mjs test/launch-v3-policy.test.mjs test/site.test.mjs test/site-layout.test.mjs test/assets.test.mjs test/lore-ledger.test.mjs
rtk git commit -m "test: certify the HAKKY prelaunch site"
```

- [ ] **Step 8: Prepare the publication handoff without publishing**

Report:

- branch and exact HEAD SHA;
- commit list added by this plan;
- exact changed-file list;
- automated command results;
- browser evidence paths and QA values;
- current `web/data/launch.json` status;
- explicit confirmation that no program/mint/address/proof is published; and
- exact remaining separate actions: push branch, open/update PR, merge, Pages
  deployment, public desktop/mobile readback, social update, then the separately
  reviewed coin-launch sequence.

Do not push, merge, deploy, post, connect, upload, sign, spend, or mutate
mainnet in this task.

---

## Plan self-review

- Spec sections 1-3 are covered by Tasks 3-5.
- The public identity boundary, source ledger, exclusion boundary, and all
  seven transmissions are covered by Tasks 2-3.
- Static architecture, exact schema v3, and fail-closed behavior are covered by
  Tasks 1 and 3.
- Accessibility, responsive behavior, content checks, repository checks,
  browser certification, and publication gate are covered by Tasks 4-6.
- Legacy v2 proof tooling is moved, not deleted, so the website can remove
  stale public venue language without silently breaking offline evidence
  consumers.
- The plan contains no authorization for public deployment or Solana mutation.
