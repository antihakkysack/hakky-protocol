import assert from "node:assert/strict";
import test from "node:test";
import { MAINNET_BETA_GENESIS_HASH } from "../src/solana-rpc.mjs";
import { fetchWalletReadiness } from "../src/wallet-readiness.mjs";

const CREATOR = "11111111111111111111111111111111";
const CHECKED_AT = "2026-07-23T01:00:00.000Z";

function rpcClient({
  genesisHash = MAINNET_BETA_GENESIS_HASH,
  value = 1_000_000_000,
  slot = 300000100,
} = {}) {
  const calls = [];
  return {
    calls,
    hostname: "api.mainnet-beta.solana.com",
    async call(method, parameters) {
      calls.push([method, parameters]);
      if (method === "getGenesisHash") return genesisHash;
      if (method === "getBalance") return { context: { slot }, value };
      throw new Error("unexpected-rpc-method");
    },
  };
}

test("reads exact finalized mainnet balance into the public readiness receipt", async () => {
  const client = rpcClient();
  const result = await fetchWalletReadiness({
    rpcClient: client,
    creatorAddress: CREATOR,
    requiredLamports: 1_000_000_000,
    checkedAt: CHECKED_AT,
  });
  assert.deepEqual(client.calls, [
    ["getGenesisHash", []],
    ["getBalance", [CREATOR, { commitment: "finalized" }]],
  ]);
  assert.deepEqual(result, {
    schemaVersion: "wallet-readiness-v1",
    network: "mainnet-beta",
    creator: CREATOR,
    genesisHash: MAINNET_BETA_GENESIS_HASH,
    finalizedBalanceLamports: "1000000000",
    requiredLamports: "1000000000",
    finalizedSlot: 300000100,
    checkedAt: CHECKED_AT,
    rpcHost: "api.mainnet-beta.solana.com",
    checks: {
      mainnetGenesis: true,
      creatorMatches: true,
      finalizedBalance: true,
      sufficientBalance: true,
    },
    ok: true,
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.checks), true);
});

test("insufficient balance remains a non-approvable public diagnostic", async () => {
  const result = await fetchWalletReadiness({
    rpcClient: rpcClient({ value: 999_999_999 }),
    creatorAddress: CREATOR,
    requiredLamports: 1_000_000_000,
    checkedAt: CHECKED_AT,
  });
  assert.equal(result.finalizedBalanceLamports, "999999999");
  assert.equal(result.checks.sufficientBalance, false);
  assert.equal(result.ok, false);
});

test("wrong chain, malformed balance, unsafe identity, or extra input fails closed", async () => {
  for (const input of [
    {
      rpcClient: rpcClient({ genesisHash: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1" }),
      creatorAddress: CREATOR,
      requiredLamports: 1_000_000_000,
      checkedAt: CHECKED_AT,
    },
    {
      rpcClient: rpcClient({ value: -1 }),
      creatorAddress: CREATOR,
      requiredLamports: 1_000_000_000,
      checkedAt: CHECKED_AT,
    },
    {
      rpcClient: rpcClient(),
      creatorAddress: "not-a-public-key",
      requiredLamports: 1_000_000_000,
      checkedAt: CHECKED_AT,
    },
    {
      rpcClient: rpcClient(),
      creatorAddress: CREATOR,
      requiredLamports: 999,
      checkedAt: CHECKED_AT,
    },
    {
      rpcClient: rpcClient(),
      creatorAddress: CREATOR,
      requiredLamports: 1_000_000_000,
      checkedAt: "not-a-time",
    },
    {
      rpcClient: rpcClient(),
      creatorAddress: CREATOR,
      requiredLamports: 1_000_000_000,
      checkedAt: CHECKED_AT,
      extra: true,
    },
  ]) {
    await assert.rejects(fetchWalletReadiness(input), /^Error: wallet-readiness-/);
  }
});
