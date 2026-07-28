import assert from "node:assert/strict";
import test from "node:test";
import { VersionedTransaction } from "@solana/web3.js";
import {
  fetchPreviewState,
  fetchUnsignedLookupTables,
  simulatePreview,
} from "../src/launchlab-rpc.mjs";
import { createLaunchlabPreviewFixture } from "../test-support/launchlab-preview-fixtures.mjs";

function rpcClient(handler) {
  const calls = [];
  return {
    calls,
    hostname: "api.mainnet-beta.solana.com",
    async call(method, params) {
      calls.push([method, params]);
      return handler(method, params);
    },
  };
}

test("establishes a finalized lookup barrier even for a lookup-free message", async () => {
  const fixture = createLaunchlabPreviewFixture();
  const transaction = VersionedTransaction.deserialize(Buffer.from(fixture.serialized, "base64"));
  const client = rpcClient((method) => {
    assert.equal(method, "getSlot");
    return 300_000_100;
  });
  const result = await fetchUnsignedLookupTables({
    rpcClient: client,
    transactionMessage: transaction.message,
  });
  assert.deepEqual(result, { lookupTableAccounts: [], lookupBarrierSlot: 300_000_100 });
  assert.deepEqual(client.calls, [["getSlot", [{ commitment: "finalized" }]]]);
});

test("reads every v0 lookup table with the exact finalized barrier", async () => {
  const fixture = createLaunchlabPreviewFixture({ version: "v0" });
  const transaction = VersionedTransaction.deserialize(Buffer.from(fixture.serialized, "base64"));
  const source = fixture.lookupTableAccounts[0];
  const client = rpcClient((method) => {
    if (method === "getSlot") return 300_000_100;
    if (method === "getAccountInfo") {
      return {
        context: { slot: 300_000_101 },
        value: {
          owner: source.owner,
          data: [source.dataBase64, "base64"],
        },
      };
    }
    throw new Error("unexpected method");
  });
  const result = await fetchUnsignedLookupTables({
    rpcClient: client,
    transactionMessage: transaction.message,
  });
  assert.equal(result.lookupBarrierSlot, 300_000_101);
  assert.deepEqual(result.lookupTableAccounts, [{
    ...source,
    contextSlot: 300_000_101,
  }]);
  assert.deepEqual(client.calls[1], [
    "getAccountInfo",
    [
      source.address,
      {
        commitment: "finalized",
        encoding: "base64",
        minContextSlot: 300_000_100,
      },
    ],
  ]);
});

test("reads and hashes exact finalized pre-state accounts", async () => {
  const fixture = createLaunchlabPreviewFixture();
  const values = fixture.state.accounts.map((account) => ({
    owner: account.owner,
    lamports: Number(account.lamports),
    data: [account.dataBase64, "base64"],
    executable: false,
    rentEpoch: 0,
  }));
  const client = rpcClient(() => ({ context: { slot: fixture.state.contextSlot }, value: values }));
  const normalizedPreview = { requiredAccounts: fixture.requiredAccounts };
  const result = await fetchPreviewState({
    rpcClient: client,
    normalizedPreview,
    minimumSlot: 300_000_100,
  });
  assert.deepEqual(result, fixture.state);
  assert.deepEqual(client.calls, [[
    "getMultipleAccounts",
    [
      fixture.requiredAccounts.map((account) => account.address),
      {
        commitment: "finalized",
        encoding: "base64",
        minContextSlot: 300_000_100,
      },
    ],
  ]]);
});

test("simulation call fixes blockhash replacement off and preserves raw evidence", async () => {
  const fixture = createLaunchlabPreviewFixture();
  const client = rpcClient(() => fixture.simulation);
  const result = await simulatePreview({
    rpcClient: client,
    canonicalBase64: fixture.serialized,
    accountAddresses: fixture.requiredAccounts.map((account) => account.address),
    minContextSlot: 300_000_101,
  });
  assert.equal(result, fixture.simulation);
  assert.deepEqual(client.calls, [[
    "simulateTransaction",
    [
      fixture.serialized,
      {
        sigVerify: false,
        replaceRecentBlockhash: false,
        commitment: "finalized",
        encoding: "base64",
        innerInstructions: true,
        minContextSlot: 300_000_101,
        accounts: {
          encoding: "base64",
          addresses: fixture.requiredAccounts.map((account) => account.address),
        },
      },
    ],
  ]]);
});

test("stale, null, malformed, or wrong-owner RPC evidence fails closed", async () => {
  const fixture = createLaunchlabPreviewFixture();
  const normalizedPreview = { requiredAccounts: fixture.requiredAccounts };
  for (const response of [
    { context: { slot: 99 }, value: [] },
    { context: { slot: 300_000_101 }, value: [null, null] },
    { context: { slot: 300_000_101 }, value: [] },
    {
      context: { slot: 300_000_101 },
      value: fixture.state.accounts.map((account) => ({
        owner: account.role === "creator" ? account.owner : "11111111111111111111111111111111",
        lamports: Number(account.lamports),
        data: [account.dataBase64, "base64"],
      })),
    },
  ]) {
    await assert.rejects(fetchPreviewState({
      rpcClient: rpcClient(() => response),
      normalizedPreview,
      minimumSlot: 300_000_100,
    }), /launchlab-rpc-/u);
  }
});
