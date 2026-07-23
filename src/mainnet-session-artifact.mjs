import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { resolveRepositoryPath } from "./metadata-integrity.mjs";
import { writeBytesAtomic } from "./record-output.mjs";

export const MAINNET_SESSION_PATHS = Object.freeze({
  officialOrigin: "artifacts/mainnet-session/official-origin.json",
  walletReadiness: "artifacts/mainnet-session/wallet-readiness.json",
  unsignedTransaction: "artifacts/mainnet-session/unsigned-transaction.base64",
  preview: "artifacts/mainnet-session/preview.json",
  approvalEnvelope: "artifacts/mainnet-session/approval-envelope.json",
  sessionReceipt: "artifacts/mainnet-session/session-receipt.json",
  statusEvent: "artifacts/mainnet-session/status-event.json",
  recoveryLookupTables: "artifacts/mainnet-session/recovery-lookup-tables.json",
  recoverySimulation: "artifacts/mainnet-session/recovery-simulation.json",
  recoveryFeeQuote: "artifacts/mainnet-session/recovery-fee-quote.json",
  recoveryTransaction: "artifacts/mainnet-session/recovery-transaction.base64",
  recoveryEnvelope: "artifacts/mainnet-session/recovery-envelope.json",
});

const JSON_PATHS = new Set(Object.values(MAINNET_SESSION_PATHS).filter((value) => value.endsWith(".json")));
const FORBIDDEN_KEY = /(?:private|secret|seed|mnemonic|keypair|credential|password|bearer|authorization)/iu;

function fail(code) {
  throw new Error(`mainnet-session-${code}`);
}

function assertPublicJson(value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("unsafe-number");
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) fail("json-value");
  seen.add(value);
  if (Array.isArray(value)) {
    for (const child of value) assertPublicJson(child, seen);
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) fail("private-field");
      assertPublicJson(child, seen);
    }
  }
  seen.delete(value);
}

export function serializeMainnetSessionJson(value) {
  assertPublicJson(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function exactSessionPath(repositoryRoot, relativePath) {
  if (!JSON_PATHS.has(relativePath)) fail("path");
  return resolveRepositoryPath(path.resolve(repositoryRoot), relativePath);
}

export async function readMainnetSessionJson({
  repositoryRoot,
  relativePath,
}) {
  const outputPath = await exactSessionPath(repositoryRoot, relativePath);
  let source;
  try {
    source = await readFile(outputPath);
  } catch {
    fail("read");
  }
  let value;
  try {
    value = JSON.parse(source.toString("utf8"));
  } catch {
    fail("json");
  }
  if (!source.equals(serializeMainnetSessionJson(value))) fail("canonical-json");
  return Object.freeze({ value, outputPath });
}

export async function writeMainnetSessionJson({
  repositoryRoot,
  relativePath,
  value,
  writeImpl = writeBytesAtomic,
}) {
  if (typeof writeImpl !== "function") fail("writer");
  const root = path.resolve(repositoryRoot);
  let outputPath = await exactSessionPath(root, relativePath);
  const directory = await resolveRepositoryPath(root, path.posix.dirname(relativePath));
  await mkdir(directory, { recursive: true });
  outputPath = await exactSessionPath(root, relativePath);
  if (path.dirname(outputPath) !== await resolveRepositoryPath(root, path.posix.dirname(relativePath))) {
    fail("path-drift");
  }
  const result = await writeImpl(outputPath, serializeMainnetSessionJson(value));
  if (result?.committed !== true) fail("write");
  return Object.freeze({ outputPath, warning: result.warning ?? null });
}
