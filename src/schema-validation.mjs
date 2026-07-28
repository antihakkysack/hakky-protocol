import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { validateContentAddressedUri } from "./metadata-integrity.mjs";

const SCHEMA_URLS = Object.freeze({
  "mint-v2": new URL("../schemas/proof/mainnet-mint-v2.schema.json", import.meta.url),
  "launchlab-v2": new URL("../schemas/proof/mainnet-launchlab-v2.schema.json", import.meta.url),
  "graduation-v1": new URL("../schemas/proof/mainnet-graduation-v1.schema.json", import.meta.url),
  "launch-v2": new URL("../schemas/web/launch-v2.schema.json", import.meta.url),
  "launch-v3": new URL("../schemas/web/launch-v3.schema.json", import.meta.url),
});

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: false,
  code: { source: true, esm: true, lines: true },
});

const validators = new Map(
  Object.entries(SCHEMA_URLS).map(([kind, url]) => {
    const schema = JSON.parse(readFileSync(url, "utf8"));
    return [kind, ajv.compile(schema)];
  }),
);

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const PUBLIC_KEY_FIELDS = new Set([
  "address", "associatedToken", "baseVault", "configId", "creator", "feeKey", "launchId",
  "launchlab", "launchlabAuthority", "lockNftMint", "lockNftTokenAccount", "lockProgram",
  "lockedPosition", "lockVault", "lpMint", "metadata", "metadataAccount", "migration", "mint",
  "mintAuthority", "owner", "ownerProgram", "platformConfig", "pool", "programId", "quoteMint",
  "quoteVault", "system", "token", "tokenProgram", "updateAuthority", "withdrawalAuthority",
]);
const SIGNATURE_FIELDS = new Set(["creationSignature", "signature"]);
const TIMESTAMP_FIELDS = new Set(["checkedAt", "creationTime", "finalizedAt"]);
const CONTENT_URI_FIELDS = new Set(["imageUri", "uri"]);
const CPMM_PROGRAM = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
const AMM_V4_PROGRAM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

function decodeBase58(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  const bytes = [0];
  for (const character of value) {
    let carry = BASE58_ALPHABET.indexOf(character);
    if (carry < 0) return null;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let index = 0; index < value.length - 1 && value[index] === "1"; index += 1) bytes.push(0);
  return bytes.reverse();
}

