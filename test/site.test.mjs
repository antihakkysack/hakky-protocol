import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildLaunchView, renderLaunchState } from "../web/app.js";
import { createValidLiveRecord } from "../test-support/launch-fixtures.mjs";

const html = await readFile("web/index.html", "utf8");
const record = JSON.parse(await readFile("web/data/launch.json", "utf8"));

const SELECTORS = [
  "[data-launch-status]",
  "[data-live-actions]",
  "[data-mint]",
  "[data-supply]",
  "[data-mint-authority]",
  "[data-freeze-authority]",
  "[data-team-allocation]",
  "[data-metadata]",
  "[data-decimals]",
  "[data-creator]",
  "[data-creator-balance]",
  "[data-allocation]",
  "[data-creator-fee]",
  "[data-lp-policy]",
  "[data-creator-spend]",
  "[data-verification-time]",
  "[data-launch-transaction]",
  "[data-solscan]",
  "[data-raydium]",
];

class FakeElement {
  constructor({ hidden = false, textContent = "" } = {}) {
    this.hidden = hidden;
    this.textContent = textContent;
    this.attributes = new Map();
  }

  get href() {
    return this.getAttribute("href");
  }

  set href(value) {
    this.setAttribute("href", value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

function createDocument({ missing } = {}) {
  const elements = new Map(SELECTORS.map((selector) => [selector, new FakeElement()]));
  elements.get("[data-live-actions]").hidden = true;
  if (missing) elements.delete(missing);
  return {
    elements,
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
  };
}

const responseFor = (value) => async () => ({
  ok: true,
  async json() {
    return structuredClone(value);
  },
});

function assertFailClosed(documentRef, { statusPattern = /do not trust/i } = {}) {
  const element = (selector) => documentRef.elements.get(selector);
  assert.match(element("[data-launch-status]").textContent, statusPattern);
  assert.equal(element("[data-mint]").textContent, "Not published");
  assert.equal(element("[data-supply]").textContent, "Required: 1,000,000");
  assert.equal(element("[data-mint-authority]").textContent, "Required: null");
  assert.equal(element("[data-freeze-authority]").textContent, "Required: null");
  assert.equal(element("[data-team-allocation]").textContent, "Required: 0%");
  assert.equal(element("[data-decimals]").textContent, "Required: 6");
  assert.equal(element("[data-creator]").textContent, "Not published");
  assert.equal(element("[data-creator-balance]").textContent, "Required: 0 HAKKY");
  assert.equal(element("[data-allocation]").textContent, "Required: 80% / 20% / 0%");
  assert.equal(element("[data-creator-fee]").textContent, "Required: off");
  assert.equal(element("[data-lp-policy]").textContent, "Required: burned");
  assert.equal(element("[data-creator-spend]").textContent, "Required: <= 1.00 SOL");
  assert.equal(element("[data-verification-time]").textContent, "Not verified");
  assert.equal(element("[data-launch-transaction]").textContent, "Not published");
  if (element("[data-metadata]")) {
    assert.equal(element("[data-metadata]").textContent, "Required: immutable");
  }
  if (element("[data-solscan]")) assert.equal(element("[data-solscan]").getAttribute("href"), null);
  if (element("[data-raydium]")) assert.equal(element("[data-raydium]").getAttribute("href"), null);
  if (element("[data-launch-transaction]")) {
    assert.equal(element("[data-launch-transaction]").getAttribute("href"), null);
  }
  assert.equal(element("[data-live-actions]").hidden, true);
}

test("homepage contains the approved story and safety contract", () => {
  for (const text of [
    "Rugs hate this little guy.",
    "The first thing it cleaned was its own launch.",
    "1,000,000",
    "0% team",
    "no presale",
    "No official mint address exists yet",
    "no promised utility or returns",
    "1.00 SOL",
  ]) {
    assert.match(
      html.toLowerCase(),
      new RegExp(text.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("homepage contains exact GitHub navigation and complete live proof structure", () => {
  assert.match(
    html,
    /<a href="https:\/\/github\.com\/antihakkysack\/hakky-protocol" target="_blank" rel="noopener noreferrer"[^>]*>GitHub ↗<\/a>/,
  );
  for (const attribute of [
    "data-decimals",
    "data-creator",
    "data-creator-balance",
    "data-allocation",
    "data-creator-fee",
    "data-lp-policy",
    "data-creator-spend",
    "data-verification-time",
    "data-launch-transaction",
  ]) {
    assert.match(html, new RegExp(`\\b${attribute}\\b`));
  }
  assert.match(
    html,
    /data-launch-transaction[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
  );
});

test("prelaunch view never exposes buy links", () => {
  const view = buildLaunchView(record);
  assert.equal(view.live, false);
  assert.equal(view.mint, null);
  assert.equal(view.solscanUrl, null);
  assert.equal(view.raydiumUrl, null);
});

test("valid live record renders exact verified evidence and official destinations", async () => {
  const documentRef = createDocument();
  const live = createValidLiveRecord(record);

  await renderLaunchState(documentRef, responseFor(live));

  const element = (selector) => documentRef.elements.get(selector);
  assert.equal(element("[data-launch-status]").textContent, "LIVE: Verify the exact mint before interacting.");
  assert.equal(element("[data-mint]").textContent, live.proof.mint);
  assert.equal(element("[data-supply]").textContent, "1,000,000 (verified)");
  assert.equal(element("[data-mint-authority]").textContent, "null (verified)");
  assert.equal(element("[data-freeze-authority]").textContent, "null (verified)");
  assert.equal(element("[data-team-allocation]").textContent, "0% (verified)");
  assert.equal(element("[data-metadata]").textContent, "immutable (verified)");
  assert.equal(element("[data-decimals]").textContent, "6 (verified)");
  assert.equal(element("[data-creator]").textContent, live.proof.creator);
  assert.equal(element("[data-creator-balance]").textContent, "0 HAKKY (verified)");
  assert.equal(element("[data-allocation]").textContent, "80% curve / 20% liquidity / 0% team (verified)");
  assert.equal(element("[data-creator-fee]").textContent, "off (verified)");
  assert.equal(element("[data-lp-policy]").textContent, "burned (verified)");
  assert.equal(element("[data-creator-spend]").textContent, "0.25 SOL / 1.00 SOL cap (verified)");
  assert.equal(element("[data-verification-time]").textContent, live.proof.verifiedAt);
  assert.equal(element("[data-launch-transaction]").textContent, live.proof.launchTransaction);
  assert.equal(
    element("[data-launch-transaction]").getAttribute("href"),
    live.proof.solscanTransactionUrl,
  );
  assert.equal(element("[data-solscan]").getAttribute("href"), live.proof.solscanUrl);
  assert.equal(element("[data-raydium]").getAttribute("href"), live.proof.raydiumUrl);
  assert.equal(element("[data-live-actions]").hidden, false);
});

test("live followed by prelaunch clears every verified field and destination", async () => {
  const documentRef = createDocument();
  await renderLaunchState(documentRef, responseFor(createValidLiveRecord(record)));

  await renderLaunchState(documentRef, responseFor(record));

  assert.equal(
    documentRef.elements.get("[data-launch-status]").textContent,
    "PRE-LAUNCH: No official mint address exists yet — ignore impostors.",
  );
  assertFailClosed(documentRef, { statusPattern: /no official mint address exists yet/i });
});

test("failed fetch and invalid record clear stale verified evidence", async () => {
  const invalid = structuredClone(record);
  invalid.token.supplyBaseUnits = "1000000000001";
  const failingFetches = [
    async () => ({ ok: false, status: 503 }),
    responseFor(invalid),
  ];

  for (const fetchImpl of failingFetches) {
    const documentRef = createDocument();
    await renderLaunchState(documentRef, responseFor(createValidLiveRecord(record)));
    await assert.rejects(renderLaunchState(documentRef, fetchImpl));
    assertFailClosed(documentRef);
  }
});

test("missing required live element never reveals actions or destinations", async () => {
  const documentRef = createDocument({ missing: "[data-raydium]" });
  documentRef.elements.get("[data-live-actions]").hidden = false;
  documentRef.elements.get("[data-solscan]").setAttribute("href", "https://example.invalid/stale");

  await assert.rejects(
    renderLaunchState(documentRef, responseFor(createValidLiveRecord(record))),
    /Launch-state elements are missing/,
  );

  assertFailClosed(documentRef);
  assert.equal(documentRef.elements.get("[data-solscan]").getAttribute("href"), null);
});
