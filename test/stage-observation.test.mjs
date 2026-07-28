import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
} from "../src/raydium-launchlab.mjs";
import { MAINNET_BETA_GENESIS_HASH } from "../src/solana-rpc.mjs";
import { encodeBase58 } from "../src/solana-transaction.mjs";
import { verifyObservedLifecycleStage } from "../src/stage-observation.mjs";

const fixture = async (name) => JSON.parse(await readFile(
  `test-support/fixtures/launchlab/${name}.json`,
  "utf8",
));

function rpcAccount(value) {
  return {
    owner: value.owner,
    data: [value.dataBase64, "base64"],
  };
}

function signedTransaction(source, mutateKeys = () => {}) {
  const payer = Keypair.generate();
  const accountNames = Object.keys(source.expected.accounts);
  const accountKeys = [...source.orderedAccountKeys];
  accountKeys[accountNames.indexOf("payer")] = payer.publicKey.toBase58();
  mutateKeys({ accountNames, accountKeys });
  const instruction = new TransactionInstruction({
    programId: new PublicKey(RAYDIUM_LAUNCHLAB_PROGRAM_ID),
    keys: accountKeys.map((publicKey, index) => ({
      pubkey: new PublicKey(publicKey),
      isSigner: index === accountNames.indexOf("payer"),
      isWritable: index === accountNames.indexOf("payer"),
    })),
    data: Buffer.from(source.instructionBase64, "base64"),
  });
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: "11111111111111111111111111111111",
    instructions: [instruction],
  }).compileToLegacyMessage();
  const transaction = new VersionedTransaction(message);
  transaction.sign([payer]);
  const signature = encodeBase58(transaction.signatures[0]);
  return {
    signature,
    response: {
      slot: 300000010,
      blockTime: 1784764860,
      version: "legacy",
      meta: { err: null, innerInstructions: [] },
      transaction: [Buffer.from(transaction.serialize()).toString("base64"), "base64"],
    },
  };
}

function rpcClient({ transaction, accounts, overrides = {} }) {
  return {
    hostname: "api.mainnet-beta.solana.com",
    async call(method, parameters) {
      if (method === "getGenesisHash") {
        return overrides.genesisHash ?? MAINNET_BETA_GENESIS_HASH;
      }
      if (method === "getTransaction") {
        assert.equal(parameters[0], transaction.signature);
        return overrides.transactionResponse ?? transaction.response;
      }
      if (method === "getSignatureStatuses") {
        return {
          value: [{
            err: null,
            confirmationStatus: overrides.confirmationStatus ?? "finalized",
            slot: transaction.response.slot,
          }],
        };
      }
      if (method === "getMultipleAccounts") {
        return {
          context: { slot: transaction.response.slot },
          value: parameters[0].map((address) => accounts.get(address) ?? null),
        };
      }
      throw new Error(`unexpected RPC method ${method}`);
    },
  };
}

test("finalized creation evidence produces the exact public-only curve receipt", async () => {
  const transactionFixture = await fixture("initialize-v2-transaction");
  const accountFixture = await fixture("curve-accounts");
  const transaction = signedTransaction(transactionFixture);
  const accounts = new Map([
    [accountFixture.accounts.launch.address, rpcAccount(accountFixture.accounts.launch)],
    [accountFixture.accounts.baseVault.address, rpcAccount(accountFixture.accounts.baseVault)],
    [accountFixture.accounts.quoteVault.address, rpcAccount(accountFixture.accounts.quoteVault)],
    [accountFixture.accounts.platformConfig.address, rpcAccount(accountFixture.accounts.platformConfig)],
  ]);
  const result = await verifyObservedLifecycleStage({
    connection: rpcClient({ transaction, accounts }),
    candidateStage: "curve-live",
    creationSignature: transaction.signature,
    graduationSignature: null,
    expectedMint: transactionFixture.expected.accounts.mint,
    expectedLaunchId: transactionFixture.expected.accounts.launchId,
  });
  assert.deepEqual(Object.keys(result), [
    "schemaVersion",
    "network",
    "stage",
    "mint",
    "launchId",
    "signature",
    "finalizedSlot",
    "finalizedAt",
    "launchlabProgramId",
    "checks",
    "ok",
  ]);
  assert.equal(result.stage, "curve-live");
  assert.equal(result.signature, transaction.signature);
  assert.equal(result.finalizedSlot, transaction.response.slot);
  assert.equal(result.launchlabProgramId, RAYDIUM_LAUNCHLAB_PROGRAM_ID);
  assert.deepEqual(result.checks, {
    mainnetGenesis: true,
    officialProgram: true,
    transactionFinalized: true,
    stageInstructionDecoded: true,
    launchAccountMatches: true,
  });
  assert.equal(result.ok, true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.checks), true);
});

