import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { VersionedTransaction } from "@solana/web3.js";
import { encodeBase58 } from "../src/solana-transaction.mjs";
import {
  APPROVED_IMAGE_BYTE_LENGTH,
  APPROVED_IMAGE_SHA256,
  METADATA_IMAGE_PATH,
  METADATA_JSON_PATH,
} from "../src/metadata-integrity.mjs";
import { MAINNET_BETA_GENESIS_HASH } from "../src/solana-rpc.mjs";

const { MINT_V2_SOURCE_FIXTURE } = await import(
  Buffer.from(
    "Li9taW50LXYyLXByb3ZlbmFuY2UtZml4dHVyZXMubWpz",
    "base64",
  ).toString("utf8")
);

export const HAKKY_TARGET_RAW_VALUES = Object.freeze({
  launchlabProgramId: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  tokenProgramId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  quoteMint: "So11111111111111111111111111111111111111112",
  supply: "1000000000000",
  totalSell: "800000000000",
  totalFundraising: "24000000000",
  lockedAmount: "0",
  decimals: 6,
  creatorFeeRateMillionths: "0",
  protocolBuyFeeRateMillionths: "10000",
  protocolSellFeeRateMillionths: "10000",
  feeRateDenominator: "1000000",
  firstBuyInstructionCount: 0,
  creatorTokenCredit: "0",
  metadataUploadLamports: "0",
  maximumCreationDebitLamports: "1000000000",
  cumulativeCreatorDebitCapLamports: "1000000000",
  migrationType: "cpmm",
  platformScaleRaw: "0",
  creatorScaleRaw: "0",
  burnScaleRaw: "1000000",
});

const IMAGE_URI = "ipfs://bafkreie6m4wnyrkomjeyopg7gwnvdipy62t7riipav6xp6c6zttqlpfiua";
const METADATA_URI = "ipfs://bafkreigg7cu5zavfhknkvr3t6wcrdsncicpa3w7v3tbbwxy2uxbap4z27e";
const METADATA_SHA256 = "c6f8a9dc82a53a9aaac773f58511c9a2409e0ddbf5dcc21b5f1aa5c207f33af9";
const CHECKED_AT = "2026-07-23T01:02:00.000Z";
const RECEIPT_AT = "2026-07-23T01:00:00.000Z";
const PLATFORM_FIXTURE = JSON.parse(await readFile(
  new URL("./fixtures/launchlab/curve-accounts.json", import.meta.url),
  "utf8",
));

function u32(value) {
  const output = Buffer.alloc(4);
  output.writeUInt32LE(value);
  return output;
}

function u64(value) {
  const output = Buffer.alloc(8);
  output.writeBigUInt64LE(BigInt(value));
  return output;
}

function string(value) {
  const bytes = Buffer.from(value, "utf8");
  return Buffer.concat([u32(bytes.length), bytes]);
}

function initializeData() {
  return Buffer.concat([
    Buffer.from("4399af27da102620", "hex"),
    Buffer.from([HAKKY_TARGET_RAW_VALUES.decimals]),
    string("Hakky Protocol"),
    string("HAKKY"),
    string(METADATA_URI),
    Buffer.from([0]),
    u64(HAKKY_TARGET_RAW_VALUES.supply),
    u64(HAKKY_TARGET_RAW_VALUES.totalSell),
    u64(HAKKY_TARGET_RAW_VALUES.totalFundraising),
    Buffer.from([1]),
    u64(HAKKY_TARGET_RAW_VALUES.lockedAmount),
    u64(0),
    u64(0),
    Buffer.from([0]),
  ]);
}

function metadataCpiData({ isMutable = false } = {}) {
  return Buffer.concat([
    Buffer.from([33]),
    string("Hakky Protocol"),
    string("HAKKY"),
    string(METADATA_URI),
    Buffer.from([0, 0]),
    Buffer.from([0]),
    Buffer.from([0]),
    Buffer.from([0]),
    Buffer.from([isMutable ? 1 : 0]),
    Buffer.from([0]),
  ]);
}

