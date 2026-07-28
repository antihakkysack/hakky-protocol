import {
  lstat,
  readFile,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  APPROVED_IMAGE_CID,
  assertCanonicalHakkyMetadataBytes,
} from "../src/metadata-integrity.mjs";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_PUBLIC_FILE_BYTES = 2 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".svg"]);
const CLASSIC_SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const PRELAUNCH_WARNING =
  "PRELAUNCH: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.";
const PROOF_UNAVAILABLE =
  "PROOF UNAVAILABLE: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.";
const X_URL = "https://x.com/antihakkysack";
const GITHUB_URL = "https://github.com/antihakkysack/hakky-protocol";
const CALL_SIGN = Object.freeze([
  "We are not anonymous.",
  "We are HAKKY.",
  "And the whole wide world",
  "just. got. sacked.",
]);
const REQUIRED_FILES = Object.freeze([
  "web/CNAME",
  "web/app.js",
  "web/assets/hakkyagent.svg",
  "web/assets/og-card.png",
  "web/data/launch.json",
  "web/index.html",
  "web/lib/launch-policy.js",
  "web/lib/launch-view.js",
  "web/metadata/hakky-v1.json",
  "web/styles.css",
]);
const REQUIRED_HTML = Object.freeze([
  PRELAUNCH_WARNING,
  "HAKKYAGENT // PUBLIC CHANNEL",
  "NETWORK: SOLANA // MODE: PRELAUNCH",
  "Transmission 001 // Red Team",
  "Transmission 002 // REDDTLAND",
  "Transmission 003 // Creative Doctrine",
  "Transmission 004 // The Lore Frame",
  "Transmission 005 // Atlantyss",
  "Transmission 006 // The Ledger",
  "Transmission 007 // Effective Transformation",
  '<a class="skip-link" href="#main-content">Skip to content</a>',
  '<img src="./assets/hakkyagent.svg"',
  "Planned: 10,000,000 HAKKY",
  "Planned: 10,000,000,000,000",
  "Planned: 8,000,000 HAKKY",
  "Planned: 2,000,000 HAKKY",
  "Planned: 0 HAKKY",
  "Planned: 0%",
  "Planned: 0.25%",
  "Required - not yet verified: 1.00 SOL",
  "Request a quote.",
  "Decode the generated transaction.",
  "Inspect direction, amount constraint, phase, fee, expiry, and exact program.",
  "Approve the transaction in a user-controlled wallet.",
  "Send directly to the immutable Solana program.",
  "Verify finalized state.",
  "This flow is not available during prelaunch. This page has no wallet or trading controls.",
  "HAKKY is a high-risk meme coin.",
  "There is no promised utility, price, yield, floor, return, buyback, or recovery mechanism.",
  "HakkyAgent does not verify every Solana transaction.",
  "Nothing here is financial, legal, medical, religious, or tax advice.",
  `href="${X_URL}"`,
  `href="${GITHUB_URL}"`,
]);
const REQUIRED_PROOF_FIELDS = Object.freeze({
  program: "Not published",
  mint: "Not published",
  market: "Not initialized",
  curve: "Not live",
  pool: "Not live",
  proof: "Unavailable before verified launch state",
});
const FORBIDDEN_TERMS = Object.freeze([
  "Qml0Y29pbg==",
  "QlRD",
  "Y0JUQw==",
  "RXRoZXJldW0=",
  "U2Vwb2xpYQ==",
  "TGF1bmNoTGFi",
  "UmF5ZGl1bQ==",
  "UHVtcC5mdW4=",
  "Z3JhZHVhdGVk",
].map(value => Buffer.from(value, "base64").toString("utf8")));

