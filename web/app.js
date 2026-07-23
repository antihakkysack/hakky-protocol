import { buildLaunchView } from "./lib/launch-view.js";

export { buildLaunchView };

const FAILURE_MESSAGE = "PROOF UNAVAILABLE: Do not trust contract addresses from replies or DMs.";
const PRELAUNCH_MESSAGE = "PRE-LAUNCH: No official mint address exists yet - ignore impostors.";
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
  commitments: "[data-commitments]",
  fixedSupplyQualifier: "[data-fixed-supply-qualifier]",
  teamAllocationQualifier: "[data-team-allocation-qualifier]",
  presaleQualifier: "[data-presale-qualifier]",
  launchQualifier: "[data-launch-qualifier]",
  allocationLabel: "[data-allocation-label]",
  curveQualifier: "[data-curve-qualifier]",
  liquidityQualifier: "[data-liquidity-qualifier]",
  proofQualifier: "[data-proof-qualifier]",
  creatorSpendCapQualifier: "[data-creator-spend-cap-qualifier]",
});
const SAFE_TEXT = Object.freeze({
  mint: "Not published",
  supply: "Required: 10,000,000",
  mintAuthority: "Required: LaunchLab PDA on curve; null after graduation",
  freezeAuthority: "Required: null",
  teamAllocation: "Required: 0%",
  metadata: "Required: immutable",
  decimals: "Required: 6",
  creator: "Not published",
  creatorBalance: "Required: 0 HAKKY",
  allocation: "Required: 80% / 20% / 0%",
  creatorFee: "Required: off",
  lpPolicy: "Required: irreversible at graduation",
  creatorSpend: "Required: <= 1.00 SOL",
  verificationTime: "Not verified",
  launchTransaction: "Not published",
});
const QUALIFIER_TEXT = Object.freeze({
  prelaunch: Object.freeze({
    fixedSupplyQualifier: "planned fixed supply",
    teamAllocationQualifier: "planned team allocation",
    presaleQualifier: "planned presale tokens",
    launchQualifier: "Planned:",
    curveQualifier: "Planned: 80% public bonding curve",
    liquidityQualifier: "Planned: 20% liquidity",
    proofQualifier: "Until complete proof is published here, every launch property below is required - not verified.",
    creatorSpendCapQualifier: "planned creator spend cap",
  }),
  live: Object.freeze({
    fixedSupplyQualifier: "verified fixed supply",
    teamAllocationQualifier: "verified team allocation",
    presaleQualifier: "verified presale tokens",
    launchQualifier: "Verified:",
    curveQualifier: "Verified: 80% public bonding curve",
    liquidityQualifier: "Verified: 20% liquidity",
    proofQualifier: "Complete canonical proof is published; every launch property below is verified.",
    creatorSpendCapQualifier: "verified creator spend cap",
  }),
});
const QUALIFIER_ARIA = Object.freeze({
  prelaunch: Object.freeze({
    commitments: "Planned launch commitments",
    allocationLabel: "Planned token distribution",
  }),
  live: Object.freeze({
    commitments: "Verified launch commitments",
    allocationLabel: "Verified token distribution",
  }),
});

function formatInteger(value) {
  return BigInt(value).toLocaleString("en-US");
}

function formatLamports(value) {
  const lamports = BigInt(value);
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function verifiedText(view) {
  const proof = view.proof;
  const authority = proof.authorities.mintAuthority === null
    ? "null (verified)"
    : `${proof.authorities.mintAuthority} (LaunchLab PDA, verified)`;
  const lpPolicy = view.state === "graduated"
    ? `${proof.lpDisposition.kind} (verified irreversible)`
    : "Pending graduation (irreversibility not yet observable)";
  return {
    mint: view.mint,
    supply: `${formatInteger(proof.supply.uiAmount)} (verified)`,
    decimals: `${proof.supply.decimals} (verified)`,
    mintAuthority: authority,
    freezeAuthority: "null (verified)",
    teamAllocation: `${proof.allocations.teamBps / 100}% (verified)`,
    metadata: proof.metadata.isMutable ? "mutable" : "immutable (verified)",
    creator: proof.creatorBalance.owner,
    creatorBalance: `${formatInteger(proof.creatorBalance.totalAmountBaseUnits)} HAKKY (verified)`,
    allocation: `${proof.allocations.publicCurveBps / 100}% curve / ${proof.allocations.liquidityBps / 100}% liquidity / ${proof.allocations.teamBps / 100}% team (verified)`,
    creatorFee: proof.fees.creatorFeeRights ? "on" : "off (verified)",
    lpPolicy,
    creatorSpend: `${formatLamports(proof.cost.cumulativeCreatorDebitLamports)} SOL / ${formatLamports(proof.cost.capLamports)} SOL cap (verified)`,
    verificationTime: proof.observation.checkedAt,
    launchTransaction: proof.transactions.creation.signature,
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

function setQualifierState(elements, state, { failClosed = false } = {}) {
  const apply = failClosed ? bestEffort : (operation) => operation();
  for (const [name, value] of Object.entries(QUALIFIER_TEXT[state])) {
    apply(() => { if (elements[name]) elements[name].textContent = value; });
  }
  for (const [name, value] of Object.entries(QUALIFIER_ARIA[state])) {
    apply(() => elements[name]?.setAttribute("aria-label", value));
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
  setQualifierState(elements, "prelaunch", { failClosed: true });
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

    if (!view.verified) {
      elements.status.textContent = view.state === "prelaunch" ? PRELAUNCH_MESSAGE : view.heading;
      return;
    }

    const text = verifiedText(view);
    elements.status.textContent = view.heading;
    elements.mint.textContent = text.mint;
    elements.supply.textContent = text.supply;
    elements.mintAuthority.textContent = text.mintAuthority;
    elements.freezeAuthority.textContent = text.freezeAuthority;
    elements.teamAllocation.textContent = text.teamAllocation;
    elements.metadata.textContent = text.metadata;
    elements.decimals.textContent = text.decimals;
    elements.creator.textContent = text.creator;
    elements.creatorBalance.textContent = text.creatorBalance;
    elements.allocation.textContent = text.allocation;
    elements.creatorFee.textContent = text.creatorFee;
    elements.lpPolicy.textContent = text.lpPolicy;
    elements.creatorSpend.textContent = text.creatorSpend;
    elements.verificationTime.textContent = text.verificationTime;
    elements.launchTransaction.textContent = text.launchTransaction;
    setQualifierState(elements, "live");
    elements.launchTransaction.setAttribute("href", view.destinations.solscanCreationTransaction);
    elements.solscan.setAttribute("href", view.destinations.solscanMint);
    elements.raydium.setAttribute(
      "href",
      view.destinations.raydiumPool ?? view.destinations.raydiumLaunchlab,
    );
    elements.actions.hidden = false;
  } catch (error) {
    setFailClosedState(documentRef);
    throw error;
  }
}

if (typeof document !== "undefined") {
  renderLaunchState().catch(() => setFailClosedState(document));
}
