import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import {
  AddressLookupTableAccount,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  decodeLaunchlabCreationTransaction,
  deriveLaunchlabAuthorityPda,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
} from "./raydium-launchlab.mjs";
import {
  decodeCreateMetadataAccountV3,
  METAPLEX_METADATA_PROGRAM_ID,
} from "./metaplex-metadata.mjs";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_INDEX = new Map([...BASE58_ALPHABET].map((character, index) => [character, index]));
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const RENT_SYSVAR_ID = "SysvarRent111111111111111111111111111111111";
const ALT_PROGRAM_ID = "AddressLookupTab1e1111111111111111111111111";

function fail(code) {
  throw new Error(code);
}

export function sha256Hex(bytes) {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

export function decodeBase58(value, { length, code = "base58" } = {}) {
  if (typeof value !== "string" || value.length === 0) fail(`${code}-alphabet`);
  let number = 0n;
  for (const character of value) {
    const digit = BASE58_INDEX.get(character);
    if (digit === undefined) fail(`${code}-alphabet`);
    number = number * 58n + BigInt(digit);
  }
  const decoded = [];
  while (number > 0n) {
    decoded.push(Number(number & 255n));
    number >>= 8n;
  }
  decoded.reverse();
  const leading = value.match(/^1*/u)?.[0].length ?? 0;
  const bytes = Buffer.concat([Buffer.alloc(leading), Buffer.from(decoded)]);
  if (length !== undefined && bytes.length !== length) fail(`${code}-length`);
  if (encodeBase58(bytes) !== value) fail(`${code}-canonical`);
  return bytes;
}

export function encodeBase58(value) {
  const bytes = Buffer.from(value);
  let number = 0n;
  for (const byte of bytes) number = (number << 8n) | BigInt(byte);
  let encoded = "";
  while (number > 0n) {
    encoded = BASE58_ALPHABET[Number(number % 58n)] + encoded;
    number /= 58n;
  }
  let leading = 0;
  while (leading < bytes.length && bytes[leading] === 0) leading += 1;
  return "1".repeat(leading) + encoded;
}

function canonicalPublicKey(value, code) {
  decodeBase58(value, { length: 32, code });
  return value;
}

function exactBase64(value, code) {
  if (typeof value !== "string" || value.length === 0 || value.length % 4 !== 0) fail(`${code}-base64`);
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) fail(`${code}-base64`);
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) fail(`${code}-base64`);
  return bytes;
}

function normalizeLoadedAddresses(value, required) {
  if (value === undefined || value === null) {
    if (required) fail("transaction-loaded-addresses-missing");
    return { writable: [], readonly: [] };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join(",") !== "readonly,writable"
    || !Array.isArray(value.writable) || !Array.isArray(value.readonly)) {
    fail("transaction-loaded-addresses-shape");
  }
  return {
    writable: value.writable.map((key) => canonicalPublicKey(key, "transaction-loaded-key")),
    readonly: value.readonly.map((key) => canonicalPublicKey(key, "transaction-loaded-key")),
  };
}

function lookupEnvelopeMap(envelopes) {
  if (!Array.isArray(envelopes)) fail("lookup-envelope-list");
  const map = new Map();
  for (const envelope of envelopes) {
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) fail("lookup-envelope");
    const address = canonicalPublicKey(envelope.address, "lookup-address");
    if (map.has(address)) fail("lookup-duplicate");
    if (envelope.owner !== ALT_PROGRAM_ID) fail("lookup-owner");
    if (!Number.isSafeInteger(envelope.contextSlot) || envelope.contextSlot < 0) fail("lookup-context");
    const data = envelope.dataBase64 ? exactBase64(envelope.dataBase64, "lookup-data") : Buffer.from(envelope.data ?? []);
    if (data.length < 56 || (data.length - 56) % 32 !== 0) fail("lookup-layout");
    const typeIndex = data.readUInt32LE(0);
    if (typeIndex !== 1) fail("lookup-layout");
    const state = AddressLookupTableAccount.deserialize(data);
    if ((state.deactivationSlot !== 0xffffffffffffffffn && state.deactivationSlot <= BigInt(envelope.contextSlot))
      || !Number.isSafeInteger(state.lastExtendedSlot) || state.lastExtendedSlot > envelope.contextSlot
      || !Number.isInteger(state.lastExtendedSlotStartIndex)
      || state.lastExtendedSlotStartIndex < 0 || state.lastExtendedSlotStartIndex > state.addresses.length) {
      fail("lookup-state");
    }
    map.set(address, { envelope, state });
  }
  return map;
}