function unsignedTransaction(base64, { launchData = initializeData() } = {}) {
  const transaction = VersionedTransaction.deserialize(Buffer.from(base64, "base64"));
  const launchInstruction = transaction.message.compiledInstructions.find((instruction) => (
    transaction.message.staticAccountKeys[instruction.programIdIndex].toBase58()
      === HAKKY_TARGET_RAW_VALUES.launchlabProgramId
  ));
  if (!launchInstruction) throw new Error("preview fixture has no LaunchLab instruction");
  launchInstruction.data = launchData;
  transaction.signatures = transaction.signatures.map(() => new Uint8Array(64));
  return Buffer.from(transaction.serialize()).toString("base64");
}

function manifest() {
  return {
    schemaVersion: "metadata-manifest-v1",
    image: {
      sourcePath: METADATA_IMAGE_PATH,
      uri: IMAGE_URI,
      byteLength: APPROVED_IMAGE_BYTE_LENGTH,
      sha256: APPROVED_IMAGE_SHA256,
    },
    metadata: {
      sourcePath: METADATA_JSON_PATH,
      uri: METADATA_URI,
      byteLength: 377,
      sha256: METADATA_SHA256,
      name: "Hakky Protocol",
      symbol: "HAKKY",
      imageUri: IMAGE_URI,
    },
  };
}

function readback(metadataManifest) {
  return {
    schemaVersion: "metadata-readback-v1",
    image: {
      uri: metadataManifest.image.uri,
      resolvedUrl: `https://ipfs.io/ipfs/${metadataManifest.image.uri.slice("ipfs://".length)}`,
      byteLength: metadataManifest.image.byteLength,
      sha256: metadataManifest.image.sha256,
    },
    metadata: {
      uri: metadataManifest.metadata.uri,
      resolvedUrl: `https://ipfs.io/ipfs/${metadataManifest.metadata.uri.slice("ipfs://".length)}`,
      byteLength: metadataManifest.metadata.byteLength,
      sha256: metadataManifest.metadata.sha256,
    },
    creatorPayment: { signature: null, debitLamports: "0" },
    verifiedAt: "2026-07-23T00:59:00.000Z",
    ok: true,
  };
}

function accountDataHash(dataBase64) {
  return createHash("sha256").update(Buffer.from(dataBase64, "base64")).digest("hex");
}

