import { buildLaunchView } from "./lib/launch-view.js";

export { buildLaunchView };

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
const SAFE_FIELDS = Object.freeze({
  program: "Not published",
  mint: "Not published",
  market: "Not initialized",
  curve: "Not live",
  pool: "Not live",
  proof: "Unavailable before verified launch state",
});

function bestEffort(operation) {
  try {
    operation();
  } catch {
    // Failure state must be restored as far as a partial DOM allows.
  }
}

function findElement(documentRef, selector) {
  try {
    return documentRef.querySelector(selector);
  } catch {
    return null;
  }
}

export function setUnavailableState(documentRef) {
  bestEffort(() => {
    documentRef.body.dataset.recordState = "unavailable";
  });
  const status = findElement(documentRef, "[data-launch-status]");
  bestEffort(() => {
    if (status) status.textContent = PROOF_UNAVAILABLE;
  });
  for (const [name, selector] of Object.entries(FIELD_SELECTORS)) {
    const element = findElement(documentRef, selector);
    bestEffort(() => {
      if (element) element.textContent = SAFE_FIELDS[name];
    });
  }
}

function collectRequiredElements(documentRef) {
  const elements = Object.fromEntries(
    Object.entries(FIELD_SELECTORS)
      .map(([name, selector]) => [name, findElement(documentRef, selector)]),
  );
  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);
  if (missing.length) {
    throw new Error(`Launch-state elements are missing: ${missing.join(", ")}`);
  }

  const status = findElement(documentRef, "[data-launch-status]");
  if (!status) throw new Error("Launch-state elements are missing: status");
  if (!documentRef.body?.dataset) throw new Error("Launch-state root is missing");
  return { elements, status, root: documentRef.body };
}

export async function renderLaunchState(documentRef = document, fetchImpl = fetch) {
  setUnavailableState(documentRef);
  try {
    const response = await fetchImpl("./data/launch.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Launch record HTTP ${response.status}`);

    const view = buildLaunchView(await response.json());
    const { elements, status, root } = collectRequiredElements(documentRef);
    for (const name of Object.keys(FIELD_SELECTORS)) {
      elements[name].textContent = view[name];
    }
    status.textContent = PRELAUNCH_WARNING;
    root.dataset.recordState = "confirmed";
  } catch (error) {
    setUnavailableState(documentRef);
    throw error;
  }
}

if (typeof document !== "undefined") {
  renderLaunchState().catch(() => setUnavailableState(document));
}
