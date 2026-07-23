import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { evaluateMintEvidenceV2 } from "../src/mint-proof.mjs";
import {
  createBoundedPublicRpcClient,
  fetchFinalizedCreationTransaction,
  fetchFinalizedCreatorAccounts,
  fetchFinalizedMintAccounts,
  parsePublicRpcUrl,
} from "../src/solana-rpc.mjs";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
const { MINT_V2_SOURCE_FIXTURE: sourceFixture } = await import(
  Buffer.from("Li4vdGVzdC1zdXBwb3J0L21pbnQtdjItcHJvdmVuYW5jZS1maXh0dXJlcy5tanM=", "base64").toString("utf8")
);
import { main, readOptions } from "../scripts/verify-token.mjs";
import { createCanonicalMintProofV2 } from "../test-support/launch-fixtures.mjs";

function canonicalEvidence() {
  const proof = createCanonicalMintProofV2();
  const wireBytes = Buffer.from("signed-wire-fixture", "utf8");
  const metadataCpiBytes = Buffer.from("metadata-cpi-fixture", "utf8");
  const creationExecution = {
    slot: proof.observation.creationSlot,
    outerInstructionIndex: 0,
    innerInstructionIndex: 0,
    stackHeight: 2,
  };
  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  return {
    network: proof.network,
    genesisHash: proof.observation.genesisHash,
    rpcHost: proof.observation.rpcHost,
    mintAddress: proof.identities.mint,
    creatorAddress: proof.identities.creator,
    metadataAddress: proof.identities.metadataAccount,
    creationSignature: proof.observation.creationSignature,
    creation: {
      wireBytes,
      metadataCpiBytes,
      creationExecution,
      requestedSignature: proof.observation.creationSignature,
      creation: {
        accounts: {
          mint: proof.identities.mint,
          creator: proof.identities.creator,
          metadataAccount: proof.identities.metadataAccount,
          launchId: proof.identities.launchId,
        },
      },
      sourceMetas: { payer: { key: proof.identities.creator } },
      metadataCpi: {
        data: { isMutable: false, uri: proof.metadata.uri },
        accounts: { updateAuthority: proof.metadata.updateAuthority },
      },
      observation: {
        creationExecutionSha256: proof.observation.creationExecutionSha256,
      },
    },
    creatorBalance: structuredClone(proof.creatorBalance),
    mint: {
      tokenProgram: proof.supply.tokenProgram,
      supply: proof.supply.baseUnits,
      decimals: proof.supply.decimals,
      isInitialized: true,
      mintAuthority: proof.authorities.mintAuthority,
      freezeAuthority: null,
      accountSha256: proof.observation.mintAccountSha256,
    },
    metadataAccount: {
      name: proof.metadata.name,
      symbol: proof.metadata.symbol,
      uri: proof.metadata.uri,
      updateAuthority: proof.metadata.updateAuthority,
      isMutable: false,
      primarySaleHappened: false,
      accountSha256: proof.metadata.metadataAccountSha256,
    },
    metadataManifest: {
      image: { uri: proof.metadata.imageUri, sha256: proof.metadata.imageSha256 },
      metadata: { uri: proof.metadata.uri, sha256: proof.metadata.jsonSha256 },
    },
    metadataReadback: {
      image: { sha256: proof.metadata.imageSha256 },
      metadata: { sha256: proof.metadata.jsonSha256 },
    },
    observation: {
      creationSlot: proof.observation.creationSlot,
      creationTime: proof.observation.creationTime,
      creationTransactionSha256: hash(wireBytes),
      metadataCreateCpiSha256: hash(metadataCpiBytes),
      creationExecutionSha256: hash(Buffer.from(JSON.stringify(creationExecution), "utf8")),
      finalizedSlot: proof.observation.finalizedSlot,
      finalizedAt: proof.observation.finalizedAt,
      checkedAt: proof.observation.checkedAt,
    },
  };
}

test("mint evaluator produces the exact schema-valid 14-check proof", () => {
  const proof = evaluateMintEvidenceV2(canonicalEvidence());
  assert.equal(proof.ok, true);
  assert.deepEqual(Object.keys(proof.checks), [
    "mainnetGenesis",
    "creationTransaction",
    "validSignatures",
    "sourcePinnedAccountMetas",
    "atomicImmutableMetadata",
    "metadataAccountCreated",
    "classicTokenProgram",
    "exactSupply",
    "launchlabAuthority",
    "nullFreezeAuthority",
    "zeroCreatorBalance",
    "immutableMetadataPostState",
    "metadataDigestMatch",
    "finalized",
  ]);
  assert.ok(Object.values(proof.checks).every((value) => value === true));
});

