import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PublicKey, TransactionMessage } from "@solana/web3.js";

import {
  DEPLOYMENT_WRITE_CHUNK_BYTES,
  DEVNET_GENESIS_HASH,
  PRIORITY_MICRO_LAMPORTS_PER_COMPUTE_UNIT,
  buildCostLedger,
  serializeCostLedger,
} from "../src/cost-ledger.mjs";
import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
import { HAKKY_RELEASE_CONFIG_V1 } from "../src/hakky-release-config.generated.mjs";
import { resolveRepositoryPath } from "../src/metadata-integrity.mjs";
import {
  serializeBuildRecord,
} from "../src/release-manifest.mjs";
import { createBoundedPublicRpcClient } from "../src/solana-rpc.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(
  new URL("../", import.meta.url),
);
const BUILD_RECORD_PATTERN =
  /^artifacts\/build\/candidate\/[a-z0-9][a-z0-9-]*\/build-record\.json$/u;
const DEVNET_RPC_URL = "https://api.devnet.solana.com/";
export const COST_LEDGER_PATH =
  "artifacts/cost/cost-ledger-v1.json";
const USAGE =
  "Usage: node scripts/build-cost-ledger.mjs --build-record artifacts/build/candidate/<id>/build-record.json --network devnet";

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseCostLedgerOptions(argv) {
  return parseExactCliOptions(argv, {
    usage: USAGE,
    definitions: [
      {
        flag: "--build-record",
        key: "buildRecordPath",
        validate(value) {
          if (!BUILD_RECORD_PATTERN.test(value)) {
            throw new Error(
              "Cost build record must be one canonical candidate path",
            );
          }
        },
      },
      {
        flag: "--network",
        key: "network",
        validate(value) {
          if (value !== "devnet") {
            throw new Error("Cost collection network must be devnet");
          }
        },
      },
    ],
  });
}

function safeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`cost-rpc-${name}-invalid`);
  }
  return value;
}

function contextValue(value, name) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "context,value" ||
    value.context === null ||
    typeof value.context !== "object" ||
    Array.isArray(value.context) ||
    !Number.isSafeInteger(value.context.slot) ||
    value.context.slot < 0
  ) {
    throw new Error(`cost-rpc-${name}-invalid`);
  }
  return { slot: value.context.slot, value: value.value };
}

async function readBoundBuild(repositoryRoot, relativePath) {
  if (!BUILD_RECORD_PATTERN.test(relativePath)) {
    throw new Error("cost-build-binding-invalid");
  }
  const buildDirectory = path.posix.dirname(relativePath);
  const executableRelativePath =
    `${buildDirectory}/hakky_market.so`;
  const recordPath = await resolveRepositoryPath(
    repositoryRoot,
    relativePath,
  );
  const executablePath = await resolveRepositoryPath(
    repositoryRoot,
    executableRelativePath,
  );
  const [recordBytes, executable] = await Promise.all([
    readFile(recordPath),
    readFile(executablePath),
  ]);
  let record;
  try {
    record = JSON.parse(recordBytes.toString("utf8"));
  } catch {
    throw new Error("cost-build-binding-invalid");
  }
  let canonicalRecord;
  try {
    canonicalRecord = serializeBuildRecord(record);
  } catch {
    throw new Error("cost-build-binding-invalid");
  }
  if (
    !Buffer.from(recordBytes).equals(canonicalRecord) ||
    record.buildDirectory !== buildDirectory ||
    record.executable.path !== "hakky_market.so" ||
    record.executable.byteLength !== executable.byteLength ||
    record.executable.sha256 !== sha256Hex(executable)
  ) {
    throw new Error("cost-build-binding-invalid");
  }
  return {
    record,
    recordBytes,
    executable,
    executableRelativePath,
  };
}

async function collectRent(rpcClient, byteLength) {
  const value = await rpcClient.call(
    "getMinimumBalanceForRentExemption",
    [byteLength, { commitment: "finalized" }],
  );
  return safeInteger(value, `rent-${byteLength}`).toString();
}

function feeProbeMessage(recentBlockhash) {
  try {
    return Buffer.from(
      new TransactionMessage({
        payerKey: new PublicKey(HAKKY_RELEASE_CONFIG_V1.initializer),
        recentBlockhash,
        instructions: [],
      })
        .compileToLegacyMessage()
        .serialize(),
    ).toString("base64");
  } catch {
    throw new Error("cost-rpc-blockhash-invalid");
  }
}

