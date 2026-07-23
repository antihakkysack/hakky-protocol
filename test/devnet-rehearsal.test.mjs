import assert from "node:assert/strict";
import {
  access,
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AccountLayout,
  AuthorityType,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  DEVNET_GENESIS_HASH,
  assertDevnetRehearsalProofV2,
  confirmSignature,
  evaluateDevnetRehearsalEvidence,
  fetchDevnetRehearsalEvidence,
  parseRehearsalOptions,
  runDevnetRehearsal,
  waitForExternalFunding,
  withDeadline,
} from "../scripts/rehearse-devnet.mjs";

const mint = new PublicKey("11111111111111111111111111111111");
const creatorAta = new PublicKey("SysvarC1ock11111111111111111111111111111111");
const vaultAta = new PublicKey("SysvarRent111111111111111111111111111111111");

function validEvidence({ payer = Keypair.generate(), vaultOwner = Keypair.generate() } = {}) {
  return {
    cluster: "devnet",
    genesisHash: DEVNET_GENESIS_HASH,
    tokenProgram: TOKEN_PROGRAM_ID.toBase58(),
    mint: mint.toBase58(),
    payer: payer.publicKey.toBase58(),
    vaultOwner: vaultOwner.publicKey.toBase58(),
    supplyBaseUnits: "1000000000000",
    decimals: 6,
    mintAuthority: null,
    freezeAuthority: null,
    payerTokenBalanceBaseUnits: "0",
    vaultTokenBalanceBaseUnits: "1000000000000",
    observation: {
      commitment: "finalized",
      slot: 42,
      checkedAt: "2026-07-23T00:00:00.000Z",
    },
  };
}

function clone(value) {
  return structuredClone(value);
}

function injectedFileSystem(overrides = {}) {
  return { link, lstat, mkdir, open, realpath, unlink, ...overrides };
}

function successfulOperationsFor(payer) {
  return {
    async createMint() {
      return mint;
    },
    async getOrCreateAssociatedTokenAccount(_connection, _payer, _mint, owner) {
      return { address: owner.equals(payer.publicKey) ? creatorAta : vaultAta };
    },
    async mintTo() {},
    async transfer() {},
    async setAuthority() {},
  };
}

function successfulRunnerOptions({ outputRoot, fundingMode = "external" }) {
  const payer = Keypair.generate();
  const vaultOwner = Keypair.generate();
  const generated = [payer, vaultOwner];
  return {
    payer,
    vaultOwner,
    options: {
      fundingMode,
      connection: {
        async getGenesisHash() {
          return DEVNET_GENESIS_HASH;
        },
        async getBalance() {
          return 2_000_000_000;
        },
        async requestAirdrop() {
          return "airdrop-signature";
        },
        async getSignatureStatuses() {
          return { value: [{ confirmationStatus: "finalized", err: null }] };
        },
      },
      outputRoot,
      generateKeypair: () => generated.shift(),
      onExternalAddress: async () => {},
      onPublicationWarning: async () => {},
      operations: successfulOperationsFor(payer),
      fetchEvidence: async () => validEvidence({ payer, vaultOwner }),
      identityDelayMs: 0,
      faucetDelayMs: 0,
      fundingDelayMs: 0,
      confirmationDelayMs: 0,
    },
  };
}

function mintAccountInfo() {
  const data = Buffer.alloc(MintLayout.span);
  MintLayout.encode({
    mintAuthorityOption: 0,
    mintAuthority: PublicKey.default,
    supply: 1_000_000_000_000n,
    decimals: 6,
    isInitialized: true,
    freezeAuthorityOption: 0,
    freezeAuthority: PublicKey.default,
  }, data);
  return { data, owner: TOKEN_PROGRAM_ID, executable: false, lamports: 1, rentEpoch: 0 };
}

function tokenAccountEntry({ address, owner, amount }) {
  const data = Buffer.alloc(AccountLayout.span);
  AccountLayout.encode({
    mint,
    owner,
    amount,
    delegateOption: 0,
    delegate: PublicKey.default,
    state: 1,
    isNativeOption: 0,
    isNative: 0n,
    delegatedAmount: 0n,
    closeAuthorityOption: 0,
    closeAuthority: PublicKey.default,
  }, data);
  return {
    pubkey: address,
    account: { data, owner: TOKEN_PROGRAM_ID, executable: false, lamports: 1, rentEpoch: 0 },
  };
}

