import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  loadCanonicalProofArtifacts,
  validateCanonicalProofBinding,
} from "../src/canonical-proof.mjs";
import {
  LAUNCH_FIELDS,
  LIVE_PROOF_FIELDS,
  PROJECT_FIELDS,
  TOKEN_FIELDS,
  validateLaunchRecord,
} from "../web/lib/launch-policy.js";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atRoot = (root, relativePath) => path.join(root, ...relativePath.split("/"));

function exactObject(source, fields, overrides = {}) {
  return Object.fromEntries(fields.map((field) => [
    field,
    Object.hasOwn(overrides, field) ? overrides[field] : source?.[field],
  ]));
}

export function buildLiveRecord({
  prelaunchRecord,
  mintProof,
  launchlabProof,
  verifiedAt,
}) {
  const prelaunchIssues = validateLaunchRecord(prelaunchRecord);
  if (prelaunchRecord?.status !== "prelaunch") {
    prelaunchIssues.push("source launch record status must equal prelaunch");
  }
  if (prelaunchIssues.length) {
    throw new Error(`Cannot build live record: ${prelaunchIssues.join("; ")}`);
  }

  const observed = mintProof?.observed;
  const proofValues = {
    mint: observed?.mint,
    creator: mintProof?.creator,
    launchId: launchlabProof?.launchId,
    launchTransaction: launchlabProof?.launchTransaction,
    solscanUrl: launchlabProof?.solscanUrl,
    solscanTransactionUrl: launchlabProof?.solscanTransactionUrl,
    raydiumUrl: launchlabProof?.raydiumUrl,
    mintVerifiedAt: mintProof?.checkedAt,
    launchVerifiedAt: launchlabProof?.checkedAt,
    verifiedAt,
    supplyBaseUnits: observed?.supplyBaseUnits,
    decimals: observed?.decimals,
    tokenProgram: observed?.tokenProgram,
    mintAuthority: observed?.mintAuthority,
    freezeAuthority: observed?.freezeAuthority,
    creatorBalanceBaseUnits: observed?.creatorBalanceBaseUnits,
    metadataImmutable: launchlabProof?.metadataImmutable,
    metadataName: launchlabProof?.metadataName,
    metadataSymbol: launchlabProof?.metadataSymbol,
    metadataUri: launchlabProof?.metadataUri,
    metadataImage: launchlabProof?.metadataImage,
    metadataWebsite: launchlabProof?.metadataWebsite,
    metadataX: launchlabProof?.metadataX,
    curveAllocationBps: launchlabProof?.curveAllocationBps,
    liquidityAllocationBps: launchlabProof?.liquidityAllocationBps,
    teamAllocationBps: launchlabProof?.teamAllocationBps,
    creatorFeeEnabled: launchlabProof?.creatorFeeEnabled,
    lpPolicy: launchlabProof?.lpPolicy,
    quoteAsset: launchlabProof?.quoteAsset,
    graduationTargetSol: launchlabProof?.graduationTargetSol,
    creatorFirstBuySol: launchlabProof?.creatorFirstBuySol,
    creatorSpendSol: launchlabProof?.creatorSpendSol,
  };
  const liveRecord = {
    schemaVersion: prelaunchRecord.schemaVersion,
    status: "live",
    network: prelaunchRecord.network,
    project: exactObject(prelaunchRecord.project, PROJECT_FIELDS),
    token: exactObject(prelaunchRecord.token, TOKEN_FIELDS, { mint: observed?.mint }),
    launch: exactObject(prelaunchRecord.launch, LAUNCH_FIELDS),
    proof: exactObject(proofValues, LIVE_PROOF_FIELDS),
  };

  const issues = validateCanonicalProofBinding(liveRecord, mintProof, launchlabProof);
  if (issues.length) throw new Error(`Cannot build live record: ${issues.join("; ")}`);
  return liveRecord;
}

async function readSourceRecord(root, readFileImpl) {
  const relativePath = "web/data/launch.json";
  const contents = await readFileImpl(atRoot(root, relativePath), "utf8");
  try {
    return JSON.parse(contents);
  } catch {
    throw new Error(`Invalid JSON in ${relativePath}`);
  }
}

export async function buildLiveRecordFile({
  root = PROJECT_ROOT,
  verifiedAt,
  readFileImpl = readFile,
  writeFileImpl = writeFile,
} = {}) {
  const prelaunchRecord = await readSourceRecord(root, readFileImpl);
  const { mintProof, launchlabProof } = await loadCanonicalProofArtifacts({ root, readFileImpl });
  const liveRecord = buildLiveRecord({ prelaunchRecord, mintProof, launchlabProof, verifiedAt });
  await writeFileImpl(
    atRoot(root, "web/data/launch.json"),
    `${JSON.stringify(liveRecord, null, 2)}\n`,
    "utf8",
  );
  return liveRecord;
}

export function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== "--verified-at" || !argv[1]) {
    throw new Error("Usage: npm run build:live-record -- --verified-at <exact-ISO-8601-timestamp>");
  }
  return { verifiedAt: argv[1] };
}

export async function main({
  argv = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  root = PROJECT_ROOT,
} = {}) {
  try {
    const { verifiedAt } = parseArguments(argv);
    const record = await buildLiveRecordFile({ root, verifiedAt });
    stdout.write(`${JSON.stringify({
      ok: true,
      output: "web/data/launch.json",
      mint: record.proof.mint,
      verifiedAt: record.proof.verifiedAt,
    }, null, 2)}\n`);
    return 0;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    stderr.write(`${JSON.stringify({ ok: false, error: detail }, null, 2)}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) process.exitCode = await main();
