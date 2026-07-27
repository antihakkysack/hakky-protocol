export const BROWSER_QA_SCHEMA_VERSION = "hakky-browser-qa-v1";
export const BROWSER_QA_OBSERVATION_PATH =
  "artifacts/qa/browser-observation-v1.json";
export const BROWSER_QA_RECEIPT_PATH =
  "artifacts/qa/browser-qa-v1.json";
export const BROWSER_QA_BASE_URL = "http://127.0.0.1:4173/";
export const PRELAUNCH_WARNING =
  "PRELAUNCH: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.";
export const BROWSER_QA_VIEWPORTS = Object.freeze([
  Object.freeze({ id: "desktop", width: 1440, height: 1000 }),
  Object.freeze({ id: "mobile", width: 390, height: 844 }),
]);

const SITE_FILES = Object.freeze([
  "web/app.js",
  "web/data/launch.json",
  "web/index.html",
  "web/styles.css",
]);
const SOURCE_COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const UTC_MILLISECOND_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function fail() {
  throw new Error("browser-qa-receipt-invalid");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expected) {
  if (!isPlainObject(value)) fail();
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail();
  }
}

function assertEmptyStrings(value) {
  if (
    !Array.isArray(value) ||
    value.some(item => typeof item !== "string") ||
    value.length !== 0
  ) {
    fail();
  }
}

function assertHashedFile(value, expectedPath) {
  assertExactKeys(value, ["path", "byteLength", "sha256"]);
  if (
    value.path !== expectedPath ||
    !Number.isSafeInteger(value.byteLength) ||
    value.byteLength <= 0 ||
    !SHA256_PATTERN.test(value.sha256)
  ) {
    fail();
  }
}

function assertViewport(value, expected) {
  assertExactKeys(value, [
    "id",
    "width",
    "height",
    "url",
    "title",
    "recordState",
    "warning",
    "callSignVisible",
    "transmissionCount",
    "innerWidth",
    "clientWidth",
    "scrollWidth",
    "hasHorizontalOverflow",
    "walletControlsPresent",
    "transactionControlsPresent",
    "tradeDestinationsPresent",
    "consoleErrors",
    "pageErrors",
    "failedRequests",
    "screenshot",
  ]);
  if (
    value.id !== expected.id ||
    value.width !== expected.width ||
    value.height !== expected.height ||
    value.url !== BROWSER_QA_BASE_URL ||
    value.title !== "HAKKY // Origin Transmission" ||
    value.recordState !== "confirmed" ||
    value.warning !== PRELAUNCH_WARNING ||
    value.callSignVisible !== true ||
    value.transmissionCount !== 7 ||
    value.innerWidth !== expected.width ||
    !Number.isSafeInteger(value.clientWidth) ||
    value.clientWidth <= 0 ||
    value.clientWidth > value.innerWidth ||
    !Number.isSafeInteger(value.scrollWidth) ||
    value.scrollWidth > value.clientWidth ||
    value.hasHorizontalOverflow !== false ||
    value.walletControlsPresent !== false ||
    value.transactionControlsPresent !== false ||
    value.tradeDestinationsPresent !== false
  ) {
    fail();
  }
  assertEmptyStrings(value.consoleErrors);
  assertEmptyStrings(value.pageErrors);
  assertEmptyStrings(value.failedRequests);
  assertHashedFile(
    value.screenshot,
    `artifacts/qa/browser-qa-${expected.id}.png`,
  );
}

function assertObservationViewport(value, expected) {
  assertExactKeys(value, [
    "id",
    "width",
    "height",
    "url",
    "title",
    "recordState",
    "warning",
    "callSignVisible",
    "transmissionCount",
    "innerWidth",
    "clientWidth",
    "scrollWidth",
    "hasHorizontalOverflow",
    "walletControlsPresent",
    "transactionControlsPresent",
    "tradeDestinationsPresent",
    "flowDisclosureVisible",
    "consoleErrors",
    "pageErrors",
    "failedRequests",
  ]);
  const synthetic = {
    ...value,
    screenshot: {
      path: `artifacts/qa/browser-qa-${expected.id}.png`,
      byteLength: 1,
      sha256: "0".repeat(64),
    },
  };
  delete synthetic.flowDisclosureVisible;
  assertViewport(synthetic, expected);
  if (value.flowDisclosureVisible !== true) fail();
}

export function assertBrowserObservationV1(value) {
  assertExactKeys(value, ["schemaVersion", "baseUrl", "viewports"]);
  if (
    value.schemaVersion !== "hakky-browser-observation-v1" ||
    value.baseUrl !== BROWSER_QA_BASE_URL ||
    !Array.isArray(value.viewports) ||
    value.viewports.length !== BROWSER_QA_VIEWPORTS.length
  ) {
    fail();
  }
  value.viewports.forEach((viewport, index) =>
    assertObservationViewport(viewport, BROWSER_QA_VIEWPORTS[index]),
  );
  return value;
}

export function assertBrowserQaReceiptV1(value) {
  assertExactKeys(value, [
    "schemaVersion",
    "sourceCommit",
    "baseUrl",
    "siteFiles",
    "viewports",
    "prelaunchControls",
    "verifiedAt",
    "mainnetActionsAuthorized",
  ]);
  if (
    value.schemaVersion !== BROWSER_QA_SCHEMA_VERSION ||
    !SOURCE_COMMIT_PATTERN.test(value.sourceCommit) ||
    value.baseUrl !== BROWSER_QA_BASE_URL ||
    !UTC_MILLISECOND_PATTERN.test(value.verifiedAt) ||
    new Date(value.verifiedAt).toISOString() !== value.verifiedAt ||
    value.mainnetActionsAuthorized !== false
  ) {
    fail();
  }
  if (
    !Array.isArray(value.siteFiles) ||
    value.siteFiles.length !== SITE_FILES.length
  ) {
    fail();
  }
  value.siteFiles.forEach((file, index) =>
    assertHashedFile(file, SITE_FILES[index]),
  );
  if (
    !Array.isArray(value.viewports) ||
    value.viewports.length !== BROWSER_QA_VIEWPORTS.length
  ) {
    fail();
  }
  value.viewports.forEach((viewport, index) =>
    assertViewport(viewport, BROWSER_QA_VIEWPORTS[index]),
  );
  assertExactKeys(value.prelaunchControls, [
    "flowDisclosureVisible",
    "walletControlsPresent",
    "transactionControlsPresent",
    "automaticSignature",
    "automaticSend",
    "automaticRetry",
  ]);
  if (
    value.prelaunchControls.flowDisclosureVisible !== true ||
    value.prelaunchControls.walletControlsPresent !== false ||
    value.prelaunchControls.transactionControlsPresent !== false ||
    value.prelaunchControls.automaticSignature !== false ||
    value.prelaunchControls.automaticSend !== false ||
    value.prelaunchControls.automaticRetry !== false
  ) {
    fail();
  }
  return value;
}

export function serializeBrowserQaReceiptV1(value) {
  assertBrowserQaReceiptV1(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}