test("pins the complete canonical devnet genesis hash", () => {
  assert.equal(DEVNET_GENESIS_HASH, "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG");
});

test("parses only the two supported funding modes", () => {
  assert.deepEqual(parseRehearsalOptions([]), { fundingMode: "faucet" });
  assert.deepEqual(parseRehearsalOptions(["--external-funding"]), { fundingMode: "external" });
  for (const invalid of [
    ["--unknown"],
    ["--external-funding", "--external-funding"],
    ["--external-funding=true"],
    ["--EXTERNAL-FUNDING"],
    ["external"],
    ["--external-funding", "extra"],
    "--external-funding",
  ]) {
    assert.throws(() => parseRehearsalOptions(invalid), /Usage:/);
  }
});

test("deadline validates its contract, invokes once, and sanitizes dependency text", async () => {
  let calls = 0;
  assert.equal(await withDeadline(async () => {
    calls += 1;
    return 7;
  }, 100), 7);
  assert.equal(calls, 1);
  await assert.rejects(
    withDeadline(async () => { throw new Error("private dependency text"); }, 100),
    (error) => error.message === "DEADLINE_OPERATION_FAILED" && !error.message.includes("private"),
  );
  await assert.rejects(withDeadline(() => new Promise(() => {}), 10), /DEADLINE_TIMEOUT/);
  await assert.rejects(withDeadline(null, 10), /OPTION_ERROR/);
  await assert.rejects(withDeadline(() => {}, 0), /OPTION_ERROR/);
});

test("external balance polling is finalized, bounded, and recovers from transient errors", async () => {
  const payer = Keypair.generate();
  let attempts = 0;
  const result = await waitForExternalFunding({
    connection: {
      async getBalance(address, commitment) {
        assert.equal(address.toBase58(), payer.publicKey.toBase58());
        assert.equal(commitment, "finalized");
        attempts += 1;
        if (attempts < 3) throw new Error("transient secret-bearing RPC text");
        return 2_000_000_000;
      },
    },
    address: payer.publicKey,
    minimumLamports: 2_000_000_000n,
    maxAttempts: 3,
    delayMs: 0,
    maxWaitMs: 1_000,
  });
  assert.equal(result, 2_000_000_000n);
  assert.equal(attempts, 3);

  attempts = 0;
  await assert.rejects(waitForExternalFunding({
    connection: {
      async getBalance() {
        attempts += 1;
        return 1;
      },
    },
    address: payer.publicKey,
    minimumLamports: 2n,
    maxAttempts: 3,
    delayMs: 0,
    maxWaitMs: 1_000,
  }), /FUNDING_ERROR/);
  assert.equal(attempts, 3);

  await assert.rejects(waitForExternalFunding({
    connection: { async getBalance() { return 2; } },
    address: payer.publicKey,
    minimumLamports: 2n,
    maxAttempts: 1,
    delayMs: 0,
    maxWaitMs: 600_001,
  }), /OPTION_ERROR/);
});

