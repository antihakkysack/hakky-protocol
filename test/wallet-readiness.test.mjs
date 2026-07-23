import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  parseWalletOptions,
  runWalletVerifier,
} from "../scripts/verify-wallet-readiness.mjs";
import {
  serializeMetadataManifest,
  serializeMetadataReadback,
} from "../src/metadata-integrity.mjs";
import { MAINNET_SESSION_PATHS } from "../src/mainnet-session-artifact.mjs";
import { MAINNET_BETA_GENESIS_HASH } from "../src/solana-rpc.mjs";
import { fetchWalletReadiness } from "../src/wallet-readiness.mjs";
import { createLaunchlabPreviewFixture } from "../test-support/launchlab-preview-fixtures.mjs";

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

test("the wallet CLI validates immutable metadata, exact paths, and the fixed one-SOL bound", async () => {
  const fixture = createLaunchlabPreviewFixture();
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-wallet-cli-"));
  try {
    await mkdir(path.join(repositoryRoot, "artifacts", "metadata"), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, "artifacts", "metadata", "manifest.json"),
      serializeMetadataManifest(fixture.metadataManifest),
    );
    await writeFile(
      path.join(repositoryRoot, "artifacts", "metadata", "readback.json"),
      serializeMetadataReadback(fixture.metadataReadback),
    );
    const writes = [];
    const client = rpcClient({ value: 2_000_000_000 });
    const receipt = await runWalletVerifier({
      argv: [
        "--creator", fixture.creator,
        "--metadata-readback", "artifacts/metadata/readback.json",
        "--out", MAINNET_SESSION_PATHS.walletReadiness,
      ],
      repositoryRoot,
      createRpcClient: () => client,
      now: () => new Date(CHECKED_AT),
      writeImpl: async (input) => { writes.push(input); },
    });
    assert.equal(receipt.requiredLamports, "1000000000");
    assert.equal(receipt.creator, fixture.creator);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].relativePath, MAINNET_SESSION_PATHS.walletReadiness);
    assert.throws(() => parseWalletOptions([
      "--creator", fixture.creator,
      "--metadata-readback", "artifacts/metadata/readback.json",
      "--out", MAINNET_SESSION_PATHS.walletReadiness,
      "--required-lamports", "1",
    ]), /Usage:/u);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
});
