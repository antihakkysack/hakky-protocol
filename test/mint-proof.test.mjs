import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { evaluateMintEvidence } from "../src/mint-proof.mjs";
import { MAINNET_BETA_GENESIS_HASH, assertMainnetIdentity, fetchMintEvidence } from "../src/solana-rpc.mjs";
import { publishJsonProof, resolveProofOutputPath } from "../src/proof-output.mjs";
import { main, readOptions, run } from "../scripts/verify-token.mjs";

const valid = {
  network: "mainnet-beta",
  tokenProgram: "spl-token",
  mint: "11111111111111111111111111111111",
  creator: "11111111111111111111111111111111",
  supplyBaseUnits: "1000000000000",
  decimals: 6,
  mintAuthority: null,
  freezeAuthority: null,
  creatorBalanceBaseUnits: "0",
};

function tokenAccountData({
  mint = new PublicKey(valid.mint),
  owner = new PublicKey(valid.creator),
  amount = 0n,
  state = 1,
} = {}) {
  const data = Buffer.alloc(AccountLayout.span);
  const zeroKey = new PublicKey(Buffer.alloc(32));
  AccountLayout.encode({
    mint,
    owner,
    amount,
    delegateOption: 0,
    delegate: zeroKey,
    state,
    isNativeOption: 0,
    isNative: 0n,
    delegatedAmount: 0n,
    closeAuthorityOption: 0,
    closeAuthority: zeroKey,
  }, data);
  return data;
}

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