function resolveLookupAddresses(message, lookupTableAccounts, minContextSlot) {
  const map = lookupEnvelopeMap(lookupTableAccounts);
  const writable = [];
  const readonly = [];
  for (const lookup of message.addressTableLookups ?? []) {
    const address = lookup.accountKey.toBase58();
    const found = map.get(address);
    if (!found) fail("lookup-missing");
    if (found.envelope.contextSlot < minContextSlot) fail("lookup-context");
    const addresses = found.state.addresses;
    for (const index of lookup.writableIndexes) {
      if (!addresses[index]) fail("lookup-index");
      writable.push(addresses[index]);
    }
    for (const index of lookup.readonlyIndexes) {
      if (!addresses[index]) fail("lookup-index");
      readonly.push(addresses[index]);
    }
  }
  if (map.size !== (message.addressTableLookups?.length ?? 0)) fail("lookup-extra");
  return { writable, readonly };
}

function keyPrivileges(message, staticCount, loadedWritableCount, completeCount) {
  const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } = message.header;
  return Array.from({ length: completeCount }, (_, index) => {
    if (index < staticCount) {
      const signer = index < numRequiredSignatures;
      const writable = signer
        ? index < numRequiredSignatures - numReadonlySignedAccounts
        : index < staticCount - numReadonlyUnsignedAccounts;
      return { signer, writable };
    }
    return { signer: false, writable: index < staticCount + loadedWritableCount };
  });
}

function verifyRequiredSignatures(transaction, messageBytes, requestedSignature) {
  const count = transaction.message.header.numRequiredSignatures;
  if (transaction.signatures.length !== count) fail("transaction-signature-count");
  if (encodeBase58(transaction.signatures[0]) !== requestedSignature) fail("transaction-signature-zero");
  const keys = transaction.message.staticAccountKeys;
  for (let index = 0; index < count; index += 1) {
    const signature = Buffer.from(transaction.signatures[index]);
    if (signature.length !== 64 || encodeBase58(signature) !== encodeBase58(decodeBase58(encodeBase58(signature), {
      length: 64,
      code: "transaction-signature",
    }))) fail("transaction-signature-canonical");
    const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), keys[index].toBuffer()]);
    if (!verifySignature(null, messageBytes, createPublicKey({ key: spki, format: "der", type: "spki" }), signature)) {
      fail("transaction-signature-invalid");
    }
  }
}

const CREATION_NAMES = [
  "payer", "creator", "configId", "platformId", "authority", "launchId", "mint", "quoteMint",
  "baseVault", "quoteVault", "metadataAccount", "tokenProgramBase", "tokenProgramQuote",
  "metadataProgram", "systemProgram", "rentSysvar", "eventAuthority", "launchlabProgram",
  "platformGlobalAccess",
];

function enforceCreationMetas(keys, privileges) {
  if (keys.length !== 18 && keys.length !== 19) fail("launchlab-account-arity");
  const byName = Object.fromEntries(keys.map((key, index) => [CREATION_NAMES[index], {
    key,
    ...privileges[index],
  }]));
  const writable = new Set(["payer", "launchId", "mint", "baseVault", "quoteVault", "metadataAccount"]);
  const signer = new Set(["payer", "mint"]);
  for (const [name, meta] of Object.entries(byName)) {
    const aliasPromotion = name === "creator" && meta.key === byName.payer.key;
    if (meta.signer !== (signer.has(name) || aliasPromotion)) fail(`launchlab-meta-${name}-signer`);
    if (meta.writable !== (writable.has(name) || aliasPromotion)) fail(`launchlab-meta-${name}-writable`);
  }
  if (byName.tokenProgramBase.key !== TOKEN_PROGRAM_ID || byName.tokenProgramQuote.key !== TOKEN_PROGRAM_ID) {
    fail("launchlab-token-program");
  }
  if (byName.metadataProgram.key !== METAPLEX_METADATA_PROGRAM_ID
    || byName.systemProgram.key !== SYSTEM_PROGRAM_ID || byName.rentSysvar.key !== RENT_SYSVAR_ID
    || byName.launchlabProgram.key !== RAYDIUM_LAUNCHLAB_PROGRAM_ID) fail("launchlab-fixed-program");
  for (let left = 0; left < keys.length; left += 1) {
    for (let right = left + 1; right < keys.length; right += 1) {
      const allowedCreatorPayer = left === 0 && right === 1;
      const allowedTokenRepeat = left === 11 && right === 12;
      if (keys[left] === keys[right] && !allowedCreatorPayer && !allowedTokenRepeat) fail("launchlab-unlisted-alias");
    }
  }
  return byName;
}

