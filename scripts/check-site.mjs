import { access, readFile } from "node:fs/promises";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";

const html = await readFile("web/index.html", "utf8");
const script = await readFile("web/app.js", "utf8");
const launch = JSON.parse(await readFile("web/data/launch.json", "utf8"));
const required = [
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
];
const missing = required.filter((value) => !html.toLowerCase().includes(value.toLowerCase()));
const issues = validateLaunchRecord(launch);
const safetyIssues = [];

if (!script.includes("validateLaunchRecord")) safetyIssues.push("app.js must validate the launch record");
if (!script.includes("PROOF UNAVAILABLE: Do not trust contract addresses from replies or DMs.")) {
  safetyIssues.push("app.js must retain the proof-unavailable warning");
}
if (/data-(?:solscan|raydium)[^>]*\shref=/i.test(html)) {
  safetyIssues.push("live links must not have static href values");
}
if (launch.status === "prelaunch" && (launch.token?.mint !== null || launch.proof !== null)) {
  safetyIssues.push("prelaunch source must not contain mint proof");
}

await access("web/assets/sack-sentinel.svg");
await access("web/assets/og-card.png");
await access("web/CNAME");

if (missing.length || issues.length || safetyIssues.length) {
  console.error(JSON.stringify({ ok: false, missing, issues, safetyIssues }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, missing: [], issues: [], safetyIssues: [] }, null, 2));
}