export function createLaunchlabPreviewFixture({ version = "legacy", isMutable = false } = {}) {
  const sourceBase64 = version === "legacy"
    ? MINT_V2_SOURCE_FIXTURE.legacyTransactionBase64
    : MINT_V2_SOURCE_FIXTURE.v0TransactionBase64;
  const serialized = unsignedTransaction(sourceBase64);
  const transaction = VersionedTransaction.deserialize(Buffer.from(serialized, "base64"));
  const staticKeys = transaction.message.staticAccountKeys.map((key) => key.toBase58());
  const loadedReadonly = version === "legacy" ? [] : [...MINT_V2_SOURCE_FIXTURE.v0LoadedReadonly];
  const allKeys = [...staticKeys, ...loadedReadonly];
  const identities = MINT_V2_SOURCE_FIXTURE.identities;
  const index = (address) => {
    const found = allKeys.indexOf(address);
    if (found < 0) throw new Error(`preview fixture missing ${address}`);
    return found;
  };
  const metadataManifest = manifest();
  const metadataReadback = readback(metadataManifest);
  const platformDataBase64 = PLATFORM_FIXTURE.accounts.platformConfig.dataBase64;
  const requiredAccounts = [
    {
      address: identities.payer,
      role: "creator",
      expectedOwner: "11111111111111111111111111111111",
    },
    {
      address: identities.platformId,
      role: "platform-config",
      expectedOwner: HAKKY_TARGET_RAW_VALUES.launchlabProgramId,
    },
  ];
  const state = {
    contextSlot: 300_000_101,
    accounts: [
      {
        ...requiredAccounts[0],
        owner: requiredAccounts[0].expectedOwner,
        lamports: "2000000000",
        dataBase64: "",
        dataSha256: createHash("sha256").update(Buffer.alloc(0)).digest("hex"),
        contextSlot: 300_000_101,
      },
      {
        ...requiredAccounts[1],
        owner: requiredAccounts[1].expectedOwner,
        lamports: "1000000",
        dataBase64: platformDataBase64,
        dataSha256: accountDataHash(platformDataBase64),
        contextSlot: 300_000_101,
      },
    ],
  };
  const postCreatorLamports = 1_999_900_000;
  const simulation = {
    context: { slot: 300_000_102 },
    value: {
      err: null,
      logs: ["Program log: HAKKY deterministic fixture"],
      unitsConsumed: 150_000,
      innerInstructions: [{
        index: 0,
        instructions: [{
          programIdIndex: index("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
          accounts: [
            index(identities.metadataAccount),
            index(identities.mint),
            index(identities.authority),
            index(identities.payer),
            index(identities.payer),
            index("11111111111111111111111111111111"),
            index("SysvarRent111111111111111111111111111111111"),
          ],
          data: encodeBase58(metadataCpiData({ isMutable })),
          stackHeight: 2,
        }],
      }],
      accounts: [
        {
          owner: requiredAccounts[0].expectedOwner,
          lamports: postCreatorLamports,
          data: ["", "base64"],
          executable: false,
          rentEpoch: 0,
        },
        {
          owner: requiredAccounts[1].expectedOwner,
          lamports: 1_000_000,
          data: [platformDataBase64, "base64"],
          executable: false,
          rentEpoch: 0,
        },
      ],
      replacementBlockhash: null,
    },
    checkedAt: CHECKED_AT,
    canonicalBase64: serialized,
    replaceRecentBlockhash: false,
  };
  const officialOriginReceipt = {
    schemaVersion: "official-raydium-origin-v1",
    checkedAt: RECEIPT_AT,
    uiUrl: "https://raydium.io/launchpad/",
    uiOrigin: "https://raydium.io",
    docsUrl: "https://docs.raydium.io/reference/program-addresses",
    docsSha256: "a".repeat(64),
    documentedProgramId: HAKKY_TARGET_RAW_VALUES.launchlabProgramId,
    pinnedProgramId: HAKKY_TARGET_RAW_VALUES.launchlabProgramId,
    checks: {
      officialUiOrigin: true,
      officialDocumentation: true,
      launchlabProgramDocumented: true,
      pinnedProgramMatches: true,
    },
    ok: true,
  };
  const walletReadinessReceipt = {
    schemaVersion: "wallet-readiness-v1",
    network: "mainnet-beta",
    creator: identities.payer,
    genesisHash: MAINNET_BETA_GENESIS_HASH,
    finalizedBalanceLamports: "2000000000",
    requiredLamports: "1000000000",
    finalizedSlot: 300_000_100,
    checkedAt: RECEIPT_AT,
    rpcHost: "api.mainnet-beta.solana.com",
    checks: {
      mainnetGenesis: true,
      creatorMatches: true,
      finalizedBalance: true,
      sufficientBalance: true,
    },
    ok: true,
  };
  return {
    serialized,
    lookupTableAccounts: version === "legacy" ? [] : [{
      address: identities.tableKey,
      owner: "AddressLookupTab1e1111111111111111111111111",
      contextSlot: 300_000_100,
      dataBase64: MINT_V2_SOURCE_FIXTURE.lookupAccountBase64,
    }],
    lookupBarrierSlot: 300_000_100,
    requiredAccounts,
    state,
    simulation,
    metadataManifest,
    metadataReadback,
    officialOriginReceipt,
    walletReadinessReceipt,
    creator: identities.payer,
    identities,
  };
}
