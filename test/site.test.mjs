import assert from "node:assert/strict";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkSite } from "../scripts/check-site.mjs";
import {
  PRELAUNCH_WARNING,
  PROOF_UNAVAILABLE,
  buildLaunchView,
  renderLaunchState,
} from "../web/app.js";

const html = await readFile("web/index.html", "utf8");
const record = JSON.parse(await readFile("web/data/launch.json", "utf8"));

const CALL_SIGN = Object.freeze([
  "We are not anonymous.",
  "We are HAKKY.",
  "And the whole wide world",
  "just. got. sacked.",
]);
const SAFE_FIELDS = Object.freeze({
  program: "Not published",
  mint: "Not published",
  market: "Not initialized",
  curve: "Not live",
  pool: "Not live",
  proof: "Unavailable before verified launch state",
});
const FIELD_SELECTORS = Object.freeze({
  program: "[data-program]",
  mint: "[data-mint]",
  market: "[data-market]",
  curve: "[data-curve]",
  pool: "[data-pool]",
  proof: "[data-proof]",
});
const SELECTORS = Object.freeze([
  "[data-launch-status]",
  ...Object.values(FIELD_SELECTORS),
]);

class FakeElement {
  constructor(textContent = "") {
    this.textContent = textContent;
  }
}

function createDocument({ missing } = {}) {
  const elements = new Map(SELECTORS.map((selector) => [selector, new FakeElement("stale")]));
  if (missing) elements.delete(missing);
  return {
    body: { dataset: { recordState: "loading" } },
    elements,
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
  };
}

function responseFor(value) {
  return async (_url, options) => ({
    ok: true,
    options,
    async json() {
      return structuredClone(value);
    },
  });
}

function assertState(documentRef, { rootState, status }) {
  assert.equal(documentRef.body.dataset.recordState, rootState);
  assert.equal(documentRef.elements.get("[data-launch-status]").textContent, status);
  for (const [name, expected] of Object.entries(SAFE_FIELDS)) {
    assert.equal(documentRef.elements.get(FIELD_SELECTORS[name])?.textContent, expected);
  }
}

async function createSiteFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-site-gate-"));
  await cp("web", path.join(root, "web"), { recursive: true });
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("homepage contains the approved meme-first origin transmission", () => {
  for (const line of CALL_SIGN) {
    assert.equal(
      html.split(line).length - 1,
      2,
      `${JSON.stringify(line)} must appear once in the hero and once in the conclusion`,
    );
  }

  assert.match(html, /HAKKYAGENT \/\/ PUBLIC CHANNEL/u);
  assert.match(html, /NETWORK: SOLANA \/\/ MODE: PRELAUNCH/u);
  assert.match(html, /Transmission 001[\s\S]*Transmission 007/iu);
  assert.match(html, /No equals\. No sequels\./u);
  assert.match(html, /Atlantyss/u);
  assert.match(html, /8,000,000 HAKKY/u);
  assert.match(html, /2,000,000 HAKKY/u);
  assert.match(html, /0\.25%/u);
  assert.match(html, /1\.00 SOL/u);
});

test("homepage is privacy-safe, action-free, and prelaunch-only", () => {
  assert.doesNotMatch(html, /Left-Agency-9292|reddit\.com/iu);
  assert.doesNotMatch(
    html,
    /<input|<button|connect wallet|href="[^"]*(?:swap|trade|launchpad)/iu,
  );
  assert.doesNotMatch(html, /data-live-actions|data-solscan|data-raydium/iu);
  assert.match(
    html,
    /This flow is not available during prelaunch\. This page has no wallet or trading controls\./u,
  );
  assert.match(html, /There is no promised utility, price, yield, floor, return, buyback, or recovery mechanism\./u);
});

test("homepage contains exactly the six static proof-terminal fields", () => {
  for (const [name, value] of Object.entries(SAFE_FIELDS)) {
    assert.match(html, new RegExp(`<dd data-${name}>${value}</dd>`));
  }
  assert.equal((html.match(/\bdata-(?:program|mint|market|curve|pool|proof)\b/gu) ?? []).length, 6);
});

test("schema-v3 prelaunch view contains no address or destination", () => {
  const view = buildLaunchView(record);
  assert.deepEqual(view, {
    state: "prelaunch",
    heading: PRELAUNCH_WARNING,
    ...SAFE_FIELDS,
  });
  assert.doesNotMatch(JSON.stringify(view), /https?:|[1-9A-HJ-NP-Za-km-z]{32,44}/u);
});

