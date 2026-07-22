import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { evaluateMintEvidence } from "../src/mint-proof.mjs";
import { MAINNET_BETA_GENESIS_HASH, assertMainnetIdentity, fetchMintEvidence } from "../src/solana-rpc.mjs";
import { readOptions, run } from "../scripts/verify-token.mjs";

const valid = {
  network: "mainnet-beta",
  tokenProgram: "spl-token",
  mint: "11111111111111111111111111111111",
  supplyBaseUnits: "1000000000000",
  decimals: 6,
  mintAuthority: null,
  freezeAuthority: null,
  creatorBalanceBaseUnits: "0",
};

test("accepts the approved immutable mint state", () => {
  const result = evaluateMintEvidence(valid);
  assert.equal(result.ok, true);
  assert.equal(result.checks.every((check) => check.ok), true);
});

test("rejects inflation, active authorities, and creator inventory", () => {
  const result = evaluateMintEvidence({
    ...valid,
    supplyBaseUnits: "1000000000001",
    mintAuthority: "MintAuthority1111111111111111111111111",
    freezeAuthority: "FreezeAuthority11111111111111111111111",
    creatorBalanceBaseUnits: "1",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.checks.filter((check) => !check.ok).map((check) => check.id), [
    "fixed-supply",
    "mint-authority-revoked",
    "freeze-authority-none",
    "creator-balance-zero",
  ]);
});

test("sums every classic token account owned by the creator", async () => {
  let mintRequest;
  let tokenAccountRequest;
  const observed = await fetchMintEvidence({
    connection: {},
    network: "devnet",
    mintAddress: valid.mint,
    creatorAddress: valid.mint,
    readMint: async (request) => {
      mintRequest = request;
      return {
        supply: 1_000_000_000_000n,
        decimals: 6,
        mintAuthority: null,
        freezeAuthority: null,
      };
    },
    readCreatorTokenAccounts: async (request) => {
      tokenAccountRequest = request;
      return [{ amount: 2n }, { amount: 7n }, { amount: 11n }];
    },
  });

  assert.equal(mintRequest.programId.toBase58(), TOKEN_PROGRAM_ID.toBase58());
  assert.equal(tokenAccountRequest.programId.toBase58(), TOKEN_PROGRAM_ID.toBase58());
  assert.equal(observed.network, "devnet");
  assert.equal(observed.tokenProgram, "spl-token");
  assert.equal(observed.creatorBalanceBaseUnits, "20");
});

test("reads and sums all classic token accounts returned by the owner-and-mint query", async () => {
  const tokenAccountData = (amount) => {
    const data = Buffer.alloc(AccountLayout.span);
    const zeroKey = new PublicKey(Buffer.alloc(32));
    AccountLayout.encode({
      mint: zeroKey,
      owner: zeroKey,
      amount,
      delegateOption: 0,
      delegate: zeroKey,
      state: 1,
      isNativeOption: 0,
      isNative: 0n,
      delegatedAmount: 0n,
      closeAuthorityOption: 0,
      closeAuthority: zeroKey,
    }, data);
    return data;
  };
  const observed = await fetchMintEvidence({
    connection: {
      async getTokenAccountsByOwner(creator, filter, commitment) {
        assert.equal(creator.toBase58(), valid.mint);
        assert.equal(filter.mint.toBase58(), valid.mint);
        assert.equal(commitment, "confirmed");
        return {
          value: [
            { account: { owner: TOKEN_PROGRAM_ID, data: tokenAccountData(4n) } },
            { account: { owner: TOKEN_PROGRAM_ID, data: tokenAccountData(9n) } },
          ],
        };
      },
    },
    network: "devnet",
    mintAddress: valid.mint,
    creatorAddress: valid.mint,
    readMint: async () => ({
      supply: 1_000_000_000_000n,
      decimals: 6,
      mintAuthority: null,
      freezeAuthority: null,
    }),
  });

  assert.equal(observed.creatorBalanceBaseUnits, "13");
});

test("rejects a non-mainnet RPC genesis hash before evidence collection", async () => {
  await assert.rejects(
    assertMainnetIdentity({ getGenesisHash: async () => "EtWTRABZaYq6iMfeYKouRu166VU2xqa1" }),
    /not mainnet-beta/,
  );
  await assert.doesNotReject(
    assertMainnetIdentity({ getGenesisHash: async () => MAINNET_BETA_GENESIS_HASH }),
  );
});

test("validates required CLI options before constructing a connection", async () => {
  assert.throws(() => readOptions([]), /Missing --mint/);
  assert.throws(() => readOptions(["--mint", valid.mint, "--creator", valid.mint, "--out", "proof.json", "--rpc"]), /Missing --rpc/);
  await assert.rejects(
    run({
      argv: [],
      ConnectionClass: class {
        constructor() {
          throw new Error("network construction must not happen");
        }
      },
    }),
    /Missing --mint/,
  );
});

test("rejects malformed public-key options before constructing a connection", async () => {
  await assert.rejects(
    run({
      argv: ["--mint", "not-a-public-key", "--creator", valid.mint, "--out", "unused.json"],
      ConnectionClass: class {
        constructor() {
          throw new Error("network construction must not happen");
        }
      },
    }),
    /Invalid --mint public key/,
  );
});

test("CLI verifies mainnet identity before asking for mint evidence", async () => {
  let evidenceFetched = false;
  await assert.rejects(
    run({
      argv: ["--mint", valid.mint, "--creator", valid.mint, "--out", "unused.json"],
      ConnectionClass: class {
        async getGenesisHash() {
          return "EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
        }
      },
      fetchEvidence: async () => {
        evidenceFetched = true;
        return valid;
      },
    }),
    /not mainnet-beta/,
  );
  assert.equal(evidenceFetched, false);
});

test("CLI creates one public proof artifact without the RPC query secret", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakky-proof-"));
  const outputPath = path.join(directory, "mint-proof.json");
  const secret = "private-rpc-query-value";
  const options = [
    "--mint", valid.mint,
    "--creator", valid.mint,
    "--out", outputPath,
    "--rpc", `https://rpc.example.test/?api-key=${secret}`,
  ];
  const ConnectionClass = class {
    async getGenesisHash() {
      return MAINNET_BETA_GENESIS_HASH;
    }
  };
  const fetchEvidence = async () => valid;

  await run({ argv: options, ConnectionClass, fetchEvidence });
  const artifact = await readFile(outputPath, "utf8");
  assert.equal(JSON.parse(artifact).rpcHost, "rpc.example.test");
  assert.equal(artifact.includes(secret), false);
  await assert.rejects(run({ argv: options, ConnectionClass, fetchEvidence }), { code: "EEXIST" });
});