test("independent evidence evaluator and v2 proof validator reject shape and policy drift", () => {
  const evidence = validEvidence();
  const proof = evaluateDevnetRehearsalEvidence(evidence);
  assert.equal(assertDevnetRehearsalProofV2(proof), proof);
  assert.deepEqual(proof.checks.map(({ id }) => id), [
    "devnet-genesis",
    "classic-token-program",
    "canonical-identities",
    "fixed-supply",
    "six-decimals",
    "mint-authority-revoked",
    "freeze-authority-none",
    "payer-token-balance-zero",
    "vault-token-balance-full",
    "finalized-observation",
  ]);

  const unknownEvidence = clone(evidence);
  unknownEvidence.unknown = true;
  assert.throws(() => evaluateDevnetRehearsalEvidence(unknownEvidence), /EVIDENCE_ERROR/);
  const unknownObservation = clone(evidence);
  unknownObservation.observation.unknown = true;
  assert.throws(() => evaluateDevnetRehearsalEvidence(unknownObservation), /EVIDENCE_ERROR/);

  const evidencePolicyMutations = [
    (value) => { value.genesisHash = "wrong"; },
    (value) => { value.tokenProgram = "11111111111111111111111111111111"; },
    (value) => { value.mint = "not-a-key"; },
    (value) => { value.supplyBaseUnits = "999"; },
    (value) => { value.decimals = 9; },
    (value) => { value.mintAuthority = value.payer; },
    (value) => { value.freezeAuthority = value.payer; },
    (value) => { value.payerTokenBalanceBaseUnits = "1"; },
    (value) => { value.vaultTokenBalanceBaseUnits = "999"; },
    (value) => { value.observation.commitment = "confirmed"; },
    (value) => { value.observation.slot = -1; },
    (value) => { value.observation.checkedAt = "2026-07-23T00:00:00Z"; },
  ];
  for (const mutate of evidencePolicyMutations) {
    const candidate = clone(evidence);
    mutate(candidate);
    assert.throws(
      () => assertDevnetRehearsalProofV2(evaluateDevnetRehearsalEvidence(candidate)),
      /EVIDENCE_ERROR/,
    );
  }

  const mutations = [
    (value) => { value.unknown = true; },
    (value) => { delete value.checkedAt; },
    (value) => { value.identities.unknown = true; },
    (value) => { value.supply.unknown = true; },
    (value) => { value.authorities.unknown = true; },
    (value) => { value.balances.unknown = true; },
    (value) => { value.observation.unknown = true; },
    (value) => { value.checks[0].unknown = true; },
    (value) => { [value.checks[0], value.checks[1]] = [value.checks[1], value.checks[0]]; },
    (value) => { value.checkedAt = "2026-07-23T00:00:00Z"; },
    (value) => { value.observation.checkedAt = "2026-07-23T00:00:01.000Z"; },
    (value) => { value.checks[0].ok = false; },
  ];
  for (const mutate of mutations) {
    const candidate = clone(proof);
    mutate(candidate);
    assert.throws(() => assertDevnetRehearsalProofV2(candidate), /EVIDENCE_ERROR/);
  }
});

test("fetches finalized raw classic-token evidence for exhaustive payer and vault owner sets", async () => {
  const payer = Keypair.generate();
  const vaultOwner = Keypair.generate();
  const requests = [];
  const evidence = await fetchDevnetRehearsalEvidence({
    connection: {
      async getSlot(commitment) {
        assert.equal(commitment, "finalized");
        return 40;
      },
      async getAccountInfoAndContext(address, config) {
        requests.push(["mint", address.toBase58(), config]);
        return { context: { slot: 41 }, value: mintAccountInfo() };
      },
      async getTokenAccountsByOwner(owner, filter, config) {
        requests.push(["owner", owner.toBase58(), filter.programId.toBase58(), config]);
        return {
          context: { slot: owner.equals(payer.publicKey) ? 42 : 43 },
          value: [tokenAccountEntry({
            address: owner.equals(payer.publicKey) ? creatorAta : vaultAta,
            owner,
            amount: owner.equals(payer.publicKey) ? 0n : 1_000_000_000_000n,
          })],
        };
      },
    },
    genesisHash: DEVNET_GENESIS_HASH,
    mintAddress: mint.toBase58(),
    payerAddress: payer.publicKey.toBase58(),
    vaultOwnerAddress: vaultOwner.publicKey.toBase58(),
    checkedAt: () => "2026-07-23T00:00:00.000Z",
  });
  assert.equal(evidence.payerTokenBalanceBaseUnits, "0");
  assert.equal(evidence.vaultTokenBalanceBaseUnits, "1000000000000");
  assert.equal(evidence.observation.slot, 41);
  assert.deepEqual(requests, [
    ["mint", mint.toBase58(), { commitment: "finalized", minContextSlot: 40 }],
    ["owner", payer.publicKey.toBase58(), TOKEN_PROGRAM_ID.toBase58(), { commitment: "finalized", minContextSlot: 40 }],
    ["owner", vaultOwner.publicKey.toBase58(), TOKEN_PROGRAM_ID.toBase58(), { commitment: "finalized", minContextSlot: 40 }],
  ]);
});