test("valid record renders only safe prelaunch strings and confirms the record", async () => {
  const documentRef = createDocument();
  let fetchUrl;
  let fetchOptions;
  const fetchImpl = async (url, options) => {
    fetchUrl = url;
    fetchOptions = options;
    return responseFor(record)(url, options);
  };

  await renderLaunchState(documentRef, fetchImpl);

  assert.equal(fetchUrl, "./data/launch.json");
  assert.deepEqual(fetchOptions, { cache: "no-store" });
  assertState(documentRef, {
    rootState: "confirmed",
    status: PRELAUNCH_WARNING,
  });
});

test("HTTP, JSON, validation, and missing-element failures restore unavailable state", async () => {
  const invalid = structuredClone(record);
  invalid.addresses = {};
  const failures = [
    async () => ({ ok: false, status: 503 }),
    async () => ({
      ok: true,
      async json() {
        throw new SyntaxError("bad json");
      },
    }),
    responseFor(invalid),
  ];

  for (const fetchImpl of failures) {
    const documentRef = createDocument();
    await assert.rejects(renderLaunchState(documentRef, fetchImpl));
    assertState(documentRef, {
      rootState: "unavailable",
      status: PROOF_UNAVAILABLE,
    });
  }

  const missing = createDocument({ missing: "[data-pool]" });
  await assert.rejects(
    renderLaunchState(missing, responseFor(record)),
    /Launch-state elements are missing: pool/u,
  );
  assert.equal(missing.body.dataset.recordState, "unavailable");
  assert.equal(missing.elements.get("[data-launch-status]").textContent, PROOF_UNAVAILABLE);
  for (const [name, value] of Object.entries(SAFE_FIELDS)) {
    if (name !== "pool") {
      assert.equal(missing.elements.get(FIELD_SELECTORS[name]).textContent, value);
    }
  }
});

test("the complete public tree passes the recursive publication gate", async () => {
  const result = await checkSite({ root: process.cwd() });
  assert.deepEqual(result, {
    ok: true,
    missing: [],
    issues: [],
    safetyIssues: [],
  });
});

for (const [name, insertion, expectedIssue] of [
  [
    "legacy term",
    "<p>LaunchLab</p>",
    'web/index.html: forbidden legacy term "LaunchLab"',
  ],
  [
    "Reddit identity",
    "<p>Left-Agency-9292</p>",
    "web/index.html: Reddit identity or URL is forbidden",
  ],
  [
    "wallet button",
    "<button>Connect wallet</button>",
    "web/index.html: wallet or trading control is forbidden",
  ],
  [
    "external trade link",
    '<a href="https://example.invalid/swap">Trade</a>',
    "web/index.html: external market link is forbidden",
  ],
  [
    "placeholder address",
    "<p>11111111111111111111111111111111</p>",
    "web/index.html: unapproved Solana public key is forbidden",
  ],
]) {
  test(`public-tree gate rejects ${name} with a filename and exact reason`, async (t) => {
    const root = await createSiteFixture(t);
    const indexPath = path.join(root, "web", "index.html");
    const source = await readFile(indexPath, "utf8");
    await writeFile(indexPath, source.replace("</body>", `${insertion}</body>`));

    const result = await checkSite({ root });

    assert.equal(result.ok, false);
    assert.ok(result.safetyIssues.includes(expectedIssue));
  });
}

for (const [name, mutate, expectedIssue] of [
  [
    "status",
    value => { value.status = "curve-live"; },
    'web/data/launch.json: /status must equal "prelaunch"; received "curve-live"',
  ],
  [
    "keys",
    value => { value.destination = "https://example.invalid"; },
    "web/data/launch.json: /destination is not allowed",
  ],
  [
    "economics",
    value => { value.policy.supplyBaseUnits = "999"; },
    'web/data/launch.json: /policy/supplyBaseUnits must equal "10000000000000"; received "999"',
  ],
  [
    "addresses",
    value => { value.addresses = {}; },
    "web/data/launch.json: /addresses must equal null; received {}",
  ],
  [
    "proof",
    value => { value.proof = {}; },
    "web/data/launch.json: /proof must equal null; received {}",
  ],
]) {
  test(`public-tree gate rejects mutated v3 ${name} with an exact reason`, async (t) => {
    const root = await createSiteFixture(t);
    const launchPath = path.join(root, "web", "data", "launch.json");
    const value = JSON.parse(await readFile(launchPath, "utf8"));
    mutate(value);
    await writeFile(launchPath, `${JSON.stringify(value, null, 2)}\n`);

    const result = await checkSite({ root });

    assert.equal(result.ok, false);
    assert.ok(result.issues.includes(expectedIssue));
  });
}

test("public-tree gate rejects oversized regular files with an exact reason", async (t) => {
  const root = await createSiteFixture(t);
  await writeFile(path.join(root, "web", "oversized.css"), "x".repeat((2 * 1024 * 1024) + 1));

  const result = await checkSite({ root });

  assert.equal(result.ok, false);
  assert.ok(result.safetyIssues.includes("web/oversized.css: file exceeds 2 MiB"));
});