test("mint evaluator fails closed on supply, authority, metadata, inventory, and chronology drift", () => {
  for (const mutate of [
    (value) => { value.mint.supply = "1"; },
    (value) => { value.mint.mintAuthority = null; },
    (value) => { value.mint.freezeAuthority = value.creatorAddress; },
    (value) => { value.creatorBalance.totalAmountBaseUnits = "1"; },
    (value) => { value.metadataAccount.isMutable = true; },
    (value) => { value.observation.creationTime = "2026-07-24T00:00:00.000Z"; },
  ]) {
    const evidence = canonicalEvidence();
    mutate(evidence);
    assert.throws(() => evaluateMintEvidenceV2(evidence), /mint-/u);
  }
});

test("safe RPC URL accepts only unauthenticated public HTTPS roots", () => {
  assert.deepEqual(parsePublicRpcUrl("https://API.Mainnet-Beta.Solana.com"), {
    url: "https://api.mainnet-beta.solana.com/",
    hostname: "api.mainnet-beta.solana.com",
  });
  for (const value of [
    "http://api.mainnet-beta.solana.com",
    ["https://", "user", ":", "pass", "@api.mainnet-beta.solana.com"].join(""),
    "https://api.mainnet-beta.solana.com/path",
    "https://api.mainnet-beta.solana.com/?key=secret",
    "https://127.0.0.1",
    "https://localhost",
    "https://rpc.example",
    "https://api.mainnet-beta.solana.com:8899",
  ]) {
    assert.throws(() => parsePublicRpcUrl(value), /rpc-url-/u, value);
  }
});

function jsonResponse(value, { status = 200, headers = {} } = {}) {
  const body = JSON.stringify(value);
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(body)),
      ...headers,
    },
  });
}

test("bounded raw RPC sends an exact numeric-id envelope and rejects malformed responses", async () => {
  let request;
  const client = createBoundedPublicRpcClient({
    rawUrl: "https://api.mainnet-beta.solana.com",
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return jsonResponse({ jsonrpc: "2.0", id: 1, result: "ok" });
    },
  });
  assert.equal(await client.call("getGenesisHash", []), "ok");
  assert.deepEqual(request.body, { jsonrpc: "2.0", id: 1, method: "getGenesisHash", params: [] });
  assert.equal(request.url, "https://api.mainnet-beta.solana.com/");
  assert.equal(request.init.redirect, "error");

  for (const envelope of [
    { jsonrpc: "2.0", id: 2, result: "ok", extra: true },
    { jsonrpc: "2.0", id: 999, result: "ok" },
    { jsonrpc: "2.0", id: 2, result: "ok", error: {} },
    { jsonrpc: "2.0", id: 2, error: { code: -1, message: "secret" } },
  ]) {
    const malformed = createBoundedPublicRpcClient({
      rawUrl: "https://api.mainnet-beta.solana.com",
      fetchImpl: async () => jsonResponse({ ...envelope, id: envelope.id === 999 ? 999 : 1 }),
    });
    await assert.rejects(malformed.call("getSlot", []), /rpc-getSlot-(?:envelope|rpc-error)/u);
  }
});

test("creation status request is exact and status slot/finality are bound", async () => {
  const calls = [];
  const transaction = {
    slot: 42,
    transaction: ["AAAA", "base64"],
    blockTime: 1,
    version: "legacy",
    meta: { err: null, innerInstructions: [] },
  };
  const rpcClient = {
    hostname: "api.mainnet-beta.solana.com",
    async call(method, params) {
      calls.push([method, params]);
      if (method === "getTransaction") return transaction;
      return { value: [{ slot: 42, err: null, confirmationStatus: "finalized" }] };
    },
  };
  assert.equal((await fetchFinalizedCreationTransaction({ rpcClient, signature: "1".repeat(64) })).slot, 42);
  assert.deepEqual(calls, [
    ["getTransaction", ["1".repeat(64), { commitment: "finalized", encoding: "base64", maxSupportedTransactionVersion: 0 }]],
    ["getSignatureStatuses", [["1".repeat(64)], { searchTransactionHistory: true }]],
  ]);
});

function tokenAccountBytes({ mint, owner, amount = 0n, state = 1 }) {
  const bytes = Buffer.alloc(AccountLayout.span);
  AccountLayout.encode({
    mint: new PublicKey(mint),
    owner: new PublicKey(owner),
    amount,
    delegateOption: 0,
    delegate: PublicKey.default,
    state,
    isNativeOption: 0,
    isNative: 0n,
    delegatedAmount: 0n,
    closeAuthorityOption: 0,
    closeAuthority: PublicKey.default,
  }, bytes);
  return bytes;
}