function toPublicPath(relativePath) {
  return `web/${relativePath.replaceAll("\\", "/")}`;
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function collectPublicFiles(webRoot, safetyIssues) {
  const files = new Map();

  async function visit(directory) {
    if (!isWithin(webRoot, directory)) {
      safetyIssues.push("web: path traversal is forbidden");
      return;
    }

    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      const relative = path.relative(webRoot, directory);
      safetyIssues.push(`${toPublicPath(relative)}: directory is unreadable`);
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.resolve(directory, entry.name);
      const relative = path.relative(webRoot, absolute);
      const publicPath = toPublicPath(relative);
      if (!isWithin(webRoot, absolute)) {
        safetyIssues.push(`${publicPath}: path traversal is forbidden`);
        continue;
      }

      let stats;
      try {
        stats = await lstat(absolute);
      } catch {
        safetyIssues.push(`${publicPath}: file is unreadable`);
        continue;
      }
      if (stats.isSymbolicLink()) {
        safetyIssues.push(`${publicPath}: symlinks and junctions are forbidden`);
        continue;
      }
      if (stats.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (!stats.isFile()) {
        safetyIssues.push(`${publicPath}: only regular files are allowed`);
        continue;
      }
      if (stats.size > MAX_PUBLIC_FILE_BYTES) {
        safetyIssues.push(`${publicPath}: file exceeds 2 MiB`);
        continue;
      }

      let bytes;
      try {
        bytes = await readFile(absolute);
      } catch {
        safetyIssues.push(`${publicPath}: file is unreadable`);
        continue;
      }
      files.set(publicPath, {
        absolute,
        bytes,
        text: TEXT_EXTENSIONS.has(path.extname(absolute).toLowerCase())
          ? bytes.toString("utf8")
          : null,
      });
    }
  }

  let rootStats;
  try {
    rootStats = await lstat(webRoot);
  } catch {
    safetyIssues.push("web: public root is missing or unreadable");
    return files;
  }
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    safetyIssues.push("web: public root must be a real directory");
    return files;
  }

  await visit(webRoot);
  return files;
}

