import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildLaunchView, renderLaunchState } from "../web/app.js";
import { createCurveLiveRecordV2 } from "../test-support/launch-fixtures.mjs";

const createValidLiveRecord = () => createCurveLiveRecordV2();

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
  "[data-commitments]",
  "[data-fixed-supply-qualifier]",
  "[data-team-allocation-qualifier]",
  "[data-presale-qualifier]",
  "[data-launch-qualifier]",
  "[data-allocation-label]",
  "[data-curve-qualifier]",
  "[data-liquidity-qualifier]",
  "[data-proof-qualifier]",
  "[data-creator-spend-cap-qualifier]",
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

function assertQualifierCopy(documentRef, { live }) {
  const element = (selector) => documentRef.elements.get(selector);
  const expected = live ? {
    commitments: "Verified launch commitments",
    fixedSupply: "verified fixed supply",
    teamAllocation: "verified team allocation",
    presale: "verified presale tokens",
    launch: "Verified:",
    allocationLabel: "Verified token distribution",
    curve: "Verified: 80% public bonding curve",
    liquidity: "Verified: 20% liquidity",
    creatorSpendCap: "verified creator spend cap",
  } : {
    commitments: "Planned launch commitments",
    fixedSupply: "planned fixed supply",
    teamAllocation: "planned team allocation",
    presale: "planned presale tokens",
    launch: "Planned:",
    allocationLabel: "Planned token distribution",
    curve: "Planned: 80% public bonding curve",
    liquidity: "Planned: 20% liquidity",
    creatorSpendCap: "planned creator spend cap",
  };
  if (element("[data-commitments]")) {
    assert.equal(element("[data-commitments]").getAttribute("aria-label"), expected.commitments);
  }
  if (element("[data-fixed-supply-qualifier]")) {
    assert.equal(element("[data-fixed-supply-qualifier]").textContent, expected.fixedSupply);
  }
  if (element("[data-team-allocation-qualifier]")) {
    assert.equal(element("[data-team-allocation-qualifier]").textContent, expected.teamAllocation);
  }
  if (element("[data-presale-qualifier]")) {
    assert.equal(element("[data-presale-qualifier]").textContent, expected.presale);
  }
  if (element("[data-launch-qualifier]")) {
    assert.equal(element("[data-launch-qualifier]").textContent, expected.launch);
  }
  if (element("[data-allocation-label]")) {
    assert.equal(element("[data-allocation-label]").getAttribute("aria-label"), expected.allocationLabel);
  }
  if (element("[data-curve-qualifier]")) {
    assert.equal(element("[data-curve-qualifier]").textContent, expected.curve);
  }
  if (element("[data-liquidity-qualifier]")) {
    assert.equal(element("[data-liquidity-qualifier]").textContent, expected.liquidity);
  }
  if (element("[data-proof-qualifier]")) {
    if (live) {
      assert.equal(
        element("[data-proof-qualifier]").textContent,
        "Complete canonical proof is published; every launch property below is verified.",
      );
    } else {
      assert.match(element("[data-proof-qualifier]").textContent, /required.*not verified/i);
    }
  }
  if (element("[data-creator-spend-cap-qualifier]")) {
    assert.equal(
      element("[data-creator-spend-cap-qualifier]").textContent,
      expected.creatorSpendCap,
    );
  }
}

function assertFailClosed(documentRef, { statusPattern = /do not trust/i } = {}) {
  const element = (selector) => documentRef.elements.get(selector);
  assert.match(element("[data-launch-status]").textContent, statusPattern);
  assert.equal(element("[data-mint]").textContent, "Not published");
  assert.equal(element("[data-supply]").textContent, "Required: 10,000,000");
  assert.equal(
    element("[data-mint-authority]").textContent,
    "Required: LaunchLab PDA on curve; null after graduation",
  );
  assert.equal(element("[data-freeze-authority]").textContent, "Required: null");
  assert.equal(element("[data-team-allocation]").textContent, "Required: 0%");
  assert.equal(element("[data-decimals]").textContent, "Required: 6");
  assert.equal(element("[data-creator]").textContent, "Not published");
  assert.equal(element("[data-creator-balance]").textContent, "Required: 0 HAKKY");
  assert.equal(element("[data-allocation]").textContent, "Required: 80% / 20% / 0%");
  assert.equal(element("[data-creator-fee]").textContent, "Required: off");
  assert.equal(element("[data-lp-policy]").textContent, "Required: irreversible at graduation");
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
  assertQualifierCopy(documentRef, { live: false });
}

