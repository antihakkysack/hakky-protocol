import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
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
} from "../src/mainnet-session-artifact.mjs";
import {
  assertSessionReceiptV1,
  buildRecoveryEnvelope,
  createSessionReceipt,
  recordPublicTransactionEvent,
  serializeSessionReceipt,
  writeSessionReceiptAtomic,
} from "../src/session-receipt.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const USAGE = [
  `Usage: npm run session:receipt -- init --preview ${MAINNET_SESSION_PATHS.preview} --metadata-manifest ${METADATA_MANIFEST_PATH} --metadata-readback ${METADATA_READBACK_PATH} --out ${MAINNET_SESSION_PATHS.sessionReceipt}`,
  `       npm run session:receipt -- record-status --receipt ${MAINNET_SESSION_PATHS.sessionReceipt} --event ${MAINNET_SESSION_PATHS.statusEvent} --out ${MAINNET_SESSION_PATHS.sessionReceipt}`,
  `       npm run session:receipt -- build-recovery --receipt ${MAINNET_SESSION_PATHS.sessionReceipt} --readback ${METADATA_READBACK_PATH} --transaction ${MAINNET_SESSION_PATHS.recoveryTransaction} --address-lookup-tables ${MAINNET_SESSION_PATHS.recoveryLookupTables} --simulation ${MAINNET_SESSION_PATHS.recoverySimulation} --fee-quote ${MAINNET_SESSION_PATHS.recoveryFeeQuote} --out ${MAINNET_SESSION_PATHS.recoveryEnvelope}`,
].join("\n");

function fixed(expected) {
  return (value) => {
    if (value !== expected) throw new Error(USAGE);
  };
}

export function parseSessionOptions(argv) {
  if (!Array.isArray(argv) || argv.length === 0) throw new Error(USAGE);
  const [command, ...rest] = argv;
  if (command === "init") {
    return {
      command,
      ...parseExactCliOptions(rest, {
        usage: USAGE,
        definitions: [
          { flag: "--preview", key: "previewPath", validate: fixed(MAINNET_SESSION_PATHS.preview) },
          { flag: "--metadata-manifest", key: "manifestPath", validate: fixed(METADATA_MANIFEST_PATH) },
          { flag: "--metadata-readback", key: "readbackPath", validate: fixed(METADATA_READBACK_PATH) },
          { flag: "--out", key: "outputPath", validate: fixed(MAINNET_SESSION_PATHS.sessionReceipt) },
        ],
      }),
    };
  }
  if (command === "record-status") {
    return {
      command,
      ...parseExactCliOptions(rest, {
        usage: USAGE,
        definitions: [
          { flag: "--receipt", key: "receiptPath", validate: fixed(MAINNET_SESSION_PATHS.sessionReceipt) },
          { flag: "--event", key: "eventPath", validate: fixed(MAINNET_SESSION_PATHS.statusEvent) },
          { flag: "--out", key: "outputPath", validate: fixed(MAINNET_SESSION_PATHS.sessionReceipt) },
        ],
      }),
    };
  }
  if (command === "build-recovery") {
    return {
      command,
      ...parseExactCliOptions(rest, {
        usage: USAGE,
        definitions: [
          { flag: "--receipt", key: "receiptPath", validate: fixed(MAINNET_SESSION_PATHS.sessionReceipt) },
          { flag: "--readback", key: "readbackPath", validate: fixed(METADATA_READBACK_PATH) },
          { flag: "--transaction", key: "transactionPath", validate: fixed(MAINNET_SESSION_PATHS.recoveryTransaction) },
          {
            flag: "--address-lookup-tables",
            key: "lookupTablesPath",
            validate: fixed(MAINNET_SESSION_PATHS.recoveryLookupTables),
          },
          { flag: "--simulation", key: "simulationPath", validate: fixed(MAINNET_SESSION_PATHS.recoverySimulation) },
          { flag: "--fee-quote", key: "feeQuotePath", validate: fixed(MAINNET_SESSION_PATHS.recoveryFeeQuote) },
          { flag: "--out", key: "outputPath", validate: fixed(MAINNET_SESSION_PATHS.recoveryEnvelope) },
        ],
      }),
    };
  }
  throw new Error(USAGE);
}

async function outputPath(repositoryRoot, relativePath) {
  return resolveRepositoryPath(path.resolve(repositoryRoot), relativePath);
}

async function writeReceipt(repositoryRoot, relativePath, receipt, writeImpl) {
  const resolved = await outputPath(repositoryRoot, relativePath);
  return writeImpl(resolved, receipt);
}

export async function runSessionReceipt({
  argv = process.argv.slice(2),
  repositoryRoot = REPOSITORY_ROOT,
  now = () => new Date(),
  writeImpl = writeSessionReceiptAtomic,
} = {}) {
  const options = parseSessionOptions(argv);
  if (options.command === "build-recovery") {
    return buildRecoveryEnvelope({
      receipt: null,
      readback: null,
      serializedTransaction: null,
      addressLookupTables: null,
      simulation: null,
      feeQuote: null,
      checkedAt: now().toISOString(),
    });
  }
  if (options.command === "init") {
    const [previewArtifact, manifestArtifact, readbackArtifact] = await Promise.all([
      readMainnetSessionJson({
        repositoryRoot,
        relativePath: options.previewPath,
      }),
      readCanonicalArtifact(
        repositoryRoot,
        options.manifestPath,
        serializeMetadataManifest,
        assertMetadataManifestV1,
      ),
      readCanonicalArtifact(
        repositoryRoot,
        options.readbackPath,
        serializeMetadataReadback,
        (value) => value,
      ),
    ]);
    assertMetadataReadbackV1({
      manifest: manifestArtifact.value,
      readback: readbackArtifact.value,
    });
    const receipt = createSessionReceipt({
      preview: previewArtifact.value,
      metadataManifest: manifestArtifact.value,
      metadataReadback: readbackArtifact.value,
      checkedAt: now().toISOString(),
    });
    await writeReceipt(repositoryRoot, options.outputPath, receipt, writeImpl);
    return receipt;
  }
  const [receiptArtifact, eventArtifact] = await Promise.all([
    readMainnetSessionJson({
      repositoryRoot,
      relativePath: options.receiptPath,
    }),
    readMainnetSessionJson({
      repositoryRoot,
      relativePath: options.eventPath,
    }),
  ]);
  assertSessionReceiptV1(receiptArtifact.value);
  const receipt = recordPublicTransactionEvent(receiptArtifact.value, eventArtifact.value);
  await writeReceipt(repositoryRoot, options.outputPath, receipt, writeImpl);
  return receipt;
}

function publicError(error) {
  const message = error instanceof Error ? error.message : "";
  return /^(?:recovery-operation-unsupported|session-receipt-|mainnet-session-|Usage:)/u.test(message)
    ? message
    : "Session receipt operation failed.";
}

export async function main({
  runImpl = runSessionReceipt,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const receipt = await runImpl();
    stdout.write(serializeSessionReceipt(receipt));
    return 0;
  } catch (error) {
    stderr.write(`${publicError(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
