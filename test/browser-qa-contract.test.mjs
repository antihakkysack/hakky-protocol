import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BROWSER_QA_OBSERVATION_PATH,
  BROWSER_QA_RECEIPT_PATH,
  BROWSER_QA_SCHEMA_VERSION,
  BROWSER_QA_VIEWPORTS,
  PRELAUNCH_WARNING,
  assertBrowserQaReceiptV1,
  serializeBrowserQaReceiptV1,
} from "../src/browser-qa.mjs";
import { runBrowserQaCertification } from "../scripts/certify-browser-qa.mjs";

const VERIFIED_AT = "2026-07-27T13:00:00.000Z";
const SOURCE_COMMIT = "d2d318942b7c36d9eb06a64fe15eb3c39fbee8aa";
const SHA256 = "a".repeat(64);

function createViewport(id, width, height) {
  return {
    id,
    width,
    height,
    url: "http://127.0.0.1:4173/",
    title: "HAKKY // Origin Transmission",
    recordState: "confirmed",
    warning: PRELAUNCH_WARNING,
    callSignVisible: true,
    transmissionCount: 7,
    innerWidth: width,
    clientWidth: width,
    scrollWidth: width,
    hasHorizontalOverflow: false,
    walletControlsPresent: false,
    transactionControlsPresent: false,
    tradeDestinationsPresent: false,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    screenshot: {
      path: `artifacts/qa/browser-qa-${id}.png`,
      byteLength: 1234,
      sha256: SHA256,
    },
  };
}

function createReceipt() {
  return {
    schemaVersion: BROWSER_QA_SCHEMA_VERSION,
    sourceCommit: SOURCE_COMMIT,
    baseUrl: "http://127.0.0.1:4173/",
    siteFiles: [
      {
        path: "web/app.js",
        byteLength: 1234,
        sha256: SHA256,
      },
      {
        path: "web/data/launch.json",
        byteLength: 1234,
        sha256: SHA256,
      },
      {
        path: "web/index.html",
        byteLength: 1234,
        sha256: SHA256,
      },
      {
        path: "web/styles.css",
        byteLength: 1234,
        sha256: SHA256,
      },
    ],
    viewports: BROWSER_QA_VIEWPORTS.map(({ id, width, height }) =>
      createViewport(id, width, height),
    ),
    prelaunchControls: {
      flowDisclosureVisible: true,
      walletControlsPresent: false,
      transactionControlsPresent: false,
      automaticSignature: false,
      automaticSend: false,
      automaticRetry: false,
    },
    verifiedAt: VERIFIED_AT,
    mainnetActionsAuthorized: false,
  };
}

test("accepts the exact two-viewport prelaunch browser certificate", () => {
  const receipt = createReceipt();
  assert.equal(assertBrowserQaReceiptV1(receipt), receipt);
  assert.deepEqual(
    serializeBrowserQaReceiptV1(receipt),
    Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
  );
  assert.equal(
    BROWSER_QA_RECEIPT_PATH,
    "artifacts/qa/browser-qa-v1.json",
  );
});

test("rejects overflow, browser errors, missing meme content, and launch actions", () => {
  const mutations = [
    receipt => { receipt.viewports[0].hasHorizontalOverflow = true; },
    receipt => { receipt.viewports[0].scrollWidth += 1; },
    receipt => { receipt.viewports[0].innerWidth -= 1; },
    receipt => { receipt.viewports[0].consoleErrors.push("boom"); },
    receipt => { receipt.viewports[0].pageErrors.push("boom"); },
    receipt => { receipt.viewports[0].failedRequests.push("/missing.svg"); },
    receipt => { receipt.viewports[0].callSignVisible = false; },
    receipt => { receipt.viewports[0].transmissionCount = 6; },
    receipt => { receipt.viewports[0].walletControlsPresent = true; },
    receipt => { receipt.viewports[0].transactionControlsPresent = true; },
    receipt => { receipt.viewports[0].tradeDestinationsPresent = true; },
    receipt => { receipt.prelaunchControls.flowDisclosureVisible = false; },
    receipt => { receipt.prelaunchControls.automaticSignature = true; },
    receipt => { receipt.prelaunchControls.automaticSend = true; },
    receipt => { receipt.prelaunchControls.automaticRetry = true; },
    receipt => { receipt.mainnetActionsAuthorized = true; },
  ];

  for (const mutate of mutations) {
    const receipt = createReceipt();
    mutate(receipt);
    assert.throws(
      () => assertBrowserQaReceiptV1(receipt),
      /browser-qa-receipt-invalid/u,
    );
  }
});