function encodeBase58(bytes) {
  if (bytes.length === 0) return "";
  let zeroes = 0;
  while (zeroes < bytes.length && bytes[zeroes] === 0) zeroes += 1;
  const digits = [0];
  for (let byteIndex = zeroes; byteIndex < bytes.length; byteIndex += 1) {
    let carry = bytes[byteIndex];
    for (let digitIndex = 0; digitIndex < digits.length; digitIndex += 1) {
      carry += digits[digitIndex] << 8;
      digits[digitIndex] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  const encoded = zeroes === bytes.length
    ? ""
    : digits.reverse().map((digit) => BASE58_ALPHABET[digit]).join("");
  return "1".repeat(zeroes) + encoded;
}

function isCanonicalBase58(value, decodedLength) {
  const decoded = decodeBase58(value);
  return decoded !== null && decoded.length === decodedLength && encodeBase58(decoded) === value;
}

function isExactTimestamp(value) {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function semanticIssue(instancePath, keyword, message) {
  return `${instancePath || "/"} [${keyword}] ${message}`;
}

function validateScalarSemantics(value, instancePath, issues) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateScalarSemantics(item, `${instancePath}/${index}`, issues));
    return;
  }
  if (value === null || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${instancePath}/${key}`;
    if (typeof child === "string" && PUBLIC_KEY_FIELDS.has(key) && !isCanonicalBase58(child, 32)) {
      issues.push(semanticIssue(childPath, "canonicalPublicKey", "must decode canonically to 32 bytes"));
    }
    if (typeof child === "string" && SIGNATURE_FIELDS.has(key) && !isCanonicalBase58(child, 64)) {
      issues.push(semanticIssue(childPath, "canonicalSignature", "must decode canonically to 64 bytes"));
    }
    if (TIMESTAMP_FIELDS.has(key) && !isExactTimestamp(child)) {
      issues.push(semanticIssue(childPath, "calendarTimestamp", "must be a real canonical UTC timestamp"));
    }
    if (typeof child === "string" && CONTENT_URI_FIELDS.has(key)) {
      try {
        validateContentAddressedUri(child);
      } catch {
        issues.push(semanticIssue(childPath, "contentAddress", "must be an exact canonical IPFS or Arweave identity"));
      }
    }
    if (key === "updateAuthorities" && Array.isArray(child)) {
      child.forEach((authority, index) => {
        if (!isCanonicalBase58(authority, 32)) {
          issues.push(semanticIssue(`${childPath}/${index}`, "canonicalPublicKey", "must decode canonically to 32 bytes"));
        }
      });
    }
    validateScalarSemantics(child, childPath, issues);
  }
}

function validateChronology(container, instancePath, issues) {
  if (container === null || typeof container !== "object") return;
  const observation = container.observation;
  if (observation && isExactTimestamp(observation.finalizedAt) && isExactTimestamp(observation.checkedAt)
      && Date.parse(observation.checkedAt) < Date.parse(observation.finalizedAt)) {
    issues.push(semanticIssue(`${instancePath}/observation/checkedAt`, "chronology", "must not precede observation finalization"));
  }

  const creatorBalance = container.creatorBalance;
  let relevantTransaction = container.transaction;
  if (container.transactions) relevantTransaction = container.transactions.graduation ?? container.transactions.creation;
  if (!relevantTransaction && observation?.creationTime !== undefined) {
    relevantTransaction = { finalizedSlot: observation.creationSlot, finalizedAt: observation.creationTime };
  }

  if (creatorBalance && relevantTransaction) {
    if (creatorBalance.finalizedSlot < relevantTransaction.finalizedSlot
        || (isExactTimestamp(creatorBalance.finalizedAt) && isExactTimestamp(relevantTransaction.finalizedAt)
          && Date.parse(creatorBalance.finalizedAt) < Date.parse(relevantTransaction.finalizedAt))) {
      issues.push(semanticIssue(`${instancePath}/creatorBalance`, "chronology", "must be finalized at or after the relevant transaction"));
    }
  }
  if (creatorBalance && observation) {
    if (creatorBalance.finalizedSlot > observation.finalizedSlot
        || (isExactTimestamp(creatorBalance.finalizedAt) && isExactTimestamp(observation.finalizedAt)
          && Date.parse(creatorBalance.finalizedAt) > Date.parse(observation.finalizedAt))) {
      issues.push(semanticIssue(`${instancePath}/creatorBalance`, "chronology", "must not be later than the observation"));
    }
  }

  const accounts = creatorBalance?.accounts;
  if (Array.isArray(accounts)) {
    const addresses = accounts.map((account) => account.address);
    if (new Set(addresses).size !== addresses.length) {
      issues.push(semanticIssue(`${instancePath}/creatorBalance/accounts`, "uniqueAddress", "must not repeat an account address"));
    }
  }
}

function validateMigrationBranch(container, instancePath, issues) {
  const disposition = container?.lpDisposition;
  if (!disposition) return;
  const expected = disposition.kind === "burn-and-earn" ? CPMM_PROGRAM
    : disposition.kind === "lp-burn" ? AMM_V4_PROGRAM : null;
  if (!expected) return;
  if (container.pool?.programId !== expected) {
    issues.push(semanticIssue(`${instancePath}/pool/programId`, "migrationBranch", "must match the LP disposition branch"));
  }
  if (container.programs && (container.programs.migration !== expected || container.programs.pool !== expected)) {
    issues.push(semanticIssue(`${instancePath}/programs`, "migrationBranch", "migration and pool programs must match the LP disposition branch"));
  }
}

function validateSemantic(kind, value) {
  const issues = [];
  validateScalarSemantics(value, "", issues);
  if (kind === "launch-v2") {
    validateChronology(value.proof, "/proof", issues);
    validateMigrationBranch(value.proof, "/proof", issues);
  } else {
    validateChronology(value, "", issues);
    if (kind === "graduation-v1") validateMigrationBranch(value, "", issues);
  }
  return issues.sort((left, right) => left.localeCompare(right));
}

function normalizedPath(error) {
  if (error.keyword === "required") return `${error.instancePath}/${error.params.missingProperty}` || "/";
  if (error.keyword === "additionalProperties") return `${error.instancePath}/${error.params.additionalProperty}` || "/";
  return error.instancePath || "/";
}

function normalizeErrors(errors = []) {
  return errors
    .map((error) => ({
      instancePath: normalizedPath(error),
      keyword: error.keyword,
      message: error.message ?? "validation failed",
    }))
    .sort((left, right) => left.instancePath.localeCompare(right.instancePath)
      || left.keyword.localeCompare(right.keyword)
      || left.message.localeCompare(right.message))
    .map(({ instancePath, keyword, message }) => `${instancePath} [${keyword}] ${message}`);
}

function validatorFor(kind) {
  const validator = validators.get(kind);
  if (!validator) throw new Error(`Unknown schema kind: ${kind}`);
  return validator;
}

export function validateSchema(kind, value) {
  const validator = validatorFor(kind);
  const shapeOk = validator(value);
  if (!shapeOk) return { ok: false, errors: normalizeErrors(validator.errors) };
  const errors = validateSemantic(kind, value);
  return { ok: errors.length === 0, errors };
}

export function assertSchema(kind, value) {
  const result = validateSchema(kind, value);
  if (!result.ok) throw new Error(`Schema ${kind} validation failed:\n${result.errors.join("\n")}`);
  return value;
}