function scanTextFile(publicPath, text, safetyIssues) {
  for (const term of FORBIDDEN_TERMS) {
    const expression = new RegExp(`(?<![A-Za-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?![A-Za-z0-9])`, "iu");
    if (expression.test(text)) {
      safetyIssues.push(`${publicPath}: forbidden legacy term "${term}"`);
    }
  }
  if (/Left-Agency-9292|(?:www\.)?reddit\.com|redd\.it/iu.test(text)) {
    safetyIssues.push(`${publicPath}: Reddit identity or URL is forbidden`);
  }
  if (/<button\b|<input\b|<form\b|connect\s+(?:your\s+)?wallet/iu.test(text)) {
    safetyIssues.push(`${publicPath}: wallet or trading control is forbidden`);
  }
  if (/<(?:iframe|object|embed)\b/iu.test(text)) {
    safetyIssues.push(`${publicPath}: third-party embeds are forbidden`);
  }
  if (/<script\b[^>]*\bsrc=["']https?:|<link\b[^>]*\bhref=["']https?:|fonts\.(?:googleapis|gstatic)\.com/iu.test(text)) {
    safetyIssues.push(`${publicPath}: remote scripts and fonts are forbidden`);
  }

  for (const match of text.matchAll(/\bhref=["']([^"']+)["']/giu)) {
    const destination = match[1];
    const safe = destination.startsWith("#")
      || destination.startsWith("./")
      || destination.startsWith("../")
      || destination === X_URL
      || destination === GITHUB_URL;
    if (!safe) {
      safetyIssues.push(`${publicPath}: external market link is forbidden`);
      break;
    }
  }

  if (/(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{64,88}(?![1-9A-HJ-NP-Za-km-z])/u.test(text)) {
    safetyIssues.push(`${publicPath}: transaction signature is forbidden`);
  }
  const publicKeys = text.match(
    /(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{32,44}(?![1-9A-HJ-NP-Za-km-z])/gu,
  ) ?? [];
  if (publicKeys.some(value => value !== CLASSIC_SPL_TOKEN_PROGRAM)) {
    safetyIssues.push(`${publicPath}: unapproved Solana public key is forbidden`);
  }
}

function requireContent(text, requirements, missing) {
  for (const requirement of requirements) {
    if (!text.includes(requirement)) missing.push(requirement);
  }
}

export async function checkSite({ root = PROJECT_ROOT } = {}) {
  const resolvedRoot = path.resolve(root);
  const webRoot = path.join(resolvedRoot, "web");
  const missing = [];
  const issues = [];
  const safetyIssues = [];
  const files = await collectPublicFiles(webRoot, safetyIssues);

  for (const required of REQUIRED_FILES) {
    if (!files.has(required)) missing.push(required);
  }
  for (const [publicPath, file] of files) {
    if (file.text !== null) scanTextFile(publicPath, file.text, safetyIssues);
  }

  const html = files.get("web/index.html")?.text ?? "";
  const script = files.get("web/app.js")?.text ?? "";
  const launchView = files.get("web/lib/launch-view.js")?.text ?? "";
  const cname = files.get("web/CNAME")?.bytes?.toString("utf8").trim() ?? "";

  requireContent(html, REQUIRED_HTML, missing);
  for (const line of CALL_SIGN) {
    if (html.split(line).length - 1 !== 2) {
      missing.push(`two exact copies of: ${line}`);
    }
  }
  for (const [name, value] of Object.entries(REQUIRED_PROOF_FIELDS)) {
    if (!html.includes(`<dd data-${name}>${value}</dd>`)) {
      missing.push(`<dd data-${name}>${value}</dd>`);
    }
  }
  if (cname !== "hakky.xyz") missing.push("CNAME: hakky.xyz");

  if (!script.includes('from "./lib/launch-view.js"')) {
    safetyIssues.push("web/app.js: lifecycle adapter must import ./lib/launch-view.js");
  }
  if (!launchView.includes('from "./launch-policy.js"')) {
    safetyIssues.push("web/lib/launch-view.js: view must validate with ./launch-policy.js");
  }
  if (!script.includes('fetchImpl("./data/launch.json", { cache: "no-store" })')) {
    safetyIssues.push('web/app.js: launch record fetch must use cache: "no-store"');
  }
  if (!script.includes(PROOF_UNAVAILABLE)) {
    safetyIssues.push("web/app.js: exact proof-unavailable warning is required");
  }

  const launchBytes = files.get("web/data/launch.json")?.bytes;
  if (launchBytes) {
    try {
      const launch = JSON.parse(launchBytes.toString("utf8"));
      issues.push(
        ...validateLaunchRecord(launch)
          .map(issue => `web/data/launch.json: ${issue}`),
      );
    } catch (error) {
      issues.push(`web/data/launch.json: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  const metadataBytes = files.get("web/metadata/hakky-v1.json")?.bytes;
  if (metadataBytes) {
    try {
      assertCanonicalHakkyMetadataBytes(metadataBytes, APPROVED_IMAGE_CID);
    } catch (error) {
      issues.push(`web/metadata/hakky-v1.json: ${error.message}`);
    }
  }

  missing.sort((left, right) => left.localeCompare(right));
  issues.sort((left, right) => left.localeCompare(right));
  const uniqueSafetyIssues = [...new Set(safetyIssues)]
    .sort((left, right) => left.localeCompare(right));
  return {
    ok: missing.length === 0 && issues.length === 0 && uniqueSafetyIssues.length === 0,
    missing,
    issues,
    safetyIssues: uniqueSafetyIssues,
  };
}

export async function main({ stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await checkSite();
    (result.ok ? stdout : stderr).write(`${JSON.stringify(result, null, 2)}\n`);
    return result.ok ? 0 : 1;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    stderr.write(`${JSON.stringify({ ok: false, error: detail }, null, 2)}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  process.exitCode = await main();
}
