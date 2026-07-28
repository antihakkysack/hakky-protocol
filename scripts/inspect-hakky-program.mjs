import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { SBF_IMAGE } from "./build-hakky-sbf.mjs";

export const MAX_PROGRAM_BYTES = 120_000;

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const EXPECTED_EXPORTS = Object.freeze(["custom_panic", "entrypoint"]);
const EXPECTED_TAGS = Object.freeze([0, 1, 2]);
const EXPECTED_CALLS = Object.freeze({
  system: Object.freeze(["allocate", "assign", "transfer"]),
  token: Object.freeze([
    "initialize_account3",
    "initialize_mint2",
    "mint_to",
    "set_authority",
    "transfer_checked",
  ]),
  metadata: Object.freeze(["create_metadata_account_v3"]),
});
const FORBIDDEN_TOKEN_CPI_PATTERN =
  /\b(close_account|burn|burn_checked|approve|approve_checked|revoke|freeze_account|thaw_account|sync_native|unchecked_transfer)\b/gu;

function sameSet(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index])
  );
}

function exportedFunctions(readelfText) {
  return readelfText
    .split(/\r?\n/u)
    .filter((line) => /\bFUNC\s+GLOBAL\s+DEFAULT\s+\d+\s+\S+\s*$/u.test(line))
    .map((line) => line.trim().split(/\s+/u).at(-1));
}

export function evaluateProgramSurface({
  binaryBytes,
  readelfText,
  tagProbe,
  invokeCallsites,
}) {
  const checks = {
    size: binaryBytes.length <= MAX_PROGRAM_BYTES,
    exports: sameSet(exportedFunctions(readelfText), EXPECTED_EXPORTS),
    tags:
      tagProbe?.nativeProcessorFallback === false &&
      tagProbe?.preferBpf === true &&
      tagProbe?.probedFirstBytes === 256 &&
      tagProbe?.malformedLengthsRejected === true &&
      sameSet(tagProbe?.acceptedInstructionTags, EXPECTED_TAGS),
    systemCalls: sameSet(invokeCallsites?.system, EXPECTED_CALLS.system),
    tokenCalls: sameSet(invokeCallsites?.token, EXPECTED_CALLS.token),
    metadataCalls: sameSet(invokeCallsites?.metadata, EXPECTED_CALLS.metadata),
    forbiddenCalls:
      Array.isArray(invokeCallsites?.forbidden) &&
      invokeCallsites.forbidden.length === 0,
    exactAccountMetas: invokeCallsites?.exactAccountMetas === true,
    exactSignerSeeds: invokeCallsites?.exactSignerSeeds === true,
    exactAuthorities: invokeCallsites?.exactAuthorities === true,
    exactDirections: invokeCallsites?.exactDirections === true,
    exactDecimals: invokeCallsites?.exactDecimals === true,
    exactAmountBindings: invokeCallsites?.exactAmountBindings === true,
  };
  return {
    ok: Object.values(checks).every(Boolean),
    binaryBytes: binaryBytes.length,
    maxProgramBytes: MAX_PROGRAM_BYTES,
    exports: exportedFunctions(readelfText),
    checks,
  };
}

function uniqueMatches(text, expression) {
  return [...new Set([...text.matchAll(expression)].map((match) => match[1]))].sort();
}

