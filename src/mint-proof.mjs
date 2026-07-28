import { PublicKey } from "@solana/web3.js";
import { createHash } from "node:crypto";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assertSchema } from "./schema-validation.mjs";
import { deriveLaunchlabAuthorityPda } from "./raydium-launchlab.mjs";
import { encodeBase58 } from "./solana-transaction.mjs";
import { METAPLEX_METADATA_PROGRAM_ID } from "./metaplex-metadata.mjs";

const SUPPLY = "10000000000000";
const DECIMALS = 6;

function fail(code) {
  throw new Error(code);
}

function canonicalKey(value, code) {
  try {
    if (typeof value !== "string" || new PublicKey(value).toBase58() !== value) fail(code);
    return value;
  } catch {
    fail(code);
  }
}

function requireTrue(value, code) {
  if (!value) fail(code);
  return true;
}

function exactChronology(evidence) {
  const { creationTime, finalizedAt, checkedAt } = evidence.observation;
  const creatorAt = evidence.creatorBalance.finalizedAt;
  requireTrue(
    typeof creationTime === "string" && creationTime <= creatorAt
      && creatorAt <= finalizedAt && finalizedAt <= checkedAt,
    "mint-chronology",
  );
}

function digest(bytes) {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

function validateCreatorAccounts(evidence, mint, creator) {
  const accounts = evidence.creatorBalance?.accounts;
  if (!Array.isArray(accounts)) fail("mint-creator-accounts");
  let previous = null;
  let total = 0n;
  const seen = new Set();
  for (const account of accounts) {
    if (!account || typeof account !== "object" || Array.isArray(account)
      || canonicalKey(account.address, "mint-creator-accounts") !== account.address
      || account.mint !== mint || account.owner !== creator
      || !/^(?:0|[1-9][0-9]*)$/u.test(account.amountBaseUnits)
      || !["initialized", "frozen"].includes(account.state)
      || !/^[0-9a-f]{64}$/u.test(account.accountSha256)
      || seen.has(account.address) || (previous !== null && account.address <= previous)) {
      fail("mint-creator-accounts");
    }
    seen.add(account.address);
    previous = account.address;
    total += BigInt(account.amountBaseUnits);
  }
  if (evidence.creatorBalance.owner !== creator
    || evidence.creatorBalance.totalAmountBaseUnits !== total.toString()) fail("mint-creator-accounts");
  return total;
}

function validateExecution(evidence) {
  const creation = evidence.creation;
  const execution = creation?.creationExecution;
  const expectedKeys = [
    "slot",
    "outerInstructionIndex",
    "innerInstructionIndex",
    "stackHeight",
    "programId",
    "accountKeys",
    "dataBase58",
    "metadataPreBalance",
    "metadataPostBalance",
    "loadedAddresses",
  ];
  if (!execution || Object.keys(execution).join(",") !== expectedKeys.join(",")
    || execution.slot !== evidence.observation.creationSlot
    || execution.slot !== creation.slot
    || execution.outerInstructionIndex !== creation.outerInstructionIndex
    || execution.innerInstructionIndex !== creation.metadataInnerInstructionIndex
    || execution.stackHeight !== 2
    || execution.programId !== METAPLEX_METADATA_PROGRAM_ID
    || JSON.stringify(execution.accountKeys) !== JSON.stringify(creation.metadataCpi.accountKeys)
    || execution.dataBase58 !== encodeBase58(creation.metadataCpiBytes)
    || execution.metadataPreBalance !== "0"
    || !/^[1-9][0-9]*$/u.test(execution.metadataPostBalance)
    || !execution.loadedAddresses
    || Object.keys(execution.loadedAddresses).join(",") !== "writable,readonly"
    || JSON.stringify(execution.loadedAddresses) !== JSON.stringify(creation.loadedAddresses)) {
    fail("mint-execution-record");
  }
}

export function evaluateMintEvidenceV2(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) fail("mint-evidence");
  const mint = canonicalKey(evidence.mintAddress, "mint-address");
  const creator = canonicalKey(evidence.creatorAddress, "creator-address");
  const metadataAccount = canonicalKey(evidence.metadataAddress, "metadata-address");
  const creation = evidence.creation;
  const launchlabAuthority = deriveLaunchlabAuthorityPda().publicKey;
  const manifest = evidence.metadataManifest;
  const onchain = evidence.metadataAccount;
  exactChronology(evidence);
  const creatorTotal = validateCreatorAccounts(evidence, mint, creator);
  requireTrue(
    Buffer.isBuffer(creation?.wireBytes) || creation?.wireBytes instanceof Uint8Array,
    "mint-transaction-bytes",
  );
  requireTrue(
    Buffer.isBuffer(creation?.metadataCpiBytes) || creation?.metadataCpiBytes instanceof Uint8Array,
    "mint-cpi-bytes",
  );
  validateExecution(evidence);
  requireTrue(
    evidence.observation.creationTransactionSha256 === digest(creation.wireBytes)
      && evidence.observation.metadataCreateCpiSha256 === digest(creation.metadataCpiBytes)
      && evidence.observation.creationExecutionSha256
        === digest(Buffer.from(JSON.stringify(creation.creationExecution), "utf8")),
    "mint-observation-hash",
  );
  const checks = {
    mainnetGenesis: requireTrue(
      evidence.network === "mainnet-beta"
        && evidence.genesisHash === "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
      "mint-mainnet",
    ),
    creationTransaction: requireTrue(
      creation?.creation?.accounts?.mint === mint
        && creation.creation.accounts.creator === creator
        && creation.creation.accounts.metadataAccount === metadataAccount,
      "mint-creation-transaction",
    ),
    validSignatures: requireTrue(creation?.requestedSignature === evidence.creationSignature, "mint-signatures"),
    sourcePinnedAccountMetas: requireTrue(Boolean(creation?.sourceMetas), "mint-source-metas"),
    atomicImmutableMetadata: requireTrue(
      creation?.metadataCpi?.data?.isMutable === false
        && creation.metadataCpi.data.uri === manifest.metadata.uri,
      "mint-atomic-metadata",
    ),
    metadataAccountCreated: requireTrue(
      creation.creationExecution.metadataPreBalance === "0"
        && BigInt(creation.creationExecution.metadataPostBalance) > 0n,
      "mint-metadata-created",
    ),
    classicTokenProgram: requireTrue(
      evidence.mint?.tokenProgram === TOKEN_PROGRAM_ID.toBase58(),
      "mint-token-program",
    ),
    exactSupply: requireTrue(
      evidence.mint?.supply === SUPPLY && evidence.mint.decimals === DECIMALS && evidence.mint.isInitialized === true,
      "mint-supply",
    ),
    launchlabAuthority: requireTrue(evidence.mint?.mintAuthority === launchlabAuthority, "mint-authority"),
    nullFreezeAuthority: requireTrue(evidence.mint?.freezeAuthority === null, "mint-freeze-authority"),
    zeroCreatorBalance: requireTrue(creatorTotal === 0n, "mint-creator-balance"),
    immutableMetadataPostState: requireTrue(
      onchain?.isMutable === false && onchain?.primarySaleHappened === false
        && onchain?.name === "Hakky Protocol" && onchain?.symbol === "HAKKY"
        && onchain?.uri === manifest.metadata.uri && onchain?.updateAuthority === creation.metadataCpi.accounts.updateAuthority,
      "mint-metadata-post-state",
    ),
    metadataDigestMatch: requireTrue(
      onchain?.accountSha256 && manifest?.metadata?.sha256 === evidence.metadataReadback?.metadata?.sha256
        && manifest?.image?.sha256 === evidence.metadataReadback?.image?.sha256,
      "mint-metadata-digest",
    ),
    finalized: requireTrue(
      Number.isSafeInteger(evidence.observation?.finalizedSlot)
        && evidence.observation.finalizedSlot >= evidence.creatorBalance.finalizedSlot
        && evidence.creatorBalance.finalizedSlot >= evidence.observation.creationSlot,
      "mint-finalized",
    ),
  };
  const metadataJson = {
    name: "Hakky Protocol",
    symbol: "HAKKY",
    uri: manifest.metadata.uri,
    metadataAccount,
    metadataAccountSha256: onchain.accountSha256,
    jsonSha256: manifest.metadata.sha256,
    imageUri: manifest.image.uri,
    imageSha256: manifest.image.sha256,
    externalUrl: "https://hakky.xyz",
    twitter: "https://x.com/antihakkysack",
    updateAuthority: onchain.updateAuthority,
    isMutable: false,
  };
  const proof = {
    schemaVersion: 2,
    network: "mainnet-beta",
    identities: {
      mint,
      creator,
      metadataAccount,
      launchId: creation.creation.accounts.launchId,
      launchlabAuthority,
    },
    supply: {
      baseUnits: SUPPLY,
      uiAmount: "10000000",
      decimals: DECIMALS,
      tokenProgram: TOKEN_PROGRAM_ID.toBase58(),
    },
    authorities: {
      mintAuthority: launchlabAuthority,
      authorityKind: "launchlab-program-pda",
      freezeAuthority: null,
    },
    creatorBalance: evidence.creatorBalance,
    metadata: metadataJson,
    observation: {
      genesisHash: evidence.genesisHash,
      creationSignature: evidence.creationSignature,
      creationSlot: evidence.observation.creationSlot,
      creationTime: evidence.observation.creationTime,
      creationTransactionSha256: evidence.observation.creationTransactionSha256,
      metadataCreateCpiSha256: evidence.observation.metadataCreateCpiSha256,
      creationExecutionSha256: evidence.observation.creationExecutionSha256,
      mintAccountSha256: evidence.mint.accountSha256,
      metadataAccountSha256: onchain.accountSha256,
      finalizedSlot: evidence.observation.finalizedSlot,
      finalizedAt: evidence.observation.finalizedAt,
      checkedAt: evidence.observation.checkedAt,
      rpcHost: evidence.rpcHost,
    },
    checks,
    ok: true,
  };
  assertSchema("mint-v2", proof);
  return proof;
}

// No v1/null-authority fallback remains.
export const evaluateMintEvidence = evaluateMintEvidenceV2;
