import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  DEVNET_GENESIS_HASH,
  confirmSignature,
  runDevnetRehearsal,
} from "../scripts/rehearse-devnet.mjs";

const mint = new PublicKey("11111111111111111111111111111111");
const creatorAta = new PublicKey("SysvarC1ock11111111111111111111111111111111");
const vaultAta = new PublicKey("SysvarRent111111111111111111111111111111111");

test("pins the complete canonical devnet genesis hash", () => {
  assert.equal(DEVNET_GENESIS_HASH, "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG");
});

test("rejects a non-devnet RPC before generating or funding an ephemeral payer", async () => {
  let generated = false;
  let requestedAirdrop = false;

  await assert.rejects(
    runDevnetRehearsal({
      connection: {
        async getGenesisHash() {
          return "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
        },
        async requestAirdrop() {
          requestedAirdrop = true;
        },
      },
      generateKeypair() {
        generated = true;
        return Keypair.generate();
      },
    }),
    /not devnet/,
  );

  assert.equal(generated, false);
  assert.equal(requestedAirdrop, false);
});

test("confirmation polling is bounded and reports a transaction failure", async () => {
  let attempts = 0;
  await assert.rejects(
    confirmSignature(
      {
        async getSignatureStatuses() {
          attempts += 1;
          return { value: [{ confirmationStatus: "confirmed", err: { InstructionError: [0, "Custom"] } }] };
        },
      },
      "safe-public-signature",
      { maxAttempts: 3, delayMs: 0 },
    ),
    /Devnet transaction failed/,
  );
  assert.equal(attempts, 1);

  attempts = 0;
  await assert.rejects(
    confirmSignature(
      {
        async getSignatureStatuses() {
          attempts += 1;
          return { value: [null] };
        },
      },
      "safe-public-signature",
      { maxAttempts: 3, delayMs: 0 },
    ),
    /not confirmed after 3 attempts/,
  );
  assert.equal(attempts, 3);
});

test("confirmation polling tolerates transient RPC failures within its bound", async () => {
  let attempts = 0;
  const status = await confirmSignature(
    {
      async getSignatureStatuses() {
        attempts += 1;
        if (attempts < 3) throw new Error("temporary RPC failure");
        return { value: [{ confirmationStatus: "finalized", err: null }] };
      },
    },
    "safe-public-signature",
    { maxAttempts: 3, delayMs: 0 },
  );
  assert.equal(status.confirmationStatus, "finalized");
  assert.equal(attempts, 3);
});

test("faucet retries stop at the configured bound with a clear devnet error", async () => {
  let attempts = 0;
  await assert.rejects(
    runDevnetRehearsal({
      connection: {
        async getGenesisHash() {
          return DEVNET_GENESIS_HASH;
        },
        async requestAirdrop() {
          attempts += 1;
          throw new Error("faucet unavailable");
        },
      },
      retryMaxAttempts: 2,
      retryDelayMs: 0,
    }),
    /Devnet faucet request failed after 2 attempts: faucet unavailable/,
  );
  assert.equal(attempts, 2);
});

test("creates classic fixed-supply evidence without persisting an ephemeral secret key", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-devnet-"));
  const payer = Keypair.fromSeed(Uint8Array.from({ length: 32 }, (_, index) => index + 1));
  const vaultOwner = Keypair.fromSeed(Uint8Array.from({ length: 32 }, (_, index) => 32 - index));
  const generated = [payer, vaultOwner];
  const calls = [];
  const connection = {
    async getGenesisHash() {
      return DEVNET_GENESIS_HASH;
    },
    async requestAirdrop(publicKey, lamports) {
      calls.push(["airdrop", publicKey.toBase58(), lamports]);
      return "airdrop-signature";
    },
    async getSignatureStatuses(signatures) {
      calls.push(["confirm", signatures]);
      return { value: [{ confirmationStatus: "confirmed", err: null }] };
    },
  };
  const accountByOwner = new Map([
    [payer.publicKey.toBase58(), { address: creatorAta }],
    [vaultOwner.publicKey.toBase58(), { address: vaultAta }],
  ]);
  const operations = {
    async createMint(...args) {
      calls.push(["createMint", args]);
      return mint;
    },
    async getOrCreateAssociatedTokenAccount(...args) {
      calls.push(["getAta", args]);
      return accountByOwner.get(args[3].toBase58());
    },
    async mintTo(...args) {
      calls.push(["mintTo", args]);
      return "mint-signature";
    },
    async transfer(...args) {
      calls.push(["transfer", args]);
      return "transfer-signature";
    },
    async setAuthority(...args) {
      calls.push(["setAuthority", args]);
      return "authority-signature";
    },
  };
  const proof = await runDevnetRehearsal({
    connection,
    outputRoot,
    generateKeypair: () => generated.shift(),
    operations,
    fetchEvidence: async (request) => {
      assert.equal(request.connection, connection);
      assert.equal(request.network, "mainnet-beta");
      assert.equal(request.mintAddress, mint.toBase58());
      assert.equal(request.creatorAddress, payer.publicKey.toBase58());
      return {
        network: "mainnet-beta",
        tokenProgram: "spl-token",
        mint: mint.toBase58(),
        creator: payer.publicKey.toBase58(),
        supplyBaseUnits: "1000000000000",
        decimals: 6,
        mintAuthority: null,
        freezeAuthority: null,
        creatorBalanceBaseUnits: "0",
      };
    },
    checkedAt: () => "2026-07-22T00:00:00.000Z",
    retryDelayMs: 0,
    confirmationDelayMs: 0,
  });

  assert.equal(proof.cluster, "devnet");
  assert.equal(proof.ok, true);
  assert.equal(proof.observed.supplyBaseUnits, "1000000000000");
  assert.equal(proof.observed.creatorBalanceBaseUnits, "0");

  const createMintCall = calls.find(([name]) => name === "createMint")[1];
  assert.equal(createMintCall[3], null);
  assert.equal(createMintCall[4], 6);
  assert.equal(createMintCall[7].toBase58(), TOKEN_PROGRAM_ID.toBase58());

  const mintToCall = calls.find(([name]) => name === "mintTo")[1];
  assert.equal(mintToCall[5], 1_000_000_000_000n);
  assert.equal(mintToCall[8].toBase58(), TOKEN_PROGRAM_ID.toBase58());

  const transferCall = calls.find(([name]) => name === "transfer")[1];
  assert.equal(transferCall[5], 1_000_000_000_000n);
  assert.equal(transferCall[8].toBase58(), TOKEN_PROGRAM_ID.toBase58());

  const authorityCall = calls.find(([name]) => name === "setAuthority")[1];
  assert.equal(authorityCall[5], null);
  assert.equal(authorityCall[8].toBase58(), TOKEN_PROGRAM_ID.toBase58());

  const artifact = await readFile(path.join(outputRoot, "artifacts", "devnet-rehearsal", "proof.json"), "utf8");
  assert.deepEqual(JSON.parse(artifact), proof);
  const compactArtifact = JSON.stringify(JSON.parse(artifact));
  assert.equal(compactArtifact.includes(JSON.stringify(Array.from(payer.secretKey))), false);
  assert.equal(compactArtifact.includes(JSON.stringify(Array.from(vaultOwner.secretKey))), false);
});