test("external funding announces only the public address and never requests an airdrop", async () => {
  assert.equal(typeof waitForExternalFunding, "function");
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-external-funding-"));
  const payer = Keypair.fromSeed(Uint8Array.from({ length: 32 }, (_, index) => index + 1));
  const vaultOwner = Keypair.fromSeed(Uint8Array.from({ length: 32 }, (_, index) => 32 - index));
  const generated = [payer, vaultOwner];
  const announcements = [];
  const balanceCommitments = [];
  let airdropCalls = 0;

  const proof = await runDevnetRehearsal({
    fundingMode: "external",
    connection: {
      async getGenesisHash() {
        return DEVNET_GENESIS_HASH;
      },
      async getBalance(address, commitment) {
        assert.equal(address.toBase58(), payer.publicKey.toBase58());
        balanceCommitments.push(commitment);
        return 2_000_000_000;
      },
      async requestAirdrop() {
        airdropCalls += 1;
        return "must-not-be-called";
      },
    },
    outputRoot,
    generateKeypair: () => generated.shift(),
    onExternalAddress: async (message) => announcements.push(message),
    onPublicationWarning: () => {},
    operations: {
      async createMint() {
        return mint;
      },
      async getOrCreateAssociatedTokenAccount(_connection, _payer, _mint, owner) {
        return { address: owner.equals(payer.publicKey) ? creatorAta : vaultAta };
      },
      async mintTo() {},
      async transfer() {},
      async setAuthority() {},
    },
    fetchEvidence: async () => ({
      cluster: "devnet",
      genesisHash: DEVNET_GENESIS_HASH,
      tokenProgram: TOKEN_PROGRAM_ID.toBase58(),
      mint: mint.toBase58(),
      payer: payer.publicKey.toBase58(),
      vaultOwner: vaultOwner.publicKey.toBase58(),
      supplyBaseUnits: "1000000000000",
      decimals: 6,
      mintAuthority: null,
      freezeAuthority: null,
      payerTokenBalanceBaseUnits: "0",
      vaultTokenBalanceBaseUnits: "1000000000000",
      observation: {
        commitment: "finalized",
        slot: 1,
        checkedAt: "2026-07-23T00:00:00.000Z",
      },
    }),
    fundingMaxAttempts: 1,
    fundingDelayMs: 0,
  });

  assert.equal(proof.ok, true);
  assert.equal(airdropCalls, 0);
  assert.deepEqual(balanceCommitments, ["finalized"]);
  assert.deepEqual(announcements, [{
    address: payer.publicKey.toBase58(),
    minimumLamports: "2000000000",
  }]);
  assert.doesNotMatch(
    JSON.stringify(announcements),
    new RegExp(Buffer.from(payer.secretKey).toString("hex"), "i"),
  );
});

test("rejects a non-devnet RPC before generating or funding an ephemeral payer", async () => {
  let generated = false;
  let requestedAirdrop = false;
  let balancePolls = 0;
  let disclosures = 0;

  await assert.rejects(
    runDevnetRehearsal({
      connection: {
        async getGenesisHash() {
          return "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
        },
        async requestAirdrop() {
          requestedAirdrop = true;
        },
        async getBalance() {
          balancePolls += 1;
          return 2_000_000_000;
        },
      },
      fundingMode: "external",
      onExternalAddress: async () => { disclosures += 1; },
      generateKeypair() {
        generated = true;
        return Keypair.generate();
      },
    }),
    /IDENTITY_ERROR/,
  );

  assert.equal(generated, false);
  assert.equal(requestedAirdrop, false);
  assert.equal(balancePolls, 0);
  assert.equal(disclosures, 0);
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
    /CONFIRMATION_ERROR/,
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
    /CONFIRMATION_ERROR/,
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
        async getSignatureStatuses() {
          return { value: [null] };
        },
      },
      faucetMaxAttempts: 2,
      faucetDelayMs: 0,
    }),
    /FUNDING_ERROR/,
  );
  assert.equal(attempts, 2);
});

