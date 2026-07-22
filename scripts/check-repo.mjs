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
const RETIRED_AGENT_MARKERS = [
  "QW50aUhha2t5U2Fjaw==",
  "QU5USUhBS0tZU0FDSw==",
  "U2FjayBTZW50aW5lbA==",
  "QWdlbnQgMDAx",
].map((value) => decode(value));
const RETIRED_ACCOUNT_ALIAS = decode("YW50aWhha2t5c2Fjaw==");
const APPROVED_RETIRED_ACCOUNT_ADDRESSES = Object.freeze([
  `https://github.com/${RETIRED_ACCOUNT_ALIAS}/hakky-protocol.git`,
  `https://github.com/${RETIRED_ACCOUNT_ALIAS}/hakky-protocol`,
  `https://x.com/${RETIRED_ACCOUNT_ALIAS}`,
  `@${RETIRED_ACCOUNT_ALIAS}`,
]);
const UNSUPPORTED_AGENT_CLAIMS = [
  /HakkyAgent.{0,80}verif(?:y|ies|ied).{0,40}(?:all|every|good|bad|safe) transactions?/i,
  /HakkyAgent.{0,80}guarantee(?:s|d)?.{0,40}(?:safe|safety|scam detection|returns?)/i,
];
const ACTIVE_PUBLIC_SCRIPT_FILES = new Set([
  "scripts/check-site.mjs",
  "scripts/render-assets.mjs",
]);
const LIVE_LAUNCH_PLAN = "docs/superpowers/plans/2026-07-22-hakky-live-launch.md";

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
    description: "Exact runtime environment lookups and GitHub secret expressions are allowed.",
  }),
]);