export function deriveInvokeCallsites({ processorSource, tokenSource, metadataSource }) {
  const system = uniqueMatches(
    processorSource,
    /fn system_(transfer|allocate|assign)_instruction\s*\(/gu,
  );
  const tokenFunctions = uniqueMatches(
    tokenSource,
    /pub fn (initialize_mint2_instruction|initialize_account3_instruction|mint_total_supply_instruction|disable_mint_authority_instruction|transfer_checked_instruction)\s*\(/gu,
  );
  const tokenNames = {
    disable_mint_authority_instruction: "set_authority",
    initialize_account3_instruction: "initialize_account3",
    initialize_mint2_instruction: "initialize_mint2",
    mint_total_supply_instruction: "mint_to",
    transfer_checked_instruction: "transfer_checked",
  };
  const token = tokenFunctions.map((name) => tokenNames[name]).sort();
  const metadata = metadataSource.includes("CREATE_METADATA_ACCOUNT_V3_DISCRIMINATOR")
    ? ["create_metadata_account_v3"]
    : [];
  const combined = `${processorSource}\n${tokenSource}\n${metadataSource}`;
  const forbidden = [...tokenSource.matchAll(FORBIDDEN_TOKEN_CPI_PATTERN)].map(
    (match) => match[1],
  );
  const requiredFragments = [
    "invoke_signed(",
    "data.extend_from_slice(&2_u32.to_le_bytes())",
    "data.extend_from_slice(&8_u32.to_le_bytes())",
    "data.extend_from_slice(&1_u32.to_le_bytes())",
    "VAULT_AUTHORITY_SEED",
    "METADATA_SINK_SEED",
    "AccountMeta::new_readonly(*metadata_sink, true)",
    "AccountMeta::new_readonly(*vault_authority, true)",
    "data.push(CREATE_METADATA_ACCOUNT_V3_DISCRIMINATOR)",
    "data.push(12)",
    "data.extend_from_slice(&[20, TOKEN_DECIMALS])",
    "data: vec![6, 0, 0]",
    "data.extend_from_slice(&TOTAL_SUPPLY.to_le_bytes())",
    "data.extend_from_slice(&amount.to_le_bytes())",
    "data.push(decimals)",
    "AccountMeta::new(*source, false)",
    "AccountMeta::new(*destination, false)",
  ];
  const bindingsExact = requiredFragments.every((fragment) => combined.includes(fragment));
  return {
    system,
    token,
    metadata,
    forbidden,
    exactAccountMetas: bindingsExact,
    exactSignerSeeds: bindingsExact,
    exactAuthorities: bindingsExact,
    exactDirections: bindingsExact,
    exactDecimals: bindingsExact,
    exactAmountBindings: bindingsExact,
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readelf(binaryPath, repositoryRoot, exec) {
  return exec(
    "rtk",
    [
      "docker",
      "run",
      "--rm",
      "--network",
      "none",
      "-v",
      `${binaryPath}:/program.so:ro`,
      SBF_IMAGE,
      "readelf",
      "--symbols",
      "/program.so",
    ],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

export async function inspectCandidate({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  exec = execFileSync,
} = {}) {
  const root = path.resolve(repositoryRoot);
  const directory = path.join(root, "artifacts", "build", "candidate");
  const binaryPath = path.join(directory, "hakky_market.so");
  const binary = await readFile(binaryPath);
  const buildReceipt = JSON.parse(
    await readFile(path.join(directory, "build-receipt.json"), "utf8"),
  );
  if (
    buildReceipt.lane !== "candidate-sbf" ||
    buildReceipt.binarySha256 !== sha256(binary)
  ) {
    throw new Error("candidate binary does not match its candidate build receipt");
  }
  const tagProbe = JSON.parse(
    await readFile(path.join(directory, "runtime-receipt.json"), "utf8"),
  );
  const [processorSource, tokenSource, metadataSource] = await Promise.all([
    readFile(path.join(root, "programs", "hakky-market", "src", "processor.rs"), "utf8"),
    readFile(path.join(root, "programs", "hakky-market", "src", "token.rs"), "utf8"),
    readFile(path.join(root, "programs", "hakky-market", "src", "metadata.rs"), "utf8"),
  ]);
  const invokeCallsites = deriveInvokeCallsites({
    processorSource,
    tokenSource,
    metadataSource,
  });
  const readelfText = readelf(binaryPath, root, exec);
  const evaluated = evaluateProgramSurface({
    binaryBytes: binary,
    readelfText,
    tagProbe,
    invokeCallsites,
  });
  const receipt = {
    schemaVersion: "hakky-program-surface-v1",
    lane: "candidate-sbf",
    binarySha256: buildReceipt.binarySha256,
    sourceSha256: buildReceipt.sourceSha256,
    readelfSha256: sha256(Buffer.from(readelfText)),
    tagProbe,
    invokeCallsites,
    ...evaluated,
  };
  await writeFile(
    path.join(directory, "surface-receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
  if (!receipt.ok) throw new Error("candidate SBF surface inspection failed");
  return receipt;
}

export async function main({ stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const receipt = await inspectCandidate();
    stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "candidate inspection failed"}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