test("removes a stale successful proof before every later failed rehearsal stage", async (t) => {
  for (const failureStage of ["identity", "faucet", "transaction", "evidence"]) {
    await t.test(failureStage, async () => {
      const outputRoot = await mkdtemp(path.join(os.tmpdir(), `hakky-stale-${failureStage}-`));
      const artifactDirectory = path.join(outputRoot, "artifacts", "devnet-rehearsal");
      const proofPath = path.join(artifactDirectory, "proof.json");
      await mkdir(artifactDirectory, { recursive: true });
      await writeFile(proofPath, '{"ok":true,"stale":true}\n');

      const payer = Keypair.generate();
      const vaultOwner = Keypair.generate();
      const generated = [payer, vaultOwner];
      const connection = {
        async getGenesisHash() {
          return failureStage === "identity"
            ? "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
            : DEVNET_GENESIS_HASH;
        },
        async requestAirdrop() {
          if (failureStage === "faucet") throw new Error("faucet unavailable");
          return "airdrop-signature";
        },
        async getSignatureStatuses() {
          return { value: [{ confirmationStatus: "finalized", err: null }] };
        },
      };
      const operations = {
        async createMint() {
          if (failureStage === "transaction") throw new Error("transaction failed");
          return mint;
        },
        async getOrCreateAssociatedTokenAccount(_connection, _payer, _mint, owner) {
          return { address: owner.equals(payer.publicKey) ? creatorAta : vaultAta };
        },
        async mintTo() {},
        async transfer() {},
        async setAuthority() {},
      };

      await assert.rejects(
        runDevnetRehearsal({
          connection,
          outputRoot,
          generateKeypair: () => generated.shift(),
          operations,
          fetchEvidence: async () => ({ network: "mainnet-beta" }),
          evaluateEvidence: () => failureStage === "evidence"
            ? { ok: false, checks: [{ id: "fixed-supply", ok: false }] }
            : { ok: true, checks: [] },
          identityMaxAttempts: 1,
          identityDelayMs: 0,
          faucetMaxAttempts: 1,
          faucetDelayMs: 0,
          confirmationDelayMs: 0,
        }),
      );
      await assert.rejects(access(proofPath), { code: "ENOENT" });
    });
  }
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
      return { value: [{ confirmationStatus: "finalized", err: null }] };
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
      calls.push(["fetchEvidence", request]);
      assert.equal(request.connection, connection);
      assert.equal(request.mintAddress, mint.toBase58());
      assert.equal(request.payerAddress, payer.publicKey.toBase58());
      assert.equal(request.vaultOwnerAddress, vaultOwner.publicKey.toBase58());
      return {
        cluster: "devnet",
        genesisHash: DEVNET_GENESIS_HASH,
        tokenProgram: TOKEN_PROGRAM_ID.toBase58(),
        mint: mint.toBase58(),
        payer: payer.publicKey.toBase58(),
        vaultOwner: vaultOwner.publicKey.toBase58(),
        supplyBaseUnits: "1000000000000",
        decimals: 6,
        mintAuthority: null,
        freezeAuthority: null,
        payerTokenBalanceBaseUnits: "0",
        vaultTokenBalanceBaseUnits: "1000000000000",
        observation: {
          commitment: "finalized",
          slot: 42,
          checkedAt: "2026-07-22T00:00:00.000Z",
        },
      };
    },
    checkedAt: () => "2026-07-22T00:00:00.000Z",
    identityDelayMs: 0,
    faucetDelayMs: 0,
    confirmationDelayMs: 0,
  });

  assert.equal(proof.cluster, "devnet");
  assert.equal(proof.ok, true);
  assert.equal(proof.schemaVersion, "devnet-rehearsal-v2");
  assert.equal(proof.supply.baseUnits, "1000000000000");
  assert.equal(proof.balances.payerBaseUnits, "0");
  assert.equal(proof.balances.vaultBaseUnits, "1000000000000");

  assert.deepEqual(calls.map(([name]) => name), [
    "airdrop",
    "confirm",
    "createMint",
    "getAta",
    "getAta",
    "mintTo",
    "transfer",
    "setAuthority",
    "fetchEvidence",
  ]);

  const createMintCall = calls.find(([name]) => name === "createMint")[1];
  assert.equal(createMintCall[0], connection);
  assert.equal(createMintCall[1], payer);
  assert.equal(createMintCall[2].toBase58(), payer.publicKey.toBase58());
  assert.equal(createMintCall[3], null);
  assert.equal(createMintCall[4], 6);
  assert.equal(createMintCall[7].toBase58(), TOKEN_PROGRAM_ID.toBase58());

  const ataCalls = calls.filter(([name]) => name === "getAta").map(([, args]) => args);
  assert.equal(ataCalls.length, 2);
  for (const ataCall of ataCalls) {
    assert.equal(ataCall[0], connection);
    assert.equal(ataCall[1], payer);
    assert.equal(ataCall[2].toBase58(), mint.toBase58());
    assert.equal(ataCall[7].toBase58(), TOKEN_PROGRAM_ID.toBase58());
    assert.equal(ataCall[8].toBase58(), ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());
  }
  assert.equal(ataCalls[0][3].toBase58(), payer.publicKey.toBase58());
  assert.equal(ataCalls[1][3].toBase58(), vaultOwner.publicKey.toBase58());

  const mintToCall = calls.find(([name]) => name === "mintTo")[1];
  assert.equal(mintToCall[0], connection);
  assert.equal(mintToCall[1], payer);
  assert.equal(mintToCall[2].toBase58(), mint.toBase58());
  assert.equal(mintToCall[3].toBase58(), creatorAta.toBase58());
  assert.equal(mintToCall[4], payer);
  assert.equal(mintToCall[5], 1_000_000_000_000n);
  assert.equal(mintToCall[8].toBase58(), TOKEN_PROGRAM_ID.toBase58());

  const transferCall = calls.find(([name]) => name === "transfer")[1];
  assert.equal(transferCall[0], connection);
  assert.equal(transferCall[1], payer);
  assert.equal(transferCall[2].toBase58(), creatorAta.toBase58());
  assert.equal(transferCall[3].toBase58(), vaultAta.toBase58());
  assert.equal(transferCall[4], payer);
  assert.equal(transferCall[5], 1_000_000_000_000n);
  assert.equal(transferCall[8].toBase58(), TOKEN_PROGRAM_ID.toBase58());

  const authorityCall = calls.find(([name]) => name === "setAuthority")[1];
  assert.equal(authorityCall[0], connection);
  assert.equal(authorityCall[1], payer);
  assert.equal(authorityCall[2].toBase58(), mint.toBase58());
  assert.equal(authorityCall[3], payer);
  assert.equal(authorityCall[4], AuthorityType.MintTokens);
  assert.equal(authorityCall[5], null);
  assert.equal(authorityCall[8].toBase58(), TOKEN_PROGRAM_ID.toBase58());

  const artifact = await readFile(path.join(outputRoot, "artifacts", "devnet-rehearsal", "proof.json"), "utf8");
  assert.deepEqual(JSON.parse(artifact), proof);
  const compactArtifact = JSON.stringify(JSON.parse(artifact));
  assert.equal(compactArtifact.includes(JSON.stringify(Array.from(payer.secretKey))), false);
  assert.equal(compactArtifact.includes(JSON.stringify(Array.from(vaultOwner.secretKey))), false);
});