const SCANNER_DEFINITION_LINES = new Set([
  "export const SECRET_ALLOWLIST_RULES = Object.freeze([",
  "const SERVICE_TOKEN_PATTERNS = Object.freeze([",
  "const PRIVATE_KEY_MATERIAL_NEEDLES = Object.freeze([",
]);
const KNOWN_NON_CREDENTIAL_ASSIGNMENT_LINES = new Set([
  ".github/workflows/pages.yml\0id-token: write",
  "package.json\0\"verify:token\": \"node scripts/verify-token.mjs\"",
  "package-lock.json\0\"registry-auth-token\": \"3.3.2\",",
  "scripts/build-live-record.mjs\0token: exactObject(prelaunchRecord.token, TOKEN_FIELDS, { mint: observed?.mint }),",
  "docs/superpowers/plans/2026-07-22-hakky-pivot-build.md\0\"verify:token\": \"node scripts/verify-token.mjs\"",
  "docs/superpowers/plans/2026-07-22-hakky-pivot-build.md\0id-token: write",
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
const ASSIGNMENT_NAME_PATTERN = /(?:(?:export|const|let|var)\s+)?(?:(['"])([A-Za-z][A-Za-z0-9_.:-]*)\1|([A-Za-z_$][A-Za-z0-9_$.:/-]*))\s*$/;
const BINDING_NAME_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const stableSort = (values) => [...values].sort((left, right) => (left === right ? 0 : left < right ? -1 : 1));

function normalized(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isHistoricalDesignRecord(relative) {
  return relative.startsWith("docs/superpowers/");
}

function isActivePublicSurface(relative) {
  const isRootPublicDocument = !relative.includes("/")
    && (relative.endsWith(".md") || relative === "LICENSE");
  return isRootPublicDocument
    || relative === "package.json"
    || ["brand/", "launch/", "proof/", "web/"].some((prefix) => relative.startsWith(prefix))
    || ACTIVE_PUBLIC_SCRIPT_FILES.has(relative)
    || relative === "docs/LAUNCH.md"
    || relative === LIVE_LAUNCH_PLAN;
}

function isAddressBoundary(content, start, end) {
  const before = content[start - 1];
  const after = content[end];
  if (before !== undefined && /[A-Za-z0-9_:/@.-]/.test(before)) return false;
  if (after === ".") {
    const afterPeriod = content[end + 1];
    return afterPeriod === undefined || /[\s)'"`\]}>,;]/.test(afterPeriod);
  }
  return after === undefined || !/[A-Za-z0-9_/?#%&=+:/@.-]/.test(after);
}

function isApprovedRetiredAccountAddress(content, aliasIndex) {
  return APPROVED_RETIRED_ACCOUNT_ADDRESSES.some((address) => {
    const aliasOffset = address.indexOf(RETIRED_ACCOUNT_ALIAS);
    const start = aliasIndex - aliasOffset;
    const end = start + address.length;
    return start >= 0
      && content.slice(start, end) === address
      && isAddressBoundary(content, start, end);
  });
}

function hasUnapprovedRetiredAccountAlias(content) {
  let aliasIndex = content.indexOf(RETIRED_ACCOUNT_ALIAS);
  while (aliasIndex !== -1) {
    if (!isApprovedRetiredAccountAddress(content, aliasIndex)) return true;
    aliasIndex = content.indexOf(RETIRED_ACCOUNT_ALIAS, aliasIndex + RETIRED_ACCOUNT_ALIAS.length);
  }
  return false;
}

function credentialNameParts(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function isCredentialName(name) {
  const key = normalized(name);
  const parts = credentialNameParts(name);
  if ([
    "apikey",
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
  ].some((marker) => key.includes(marker))) return true;
  if (parts.includes("secret")) return true;
  const tokenIndex = parts.indexOf("token");
  return parts.length === 1 && tokenIndex === 0
    || tokenIndex === parts.length - 1
    || tokenIndex >= 0 && ["pattern", "regex", "rule", "allowlist", "field", "marker"].includes(parts[tokenIndex + 1]);
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

function normalizedAssignmentExpression(rawValue) {
  let expression = rawValue.trim().replace(/[,;]$/, "").trim();
  const quote = expression[0];
  if ((quote === '"' || quote === "'" || quote === "`") && expression.at(-1) === quote) {
    expression = expression.slice(1, -1).trim();
  }
  return expression;
}

function isEnvironmentOrSecretExpression(rawValue) {
  const expression = normalizedAssignmentExpression(rawValue);
  return [
    /^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/,
    /^\$\{\{\s*secrets\.[A-Za-z_][A-Za-z0-9_]*\s*\}\}$/,
    /^process\.env(?:\.[A-Za-z_][A-Za-z0-9_]*|\[["'][A-Za-z_][A-Za-z0-9_]*["']\])(?:\s*(?:\?\?|\|\|)\s*(?:""|''|``))?$/,
    /^Deno\.env\.get\(["'][A-Za-z_][A-Za-z0-9_]*["']\)$/,
    /^Bun\.env(?:\.[A-Za-z_][A-Za-z0-9_]*|\[["'][A-Za-z_][A-Za-z0-9_]*["']\])$/,
    /^os\.environ(?:\.get\(["'][A-Za-z_][A-Za-z0-9_]*["']\)|\[["'][A-Za-z_][A-Za-z0-9_]*["']\])$/,
    /^getenv\(["'][A-Za-z_][A-Za-z0-9_]*["']\)$/,
  ].some((pattern) => pattern.test(expression));
}

function bareIdentifierReference(rawValue) {
  const expression = rawValue.trim().replace(/[,;]$/, "").trim();
  if (["\"", "'", "`"].includes(expression[0])) return null;
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(expression) ? expression : null;
}

function isEnvironmentBoundExpression(rawValue, environmentBindings) {
  if (isEnvironmentOrSecretExpression(rawValue)) return true;
  const reference = bareIdentifierReference(rawValue);
  return reference !== null && environmentBindings.has(reference);
}

function isAllowedSecretAssignment(rawValue, value, environmentBindings) {
  if (isEnvironmentBoundExpression(rawValue, environmentBindings)) return true;
  if (value === null) return false;
  const lower = value.toLowerCase();
  if (PLACEHOLDER_VALUES.has(lower)) return true;
  if (/^(?:fixture|synthetic|test)-[a-z0-9-]+$/i.test(value)) return true;
  if (/^<[^>]+>$/.test(value)) return true;
  return false;
}

function isStructuralContainer(rawValue) {
  return ["{", "["].includes(normalizedAssignmentExpression(rawValue)[0]);
}

function assignmentExpressionAt(line, start) {
  let index = start;
  while (/\s/.test(line[index] ?? "")) index += 1;
  const expressionStart = index;
  const closers = [];
  let quote = null;
  let escaped = false;

  for (; index < line.length; index += 1) {
    const character = line[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (["\"", "'", "`"].includes(character)) {
      quote = character;
      continue;
    }
    if (character === "/" && line[index + 1] === "/" && closers.length === 0) break;
    if (character === "(") closers.push(")");
    else if (character === "[") closers.push("]");
    else if (character === "{") closers.push("}");
    else if (closers.at(-1) === character) closers.pop();
    else if (closers.length === 0 && [",", ";", "}", "]"].includes(character)) break;
  }
  return line.slice(expressionStart, index).trim();
}

function assignmentsForLine(line) {
  const assignments = [];
  let quote = null;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (["\"", "'", "`"].includes(character)) {
      quote = character;
      continue;
    }
    if (character === "/" && line[index + 1] === "/") break;
    if (![":", "="].includes(character)) continue;
    if (character === "=" && ["=", ">"].includes(line[index + 1])) continue;
    if (character === "=" && ["!", "<", ">", "="].includes(line[index - 1])) continue;

    const prefix = line.slice(0, index);
    const nameMatch = prefix.match(ASSIGNMENT_NAME_PATTERN);
    if (!nameMatch) continue;
    const name = nameMatch[2] ?? nameMatch[3];
    const beforeName = prefix.slice(0, nameMatch.index).trimEnd();
    if (character === ":") {
      const boundary = beforeName.at(-1);
      if (boundary && !["{", "[", ","].includes(boundary)) continue;
      if (/(?:^|[;{}])\s*(?:export\s+)?(?:const|let|var)\s*$/.test(beforeName)) continue;
    }
    assignments.push({
      name,
      rawValue: assignmentExpressionAt(line, index + 1),
      updatesBinding: character === "=" && BINDING_NAME_PATTERN.test(name),
    });
  }
  return assignments;
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

function secretRulesForContent(content, relative) {
  const rules = new Set();
  const environmentBindings = new Set();
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
    if (relative === "scripts/check-repo.mjs" && SCANNER_DEFINITION_LINES.has(line.trim())) continue;
    if (KNOWN_NON_CREDENTIAL_ASSIGNMENT_LINES.has(`${relative}\0${line.trim()}`)) continue;
    for (const { name, rawValue, updatesBinding } of assignmentsForLine(line)) {
      const value = literalValue(rawValue);
      if (
        isCredentialName(name)
        && !isStructuralContainer(rawValue)
        && !isAllowedSecretAssignment(rawValue, value, environmentBindings)
      ) {
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
      if (updatesBinding) {
        if (isEnvironmentBoundExpression(rawValue, environmentBindings)) environmentBindings.add(name);
        else environmentBindings.delete(name);
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
    if (isActivePublicSurface(relative)) {
      if (
        RETIRED_AGENT_MARKERS.some((marker) => content.includes(marker))
        || hasUnapprovedRetiredAccountAlias(content)
      ) {
        violations.push({ file: relative, rule: "retired-agent-identity" });
      }
      if (UNSUPPORTED_AGENT_CLAIMS.some((pattern) => pattern.test(content))) {
        violations.push({ file: relative, rule: "unsupported-agent-claim" });
      }
    }
    for (const rule of secretRulesForContent(content, relative)) violations.push({ file: relative, rule });
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