async function collectSnapshot({
  build,
  buildRecordPath,
  rpcClient,
  now,
}) {
  const genesisHash = await rpcClient.call("getGenesisHash", []);
  if (genesisHash !== DEVNET_GENESIS_HASH) {
    throw new Error("cost-rpc-genesis-invalid");
  }
  const programDataBytes = build.executable.byteLength + 45;
  const [
    program36,
    programData,
    mint82,
    state384,
    token165,
    metadata679,
  ] = await Promise.all([
    collectRent(rpcClient, 36),
    collectRent(rpcClient, programDataBytes),
    collectRent(rpcClient, 82),
    collectRent(rpcClient, 384),
    collectRent(rpcClient, 165),
    collectRent(rpcClient, 679),
  ]);
  const latestContext = contextValue(
    await rpcClient.call("getLatestBlockhash", [
      { commitment: "finalized" },
    ]),
    "latest-blockhash",
  );
  const latest = latestContext.value;
  if (
    latest === null ||
    typeof latest !== "object" ||
    Array.isArray(latest) ||
    Object.keys(latest).sort().join(",") !==
      "blockhash,lastValidBlockHeight" ||
    typeof latest.blockhash !== "string" ||
    !Number.isSafeInteger(latest.lastValidBlockHeight) ||
    latest.lastValidBlockHeight < 0
  ) {
    throw new Error("cost-rpc-latest-blockhash-invalid");
  }
  const feeContext = contextValue(
    await rpcClient.call("getFeeForMessage", [
      feeProbeMessage(latest.blockhash),
      { commitment: "finalized" },
    ]),
    "fee",
  );
  const lamportsPerSignature = safeInteger(
    feeContext.value,
    "lamports-per-signature",
  );
  if (lamportsPerSignature < 1) {
    throw new Error("cost-rpc-lamports-per-signature-invalid");
  }
  const instant = typeof now === "function" ? now() : now;
  let collectedAt;
  try {
    collectedAt = instant.toISOString();
  } catch {
    throw new Error("cost-time-invalid");
  }
  return {
    schemaVersion: "hakky-cost-snapshot-v1",
    network: "devnet",
    genesisHash,
    commitment: "finalized",
    rpcHost: rpcClient.hostname,
    collectedAt,
    feeProbe: {
      latestBlockhash: latest.blockhash,
      latestBlockhashSlot: latestContext.slot,
      lastValidBlockHeight: latest.lastValidBlockHeight,
      feeSlot: feeContext.slot,
    },
    build: {
      recordPath: buildRecordPath,
      recordSha256: sha256Hex(build.recordBytes),
      executablePath: build.executableRelativePath,
      executableByteLength: build.executable.byteLength,
      executableSha256: sha256Hex(build.executable),
    },
    rent: {
      program36,
      programData: {
        byteLength: programDataBytes,
        lamports: programData,
      },
      mint82,
      state384,
      token165,
      metadata679,
    },
    fees: {
      lamportsPerSignature: lamportsPerSignature.toString(),
      priorityMicroLamportsPerComputeUnit:
        PRIORITY_MICRO_LAMPORTS_PER_COMPUTE_UNIT.toString(),
      computeUnitLimits: {
        deployCreateBuffer: 200_000,
        deployCreateProgram: 200_000,
        deployWrite: 200_000,
        deployFinalize: 200_000,
        initializeMarket: 1_400_000,
      },
    },
    deployment: {
      writeChunkBytes: DEPLOYMENT_WRITE_CHUNK_BYTES,
      writeTransactionCount: Math.ceil(
        build.executable.byteLength / DEPLOYMENT_WRITE_CHUNK_BYTES,
      ),
    },
    policy: {
      automaticRetries: 0,
      refundsNettedBeforeFinality: false,
      externalBuyerWsolIncluded: false,
    },
  };
}

async function publishLedger(repositoryRoot, bytes) {
  const outputPath = await resolveRepositoryPath(
    repositoryRoot,
    COST_LEDGER_PATH,
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  try {
    await writeFile(outputPath, bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = await readFile(outputPath);
    if (!Buffer.from(existing).equals(bytes)) {
      throw new Error("cost-ledger-conflict");
    }
  }
}

export async function runCostLedger({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  rpcClient,
  now = () => new Date(),
} = {}) {
  const options = parseCostLedgerOptions(argv);
  const build = await readBoundBuild(
    repositoryRoot,
    options.buildRecordPath,
  );
  const client =
    rpcClient ??
    createBoundedPublicRpcClient({ rawUrl: DEVNET_RPC_URL });
  if (
    client === null ||
    typeof client !== "object" ||
    typeof client.call !== "function" ||
    client.hostname !== "api.devnet.solana.com"
  ) {
    throw new Error("cost-rpc-client-invalid");
  }
  const snapshot = await collectSnapshot({
    build,
    buildRecordPath: options.buildRecordPath,
    rpcClient: client,
    now,
  });
  const ledger = buildCostLedger(snapshot, {
    evaluatedAt: snapshot.collectedAt,
  });
  await publishLedger(
    repositoryRoot,
    serializeCostLedger(ledger),
  );
  return ledger;
}

export async function main({
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const ledger = await runCostLedger();
    stdout.write(serializeCostLedger(ledger));
    return ledger.ok ? 0 : 1;
  } catch (error) {
    stderr.write(`${error?.message || "Cost ledger failed"}\n`);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  process.exitCode = await main();
}
