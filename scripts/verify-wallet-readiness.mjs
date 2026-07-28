import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
import {
  METADATA_MANIFEST_PATH,
  METADATA_READBACK_PATH,
  assertMetadataManifestV1,
  assertMetadataReadbackV1,
  readCanonicalArtifact,
  serializeMetadataManifest,
  serializeMetadataReadback,
} from "../src/metadata-integrity.mjs";
import {
  MAINNET_SESSION_PATHS,
  serializeMainnetSessionJson,
  writeMainnetSessionJson,
} from "../src/mainnet-session-artifact.mjs";
import {
  DEFAULT_PUBLIC_MAINNET_RPC,
  createBoundedPublicRpcClient,
  parsePublicRpcUrl,
} from "../src/solana-rpc.mjs";
import { fetchWalletReadiness } from "../src/wallet-readiness.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const REQUIRED_LAMPORTS = 1_000_000_000;
const USAGE = `Usage: npm run verify:wallet-readiness -- --creator <public-key> --metadata-readback ${METADATA_READBACK_PATH} --out ${MAINNET_SESSION_PATHS.walletReadiness}`;

export function parseWalletOptions(argv) {
  return parseExactCliOptions(argv, {
    usage: USAGE,
    definitions: [
      { flag: "--creator", key: "creator" },
      {
        flag: "--metadata-readback",
        key: "metadataReadbackPath",
        validate(value) {
          if (value !== METADATA_READBACK_PATH) throw new Error(USAGE);
        },
      },
      {
        flag: "--out",
        key: "outputPath",
        validate(value) {
          if (value !== MAINNET_SESSION_PATHS.walletReadiness) throw new Error(USAGE);
        },
      },
    ],
  });
}

export async function runWalletVerifier({
  argv = process.argv.slice(2),
  repositoryRoot = REPOSITORY_ROOT,
  rawRpcUrl = process.env.HAKKY_RPC_URL ?? DEFAULT_PUBLIC_MAINNET_RPC,
  createRpcClient = createBoundedPublicRpcClient,
  now = () => new Date(),
  writeImpl = writeMainnetSessionJson,
} = {}) {
  const options = parseWalletOptions(argv);
  const [manifestArtifact, readbackArtifact] = await Promise.all([
    readCanonicalArtifact(
      repositoryRoot,
      METADATA_MANIFEST_PATH,
      serializeMetadataManifest,
      assertMetadataManifestV1,
    ),
    readCanonicalArtifact(
      repositoryRoot,
      options.metadataReadbackPath,
      serializeMetadataReadback,
      (value) => value,
    ),
  ]);
  assertMetadataReadbackV1({
    manifest: manifestArtifact.value,
    readback: readbackArtifact.value,
  });
  const rpc = parsePublicRpcUrl(rawRpcUrl);
  const rpcClient = createRpcClient({ rawUrl: rpc.url });
  if (rpcClient.hostname !== rpc.hostname) throw new Error("wallet-cli-rpc-host");
  const receipt = await fetchWalletReadiness({
    rpcClient,
    creatorAddress: options.creator,
    requiredLamports: REQUIRED_LAMPORTS,
    checkedAt: now().toISOString(),
  });
  await writeImpl({
    repositoryRoot,
    relativePath: options.outputPath,
    value: receipt,
  });
  return receipt;
}

function publicError(error) {
  const message = error instanceof Error ? error.message : "";
  return /^(?:wallet-readiness-|wallet-cli-|rpc-url-|mainnet-session-|Usage:)/u.test(message)
    ? message
    : "Wallet readiness verification failed.";
}

export async function main({
  runImpl = runWalletVerifier,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const receipt = await runImpl();
    stdout.write(serializeMainnetSessionJson(receipt));
    return receipt.ok === true ? 0 : 1;
  } catch (error) {
    stderr.write(`${publicError(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}

