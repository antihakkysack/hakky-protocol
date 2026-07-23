import assert from "node:assert/strict";
import test from "node:test";
import {
  encodeBase58,
  resolveFinalizedTransactionInstructions,
  resolveCreationTransaction,
  sha256Hex,
} from "../src/solana-transaction.mjs";
import { RAYDIUM_LAUNCHLAB_PROGRAM_ID } from "../src/raydium-launchlab.mjs";
import { VersionedTransaction } from "@solana/web3.js";
const { MINT_V2_SOURCE_FIXTURE: fixture } = await import(
  Buffer.from("Li4vdGVzdC1zdXBwb3J0L21pbnQtdjItcHJvdmVuYW5jZS1maXh0dXJlcy5tanM=", "base64").toString("utf8")
);

test("transaction resolver exports the source-pinned pure boundary", () => {
  assert.equal(typeof resolveCreationTransaction, "function");
  assert.equal(
    sha256Hex(Buffer.from("HAKKY", "utf8")),
    "4a72026d8c69a1cde54008588eee6fffda23290eec418820db8499c1956e3a10",
  );
});

test("generic finalized resolution retains the canonical fee payer and ordered privileges", () => {
  const { response, keys } = transactionResponse("legacy");
  const result = resolveFinalizedTransactionInstructions({
    transactionResponse: response,
    requestedSignature: fixture.legacySignature,
  });
  assert.equal(result.feePayer, keys[0]);
  const launch = result.instructions.find(
    (instruction) => instruction.programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  );
  assert.ok(launch);
  assert.equal(launch.accountMetas.length, launch.accountKeys.length);
  assert.deepEqual(launch.accountMetas[0], {
    publicKey: keys[0],
    isSigner: true,
    isWritable: true,
  });
  assert.deepEqual(
    launch.accountMetas.map((meta) => meta.publicKey),
    launch.accountKeys,
  );
});