test("homepage contains the approved story and safety contract", () => {
  assert.match(
    html,
    /All 10,000,000 tokens enter the Raydium launch mechanism\./u,
  );
  for (const text of [
    "Rugs hate this little guy.",
    "The first thing it cleaned was its own launch.",
    "10,000,000",
    "0% team",
    "no presale",
    "No official mint address exists yet",
    "no promised utility or returns",
    "1.00 SOL",
    "planned creator spend cap",
  ]) {
    assert.match(
      html.toLowerCase(),
      new RegExp(text.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("homepage presents the exact HakkyAgent identity and claim boundary", () => {
  for (const text of [
    "<title>HAKKY — HakkyAgent</title>",
    "HAKKY! / HAKKYAGENT",
    "HAKKYAGENT IS ONLINE",
    "HakkyAgent verifies the facts. You decide the risk.",
    "Does HakkyAgent verify every Solana transaction?",
    "HAKKYAGENT © 2026 · KEEP CRYPTO CLEAN",
  ]) {
    assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(
    html,
    /<img src="\.\/assets\/hakkyagent\.svg" alt="HakkyAgent, the orange HAKKY proof agent"/,
  );
  assert.match(
    html,
    /HakkyAgent verifies only the published HAKKY launch facts backed by this repository's deterministic checks and canonical evidence\./,
  );
  assert.match(html, /data-creator-spend-cap-qualifier>planned creator spend cap</);
});

test("homepage keeps exact account destinations and complete live proof structure", () => {
  assert.match(
    html,
    /<a href="https:\/\/x\.com\/antihakkysack" target="_blank" rel="noopener noreferrer" aria-label="HakkyAgent on X \(opens in a new tab\)">X ↗<\/a>/,
  );
  assert.match(
    html,
    /<a href="https:\/\/github\.com\/antihakkysack\/hakky-protocol" target="_blank" rel="noopener noreferrer" aria-label="HakkyAgent source on GitHub \(opens in a new tab\)">GitHub ↗<\/a>/,
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
    "data-commitments",
    "data-fixed-supply-qualifier",
    "data-team-allocation-qualifier",
    "data-presale-qualifier",
    "data-launch-qualifier",
    "data-allocation-label",
    "data-curve-qualifier",
    "data-liquidity-qualifier",
    "data-proof-qualifier",
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
  assert.equal(view.verified, false);
  assert.equal(view.mint, null);
  assert.equal(view.destinations.solscanMint, null);
  assert.equal(view.destinations.raydiumLaunchlab, null);
});

test("valid live record renders exact verified evidence and official destinations", async () => {
  const documentRef = createDocument();
  const live = createValidLiveRecord(record);

  await renderLaunchState(documentRef, responseFor(live));

  const element = (selector) => documentRef.elements.get(selector);
  assert.equal(element("[data-launch-status]").textContent, "CURVE LIVE - PROGRAM AUTHORITY ACTIVE");
  assert.equal(element("[data-mint]").textContent, live.token.mint);
  assert.equal(element("[data-supply]").textContent, "10,000,000 (verified)");
  assert.equal(
    element("[data-mint-authority]").textContent,
    `${live.proof.authorities.mintAuthority} (LaunchLab PDA, verified)`,
  );
  assert.equal(element("[data-freeze-authority]").textContent, "null (verified)");
  assert.equal(element("[data-team-allocation]").textContent, "0% (verified)");
  assert.equal(element("[data-metadata]").textContent, "immutable (verified)");
  assert.equal(element("[data-decimals]").textContent, "6 (verified)");
  assert.equal(element("[data-creator]").textContent, live.proof.creatorBalance.owner);
  assert.equal(element("[data-creator-balance]").textContent, "0 HAKKY (verified)");
  assert.equal(element("[data-allocation]").textContent, "80% curve / 20% liquidity / 0% team (verified)");
  assert.equal(element("[data-creator-fee]").textContent, "off (verified)");
  assert.equal(
    element("[data-lp-policy]").textContent,
    "Pending graduation (irreversibility not yet observable)",
  );
  assert.equal(element("[data-creator-spend]").textContent, "0.000003 SOL / 1 SOL cap (verified)");
  assert.equal(element("[data-verification-time]").textContent, live.proof.observation.checkedAt);
  assert.equal(
    element("[data-launch-transaction]").textContent,
    live.proof.transactions.creation.signature,
  );
  assert.equal(
    element("[data-launch-transaction]").getAttribute("href"),
    live.proof.links.solscanCreationTransaction,
  );
  assert.equal(element("[data-solscan]").getAttribute("href"), live.proof.links.solscanMint);
  assert.equal(element("[data-raydium]").getAttribute("href"), live.proof.links.raydiumLaunchlab);
  assert.equal(element("[data-live-actions]").hidden, false);
  assertQualifierCopy(documentRef, { live: true });
});

test("known unavailable lifecycle state never reveals a mint or destination", async () => {
  const documentRef = createDocument();
  await renderLaunchState(
    documentRef,
    responseFor(createCurveLiveRecordV2({ availability: "unavailable" })),
  );
  assertFailClosed(documentRef, { statusPattern: /^VERIFICATION UNAVAILABLE$/ });
});

test("live followed by prelaunch clears every verified field and destination", async () => {
  const documentRef = createDocument();
  await renderLaunchState(documentRef, responseFor(createValidLiveRecord(record)));

  await renderLaunchState(documentRef, responseFor(record));

  assert.equal(
    documentRef.elements.get("[data-launch-status]").textContent,
    "PRE-LAUNCH: No official mint address exists yet - ignore impostors.",
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

test("partial DOM failure after live restores every available prelaunch qualifier", async () => {
  const documentRef = createDocument();
  await renderLaunchState(documentRef, responseFor(createValidLiveRecord(record)));
  documentRef.elements.delete("[data-proof-qualifier]");

  await assert.rejects(
    renderLaunchState(documentRef, responseFor(createValidLiveRecord(record))),
    /Launch-state elements are missing/,
  );

  assertFailClosed(documentRef);
});