test("rejects viewport substitutions, extra fields, and non-canonical ordering", () => {
  for (const mutate of [
    receipt => { receipt.viewports.reverse(); },
    receipt => { receipt.viewports[1].width = 391; },
    receipt => { receipt.viewports[1].url = "https://hakky.xyz/"; },
    receipt => { receipt.siteFiles.reverse(); },
    receipt => { receipt.extra = true; },
    receipt => { receipt.viewports[0].extra = true; },
    receipt => { receipt.sourceCommit = "main"; },
  ]) {
    const receipt = createReceipt();
    mutate(receipt);
    assert.throws(
      () => assertBrowserQaReceiptV1(receipt),
      /browser-qa-receipt-invalid/u,
    );
  }
});

test("the browser checklist preserves prelaunch boundaries", async () => {
  const checklist = await readFile(
    "docs/qa/immutable-market-browser-checklist.md",
    "utf8",
  );
  for (const required of [
    "1440 x 1000",
    "390 x 844",
    "No horizontal overflow",
    "No console errors",
    "No page errors",
    "No failed requests",
    "wallet or trading controls",
    "automatic signature",
    "automatic send",
    "automatic retry",
    "not available during prelaunch",
    "mainnetActionsAuthorized: false",
  ]) {
    assert.ok(checklist.includes(required), `missing checklist text: ${required}`);
  }
});

test("the certifier hashes exact site inputs and screenshots into one closed receipt", async (t) => {
  const repositoryRoot = await mkdtemp(
    path.join(os.tmpdir(), "hakky-browser-qa-"),
  );
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  for (const relativePath of [
    "web/app.js",
    "web/data/launch.json",
    "web/index.html",
    "web/styles.css",
    "artifacts/qa/browser-qa-desktop.png",
    "artifacts/qa/browser-qa-mobile.png",
  ]) {
    const absolutePath = path.join(
      repositoryRoot,
      ...relativePath.split("/"),
    );
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(relativePath, "utf8"));
  }
  const observation = {
    schemaVersion: "hakky-browser-observation-v1",
    baseUrl: "http://127.0.0.1:4173/",
    viewports: BROWSER_QA_VIEWPORTS.map(({ id, width, height }) => {
      const viewport = createViewport(id, width, height);
      delete viewport.screenshot;
      viewport.flowDisclosureVisible = true;
      return viewport;
    }),
  };
  const observationPath = path.join(
    repositoryRoot,
    ...BROWSER_QA_OBSERVATION_PATH.split("/"),
  );
  await writeFile(
    observationPath,
    `${JSON.stringify(observation, null, 2)}\n`,
    "utf8",
  );

  const receipt = await runBrowserQaCertification({
    repositoryRoot,
    sourceCommit: SOURCE_COMMIT,
    now: () => new Date(VERIFIED_AT),
  });

  assert.equal(assertBrowserQaReceiptV1(receipt), receipt);
  assert.deepEqual(
    await readFile(
      path.join(repositoryRoot, ...BROWSER_QA_RECEIPT_PATH.split("/")),
    ),
    serializeBrowserQaReceiptV1(receipt),
  );
  assert.deepEqual(
    receipt.siteFiles.map(file => file.path),
    [
      "web/app.js",
      "web/data/launch.json",
      "web/index.html",
      "web/styles.css",
    ],
  );
  assert.deepEqual(
    receipt.viewports.map(viewport => viewport.screenshot.path),
    [
      "artifacts/qa/browser-qa-desktop.png",
      "artifacts/qa/browser-qa-mobile.png",
    ],
  );
});