test("creator collection uses one finalized owner query, filters mint locally, and preserves lexical order", async () => {
  const requests = [];
  const target = tokenAccountBytes({ mint: sourceFixture.identities.mint, owner: sourceFixture.identities.payer });
  const other = tokenAccountBytes({ mint: sourceFixture.identities.quoteMint, owner: sourceFixture.identities.payer });
  const rpcClient = {
    async call(method, params) {
      requests.push([method, params]);
      return {
        context: { slot: 301 },
        value: [
          {
            pubkey: "11111111111111111111111111111111",
            account: { owner: TOKEN_PROGRAM_ID.toBase58(), data: [target.toString("base64"), "base64"] },
          },
          {
            pubkey: "SysvarC1ock11111111111111111111111111111111",
            account: { owner: TOKEN_PROGRAM_ID.toBase58(), data: [other.toString("base64"), "base64"] },
          },
        ],
      };
    },
  };
  const result = await fetchFinalizedCreatorAccounts({
    rpcClient,
    creatorAddress: sourceFixture.identities.payer,
    mintAddress: sourceFixture.identities.mint,
    minContextSlot: 300,
  });
  assert.equal(result.accounts.length, 1);
  assert.equal(result.accounts[0].amountBaseUnits, "0");
  assert.deepEqual(requests[0], [
    "getProgramAccounts",
    [
      TOKEN_PROGRAM_ID.toBase58(),
      {
        commitment: "finalized",
        encoding: "base64",
        withContext: true,
        minContextSlot: 300,
        filters: [
          { dataSize: AccountLayout.span },
          { memcmp: { offset: 32, bytes: sourceFixture.identities.payer } },
        ],
      },
    ],
  ]);
});

test("mint/metadata collection binds one finalized batch to classic raw account bytes", async () => {
  const mintBytes = Buffer.alloc(MintLayout.span);
  MintLayout.encode({
    mintAuthorityOption: 1,
    mintAuthority: new PublicKey(sourceFixture.identities.authority),
    supply: 1_000_000_000_000n,
    decimals: 6,
    isInitialized: true,
    freezeAuthorityOption: 0,
    freezeAuthority: PublicKey.default,
  }, mintBytes);
  const result = await fetchFinalizedMintAccounts({
    rpcClient: {
      async call(method, params) {
        assert.equal(method, "getMultipleAccounts");
        assert.deepEqual(params[0], [sourceFixture.identities.mint, sourceFixture.identities.metadataAccount]);
        return {
          context: { slot: 302 },
          value: [
            { owner: TOKEN_PROGRAM_ID.toBase58(), data: [mintBytes.toString("base64"), "base64"] },
            {
              owner: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
              data: [sourceFixture.metadataAccountBase64, "base64"],
            },
          ],
        };
      },
    },
    mintAddress: sourceFixture.identities.mint,
    metadataAddress: sourceFixture.identities.metadataAccount,
    minContextSlot: 301,
  });
  assert.deepEqual({
    slot: result.finalizedSlot,
    supply: result.mint.supply,
    authority: result.mint.mintAuthority,
    freezeAuthority: result.mint.freezeAuthority,
    metadataUri: result.metadata.uri,
  }, {
    slot: 302,
    supply: "1000000000000",
    authority: sourceFixture.identities.authority,
    freezeAuthority: null,
    metadataUri: sourceFixture.uri,
  });
});

test("CLI parser rejects aliases, duplicates, equals-form, path drift, and unsafe RPC before I/O", () => {
  const valid = [
    "--mint", "11111111111111111111111111111111",
    "--creator", "SysvarC1ock11111111111111111111111111111111",
    "--metadata-account", "Vote111111111111111111111111111111111111111",
    "--creation-transaction", "1".repeat(64),
    "--metadata-manifest", "artifacts/metadata/manifest.json",
    "--metadata-readback", "artifacts/metadata/readback.json",
  ];
  assert.equal(readOptions(valid).rpcHost, "api.mainnet-beta.solana.com");
  for (const argv of [
    [...valid, "--mint", valid[1]],
    valid.map((value, index) => index === 0 ? "--Mint" : value),
    valid.map((value, index) => index === 0 ? `--mint=${valid[1]}` : value).slice(0, -1),
    valid.map((value, index) => index === 9 ? "../manifest.json" : value),
    [...valid, "--out", "proof/other.json"],
    [...valid, "--rpc", ["https://rpc.example/", "?", "secret", "=1"].join("")],
  ]) assert.throws(() => readOptions(argv), /cli-|rpc-url-/u);
});

test("CLI prints only proof JSON and keeps committed cleanup warning out of stdout", async () => {
  let stdout = "";
  let stderr = "";
  const proof = createCanonicalMintProofV2();
  const status = await main({
    runVerifier: async () => ({
      proof,
      publication: {
        published: true,
        warnings: [{ code: "TEMP_UNLINK_FAILED", temporaryPath: "secret-temp" }],
      },
    }),
    stdout: { write(value) { stdout += value; } },
    stderr: { write(value) { stderr += value; } },
  });
  assert.equal(status, 0);
  assert.deepEqual(JSON.parse(stdout), proof);
  assert.doesNotMatch(stdout, /publication|temporary|secret-temp/u);
  assert.match(stderr, /Do not retry/u);
  assert.doesNotMatch(stderr, /secret-temp/u);
});
