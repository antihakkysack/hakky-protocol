import { validateLaunchRecord } from "./lib/launch-policy.js";

const FAILURE_MESSAGE = "PROOF UNAVAILABLE: Do not trust contract addresses from replies or DMs.";
const PRELAUNCH_MESSAGE = "PRE-LAUNCH: No official mint address exists yet — ignore impostors.";
const ELEMENT_SELECTORS = Object.freeze({
  status: "[data-launch-status]",
  actions: "[data-live-actions]",
  mint: "[data-mint]",
  supply: "[data-supply]",
  mintAuthority: "[data-mint-authority]",
  freezeAuthority: "[data-freeze-authority]",
  teamAllocation: "[data-team-allocation]",
  metadata: "[data-metadata]",
  decimals: "[data-decimals]",
  creator: "[data-creator]",
  creatorBalance: "[data-creator-balance]",
  allocation: "[data-allocation]",
  creatorFee: "[data-creator-fee]",
  lpPolicy: "[data-lp-policy]",
  creatorSpend: "[data-creator-spend]",
  verificationTime: "[data-verification-time]",
  launchTransaction: "[data-launch-transaction]",
  solscan: "[data-solscan]",
  raydium: "[data-raydium]",
});
const SAFE_TEXT = Object.freeze({
  mint: "Not published",
  supply: "Required: 1,000,000",
  mintAuthority: "Required: null",
  freezeAuthority: "Required: null",
  teamAllocation: "Required: 0%",
  metadata: "Required: immutable",
  decimals: "Required: 6",
  creator: "Not published",
  creatorBalance: "Required: 0 HAKKY",
  allocation: "Required: 80% / 20% / 0%",
  creatorFee: "Required: off",
  lpPolicy: "Required: burned",
  creatorSpend: "Required: <= 1.00 SOL",
  verificationTime: "Not verified",
  launchTransaction: "Not published",
});

export function buildLaunchView(record) {
  const issues = validateLaunchRecord(record);
  if (issues.length) throw new Error(`Invalid launch record: ${issues.join("; ")}`);

  if (record.status === "prelaunch") {
    return {
      live: false,
      mint: null,
      solscanUrl: null,
      solscanTransactionUrl: null,
      raydiumUrl: null,
    };
  }

  return {
    live: true,
    mint: record.proof.mint,
    solscanUrl: record.proof.solscanUrl,
    solscanTransactionUrl: record.proof.solscanTransactionUrl,
    raydiumUrl: record.proof.raydiumUrl,
    creator: record.proof.creator,
    launchTransaction: record.proof.launchTransaction,
    supply: "1,000,000 (verified)",
    decimals: `${record.proof.decimals} (verified)`,
    mintAuthority: "null (verified)",
    freezeAuthority: "null (verified)",
    teamAllocation: "0% (verified)",
    creatorBalance: "0 HAKKY (verified)",
    allocation: "80% curve / 20% liquidity / 0% team (verified)",
    creatorFee: "off (verified)",
    lpPolicy: "burned (verified)",
    creatorSpend: `${record.proof.creatorSpendSol} SOL / 1.00 SOL cap (verified)`,
    verificationTime: record.proof.verifiedAt,
    metadata: "immutable (verified)",
  };
}

function bestEffort(operation) {
  try {
    operation();
  } catch {
    // A partial or hostile DOM must not prevent the remaining safety reset.
  }
}

function findElement(documentRef, selector) {
  try {
    return documentRef.querySelector(selector);
  } catch {
    return null;
  }
}

function setFailClosedState(documentRef, message = FAILURE_MESSAGE) {
  const elements = Object.fromEntries(
    Object.entries(ELEMENT_SELECTORS).map(([name, selector]) => [name, findElement(documentRef, selector)]),
  );

  bestEffort(() => { if (elements.status) elements.status.textContent = message; });
  bestEffort(() => { if (elements.actions) elements.actions.hidden = true; });
  for (const [name, value] of Object.entries(SAFE_TEXT)) {
    bestEffort(() => { if (elements[name]) elements[name].textContent = value; });
  }
  bestEffort(() => elements.solscan?.removeAttribute("href"));
  bestEffort(() => elements.launchTransaction?.removeAttribute("href"));
  bestEffort(() => elements.raydium?.removeAttribute("href"));
}

function collectLaunchElements(documentRef) {
  const elements = Object.fromEntries(
    Object.entries(ELEMENT_SELECTORS).map(([name, selector]) => [name, findElement(documentRef, selector)]),
  );
  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);
  if (missing.length) throw new Error(`Launch-state elements are missing: ${missing.join(", ")}`);
  return elements;
}

export async function renderLaunchState(documentRef = document, fetchImpl = fetch) {
  setFailClosedState(documentRef);
  try {
    const response = await fetchImpl("./data/launch.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Launch record HTTP ${response.status}`);
    const view = buildLaunchView(await response.json());
    const elements = collectLaunchElements(documentRef);

    if (!view.live) {
      elements.status.textContent = PRELAUNCH_MESSAGE;
      return;
    }

    elements.status.textContent = "LIVE: Verify the exact mint before interacting.";
    elements.mint.textContent = view.mint;
    elements.supply.textContent = view.supply;
    elements.mintAuthority.textContent = view.mintAuthority;
    elements.freezeAuthority.textContent = view.freezeAuthority;
    elements.teamAllocation.textContent = view.teamAllocation;
    elements.metadata.textContent = view.metadata;
    elements.decimals.textContent = view.decimals;
    elements.creator.textContent = view.creator;
    elements.creatorBalance.textContent = view.creatorBalance;
    elements.allocation.textContent = view.allocation;
    elements.creatorFee.textContent = view.creatorFee;
    elements.lpPolicy.textContent = view.lpPolicy;
    elements.creatorSpend.textContent = view.creatorSpend;
    elements.verificationTime.textContent = view.verificationTime;
    elements.launchTransaction.textContent = view.launchTransaction;
    elements.launchTransaction.setAttribute("href", view.solscanTransactionUrl);
    elements.solscan.setAttribute("href", view.solscanUrl);
    elements.raydium.setAttribute("href", view.raydiumUrl);
    elements.actions.hidden = false;
  } catch (error) {
    setFailClosedState(documentRef);
    throw error;
  }
}

if (typeof document !== "undefined") {
  renderLaunchState().catch(() => setFailClosedState(document));
}
