import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import net from "node:net";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import {
  assertMetadataReadbackV1,
  buildMetadata,
  resolveRepositoryPath,
  serializeMetadata,
  verifyPublishedContent,
} from "./metadata-integrity.mjs";
import { decodeMetadataAccountV1, deriveMetadataPdas, METAPLEX_METADATA_PROGRAM_ID } from "./metaplex-metadata.mjs";
import { decodeBase58, resolveCreationTransaction } from "./solana-transaction.mjs";

export const MAINNET_BETA_GENESIS_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
export const DEFAULT_PUBLIC_MAINNET_RPC = "https://api.mainnet-beta.solana.com/";
const RPC_TIMEOUT_MS = 15_000;
const RPC_RESPONSE_CAP = 5_000_000;
const ALT_PROGRAM_ID = "AddressLookupTab1e1111111111111111111111111";
const BLOCKED_HOST_SUFFIXES = [".local", ".localhost", ".test", ".invalid", ".example"];
const BLOCKED_HOSTS = new Set([
  "localhost",
  "example.com",
  "example.net",
  "example.org",
]);

function fail(code) {
  throw new Error(code);
}

function canonicalPublicKey(value, code) {
  try {
    if (typeof value !== "string") fail(code);
    const key = new PublicKey(value);
    if (key.toBase58() !== value || key.toBytes().length !== 32) fail(code);
    return value;
  } catch {
    fail(code);
  }
}

function sha256Hex(bytes) {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

function awaitWithAbort(promise, signal, stage) {
  if (signal.aborted) return Promise.reject(new Error(`${stage}-timeout`));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new Error(`${stage}-timeout`));
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

async function cancelBody(response, signal, stage) {
  if (typeof response?.body?.cancel !== "function") return;
  try {
    await awaitWithAbort(response.body.cancel(), signal, stage);
  } catch {
    // Cleanup cannot replace or extend the fixed primary error.
  }
}

export function parsePublicRpcUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail("rpc-url-invalid");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash
    || (parsed.pathname !== "" && parsed.pathname !== "/") || parsed.port) fail("rpc-url-policy");
  const hostname = parsed.hostname.toLowerCase();
  const labels = hostname.split(".");
  if (net.isIP(hostname) !== 0 || BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".localhost")
    || BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
    || labels.some((label) => ["localhost", "local", "test", "invalid", "example"].includes(label))
    || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u.test(hostname)) {
    fail("rpc-url-host");
  }
  return Object.freeze({ url: `https://${hostname}/`, hostname });
}

async function readResponseBody(response, signal, stage) {
  const rawLength = response?.headers?.get?.("content-length");
  if (rawLength !== null && rawLength !== undefined) {
    if (!/^(?:0|[1-9][0-9]*)$/u.test(rawLength)) fail(`${stage}-content-length`);
    if (BigInt(rawLength) > BigInt(RPC_RESPONSE_CAP)) {
      await cancelBody(response, signal, stage);
      fail(`${stage}-response-too-large`);
    }
  }
  const reader = response?.body?.getReader?.();
  if (!reader) {
    if (rawLength === null || rawLength === undefined || typeof response?.arrayBuffer !== "function") fail(`${stage}-body`);
    const bytes = Buffer.from(await awaitWithAbort(response.arrayBuffer(), signal, stage));
    if (bytes.length > RPC_RESPONSE_CAP) fail(`${stage}-response-too-large`);
    if (Number(rawLength) !== bytes.length) fail(`${stage}-content-length`);
    return bytes;
  }
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const result = await awaitWithAbort(reader.read(), signal, stage);
      if (signal.aborted) fail(`${stage}-timeout`);
      if (result.done) break;
      if (!(result.value instanceof Uint8Array)) fail(`${stage}-body`);
      length += result.value.length;
      if (length > RPC_RESPONSE_CAP) {
        await awaitWithAbort(reader.cancel(), signal, stage);
        fail(`${stage}-response-too-large`);
      }
      chunks.push(Buffer.from(result.value));
    }
  } finally {
    reader.releaseLock?.();
  }
  if (rawLength !== null && rawLength !== undefined && Number(rawLength) !== length) fail(`${stage}-content-length`);
  return Buffer.concat(chunks, length);
}