test("funding branches exactly once and never fall back", async () => {
  const externalRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-branch-external-"));
  const external = successfulRunnerOptions({ outputRoot: externalRoot, fundingMode: "external" });
  let externalAnnouncements = 0;
  let balanceCalls = 0;
  let airdropCalls = 0;
  external.options.onExternalAddress = async () => { externalAnnouncements += 1; };
  external.options.connection.getBalance = async (_address, commitment) => {
    assert.equal(commitment, "finalized");
    balanceCalls += 1;
    return 2_000_000_000;
  };
  external.options.connection.requestAirdrop = async () => {
    airdropCalls += 1;
    throw new Error("must not run");
  };
  await runDevnetRehearsal(external.options);
  assert.equal(externalAnnouncements, 1);
  assert.equal(balanceCalls, 1);
  assert.equal(airdropCalls, 0);

  const faucetRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-branch-faucet-"));
  const faucet = successfulRunnerOptions({ outputRoot: faucetRoot, fundingMode: "faucet" });
  let faucetBalanceCalls = 0;
  let faucetAnnouncements = 0;
  let faucetAirdrops = 0;
  faucet.options.onExternalAddress = async () => { faucetAnnouncements += 1; };
  faucet.options.connection.getBalance = async () => { faucetBalanceCalls += 1; return 2_000_000_000; };
  faucet.options.connection.requestAirdrop = async () => { faucetAirdrops += 1; return "airdrop"; };
  await runDevnetRehearsal(faucet.options);
  assert.equal(faucetBalanceCalls, 0);
  assert.equal(faucetAnnouncements, 0);
  assert.equal(faucetAirdrops, 1);
});

test("external callback and polling failures never fall back to the faucet", async (t) => {
  for (const failure of ["callback", "poll"]) {
    await t.test(failure, async () => {
      const outputRoot = await mkdtemp(path.join(os.tmpdir(), `hakky-no-fallback-${failure}-`));
      const fixture = successfulRunnerOptions({ outputRoot, fundingMode: "external" });
      let airdropCalls = 0;
      fixture.options.connection.requestAirdrop = async () => { airdropCalls += 1; };
      if (failure === "callback") {
        fixture.options.onExternalAddress = async () => { throw new Error("secret callback text"); };
      } else {
        fixture.options.connection.getBalance = async () => { throw new Error("secret RPC text"); };
        fixture.options.fundingMaxAttempts = 2;
      }
      await assert.rejects(
        runDevnetRehearsal(fixture.options),
        (error) => error.message === "FUNDING_ERROR" && !error.message.includes("secret"),
      );
      assert.equal(airdropCalls, 0);
    });
  }
});