test("fails closed when mint or creator is not a canonical Solana public key", () => {
  const result = evaluateMintEvidence({
    ...valid,
    mint: "not-a-public-key",
    creator: "also-not-a-public-key",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.checks.filter((check) => !check.ok).map((check) => check.id), [
    "mint-public-key",
    "creator-public-key",
  ]);
});

test("fails closed when direct evidence omits mint or creator", () => {
  const result = evaluateMintEvidence({ ...valid, mint: undefined, creator: undefined });
  assert.equal(result.ok, false);
  assert.deepEqual(result.checks.filter((check) => !check.ok).map((check) => check.id), [
    "mint-public-key",
    "creator-public-key",
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
  assert.equal(observed.creator, valid.creator);
  assert.equal(observed.creatorBalanceBaseUnits, "20");
});

test("reads and sums all classic token accounts returned by the owner-and-mint query", async () => {
  const observed = await fetchMintEvidence({
    connection: {
      async getTokenAccountsByOwner(creator, filter, commitment) {
        assert.equal(creator.toBase58(), valid.mint);
        assert.equal(filter.mint.toBase58(), valid.mint);
        assert.equal(commitment, "confirmed");
        return {
          value: [
            { account: { owner: TOKEN_PROGRAM_ID, data: tokenAccountData({ amount: 4n }) } },
            { account: { owner: TOKEN_PROGRAM_ID, data: tokenAccountData({ amount: 9n, state: 2 }) } },
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

test("rejects creator token accounts for the wrong mint or wallet owner", async () => {
  const wrongKey = new PublicKey("SysvarRent111111111111111111111111111111111");
  for (const [label, data] of [
    ["mint", tokenAccountData({ mint: wrongKey })],
    ["owner", tokenAccountData({ owner: wrongKey })],
  ]) {
    await assert.rejects(
      fetchMintEvidence({
        connection: {
          async getTokenAccountsByOwner() {
            return { value: [{ account: { owner: TOKEN_PROGRAM_ID, data } }] };
          },
        },
        network: "devnet",
        mintAddress: valid.mint,
        creatorAddress: valid.creator,
        readMint: async () => ({ supply: 0n, decimals: 6, mintAuthority: null, freezeAuthority: null }),
      }),
      new RegExp(`decoded ${label} does not match`),
    );
  }
});

test("rejects uninitialized, invalid-state, and wrong-program creator token accounts", async () => {
  for (const [label, account] of [
    ["uninitialized", { owner: TOKEN_PROGRAM_ID, data: tokenAccountData({ state: 0 }) }],
    ["invalid state", { owner: TOKEN_PROGRAM_ID, data: tokenAccountData({ state: 3 }) }],
    ["classic SPL Token program", {
      owner: new PublicKey("SysvarRent111111111111111111111111111111111"),
      data: tokenAccountData(),
    }],
  ]) {
    await assert.rejects(
      fetchMintEvidence({
        connection: {
          async getTokenAccountsByOwner() {
            return { value: [{ account }] };
          },
        },
        network: "devnet",
        mintAddress: valid.mint,
        creatorAddress: valid.creator,
        readMint: async () => ({ supply: 0n, decimals: 6, mintAuthority: null, freezeAuthority: null }),
      }),
      new RegExp(label),
    );
  }
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

test("confines proof output to a JSON file below the worktree proof directory", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-worktree-"));
  const proofDirectory = path.join(root, "proof");
  await mkdir(proofDirectory);
  assert.equal(resolveProofOutputPath("proof/evidence.json", { cwd: root }), path.join(proofDirectory, "evidence.json"));
  assert.throws(() => resolveProofOutputPath("proof/../escape.json", { cwd: root }), /--out must resolve below proof/);
  assert.throws(() => resolveProofOutputPath("proof/evidence.txt", { cwd: root }), /--out must name a .json file/);
});

test("CLI output resolution stays anchored to the verifier worktree", async () => {
  const worktree = process.cwd();
  const elsewhere = await mkdtemp(path.join(os.tmpdir(), "hakky-elsewhere-"));
  process.chdir(elsewhere);
  try {
    const options = readOptions(["--mint", valid.mint, "--creator", valid.creator, "--out", "proof/evidence.json"]);
    assert.equal(options.outputPath, path.join(worktree, "proof", "evidence.json"));
  } finally {
    process.chdir(worktree);
  }
});

test("atomically publishes complete JSON once and preserves an existing proof", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakky-publish-"));
  const outputPath = path.join(directory, "proof.json");
  const proof = { schemaVersion: 1, complete: true };
  await publishJsonProof(outputPath, proof);
  assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), proof);
  assert.deepEqual((await readdir(directory)).filter((name) => name.endsWith(".tmp")), []);
  await assert.rejects(publishJsonProof(outputPath, { complete: false }), { code: "EEXIST" });
  assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), proof);
});

test("never unlinks a temporary-name collision that the publisher did not create", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakky-publish-collision-"));
  const outputPath = path.join(directory, "proof.json");
  const collisionPath = path.join(directory, ".proof.json.existing-collision.tmp");
  const sentinel = "pre-existing collision bytes\n";
  await writeFile(collisionPath, sentinel);

  try {
    await assert.rejects(
      publishJsonProof(outputPath, { complete: true }, {
        randomUUIDImpl: () => "existing-collision",
      }),
      { code: "EEXIST" },
    );
    assert.equal(await readFile(collisionPath, "utf8"), sentinel);
    await assert.rejects(readFile(outputPath, "utf8"), { code: "ENOENT" });
  } finally {
    await unlink(collisionPath);
  }
});

test("reports a committed proof with unambiguous retry guidance when owned-temp unlink fails", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakky-publish-warning-"));
  const outputPath = path.join(directory, "proof.json");
  const proof = { schemaVersion: 1, complete: true };
  let temporaryPath;
  const cleanupFailure = Object.assign(new Error("synthetic owned-temp cleanup failure"), { code: "EPERM" });

  const outcome = await publishJsonProof(outputPath, proof, {
    randomUUIDImpl: () => "owned-temp-warning",
    unlinkImpl: async (candidate) => {
      temporaryPath = candidate;
      throw cleanupFailure;
    },
  });

  try {
    assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), proof);
    assert.deepEqual(JSON.parse(await readFile(temporaryPath, "utf8")), proof);
    assert.equal(outcome.published, true);
    assert.equal(outcome.outputPath, outputPath);
    assert.deepEqual(outcome.warnings.map(({ code }) => code), ["TEMP_UNLINK_FAILED"]);
    assert.match(outcome.warnings[0].message, /Proof is published\./);
    assert.match(outcome.warnings[0].message, /Do not retry publication\./);
    assert.equal(outcome.warnings[0].temporaryPath, temporaryPath);
  } finally {
    if (temporaryPath) await unlink(temporaryPath);
  }
});

test("CLI treats a committed proof cleanup warning as success and tells the operator not to retry", async () => {
  let stdout = "";
  let stderr = "";
  const warning = {
    code: "TEMP_UNLINK_FAILED",
    message: "Proof is published. Temporary cleanup failed. Do not retry publication. Remove only the owned temporary file shown in this warning.",
    temporaryPath: "proof/.proof.json.owned-temp.tmp",
  };
  const status = await main({
    stdout: { write(value) { stdout += value; } },
    stderr: { write(value) { stderr += value; } },
    runVerifier: async () => ({
      ok: true,
      publication: { published: true, outputPath: "proof/proof.json", warnings: [warning] },
    }),
  });

  assert.equal(status, 0);
  assert.match(stdout, /"published": true/);
  assert.match(stderr, /Proof is published\./);
  assert.match(stderr, /Do not retry publication\./);
  assert.doesNotMatch(stderr, /failed before publishing/i);
});

test("validates required CLI options before constructing a connection", async () => {
  assert.throws(() => readOptions([]), /Missing --mint/);
  assert.throws(() => readOptions(["--mint", valid.mint, "--creator", valid.mint, "--out", "proof/proof.json", "--rpc"]), /Missing --rpc/);
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

test("rejects an output path outside proof before constructing a connection", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-worktree-"));
  await mkdir(path.join(root, "proof"));
  let constructed = false;
  await assert.rejects(
    run({
      argv: ["--mint", valid.mint, "--creator", valid.creator, "--out", "../outside.json"],
      cwd: root,
      ConnectionClass: class {
        constructor() {
          constructed = true;
        }
      },
    }),
    /--out must resolve below proof/,
  );
  assert.equal(constructed, false);
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
      argv: ["--mint", valid.mint, "--creator", valid.mint, "--out", "proof/unused.json"],
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

test("CLI rejects evidence that is not attributable to the requested creator", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-worktree-"));
  await mkdir(path.join(root, "proof"));
  await assert.rejects(
    run({
      argv: ["--mint", valid.mint, "--creator", valid.creator, "--out", "proof/unused.json"],
      cwd: root,
      ConnectionClass: class {
        async getGenesisHash() {
          return MAINNET_BETA_GENESIS_HASH;
        }
      },
      fetchEvidence: async () => ({ ...valid, creator: "SysvarC1ock11111111111111111111111111111111" }),
    }),
    /Observed creator does not match the requested creator/,
  );
});

test("CLI creates one public proof artifact without the RPC query secret", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakky-proof-"));
  const proofDirectory = path.join(directory, "proof");
  await mkdir(proofDirectory);
  const outputPath = path.join(proofDirectory, "mainnet-mint.json");
  const secret = "fixture-rpc-query-value";
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

  await run({ argv: options, cwd: directory, ConnectionClass, fetchEvidence });
  const artifact = await readFile(outputPath, "utf8");
  assert.equal(JSON.parse(artifact).rpcHost, "rpc.example.test");
  assert.equal(JSON.parse(artifact).creator, valid.creator);
  assert.equal(artifact.includes(secret), false);
  await assert.rejects(run({ argv: options, cwd: directory, ConnectionClass, fetchEvidence }), { code: "EEXIST" });
});

test("CLI never publishes canonical mainnet mint proof when evaluated evidence fails", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakky-failed-proof-"));
  const proofDirectory = path.join(directory, "proof");
  await mkdir(proofDirectory);
  const outputPath = path.join(proofDirectory, "mainnet-mint.json");
  const proof = await run({
    argv: ["--mint", valid.mint, "--creator", valid.creator, "--out", outputPath],
    cwd: directory,
    ConnectionClass: class {
      async getGenesisHash() {
        return MAINNET_BETA_GENESIS_HASH;
      }
    },
    fetchEvidence: async () => ({ ...valid, creatorBalanceBaseUnits: "1" }),
  });
  assert.equal(proof.ok, false);
  await assert.rejects(readFile(outputPath, "utf8"), { code: "ENOENT" });
});

test("CLI redacts provider failures from stdout, stderr, and proof output", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-worktree-"));
  const proofDirectory = path.join(root, "proof");
  await mkdir(proofDirectory);
  const outputPath = path.join(proofDirectory, "mint-proof.json");
  const secret = "fixture-rpc-query-value";
  let stdout = "";
  let stderr = "";
  const status = await main({
    stdout: { write(value) { stdout += value; } },
    stderr: { write(value) { stderr += value; } },
    runVerifier: () => run({
      argv: [
        "--mint", valid.mint,
        "--creator", valid.creator,
        "--out", outputPath,
        "--rpc", `https://rpc.example.test/?api-key=${secret}`,
      ],
      cwd: root,
      ConnectionClass: class {
        async getGenesisHash() {
          return MAINNET_BETA_GENESIS_HASH;
        }
      },
      fetchEvidence: async () => valid,
      publishProof: async () => {
        throw new Error(`provider failure at https://rpc.example.test/?api-key=${secret}`);
      },
    }),
  });
  assert.equal(status, 1);
  assert.equal(stdout.includes(secret), false);
  assert.equal(stderr.includes(secret), false);
  await assert.rejects(readFile(outputPath, "utf8"), { code: "ENOENT" });
});
