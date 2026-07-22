import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildLaunchView, renderLaunchState } from "../web/app.js";

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
    querySelectorAll(selector) {
      if (selector !== "[data-solscan], [data-raydium]") return [];
      return [elements.get("[data-solscan]"), elements.get("[data-raydium]")].filter(Boolean);
    },
  };
}

function createValidLiveRecord() {
  const changed = structuredClone(record);
  changed.status = "live";
  changed.token.mint = "11111111111111111111111111111111";
  changed.proof = {
    mint: changed.token.mint,
    launchId: "11111111111111111111111111111111",
    launchTransaction: "1111111111111111111111111111111111111111111111111111111111111111",
    solscanUrl: `https://solscan.io/token/${changed.token.mint}`,
    raydiumUrl: `https://raydium.io/launchpad/token/?mint=${changed.token.mint}`,
    verifiedAt: "2026-07-22T00:00:00.000Z",
    supplyBaseUnits: "1000000000000",
    decimals: 6,
    tokenProgram: "spl-token",
    mintAuthority: null,
    freezeAuthority: null,
    creatorBalanceBaseUnits: "0",
    metadataImmutable: true,
    metadataName: "Hakky Protocol",
    metadataSymbol: "HAKKY",
    metadataUri: "https://hakky.xyz/metadata.json",
    metadataImage: "https://hakky.xyz/assets/token.png",
    metadataWebsite: "https://hakky.xyz",
    metadataX: "https://x.com/antihakkysack",
    curveAllocationBps: 8000,
    liquidityAllocationBps: 2000,
    teamAllocationBps: 0,
    creatorFeeEnabled: false,
    lpPolicy: "burn",
    quoteAsset: "SOL",
    graduationTargetSol: 24,
    creatorFirstBuySol: 0,
    creatorSpendSol: 0.25,
  };
  return changed;
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
  if (element("[data-metadata]")) {
    assert.equal(element("[data-metadata]").textContent, "Required: immutable");
  }
  if (element("[data-solscan]")) assert.equal(element("[data-solscan]").getAttribute("href"), null);
  if (element("[data-raydium]")) assert.equal(element("[data-raydium]").getAttribute("href"), null);
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

test("prelaunch view never exposes buy links", () => {
  const view = buildLaunchView(record);
  assert.equal(view.live, false);
  assert.equal(view.mint, null);
  assert.equal(view.solscanUrl, null);
  assert.equal(view.raydiumUrl, null);
});

test("valid live record renders exact verified evidence and official destinations", async () => {
  const documentRef = createDocument();
  const live = createValidLiveRecord();

  await renderLaunchState(documentRef, responseFor(live));

  const element = (selector) => documentRef.elements.get(selector);
  assert.equal(element("[data-launch-status]").textContent, "LIVE: Verify the exact mint before interacting.");
  assert.equal(element("[data-mint]").textContent, live.proof.mint);
  assert.equal(element("[data-supply]").textContent, "1,000,000 (verified)");
  assert.equal(element("[data-mint-authority]").textContent, "null (verified)");
  assert.equal(element("[data-freeze-authority]").textContent, "null (verified)");
  assert.equal(element("[data-team-allocation]").textContent, "0% (verified)");
  assert.equal(element("[data-metadata]").textContent, "immutable (verified)");
  assert.equal(element("[data-solscan]").getAttribute("href"), live.proof.solscanUrl);
  assert.equal(element("[data-raydium]").getAttribute("href"), live.proof.raydiumUrl);
  assert.equal(element("[data-live-actions]").hidden, false);
});

test("live followed by prelaunch clears every verified field and destination", async () => {
  const documentRef = createDocument();
  await renderLaunchState(documentRef, responseFor(createValidLiveRecord()));

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
    await renderLaunchState(documentRef, responseFor(createValidLiveRecord()));
    await assert.rejects(renderLaunchState(documentRef, fetchImpl));
    assertFailClosed(documentRef);
  }
});

test("missing required live element never reveals actions or destinations", async () => {
  const documentRef = createDocument({ missing: "[data-raydium]" });
  documentRef.elements.get("[data-live-actions]").hidden = false;
  documentRef.elements.get("[data-solscan]").setAttribute("href", "https://example.invalid/stale");

  await assert.rejects(
    renderLaunchState(documentRef, responseFor(createValidLiveRecord())),
    /Launch-state elements are missing/,
  );

  assertFailClosed(documentRef);
  assert.equal(documentRef.elements.get("[data-solscan]").getAttribute("href"), null);
});