function exactExecutionHash({
  slot,
  outerInstructionIndex,
  innerInstructionIndex,
  instruction,
  accountKeys,
  metadataPreBalance,
  metadataPostBalance,
  loadedAddresses,
}) {
  const dataBase58 = instruction.data;
  decodeBase58(dataBase58, { code: "metadata-cpi-data" });
  const ordered = {
    slot,
    outerInstructionIndex,
    innerInstructionIndex,
    stackHeight: instruction.stackHeight,
    programId: accountKeys[instruction.programIdIndex],
    accountKeys: instruction.accounts.map((index) => accountKeys[index]),
    dataBase58,
    metadataPreBalance: String(metadataPreBalance),
    metadataPostBalance: String(metadataPostBalance),
    loadedAddresses: {
      writable: [...loadedAddresses.writable],
      readonly: [...loadedAddresses.readonly],
    },
  };
  return { ordered, sha256: sha256Hex(Buffer.from(JSON.stringify(ordered), "utf8")) };
}

export function resolveCreationTransaction({
  transactionResponse,
  lookupTableAccounts = [],
  requestedSignature,
}) {
  if (!transactionResponse || typeof transactionResponse !== "object") fail("transaction-response");
  const { slot, blockTime, version, meta } = transactionResponse;
  if (!Number.isSafeInteger(slot) || slot < 0 || !Number.isSafeInteger(blockTime)) fail("transaction-observation");
  if (!meta || meta.err !== null || !Array.isArray(meta.innerInstructions)) fail("transaction-meta");
  if (!Array.isArray(transactionResponse.transaction) || transactionResponse.transaction.length !== 2
    || transactionResponse.transaction[1] !== "base64") fail("transaction-tuple");
  const wireBytes = exactBase64(transactionResponse.transaction[0], "transaction");
  let transaction;
  try {
    transaction = VersionedTransaction.deserialize(wireBytes);
  } catch {
    fail("transaction-wire");
  }
  const message = transaction.message;
  const resolvedVersion = message.version === "legacy" ? "legacy" : message.version;
  if (resolvedVersion !== version) fail("transaction-version");
  if (resolvedVersion !== "legacy" && resolvedVersion !== 0) fail("transaction-version");
  decodeBase58(requestedSignature, { length: 64, code: "transaction-requested-signature" });
  const messageBytes = Buffer.from(message.serialize());
  verifyRequiredSignatures(transaction, messageBytes, requestedSignature);

  const staticKeys = message.staticAccountKeys;
  let accountKeysFromLookups;
  if (resolvedVersion === 0) {
    accountKeysFromLookups = resolveLookupAddresses(message, lookupTableAccounts, slot);
  } else if (lookupTableAccounts.length !== 0 || (message.addressTableLookups?.length ?? 0) !== 0) {
    fail("legacy-lookup");
  }
  const loaded = normalizeLoadedAddresses(meta.loadedAddresses, resolvedVersion === 0);
  const resolvedLoaded = {
    writable: (accountKeysFromLookups?.writable ?? []).map((key) => key.toBase58()),
    readonly: (accountKeysFromLookups?.readonly ?? []).map((key) => key.toBase58()),
  };
  if (JSON.stringify(loaded) !== JSON.stringify(resolvedLoaded)) fail("transaction-loaded-addresses");
  const allKeys = [
    ...staticKeys.map((key) => key.toBase58()),
    ...resolvedLoaded.writable,
    ...resolvedLoaded.readonly,
  ];
  const privileges = keyPrivileges(message, staticKeys.length, resolvedLoaded.writable.length, allKeys.length);
  const instructions = message.compiledInstructions;
  const candidates = instructions.map((instruction, index) => ({ instruction, index }))
    .filter(({ instruction }) => allKeys[instruction.programIdIndex] === RAYDIUM_LAUNCHLAB_PROGRAM_ID
      && Buffer.from(instruction.data).subarray(0, 8).toString("hex") === "4399af27da102620");
  if (candidates.length !== 1) fail("launchlab-initialize-count");
  const outer = candidates[0];
  const outerKeys = [...outer.instruction.accountKeyIndexes].map((index) => allKeys[index]);
  const outerPrivileges = [...outer.instruction.accountKeyIndexes].map((index) => privileges[index]);
  const creation = decodeLaunchlabCreationTransaction({
    transactionBytes: Buffer.from(outer.instruction.data),
    accountKeys: outerKeys,
  });
  const sourceMetas = enforceCreationMetas(outerKeys, outerPrivileges);
  if (allKeys[0] !== sourceMetas.payer.key || !sourceMetas.payer.signer || !sourceMetas.payer.writable) fail("launchlab-fee-payer");
  if (creation.accounts.authority !== deriveLaunchlabAuthorityPda().publicKey) fail("launchlab-authority");

  const group = meta.innerInstructions.filter((entry) => entry.index === outer.index);
  if (group.length !== 1 || !Array.isArray(group[0].instructions)) fail("metadata-inner-group");
  const metaplex = [];
  for (const entry of meta.innerInstructions) {
    if (!Number.isSafeInteger(entry.index) || !Array.isArray(entry.instructions)) fail("metadata-inner-group");
    for (let index = 0; index < entry.instructions.length; index += 1) {
      const instruction = entry.instructions[index];
      if (!instruction || !Number.isSafeInteger(instruction.programIdIndex)
        || !Array.isArray(instruction.accounts) || typeof instruction.data !== "string"
        || !Number.isSafeInteger(instruction.stackHeight)) fail("metadata-inner-instruction");
      const programId = allKeys[instruction.programIdIndex];
      const touched = instruction.accounts.some((keyIndex) => allKeys[keyIndex] === creation.accounts.metadataAccount);
      if (programId === METAPLEX_METADATA_PROGRAM_ID && touched) metaplex.push({ entry, instruction, index });
    }
  }
  if (metaplex.length !== 1 || metaplex[0].entry.index !== outer.index) fail("metadata-cpi-count");
  const selected = metaplex[0];
  if (selected.instruction.stackHeight !== 2) fail("metadata-cpi-stack-height");
  const innerKeys = selected.instruction.accounts.map((index) => allKeys[index]);
  const cpiBytes = decodeBase58(selected.instruction.data, { code: "metadata-cpi-data" });
  const cpi = decodeCreateMetadataAccountV3({ instructionData: cpiBytes, accountKeys: innerKeys });
  if (cpi.accounts.metadata !== creation.accounts.metadataAccount
    || cpi.accounts.mint !== creation.accounts.mint
    || cpi.accounts.mintAuthority !== creation.accounts.authority
    || cpi.accounts.payer !== creation.accounts.payer
    || cpi.accounts.systemProgram !== SYSTEM_PROGRAM_ID
    || (cpi.accounts.rentSysvar !== undefined && cpi.accounts.rentSysvar !== RENT_SYSVAR_ID)
    || cpi.data.name !== creation.name || cpi.data.symbol !== creation.symbol || cpi.data.uri !== creation.uri
    || cpi.data.sellerFeeBasisPoints !== 0 || cpi.data.creators !== null
    || cpi.data.collection !== null || cpi.data.uses !== null || cpi.data.collectionDetails !== null
    || cpi.data.isMutable !== false) fail("metadata-cpi-binding");

  if (!Array.isArray(meta.preBalances) || !Array.isArray(meta.postBalances)
    || meta.preBalances.length !== allKeys.length || meta.postBalances.length !== allKeys.length
    || [...meta.preBalances, ...meta.postBalances].some((value) => !Number.isSafeInteger(value) || value < 0)) {
    fail("transaction-balances");
  }
  const metadataIndexes = allKeys.map((key, index) => key === creation.accounts.metadataAccount ? index : -1)
    .filter((index) => index !== -1);
  if (metadataIndexes.length !== 1) fail("metadata-account-index");
  const metadataIndex = metadataIndexes[0];
  const metadataPreBalance = meta.preBalances[metadataIndex];
  const metadataPostBalance = meta.postBalances[metadataIndex];
  if (metadataPreBalance !== 0 || metadataPostBalance <= 0) fail("metadata-account-creation-balance");
  const execution = exactExecutionHash({
    slot,
    outerInstructionIndex: outer.index,
    innerInstructionIndex: selected.index,
    instruction: selected.instruction,
    accountKeys: allKeys,
    metadataPreBalance,
    metadataPostBalance,
    loadedAddresses: loaded,
  });
  return Object.freeze({
    slot,
    blockTime,
    version: resolvedVersion,
    requestedSignature,
    wireBytes,
    messageBytes,
    accountKeys: Object.freeze(allKeys),
    privileges: Object.freeze(privileges),
    loadedAddresses: Object.freeze({ writable: Object.freeze(loaded.writable), readonly: Object.freeze(loaded.readonly) }),
    creation,
    sourceMetas: Object.freeze(sourceMetas),
    outerInstructionIndex: outer.index,
    metadataInnerInstructionIndex: selected.index,
    metadataCpi: cpi,
    metadataCpiBytes: Buffer.from(cpiBytes),
    observation: Object.freeze({
      creationTransactionSha256: sha256Hex(wireBytes),
      metadataCreateCpiSha256: sha256Hex(cpiBytes),
      creationExecutionSha256: execution.sha256,
    }),
    creationExecution: Object.freeze(execution.ordered),
  });
}