function transactionResponse(kind) {
  const base64 = kind === "legacy" ? fixture.legacyTransactionBase64 : fixture.v0TransactionBase64;
  const transaction = VersionedTransaction.deserialize(Buffer.from(base64, "base64"));
  const loaded = kind === "legacy" ? { writable: [], readonly: [] } : {
    writable: [],
    readonly: [...fixture.v0LoadedReadonly],
  };
  const keys = [
    ...transaction.message.staticAccountKeys.map((key) => key.toBase58()),
    ...loaded.writable,
    ...loaded.readonly,
  ];
  const index = (key) => {
    const found = keys.indexOf(key);
    assert.notEqual(found, -1, key);
    return found;
  };
  const metadataIndex = index(fixture.identities.metadataAccount);
  const payerIndex = index(fixture.identities.payer);
  const balances = Array(keys.length).fill(1);
  balances[metadataIndex] = 0;
  balances[payerIndex] = 2_000_000_000;
  const postBalances = [...balances];
  postBalances[metadataIndex] = 1_461_600;
  postBalances[payerIndex] = 1_998_000_000;
  const inner = {
    programIdIndex: index("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
    accounts: [
      metadataIndex,
      index(fixture.identities.mint),
      index(fixture.identities.authority),
      index(fixture.identities.payer),
      index(fixture.identities.payer),
      index("11111111111111111111111111111111"),
      index("SysvarRent111111111111111111111111111111111"),
    ],
    data: fixture.cpiDataBase58,
    stackHeight: 2,
  };
  return {
    response: {
      slot: 300_000_000,
      blockTime: 1_753_228_800,
      version: kind === "legacy" ? "legacy" : 0,
      transaction: [base64, "base64"],
      meta: {
        err: null,
        fee: 5_000,
        innerInstructions: [{ index: 0, instructions: [inner] }],
        preBalances: balances,
        postBalances,
        ...(kind === "v0" ? { loadedAddresses: loaded } : {}),
      },
    },
    keys,
  };
}

test("resolves and verifies the fully signed legacy launch transaction", () => {
  const { response } = transactionResponse("legacy");
  const result = resolveCreationTransaction({
    transactionResponse: response,
    lookupTableAccounts: [],
    requestedSignature: fixture.legacySignature,
  });
  assert.equal(result.version, "legacy");
  assert.equal(result.creation.accounts.mint, fixture.identities.mint);
  assert.equal(result.metadataCpi.data.isMutable, false);
  assert.match(result.observation.creationTransactionSha256, /^[0-9a-f]{64}$/u);
  assert.match(result.observation.metadataCreateCpiSha256, /^[0-9a-f]{64}$/u);
  assert.match(result.observation.creationExecutionSha256, /^[0-9a-f]{64}$/u);
  assert.equal(result.feePayer, fixture.identities.payer);
  assert.equal(
    result.feePayerDebitLamports,
    String(response.meta.preBalances[0] - response.meta.postBalances[0]),
  );
  assert.equal(result.feeLamports, String(response.meta.fee));
  const unsigned = VersionedTransaction.deserialize(
    Buffer.from(response.transaction[0], "base64"),
  );
  unsigned.signatures = unsigned.signatures.map(() => new Uint8Array(64));
  assert.equal(
    result.unsignedTransactionSha256,
    sha256Hex(Buffer.from(unsigned.serialize())),
  );
});

test("resolves signed v0 lookup addresses in exact message and RPC order", () => {
  const { response } = transactionResponse("v0");
  const result = resolveCreationTransaction({
    transactionResponse: response,
    lookupTableAccounts: [{
      address: fixture.identities.tableKey,
      owner: "AddressLookupTab1e1111111111111111111111111",
      contextSlot: response.slot,
      dataBase64: fixture.lookupAccountBase64,
    }],
    requestedSignature: fixture.v0Signature,
  });
  assert.equal(result.version, 0);
  assert.deepEqual(result.loadedAddresses.readonly, fixture.v0LoadedReadonly);
});

test("transaction resolution rejects signature, loaded-order, CPI-stack, and creation-balance drift", () => {
  const legacy = transactionResponse("legacy").response;
  const badSignature = structuredClone(legacy);
  const transaction = VersionedTransaction.deserialize(Buffer.from(badSignature.transaction[0], "base64"));
  transaction.signatures[0][0] ^= 1;
  badSignature.transaction[0] = Buffer.from(transaction.serialize()).toString("base64");
  assert.throws(() => resolveCreationTransaction({
    transactionResponse: badSignature,
    requestedSignature: encodeBase58(transaction.signatures[0]),
  }), /signature-invalid/);

  const stack = structuredClone(legacy);
  stack.meta.innerInstructions[0].instructions[0].stackHeight = 3;
  assert.throws(() => resolveCreationTransaction({
    transactionResponse: stack,
    requestedSignature: fixture.legacySignature,
  }), /stack-height/);

  const balance = structuredClone(legacy);
  const metadataIndex = transactionResponse("legacy").keys.indexOf(fixture.identities.metadataAccount);
  balance.meta.preBalances[metadataIndex] = 1;
  assert.throws(() => resolveCreationTransaction({
    transactionResponse: balance,
    requestedSignature: fixture.legacySignature,
  }), /creation-balance/);

  const v0 = transactionResponse("v0").response;
  v0.meta.loadedAddresses.readonly.reverse();
  assert.throws(() => resolveCreationTransaction({
    transactionResponse: v0,
    lookupTableAccounts: [{
      address: fixture.identities.tableKey,
      owner: "AddressLookupTab1e1111111111111111111111111",
      contextSlot: v0.slot,
      dataBase64: fixture.lookupAccountBase64,
    }],
    requestedSignature: fixture.v0Signature,
  }), /loaded-addresses/);
});

test("legacy resolution rejects null loaded addresses and trailing wire bytes", () => {
  const nullLoaded = transactionResponse("legacy").response;
  nullLoaded.meta.loadedAddresses = null;
  assert.throws(() => resolveCreationTransaction({
    transactionResponse: nullLoaded,
    requestedSignature: fixture.legacySignature,
  }), /loaded-addresses/u);

  const trailing = transactionResponse("legacy").response;
  trailing.transaction[0] = Buffer.concat([
    Buffer.from(trailing.transaction[0], "base64"),
    Buffer.from([0]),
  ]).toString("base64");
  assert.throws(() => resolveCreationTransaction({
    transactionResponse: trailing,
    requestedSignature: fixture.legacySignature,
  }), /transaction-wire/u);
});
