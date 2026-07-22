import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  loadCanonicalProofsForLaunch,
  validateCanonicalProofBinding,
} from "../src/canonical-proof.mjs";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACCOUNT_ALIAS = Buffer.from("YW50aWhha2t5c2Fjaw==", "base64").toString("utf8");
const REQUIRED_HTML = Object.freeze([
  "Rugs hate this little guy.",
  "The first thing it cleaned was its own launch.",
  "No official mint address exists yet",
  "1,000,000",
  "1.00 SOL",
  "0% team",
  "no presale",
  "no promised utility or returns",
  "PERSONAL PROJECT",
  "data-live-actions hidden",
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
  "data-decimals",
  "data-creator",
  "data-creator-balance",
  "data-allocation",
  "data-creator-fee",
  "data-lp-policy",
  "data-creator-spend",
  "data-verification-time",
  "data-creator-spend-cap-qualifier",
]);
const REQUIRED_EXACT_HTML = Object.freeze([
  "<title>HAKKY — HakkyAgent</title>",
  "HAKKY! / HAKKYAGENT",
  "HAKKYAGENT IS ONLINE",
  "HakkyAgent verifies the facts. You decide the risk.",
  "Does HakkyAgent verify every Solana transaction?",
  "HakkyAgent verifies only the published HAKKY launch facts backed by this repository's deterministic checks and canonical evidence.",
  "data-creator-spend-cap-qualifier>planned creator spend cap",
]);
const X_LINK_HTML = `<a href="https://x.com/${ACCOUNT_ALIAS}" target="_blank" rel="noopener noreferrer" aria-label="HakkyAgent on X (opens in a new tab)">X ↗</a>`;
const GITHUB_LINK_HTML = `<a href="https://github.com/${ACCOUNT_ALIAS}/hakky-protocol" target="_blank" rel="noopener noreferrer" aria-label="HakkyAgent source on GitHub (opens in a new tab)">GitHub ↗</a>`;

const atRoot = (root, relativePath) => path.join(root, ...relativePath.split("/"));

export async function checkSite({ root = PROJECT_ROOT } = {}) {
  const html = await readFile(atRoot(root, "web/index.html"), "utf8");
  const script = await readFile(atRoot(root, "web/app.js"), "utf8");
  const launch = JSON.parse(await readFile(atRoot(root, "web/data/launch.json"), "utf8"));
  const missing = [
    ...REQUIRED_HTML.filter((value) => !html.toLowerCase().includes(value.toLowerCase())),
    ...REQUIRED_EXACT_HTML.filter((value) => !html.includes(value)),
  ];
  const issues = validateLaunchRecord(launch);
  const safetyIssues = [];
  const canonicalIssues = [];

  if (!script.includes("validateLaunchRecord")) safetyIssues.push("app.js must validate the launch record");
  if (!script.includes("PROOF UNAVAILABLE: Do not trust contract addresses from replies or DMs.")) {
    safetyIssues.push("app.js must retain the proof-unavailable warning");
  }
  if (/data-(?:solscan|raydium|launch-transaction)[^>]*\shref=/i.test(html)) {
    safetyIssues.push("live links must not have static href values");
  }
  if (!html.includes(GITHUB_LINK_HTML)) {
    safetyIssues.push("navigation must include the exact safe GitHub repository link");
  }
  if (!html.includes(X_LINK_HTML)) {
    safetyIssues.push("navigation must include the exact safe X account link");
  }
  if (launch.status === "prelaunch" && (launch.token?.mint !== null || launch.proof !== null)) {
    safetyIssues.push("prelaunch source must not contain mint proof or destinations");
  }

  let canonicalProofs = { mintProof: null, launchlabProof: null };
  try {
    canonicalProofs = await loadCanonicalProofsForLaunch(launch, { root });
    if (launch.status === "live") {
      canonicalIssues.push(...validateCanonicalProofBinding(
        launch,
        canonicalProofs.mintProof,
        canonicalProofs.launchlabProof,
      ));
    }
  } catch (error) {
    canonicalIssues.push(error instanceof Error ? error.message : String(error));
  }

  await access(atRoot(root, "web/assets/hakkyagent.svg"));
  await access(atRoot(root, "web/assets/og-card.png"));
  await access(atRoot(root, "web/CNAME"));

  return {
    ok: missing.length === 0
      && issues.length === 0
      && safetyIssues.length === 0
      && canonicalIssues.length === 0,
    missing,
    issues,
    safetyIssues,
    canonicalIssues,
    canonicalProofs,
  };
}

export async function main({ stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await checkSite();
    const output = {
      ok: result.ok,
      missing: result.missing,
      issues: result.issues,
      safetyIssues: result.safetyIssues,
      canonicalIssues: result.canonicalIssues,
    };
    (result.ok ? stdout : stderr).write(`${JSON.stringify(output, null, 2)}\n`);
    return result.ok ? 0 : 1;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    stderr.write(`${JSON.stringify({ ok: false, error: detail }, null, 2)}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  process.exitCode = await main();
}
