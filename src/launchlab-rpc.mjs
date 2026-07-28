import { createHash } from "node:crypto";
import {
  AddressLookupTableAccount,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";

const ALT_PROGRAM_ID = "AddressLookupTab1e1111111111111111111111111";

function fail(code) {
  throw new Error(`launchlab-rpc-${code}`);
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) fail(code);
}

function safeSlot(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  return value;
}

function canonicalKey(value, code) {
  try {
    if (typeof value !== "string") fail(code);
    const key = new PublicKey(value);
    if (key.toBase58() !== value || key.toBytes().length !== 32) fail(code);
    return value;
  } catch {
    fail(code);
  }
}

function canonicalBase64(value, { allowEmpty = false, code = "base64" } = {}) {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
    fail(code);
  }
  const bytes = Buffer.from(value, "base64");
  if ((!allowEmpty && bytes.length === 0) || bytes.toString("base64") !== value) fail(code);
  return bytes;
}

function rpcClient(value) {
  if (!value || typeof value.call !== "function" || typeof value.hostname !== "string") {
    fail("rpc-client");
  }
  return value;
}

function lookupRecords(transactionMessage) {
  if (!transactionMessage || (transactionMessage.version !== "legacy" && transactionMessage.version !== 0)) {
    fail("transaction-message");
  }
  if (transactionMessage.version === "legacy") return [];
  if (!Array.isArray(transactionMessage.addressTableLookups)) fail("transaction-message");
  return transactionMessage.addressTableLookups;
}

export async function fetchUnsignedLookupTables(input) {
  exactKeys(input, ["rpcClient", "transactionMessage"], "lookup-input");
  const client = rpcClient(input.rpcClient);
  const lookups = lookupRecords(input.transactionMessage);
  const baseSlot = safeSlot(
    await client.call("getSlot", [{ commitment: "finalized" }]),
    "lookup-base-slot",
  );
  const records = [];
  let lookupBarrierSlot = baseSlot;
  for (const lookup of lookups) {
    const address = canonicalKey(lookup?.accountKey?.toBase58?.(), "lookup-address");
    const result = await client.call("getAccountInfo", [
      address,
      {
        commitment: "finalized",
        encoding: "base64",
        minContextSlot: baseSlot,
      },
    ]);
    const contextSlot = safeSlot(result?.context?.slot, "lookup-context-slot");
    if (contextSlot < baseSlot) fail("lookup-context-stale");
    const value = result?.value;
    if (!value || value.owner !== ALT_PROGRAM_ID
      || !Array.isArray(value.data) || value.data.length !== 2 || value.data[1] !== "base64") {
      fail("lookup-account");
    }
    const data = canonicalBase64(value.data[0], { code: "lookup-account-base64" });
    try {
      AddressLookupTableAccount.deserialize(data);
    } catch {
      fail("lookup-account-layout");
    }
    records.push(Object.freeze({
      address,
      owner: ALT_PROGRAM_ID,
      contextSlot,
      dataBase64: value.data[0],
    }));
    lookupBarrierSlot = Math.max(lookupBarrierSlot, contextSlot);
  }
  if (lookups.length > 0) {
    try {
      input.transactionMessage.getAccountKeys({
        addressLookupTableAccounts: records.map((record) => new AddressLookupTableAccount({
          key: new PublicKey(record.address),
          state: AddressLookupTableAccount.deserialize(Buffer.from(record.dataBase64, "base64")),
        })),
      });
    } catch {
      fail("lookup-index");
    }
  }
  return Object.freeze({
    lookupTableAccounts: Object.freeze(records),
    lookupBarrierSlot,
  });
}

function normalizeRequiredAccounts(value) {
  if (!Array.isArray(value) || value.length === 0) fail("required-accounts");
  const seen = new Set();
  return value.map((entry) => {
    exactKeys(entry, ["address", "role", "expectedOwner"], "required-account");
    const address = canonicalKey(entry.address, "required-address");
    const expectedOwner = canonicalKey(entry.expectedOwner, "required-owner");
    if (typeof entry.role !== "string" || !/^[a-z][a-z0-9-]*$/u.test(entry.role)
      || seen.has(address)) fail("required-account");
    seen.add(address);
    return Object.freeze({ address, role: entry.role, expectedOwner });
  });
}

export function normalizeAndHashFinalizedAccounts({ requiredAccounts, result }) {
  const expected = normalizeRequiredAccounts(requiredAccounts);
  if (!result || !Array.isArray(result.value) || result.value.length !== expected.length) {
    fail("account-result");
  }
  const contextSlot = safeSlot(result?.context?.slot, "account-context-slot");
  return Object.freeze(result.value.map((value, index) => {
    const requirement = expected[index];
    if (!value || value.owner !== requirement.expectedOwner
      || !Number.isSafeInteger(value.lamports) || value.lamports < 0
      || !Array.isArray(value.data) || value.data.length !== 2 || value.data[1] !== "base64"
      || ("executable" in value && value.executable !== false)
      || ("rentEpoch" in value && (!Number.isSafeInteger(value.rentEpoch) || value.rentEpoch < 0))) {
      fail("account-envelope");
    }
    const data = canonicalBase64(value.data[0], { allowEmpty: true, code: "account-base64" });
    return Object.freeze({
      ...requirement,
      owner: value.owner,
      lamports: String(value.lamports),
      dataBase64: value.data[0],
      dataSha256: createHash("sha256").update(data).digest("hex"),
      contextSlot,
    });
  }));
}

export async function fetchPreviewState(input) {
  exactKeys(input, ["rpcClient", "normalizedPreview", "minimumSlot"], "preview-state-input");
  const client = rpcClient(input.rpcClient);
  const minimumSlot = safeSlot(input.minimumSlot, "minimum-slot");
  const requiredAccounts = normalizeRequiredAccounts(input.normalizedPreview?.requiredAccounts);
  const addresses = requiredAccounts.map((account) => account.address);
  const result = await client.call("getMultipleAccounts", [
    addresses,
    {
      commitment: "finalized",
      encoding: "base64",
      minContextSlot: minimumSlot,
    },
  ]);
  const contextSlot = safeSlot(result?.context?.slot, "account-context-slot");
  if (contextSlot < minimumSlot) fail("account-context-stale");
  return Object.freeze({
    contextSlot,
    accounts: normalizeAndHashFinalizedAccounts({ requiredAccounts, result }),
  });
}

export async function simulatePreview(input) {
  exactKeys(input, ["rpcClient", "canonicalBase64", "accountAddresses", "minContextSlot"], "simulation-input");
  const client = rpcClient(input.rpcClient);
  const minContextSlot = safeSlot(input.minContextSlot, "simulation-min-slot");
  const bytes = canonicalBase64(input.canonicalBase64, { code: "simulation-transaction-base64" });
  try {
    const transaction = VersionedTransaction.deserialize(bytes);
    if (!Buffer.from(transaction.serialize()).equals(bytes)) fail("simulation-transaction-wire");
  } catch (error) {
    if (error?.message?.startsWith("launchlab-rpc-")) throw error;
    fail("simulation-transaction-wire");
  }
  if (!Array.isArray(input.accountAddresses) || input.accountAddresses.length === 0) {
    fail("simulation-account-addresses");
  }
  const addresses = input.accountAddresses.map((address) => canonicalKey(address, "simulation-account-address"));
  return client.call("simulateTransaction", [
    input.canonicalBase64,
    {
      sigVerify: false,
      replaceRecentBlockhash: false,
      commitment: "finalized",
      encoding: "base64",
      innerInstructions: true,
      minContextSlot,
      accounts: { encoding: "base64", addresses },
    },
  ]);
}
