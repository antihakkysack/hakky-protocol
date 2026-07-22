import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const BINARY_EXTENSIONS = new Set([".gif", ".ico", ".jpg", ".jpeg", ".png", ".webp", ".woff", ".woff2"]);
const decode = (value) => Buffer.from(value, "base64").toString("utf8");
const PERSONAL_PROJECT_NEEDLE = decode("ZnJlc2hkaWdpdGFs");
const LEGACY_NEEDLES = [
  "Y2J0Yw==",
  "Y2xlYW5iaXRjb2lu",
  "Yml0Y29pbg==",
  "ZXRoZXJldW0=",
  "cHJvb2Ygb2YgcmVzZXJ2ZXM=",
  "UmVzZXJ2ZVZhdWx0",
  "cmVzZXJ2ZW9yYWNsZQ==",
  "YXR0ZXN0YXRpb25yZWdpc3RyeQ==",
  "YXR0ZXN0YXRpb24=",
  "cHJvdmVuYW5jZQ==",
  "Y29tcGxpYW5jZQ==",
  "c2Vwb2xpYQ==",
  "c29saWRpdHk=",
  "aGFyZGhhdA==",
].map((value) => decode(value).toLowerCase().replace(/[^a-z0-9]/g, ""));

const PLACEHOLDER_VALUES = new Set([
  "",
  "change-me",
  "changeme",
  "dummy",
  "example",
  "example-value",
  "none",
  "not-set",
  "null",
  "placeholder",
  "redacted",
  "test",
  "undefined",
]);

export const SECRET_ALLOWLIST_RULES = Object.freeze([
  Object.freeze({
    id: "placeholder-value",
    description: "Empty values and explicit non-secret placeholders are allowed.",
  }),
  Object.freeze({
    id: "environment-reference",
    description: "Runtime environment lookups and interpolation-only values are allowed.",
  }),
  Object.freeze({
    id: "public-url",
    description: "Credential-free HTTPS URLs without query or fragment data are allowed.",
  }),
  Object.freeze({
    id: "scanner-rule-definition",
    description: "Identifiers ending in pattern, regex, rule, allowlist, field, or marker are scanner definitions.",
  }),
]);

