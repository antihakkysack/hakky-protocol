import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { VersionedTransaction } from "@solana/web3.js";
import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
import {
  buildApprovalEnvelope,
  decodeUnsignedLaunchTransaction,
  evaluateLaunchPreview,
} from "../src/launchlab-preview.mjs";
import {
  fetchPreviewState,
  fetchUnsignedLookupTables,
  simulatePreview,
} from "../src/launchlab-rpc.mjs";
import {
  METADATA_MANIFEST_PATH,
  METADATA_READBACK_PATH,
  assertMetadataManifestV1,
  assertMetadataReadbackV1,
  readCanonicalArtifact,
  resolveRepositoryPath,
  serializeMetadataManifest,
  serializeMetadataReadback,
} from "../src/metadata-integrity.mjs";
import {
  MAINNET_SESSION_PATHS,
  readMainnetSessionJson,
  writeMainnetSessionJson,
} from "../src/mainnet-session-artifact.mjs";
import {
  DEFAULT_PUBLIC_MAINNET_RPC,
  createBoundedPublicRpcClient,
  parsePublicRpcUrl,
} from "../src/solana-rpc.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const USAGE = `Usage: npm run verify:launch-preview -- --transaction ${MAINNET_SESSION_PATHS.unsignedTransaction} --creator <public-key> --metadata-manifest ${METADATA_MANIFEST_PATH} --metadata-readback ${METADATA_READBACK_PATH} --official-origin ${MAINNET_SESSION_PATHS.officialOrigin} --wallet-readiness ${MAINNET_SESSION_PATHS.walletReadiness} --out ${MAINNET_SESSION_PATHS.preview}`;

function fixed(value, expected) {
  if (value !== expected) throw new Error(USAGE);
}

export function parsePreviewOptions(argv) {
  return parseExactCliOptions(argv, {
    usage: USAGE,
    definitions: [
      {
        flag: "--transaction",
        key: "transactionPath",
        validate(value) { fixed(value, MAINNET_SESSION_PATHS.unsignedTransaction); },
      },
      { flag: "--creator", key: "creator" },
      {
        flag: "--metadata-manifest",
        key: "metadataManifestPath",
        validate(value) { fixed(value, METADATA_MANIFEST_PATH); },
      },
      {
        flag: "--metadata-readback",
        key: "metadataReadbackPath",
        validate(value) { fixed(value, METADATA_READBACK_PATH); },
      },
      {
        flag: "--official-origin",
        key: "officialOriginPath",
        validate(value) { fixed(value, MAINNET_SESSION_PATHS.officialOrigin); },
      },
      {
        flag: "--wallet-readiness",
        key: "walletReadinessPath",
        validate(value) { fixed(value, MAINNET_SESSION_PATHS.walletReadiness); },
      },
      {
        flag: "--out",
        key: "outputPath",
        validate(value) { fixed(value, MAINNET_SESSION_PATHS.preview); },
      },
    ],
  });
}

async function readUnsignedTransaction(repositoryRoot, relativePath) {
  const outputPath = await resolveRepositoryPath(repositoryRoot, relativePath);
  const bytes = await readFile(outputPath);
  const serialized = bytes.toString("utf8");
  if (serialized.length === 0 || Buffer.from(serialized, "base64").toString("base64") !== serialized) {
    throw new Error("preview-cli-transaction-base64");
  }
  return serialized;
}

export async function runPreviewVerifier({
  argv = process.argv.slice(2),
  repositoryRoot = REPOSITORY_ROOT,
  rawRpcUrl = process.env.HAKKY_RPC_URL ?? DEFAULT_PUBLIC_MAINNET_RPC,
  createRpcClient = createBoundedPublicRpcClient,
  now = () => new Date(),
  writeImpl = writeMainnetSessionJson,
} = {}) {
  const options = parsePreviewOptions(argv);
  const [
    serialized,
    manifestArtifact,
    readbackArtifact,
    originArtifact,
    walletArtifact,
  ] = await Promise.all([
    readUnsignedTransaction(repositoryRoot, options.transactionPath),
    readCanonicalArtifact(
      repositoryRoot,
      options.metadataManifestPath,
      serializeMetadataManifest,
      assertMetadataManifestV1,
    ),
    readCanonicalArtifact(
      repositoryRoot,
      options.metadataReadbackPath,
      serializeMetadataReadback,
      (value) => value,
    ),
    readMainnetSessionJson({
      repositoryRoot,
      relativePath: options.officialOriginPath,
    }),
    readMainnetSessionJson({
      repositoryRoot,
      relativePath: options.walletReadinessPath,
    }),
  ]);
  assertMetadataReadbackV1({
    manifest: manifestArtifact.value,
    readback: readbackArtifact.value,
  });
  let transaction;
  try {
    transaction = VersionedTransaction.deserialize(Buffer.from(serialized, "base64"));
  } catch {
    throw new Error("preview-cli-transaction-wire");
  }
  const rpc = parsePublicRpcUrl(rawRpcUrl);
  const rpcClient = createRpcClient({ rawUrl: rpc.url });
  if (rpcClient.hostname !== rpc.hostname) throw new Error("preview-cli-rpc-host");
  const lookup = await fetchUnsignedLookupTables({
    rpcClient,
    transactionMessage: transaction.message,
  });
  const preview = decodeUnsignedLaunchTransaction({
    serialized,
    lookupTableAccounts: lookup.lookupTableAccounts,
    lookupBarrierSlot: lookup.lookupBarrierSlot,
  });
  const preStateBarrier = Math.max(
    walletArtifact.value.finalizedSlot,
    lookup.lookupBarrierSlot,
  );
  const state = await fetchPreviewState({
    rpcClient,
    normalizedPreview: preview,
    minimumSlot: preStateBarrier,
  });
  const simulationBarrier = Math.max(preStateBarrier, state.contextSlot);
  const rawSimulation = await simulatePreview({
    rpcClient,
    canonicalBase64: preview.canonicalBase64,
    accountAddresses: preview.requiredAccountAddresses,
    minContextSlot: simulationBarrier,
  });
  const simulation = {
    ...rawSimulation,
    checkedAt: now().toISOString(),
    canonicalBase64: preview.canonicalBase64,
    replaceRecentBlockhash: false,
  };
  const evaluation = evaluateLaunchPreview({
    preview,
    state,
    simulation,
    metadataManifest: manifestArtifact.value,
    metadataReadback: readbackArtifact.value,
    officialOriginReceipt: originArtifact.value,
    walletReadinessReceipt: walletArtifact.value,
    creator: options.creator,
  });
  if (evaluation.ok !== true) {
    throw new Error(evaluation.coverage.code);
  }
  const envelope = buildApprovalEnvelope(evaluation);
  await writeImpl({
    repositoryRoot,
    relativePath: options.outputPath,
    value: evaluation,
  });
  await writeImpl({
    repositoryRoot,
    relativePath: MAINNET_SESSION_PATHS.approvalEnvelope,
    value: envelope,
  });
  return { evaluation, envelope };
}

function publicError(error) {
  const message = error instanceof Error ? error.message : "";
  return /^(?:source-coverage-unavailable|source-coverage-query-rejected|launch-preview-|launchlab-rpc-|preview-cli-|rpc-url-|mainnet-session-|Usage:)/u.test(message)
    ? message
    : "LaunchLab preview verification failed.";
}

export async function main({
  runImpl = runPreviewVerifier,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const result = await runImpl();
    stdout.write(`${JSON.stringify(result.evaluation, null, 2)}\n`);
    return result.evaluation.ok === true ? 0 : 1;
  } catch (error) {
    stderr.write(`${publicError(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