test("finalized migration and raw pool evidence produce a graduated receipt", async () => {
  const transactionFixture = await fixture("migrate-to-cpswap-transaction");
  const accountFixture = (await fixture("graduation-accounts")).cpmm;
  const transaction = signedTransaction(transactionFixture, ({ accountNames, accountKeys }) => {
    accountKeys[accountNames.indexOf("cpmmPool")] = accountFixture.accounts.pool.address;
  });
  const accounts = new Map([
    [accountFixture.accounts.launch.address, rpcAccount(accountFixture.accounts.launch)],
    [accountFixture.accounts.pool.address, rpcAccount(accountFixture.accounts.pool)],
    [accountFixture.accounts.platformConfig.address, rpcAccount(accountFixture.accounts.platformConfig)],
  ]);
  const result = await verifyObservedLifecycleStage({
    connection: rpcClient({ transaction, accounts }),
    candidateStage: "graduated",
    creationSignature: "1".repeat(64),
    graduationSignature: transaction.signature,
    expectedMint: transactionFixture.expected.accounts.baseMint,
    expectedLaunchId: transactionFixture.expected.accounts.launchId,
  });
  assert.equal(result.stage, "graduated");
  assert.equal(result.signature, transaction.signature);
  assert.deepEqual(result.checks, {
    mainnetGenesis: true,
    officialProgram: true,
    transactionFinalized: true,
    stageInstructionDecoded: true,
    launchAccountMatches: true,
    poolObserved: true,
  });
});

test("observer fails closed on nonfinal, wrong-chain, mismatched, missing, or unknown evidence", async () => {
  const transactionFixture = await fixture("initialize-v2-transaction");
  const accountFixture = await fixture("curve-accounts");
  const transaction = signedTransaction(transactionFixture);
  const accounts = new Map([
    [accountFixture.accounts.launch.address, rpcAccount(accountFixture.accounts.launch)],
    [accountFixture.accounts.baseVault.address, rpcAccount(accountFixture.accounts.baseVault)],
    [accountFixture.accounts.quoteVault.address, rpcAccount(accountFixture.accounts.quoteVault)],
    [accountFixture.accounts.platformConfig.address, rpcAccount(accountFixture.accounts.platformConfig)],
  ]);
  const input = {
    connection: rpcClient({ transaction, accounts }),
    candidateStage: "curve-live",
    creationSignature: transaction.signature,
    graduationSignature: null,
    expectedMint: transactionFixture.expected.accounts.mint,
    expectedLaunchId: transactionFixture.expected.accounts.launchId,
  };
  for (const mutate of [
    (candidate) => {
      candidate.connection = rpcClient({
        transaction,
        accounts,
        overrides: { confirmationStatus: "confirmed" },
      });
    },
    (candidate) => {
      candidate.connection = rpcClient({
        transaction,
        accounts,
        overrides: { genesisHash: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1" },
      });
    },
    (candidate) => { candidate.expectedMint = candidate.expectedLaunchId; },
    (candidate) => {
      const missing = new Map(accounts);
      missing.delete(accountFixture.accounts.launch.address);
      candidate.connection = rpcClient({ transaction, accounts: missing });
    },
    (candidate) => { candidate.candidateStage = "unknown"; },
    (candidate) => { candidate.extra = true; },
  ]) {
    const candidate = { ...input };
    mutate(candidate);
    await assert.rejects(
      verifyObservedLifecycleStage(candidate),
      /stage-observation-/,
    );
  }
});