export function createBoundedPublicRpcClient({ rawUrl = DEFAULT_PUBLIC_MAINNET_RPC, fetchImpl = globalThis.fetch } = {}) {
  const { url, hostname } = parsePublicRpcUrl(rawUrl);
  if (typeof fetchImpl !== "function") fail("rpc-fetch-invalid");
  let nextId = 1;
  const call = async (method, params) => {
    if (typeof method !== "string" || !/^[A-Za-z][A-Za-z0-9]*$/u.test(method) || !Array.isArray(params)) fail("rpc-call-invalid");
    const id = nextId++;
    const stage = `rpc-${method}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
    try {
      let response;
      try {
        response = await awaitWithAbort(fetchImpl(url, {
          method: "POST",
          redirect: "error",
          signal: controller.signal,
          headers: { "content-type": "application/json", "accept-encoding": "identity" },
          body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
        }), controller.signal, stage);
      } catch {
        fail(controller.signal.aborted ? `${stage}-timeout` : `${stage}-transport`);
      }
      if (response?.status !== 200 || response?.ok === false) {
        await cancelBody(response, controller.signal, stage);
        fail(`${stage}-http`);
      }
      const contentType = response?.headers?.get?.("content-type");
      if (typeof contentType !== "string" || !/^application\/json(?:\s*;|$)/iu.test(contentType)) {
        await cancelBody(response, controller.signal, stage);
        fail(`${stage}-content-type`);
      }
      const contentEncoding = response?.headers?.get?.("content-encoding");
      if (contentEncoding !== null && contentEncoding !== undefined
        && contentEncoding.toLowerCase() !== "identity") {
        await cancelBody(response, controller.signal, stage);
        fail(`${stage}-content-encoding`);
      }
      const bytes = await readResponseBody(response, controller.signal, stage);
      let envelope;
      try {
        envelope = JSON.parse(bytes.toString("utf8"));
      } catch {
        fail(`${stage}-json`);
      }
      if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)
        || envelope.jsonrpc !== "2.0" || envelope.id !== id) fail(`${stage}-envelope`);
      const keys = Object.keys(envelope).sort();
      const resultShape = keys.join(",") === "id,jsonrpc,result";
      const errorShape = keys.join(",") === "error,id,jsonrpc";
      if (resultShape === errorShape) fail(`${stage}-envelope`);
      if (errorShape) fail(`${stage}-rpc-error`);
      return envelope.result;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith(`${stage}-`)) throw error;
      fail(controller.signal.aborted ? `${stage}-timeout` : `${stage}-response`);
    } finally {
      clearTimeout(timer);
    }
  };
  return Object.freeze({ hostname, call: Object.freeze(call) });
}

export async function fetchFinalizedCreationTransaction({ rpcClient, signature }) {
  if (!rpcClient || typeof rpcClient.call !== "function" || typeof rpcClient.hostname !== "string") fail("rpc-client-invalid");
  try {
    decodeBase58(signature, { length: 64, code: "creation-signature" });
  } catch {
    fail("creation-signature");
  }
  const transaction = await rpcClient.call("getTransaction", [
    signature,
    { commitment: "finalized", encoding: "base64", maxSupportedTransactionVersion: 0 },
  ]);
  if (!transaction) fail("creation-transaction-unavailable");
  if (!Number.isSafeInteger(transaction.slot) || transaction.slot < 0
    || !Number.isSafeInteger(transaction.blockTime) || transaction.blockTime < 0
    || (transaction.version !== "legacy" && transaction.version !== 0)
    || !transaction.meta || transaction.meta.err !== null || !Array.isArray(transaction.meta.innerInstructions)
    || !Array.isArray(transaction.transaction) || transaction.transaction.length !== 2
    || transaction.transaction[1] !== "base64"
    || typeof transaction.transaction[0] !== "string") fail("creation-transaction-envelope");
  const wire = Buffer.from(transaction.transaction[0], "base64");
  if (wire.length === 0 || wire.toString("base64") !== transaction.transaction[0]) fail("creation-transaction-base64");
  const status = await rpcClient.call("getSignatureStatuses", [[signature], { searchTransactionHistory: true }]);
  if (!status || !Array.isArray(status.value) || status.value.length !== 1 || !status.value[0]) fail("creation-status-unavailable");
  const value = status.value[0];
  if (value.err !== null || value.confirmationStatus !== "finalized" || value.slot !== transaction.slot) fail("creation-status-not-finalized");
  return transaction;
}

export async function fetchFinalizedLookupTables({ rpcClient, transactionMessage, minContextSlot }) {
  if (!transactionMessage || transactionMessage.version !== 0 || !Array.isArray(transactionMessage.addressTableLookups)) {
    return Object.freeze([]);
  }
  const output = [];
  for (const lookup of transactionMessage.addressTableLookups) {
    const address = lookup.accountKey.toBase58();
    const result = await rpcClient.call("getAccountInfo", [
      address,
      { commitment: "finalized", encoding: "base64", minContextSlot },
    ]);
    const value = result?.value;
    if (!result?.context || result.context.slot < minContextSlot || !value
      || value.owner !== ALT_PROGRAM_ID || !Array.isArray(value.data) || value.data.length !== 2 || value.data[1] !== "base64") {
      fail("lookup-account-envelope");
    }
    output.push(Object.freeze({
      address,
      owner: value.owner,
      contextSlot: result.context.slot,
      dataBase64: value.data[0],
    }));
  }
  return Object.freeze(output);
}

function rawAccount(value, expectedOwner, code) {
  if (!value || value.owner !== expectedOwner || !Array.isArray(value.data) || value.data.length !== 2 || value.data[1] !== "base64") fail(code);
  const bytes = Buffer.from(value.data[0], "base64");
  if (bytes.toString("base64") !== value.data[0]) fail(`${code}-base64`);
  return bytes;
}

async function blockTime(rpcClient, slot, code) {
  const value = await rpcClient.call("getBlockTime", [slot]);
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  return new Date(value * 1000).toISOString();
}

export async function fetchFinalizedCreatorAccounts({ rpcClient, creatorAddress, mintAddress, minContextSlot }) {
  canonicalPublicKey(creatorAddress, "creator-address");
  canonicalPublicKey(mintAddress, "mint-address");
  const result = await rpcClient.call("getProgramAccounts", [
    TOKEN_PROGRAM_ID.toBase58(),
    {
      commitment: "finalized",
      encoding: "base64",
      withContext: true,
      minContextSlot,
      filters: [
        { dataSize: AccountLayout.span },
        { memcmp: { offset: 32, bytes: creatorAddress } },
      ],
    },
  ]);
  const slot = result?.context?.slot;
  if (!Number.isSafeInteger(slot) || slot < minContextSlot || !Array.isArray(result.value)) fail("creator-query-envelope");
  const accounts = [];
  const seen = new Set();
  let previousTargetAddress = null;
  for (const entry of result.value) {
    const address = canonicalPublicKey(entry?.pubkey, "creator-account-address");
    if (seen.has(address)) fail("creator-account-duplicate");
    seen.add(address);
    const bytes = rawAccount(entry.account, TOKEN_PROGRAM_ID.toBase58(), "creator-account");
    if (bytes.length !== AccountLayout.span) fail("creator-account-length");
    const decoded = AccountLayout.decode(bytes);
    const owner = new PublicKey(decoded.owner).toBase58();
    const mint = new PublicKey(decoded.mint).toBase58();
    if (owner !== creatorAddress) fail("creator-account-decoded-owner");
    if (decoded.state !== 1 && decoded.state !== 2) fail("creator-account-state");
    if (mint !== mintAddress) continue;
    if (previousTargetAddress !== null && address <= previousTargetAddress) fail("creator-account-order");
    previousTargetAddress = address;
    accounts.push({
      address,
      mint,
      owner,
      amountBaseUnits: decoded.amount.toString(),
      state: decoded.state === 1 ? "initialized" : "frozen",
      accountSha256: sha256Hex(bytes),
    });
  }
  return { finalizedSlot: slot, accounts };
}

export async function fetchFinalizedMintAccounts({ rpcClient, mintAddress, metadataAddress, minContextSlot }) {
  canonicalPublicKey(mintAddress, "mint-address");
  const { metadata, editionBump } = deriveMetadataPdas({ mint: mintAddress });
  if (metadataAddress !== metadata) fail("metadata-pda");
  const result = await rpcClient.call("getMultipleAccounts", [
    [mintAddress, metadataAddress],
    { commitment: "finalized", encoding: "base64", minContextSlot },
  ]);
  const slot = result?.context?.slot;
  if (!Number.isSafeInteger(slot) || slot < minContextSlot || !Array.isArray(result.value) || result.value.length !== 2) {
    fail("mint-query-envelope");
  }
  const mintBytes = rawAccount(result.value[0], TOKEN_PROGRAM_ID.toBase58(), "mint-account");
  if (mintBytes.length !== MintLayout.span) fail("mint-account-length");
  const metadataBytes = rawAccount(result.value[1], METAPLEX_METADATA_PROGRAM_ID, "metadata-account");
  const mint = MintLayout.decode(mintBytes);
  if (mint.mintAuthorityOption !== 1 || mint.freezeAuthorityOption !== 0) fail("mint-account-coption");
  const metadataAccount = decodeMetadataAccountV1({
    accountBytes: metadataBytes,
    expectedMint: mintAddress,
    expectedEditionBump: editionBump,
  });
  return {
    finalizedSlot: slot,
    mint: {
      tokenProgram: TOKEN_PROGRAM_ID.toBase58(),
      supply: mint.supply.toString(),
      decimals: mint.decimals,
      isInitialized: mint.isInitialized,
      mintAuthority: mint.mintAuthorityOption === 0 ? null : new PublicKey(mint.mintAuthority).toBase58(),
      freezeAuthority: mint.freezeAuthorityOption === 0 ? null : new PublicKey(mint.freezeAuthority).toBase58(),
      accountSha256: sha256Hex(mintBytes),
    },
    metadata: { ...metadataAccount, accountSha256: sha256Hex(metadataBytes) },
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function fetchMintEvidence({
  rpcClient,
  mintAddress,
  creatorAddress,
  metadataAddress,
  creationSignature,
  metadataManifest,
  metadataReadback,
  repositoryRoot,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
}) {
  assertMetadataReadbackV1({ manifest: metadataManifest, readback: metadataReadback });
  const metadataBytes = serializeMetadata(buildMetadata({ imageUri: metadataManifest.image.uri }));
  const imagePath = await resolveRepositoryPath(repositoryRoot, metadataManifest.image.sourcePath);
  const imageBytes = await readFile(imagePath);
  const imageReadback = await verifyPublishedContent({
    expectedBytes: imageBytes,
    expectedUri: metadataManifest.image.uri,
    fetchImpl,
  });
  const metadataRemote = await verifyPublishedContent({
    expectedBytes: metadataBytes,
    expectedUri: metadataManifest.metadata.uri,
    fetchImpl,
  });
  const normalized = {
    schemaVersion: "metadata-readback-v1",
    image: imageReadback,
    metadata: metadataRemote,
    creatorPayment: { signature: null, debitLamports: "0" },
    verifiedAt: metadataReadback.verifiedAt,
    ok: true,
  };
  if (!sameJson(normalized, metadataReadback)) fail("metadata-readback-mismatch");

  const genesisHash = await rpcClient.call("getGenesisHash", []);
  if (genesisHash !== MAINNET_BETA_GENESIS_HASH) fail("mainnet-genesis");
  const transactionResponse = await fetchFinalizedCreationTransaction({ rpcClient, signature: creationSignature });
  const wire = Buffer.from(transactionResponse.transaction?.[0] ?? "", "base64");
  let rawTransaction;
  try {
    rawTransaction = VersionedTransaction.deserialize(wire);
  } catch {
    fail("creation-transaction-wire");
  }
  const lookupTableAccounts = rawTransaction.message.version === 0
    ? await fetchFinalizedLookupTables({
      rpcClient,
      transactionMessage: rawTransaction.message,
      minContextSlot: transactionResponse.slot,
    })
    : [];
  const creation = resolveCreationTransaction({
    transactionResponse,
    lookupTableAccounts,
    requestedSignature: creationSignature,
  });
  if (creation.creation.accounts.mint !== mintAddress
    || creation.creation.accounts.creator !== creatorAddress
    || creation.creation.accounts.metadataAccount !== metadataAddress
    || creation.creation.uri !== metadataManifest.metadata.uri) fail("creation-binding");

  const creator = await fetchFinalizedCreatorAccounts({
    rpcClient,
    creatorAddress,
    mintAddress,
    minContextSlot: creation.slot,
  });
  const accounts = await fetchFinalizedMintAccounts({
    rpcClient,
    mintAddress,
    metadataAddress,
    minContextSlot: creator.finalizedSlot,
  });
  const [creationTime, creatorTime, finalizedAt] = await Promise.all([
    blockTime(rpcClient, creation.slot, "creation-time"),
    blockTime(rpcClient, creator.finalizedSlot, "creator-time"),
    blockTime(rpcClient, accounts.finalizedSlot, "finalized-time"),
  ]);
  const checkedDate = typeof now === "function" ? now() : now;
  const checkedAt = (checkedDate instanceof Date ? checkedDate : new Date(checkedDate)).toISOString();
  if (!(creationTime <= creatorTime && creatorTime <= finalizedAt && finalizedAt <= checkedAt)) fail("observation-chronology");
  const total = creator.accounts.reduce((sum, account) => sum + BigInt(account.amountBaseUnits), 0n);
  return {
    network: "mainnet-beta",
    genesisHash,
    rpcHost: rpcClient.hostname,
    mintAddress,
    creatorAddress,
    metadataAddress,
    creationSignature,
    creation,
    creatorBalance: {
      owner: creatorAddress,
      accounts: creator.accounts,
      totalAmountBaseUnits: total.toString(),
      finalizedSlot: creator.finalizedSlot,
      finalizedAt: creatorTime,
    },
    mint: accounts.mint,
    metadataAccount: accounts.metadata,
    metadataManifest,
    metadataReadback,
    observation: {
      creationSlot: creation.slot,
      creationTime,
      finalizedSlot: accounts.finalizedSlot,
      finalizedAt,
      checkedAt,
      ...creation.observation,
    },
  };
}

// Kept as a narrow raw-client compatibility helper for callers that only need
// identity validation; it does not accept a web3 Connection.
export async function assertMainnetIdentity(rpcClient) {
  const genesisHash = await rpcClient.call("getGenesisHash", []);
  if (genesisHash !== MAINNET_BETA_GENESIS_HASH) fail("mainnet-genesis");
  return genesisHash;
}
