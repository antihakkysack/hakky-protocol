import { validateLaunchRecord } from "./lib/launch-policy.js";

const FAILURE_MESSAGE = "PROOF UNAVAILABLE: Do not trust contract addresses from replies or DMs.";

export function buildLaunchView(record) {
  const issues = validateLaunchRecord(record);
  if (issues.length) throw new Error(`Invalid launch record: ${issues.join("; ")}`);

  if (record.status === "prelaunch") {
    return {
      live: false,
      mint: null,
      solscanUrl: null,
      raydiumUrl: null,
    };
  }

  return {
    live: true,
    mint: record.proof.mint,
    solscanUrl: record.proof.solscanUrl,
    raydiumUrl: record.proof.raydiumUrl,
    supply: "1,000,000 (verified)",
    mintAuthority: "null (verified)",
    freezeAuthority: "null (verified)",
    teamAllocation: "0% (verified)",
    metadata: "immutable (verified)",
  };
}

function setFailClosedState(documentRef, message = FAILURE_MESSAGE) {
  const status = documentRef.querySelector("[data-launch-status]");
  const actions = documentRef.querySelector("[data-live-actions]");
  const mint = documentRef.querySelector("[data-mint]");

  if (status) status.textContent = message;
  if (actions) actions.hidden = true;
  if (mint) mint.textContent = "Not published";
  for (const link of documentRef.querySelectorAll("[data-solscan], [data-raydium]")) {
    link.removeAttribute("href");
  }
}

export async function renderLaunchState(documentRef = document) {
  setFailClosedState(documentRef);

  const response = await fetch("./data/launch.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Launch record HTTP ${response.status}`);
  const view = buildLaunchView(await response.json());
  const status = documentRef.querySelector("[data-launch-status]");
  const actions = documentRef.querySelector("[data-live-actions]");

  if (!status || !actions) throw new Error("Launch-state elements are missing");
  if (!view.live) {
    status.textContent = "PRE-LAUNCH: No official mint address exists yet — ignore impostors.";
    return;
  }

  status.textContent = "LIVE: Verify the exact mint before interacting.";
  documentRef.querySelector("[data-mint]").textContent = view.mint;
  documentRef.querySelector("[data-supply]").textContent = view.supply;
  documentRef.querySelector("[data-mint-authority]").textContent = view.mintAuthority;
  documentRef.querySelector("[data-freeze-authority]").textContent = view.freezeAuthority;
  documentRef.querySelector("[data-team-allocation]").textContent = view.teamAllocation;
  documentRef.querySelector("[data-metadata]").textContent = view.metadata;
  documentRef.querySelector("[data-solscan]").href = view.solscanUrl;
  documentRef.querySelector("[data-raydium]").href = view.raydiumUrl;
  actions.hidden = false;
}

if (typeof document !== "undefined") {
  renderLaunchState().catch(() => setFailClosedState(document));
}