test("invalid options and stale cleanup failures stop before connection, keys, or disclosure", async () => {
  const invalidRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-invalid-order-"));
  const invalidProofPath = path.join(invalidRoot, "artifacts", "devnet-rehearsal", "proof.json");
  await mkdir(path.dirname(invalidProofPath), { recursive: true });
  await writeFile(invalidProofPath, "stale\n");
  let unlinkCalls = 0;
  let connectionCalls = 0;
  await assert.rejects(runDevnetRehearsal({
    fundingMode: "EXTERNAL",
    outputRoot: invalidRoot,
    createConnection: async () => { connectionCalls += 1; return {}; },
    fileSystem: injectedFileSystem({
      async unlink(target) {
        unlinkCalls += 1;
        return unlink(target);
      },
    }),
  }), /OPTION_ERROR/);
  assert.equal(unlinkCalls, 0);
  assert.equal(connectionCalls, 0);
  assert.equal(await readFile(invalidProofPath, "utf8"), "stale\n");

  await assert.rejects(runDevnetRehearsal({
    fundingMode: "external",
    connection: {},
    outputRoot: invalidRoot,
    onExternalAddress: async () => {},
    fileSystem: injectedFileSystem({
      async unlink(target) {
        unlinkCalls += 1;
        return unlink(target);
      },
    }),
  }), /OPTION_ERROR/);
  assert.equal(unlinkCalls, 0);
  assert.equal(await readFile(invalidProofPath, "utf8"), "stale\n");

  const cleanupRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-cleanup-order-"));
  let generated = 0;
  let disclosed = 0;
  connectionCalls = 0;
  await assert.rejects(runDevnetRehearsal({
    fundingMode: "external",
    outputRoot: cleanupRoot,
    createConnection: async () => { connectionCalls += 1; return {}; },
    generateKeypair: () => { generated += 1; return Keypair.generate(); },
    onExternalAddress: async () => { disclosed += 1; },
    fileSystem: injectedFileSystem({
      async unlink() {
        const error = new Error("secret cleanup dependency text");
        error.code = "EACCES";
        throw error;
      },
    }),
  }), (error) => error.message === "CLEANUP_ERROR" && !error.message.includes("secret"));
  assert.equal(connectionCalls, 0);
  assert.equal(generated, 0);
  assert.equal(disclosed, 0);
});

test("exclusive publication preserves a concurrent proof and fails closed", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-publication-conflict-"));
  const fixture = successfulRunnerOptions({ outputRoot });
  const proofPath = path.join(outputRoot, "artifacts", "devnet-rehearsal", "proof.json");
  fixture.options.fileSystem = injectedFileSystem({
    async link() {
      await writeFile(proofPath, "concurrent\n", { flag: "wx" });
      const error = new Error("already exists");
      error.code = "EEXIST";
      throw error;
    },
  });
  await assert.rejects(runDevnetRehearsal(fixture.options), /PUBLICATION_CONFLICT/);
  assert.equal(await readFile(proofPath, "utf8"), "concurrent\n");
});

test("post-commit temporary cleanup warning does not invalidate or retry publication", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-publication-warning-"));
  const fixture = successfulRunnerOptions({ outputRoot });
  const warnings = [];
  let linkCalls = 0;
  fixture.options.onPublicationWarning = async (code) => warnings.push(code);
  fixture.options.fileSystem = injectedFileSystem({
    async link(source, destination) {
      linkCalls += 1;
      return link(source, destination);
    },
    async unlink(target) {
      if (path.basename(target).startsWith(".proof-") && target.endsWith(".tmp")) {
        const error = new Error("post-commit secret cleanup text");
        error.code = "EACCES";
        throw error;
      }
      return unlink(target);
    },
  });
  const proof = await runDevnetRehearsal(fixture.options);
  assert.equal(proof.ok, true);
  assert.equal(linkCalls, 1);
  assert.deepEqual(warnings, ["TEMP_UNLINK_FAILED"]);
  const published = await readFile(
    path.join(outputRoot, "artifacts", "devnet-rehearsal", "proof.json"),
    "utf8",
  );
  assert.equal(published, `${JSON.stringify(proof, null, 2)}\n`);
});