const SERVICE_TOKEN_PATTERNS = Object.freeze([
  /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/g,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  /\bnpm_[A-Za-z0-9]{36}\b/g,
]);
const PRIVATE_KEY_MATERIAL_NEEDLES = Object.freeze([
  ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
  ["-----BEGIN", "RSA PRIVATE KEY-----"].join(" "),
  ["-----BEGIN", "EC PRIVATE KEY-----"].join(" "),
  ["-----BEGIN", "OPENSSH PRIVATE KEY-----"].join(" "),
  ["-----BEGIN", "DSA PRIVATE KEY-----"].join(" "),
  ["-----BEGIN", "PGP PRIVATE KEY BLOCK-----"].join(" "),
]);
const AUTHENTICATED_URL_PATTERN = /https:\/\/[^/\s:@]+:[^@\s/]+@/;
const ASSIGNMENT_PATTERN = /^\s*(?:(?:export|const|let|var)\s+)?["']?([A-Za-z][A-Za-z0-9_.:-]*)["']?\s*[:=]\s*(.+?)\s*[,;]?\s*$/;

const stableSort = (values) => [...values].sort((left, right) => (left === right ? 0 : left < right ? -1 : 1));

function normalized(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isHistoricalDesignRecord(relative) {
  return relative.startsWith("docs/superpowers/");
}

function isCredentialName(name) {
  if (name.includes(":")) return false;
  const key = normalized(name);
  if (/(?:pattern|regex|rule|allowlist|field|marker)$/.test(key)) return false;
  return [
    "apikey",
    "secret",
    "token",
    "password",
    "passwd",
    "privatekey",
    "clientsecret",
    "accesskey",
    "authtoken",
    "bearertoken",
    "mnemonic",
    "seedphrase",
    "recoveryphrase",
  ].some((suffix) => key === suffix || key.endsWith(suffix));
}

function literalValue(rawValue) {
  let value = rawValue.trim().replace(/[,;]$/, "").trim();
  if (!value) return "";
  const quote = value[0];
  if ((quote === '"' || quote === "'" || quote === "`") && value.at(-1) === quote) {
    return value.slice(1, -1).trim();
  }
  value = value.replace(/^["'`]|["'`]$/g, "").trim();
  if (/^[^\s[\]{}()]+$/.test(value)) return value;
  return null;
}

function isAllowedSecretValue(value) {
  if (value === null) return true;
  const lower = value.toLowerCase();
  if (PLACEHOLDER_VALUES.has(lower)) return true;
  if (/^(?:fixture|synthetic|test)-[a-z0-9-]+$/i.test(value)) return true;
  if (/^<[^>]+>$/.test(value)) return true;
  if (/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/.test(value)) return true;
  if (/^[A-Z][A-Z0-9_]+$/.test(value)) return true;
  if (/^(?:process\.env|Deno\.env|Bun\.env|os\.environ|getenv\()/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

function hasWalletKeyArray(content) {
  const isByteArray = (value) => Array.isArray(value)
    && (value.length === 32 || value.length === 64)
    && value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255);
  try {
    const parsed = JSON.parse(content);
    if (isByteArray(parsed)) return true;
    if (parsed && typeof parsed === "object") {
      for (const [key, value] of Object.entries(parsed)) {
        if (/(?:secret|private|keypair|wallet)/i.test(key) && isByteArray(value)) return true;
      }
    }
  } catch {
    // Non-JSON tracked files are checked with the assignment pattern below.
  }
  const arrayMatches = content.matchAll(
    /(?:secretKey|privateKey|keypair|walletKey)\s*[:=]\s*(?:Uint8Array\.from\()?\s*(\[(?:\s*\d{1,3}\s*,){31,63}\s*\d{1,3}\s*\])/g,
  );
  for (const match of arrayMatches) {
    try {
      if (isByteArray(JSON.parse(match[1]))) return true;
    } catch {
      // Keep scanning other candidates.
    }
  }
  return false;
}

function secretRulesForContent(content) {
  const rules = new Set();
  if (PRIVATE_KEY_MATERIAL_NEEDLES.some((needle) => content.includes(needle))) {
    rules.add("secret-private-key-material");
  }
  if (AUTHENTICATED_URL_PATTERN.test(content)) rules.add("secret-authenticated-url");
  if (hasWalletKeyArray(content)) rules.add("secret-wallet-key-array");
  for (const pattern of SERVICE_TOKEN_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) rules.add("secret-service-token");
  }

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(ASSIGNMENT_PATTERN);
    if (!match) continue;
    const [, name, rawValue] = match;
    const value = literalValue(rawValue);
    if (isCredentialName(name) && value !== null && value.length >= 8 && !isAllowedSecretValue(value)) {
      rules.add("secret-credential-assignment");
    }
    const key = normalized(name);
    if (["mnemonic", "seedphrase", "recoveryphrase"].includes(key)) {
      const phrase = value ?? rawValue.trim().replace(/[,;]$/, "").replace(/^["'`]|["'`]$/g, "").trim();
      const words = phrase.split(/\s+/);
      if (words.length >= 12 && words.length <= 24 && words.every((word) => /^[a-z]+$/i.test(word))) {
        rules.add("secret-mnemonic-phrase");
      }
    }
  }
  return stableSort(rules);
}

async function listTrackedFiles(root) {
  const { stdout } = await execFileAsync("git", ["-C", root, "ls-files", "-z", "--cached"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout.split("\0").filter(Boolean);
}

export async function scanRepository(root = process.cwd(), { trackedFiles } = {}) {
  const files = stableSort(new Set((trackedFiles ?? await listTrackedFiles(root))
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file && !BINARY_EXTENSIONS.has(path.extname(file).toLowerCase()))));
  const violations = [];
  for (const relative of files) {
    let content;
    try {
      content = await readFile(path.join(root, ...relative.split("/")), "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    const compact = normalized(content);
    if (compact.includes(PERSONAL_PROJECT_NEEDLE)) {
      violations.push({ file: relative, rule: "personal-project-only" });
    }
    if (!isHistoricalDesignRecord(relative) && LEGACY_NEEDLES.some((needle) => compact.includes(needle))) {
      violations.push({ file: relative, rule: "legacy-product-active" });
    }
    for (const rule of secretRulesForContent(content)) violations.push({ file: relative, rule });
  }
  return violations.sort((left, right) => {
    const fileOrder = left.file === right.file ? 0 : left.file < right.file ? -1 : 1;
    if (fileOrder) return fileOrder;
    return left.rule === right.rule ? 0 : left.rule < right.rule ? -1 : 1;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const violations = await scanRepository();
  if (violations.length) {
    console.error(JSON.stringify({ ok: false, violations }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, violations: [] }, null, 2));
  }
}
