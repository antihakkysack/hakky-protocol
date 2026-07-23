import { VersionedTransaction } from "@solana/web3.js";
import {
  decodeGraduationAccounts,
  decodeLaunchlabAccounts,
  decodeLaunchlabCreationTransaction,
  decodeLaunchlabGraduationTransaction,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
} from "./raydium-launchlab.mjs";
import {
  assertMainnetIdentity,
  fetchFinalizedCreationTransaction,
  fetchFinalizedLookupTables,
} from "./solana-rpc.mjs";
import {
  decodeBase58,
  resolveFinalizedTransactionInstructions,
} from "./solana-transaction.mjs";

const INPUT_FIELDS = Object.freeze([
  "connection",
  "candidateStage",
  "creationSignature",
  "graduationSignature",
  "expectedMint",
  "expectedLaunchId",
]);
const DISCRIMINATORS = Object.freeze({
  "curve-live": "4399af27da102620",
  graduated: null,
});

function fail(code) {
  throw new Error(`stage-observation-${code}`);
}

function exactInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)
    || Object.keys(input).sort().join(",") !== [...INPUT_FIELDS].sort().join(",")) {
    fail("input");
  }
}

function canonicalPublicKey(value, code) {
  try {
    decodeBase58(value, { length: 32, code });
  } catch {
    fail("input");
  }
}

function canonicalSignature(value, code) {
  try {
    decodeBase58(value, { length: 64, code });
  } catch {
    fail("input");
  }
}

function exactBase64(value) {
  if (typeof value !== "string" || value.length === 0 || value.length % 4 !== 0) fail("account");
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) fail("account");
  return bytes;
}

async function fetchFinalizedAccounts(connection, addresses, minContextSlot) {
  const result = await connection.call("getMultipleAccounts", [
    addresses,
    {
      commitment: "finalized",
      encoding: "base64",
      minContextSlot,
    },
  ]);
  if (!result?.context || !Number.isSafeInteger(result.context.slot)
    || result.context.slot < minContextSlot
    || !Array.isArray(result.value) || result.value.length !== addresses.length) {
    fail("accounts");
  }
  return result.value.map((value, index) => {
    if (!value || typeof value.owner !== "string"
      || !Array.isArray(value.data) || value.data.length !== 2 || value.data[1] !== "base64") {
      fail("accounts");
    }
    return {
      address: addresses[index],
      owner: value.owner,
      data: exactBase64(value.data[0]),
    };
  });
}

function selectLifecycleInstruction(resolved, candidateStage) {
  const candidates = resolved.instructions.filter((instruction) => {
    if (instruction.programId !== RAYDIUM_LAUNCHLAB_PROGRAM_ID || instruction.data.length < 8) {
      return false;
    }
    const discriminator = instruction.data.subarray(0, 8).toString("hex");
    return candidateStage === "curve-live"
      ? discriminator === DISCRIMINATORS["curve-live"]
      : ["885cc8671cda908c", "cf52c091fecf91df"].includes(discriminator);
  });
  if (candidates.length !== 1) fail("instruction");
  return candidates[0];
}

async function resolveFinalizedLifecycleTransaction(connection, signature) {
  const transactionResponse = await fetchFinalizedCreationTransaction({
    rpcClient: connection,
    signature,
  });
  let transactionMessage;
  try {
    transactionMessage = VersionedTransaction.deserialize(
      Buffer.from(transactionResponse.transaction[0], "base64"),
    ).message;
  } catch {
    fail("transaction");
  }
  const lookupTableAccounts = await fetchFinalizedLookupTables({
    rpcClient: connection,
    transactionMessage,
    minContextSlot: transactionResponse.slot,
  });
  return resolveFinalizedTransactionInstructions({
    transactionResponse,
    lookupTableAccounts,
    requestedSignature: signature,
  });
}

function receipt(candidateStage, signature, resolved) {
  const checks = {
    mainnetGenesis: true,
    officialProgram: true,
    transactionFinalized: true,
    stageInstructionDecoded: true,
    launchAccountMatches: true,
    ...(candidateStage === "graduated" ? { poolObserved: true } : {}),
  };
  return {
    schemaVersion: "observed-stage-v1",
    network: "mainnet-beta",
    stage: candidateStage,
    mint: null,
    launchId: null,
    signature,
    finalizedSlot: resolved.slot,
    finalizedAt: new Date(resolved.blockTime * 1000).toISOString(),
    launchlabProgramId: RAYDIUM_LAUNCHLAB_PROGRAM_ID,
    checks,
    ok: true,
  };
}

export async function verifyObservedLifecycleStage(input) {
  exactInput(input);
  const {
    connection,
    candidateStage,
    creationSignature,
    graduationSignature,
    expectedMint,
    expectedLaunchId,
  } = input;
  if (!connection || typeof connection.call !== "function" || typeof connection.hostname !== "string"
    || !["curve-live", "graduated"].includes(candidateStage)) fail("input");
  canonicalPublicKey(expectedMint, "expected-mint");
  canonicalPublicKey(expectedLaunchId, "expected-launch");
  canonicalSignature(creationSignature, "creation-signature");
  if (candidateStage === "curve-live") {
    if (graduationSignature !== null) fail("input");
  } else {
    canonicalSignature(graduationSignature, "graduation-signature");
  }

  try {
    await assertMainnetIdentity(connection);
    const signature = candidateStage === "curve-live" ? creationSignature : graduationSignature;
    const resolved = await resolveFinalizedLifecycleTransaction(connection, signature);
    const instruction = selectLifecycleInstruction(resolved, candidateStage);
    const output = receipt(candidateStage, signature, resolved);

    if (candidateStage === "curve-live") {
      const decoded = decodeLaunchlabCreationTransaction({
        transactionBytes: instruction.data,
        accountKeys: instruction.accountKeys,
      });
      if (decoded.accounts.mint !== expectedMint || decoded.accounts.launchId !== expectedLaunchId) {
        fail("identity");
      }
      const [launchAccount, baseVault, quoteVault, platformConfigAccount] = await fetchFinalizedAccounts(
        connection,
        [
          decoded.accounts.launchId,
          decoded.accounts.baseVault,
          decoded.accounts.quoteVault,
          decoded.accounts.platformId,
        ],
        resolved.slot,
      );
      const accounts = decodeLaunchlabAccounts({
        launchAccount,
        vaultAccount: { baseVault, quoteVault },
        platformConfigAccount,
      });
      if (accounts.launch.status !== "fund" || accounts.launch.mintA !== expectedMint) {
        fail("launch-account");
      }
    } else {
      const decoded = decodeLaunchlabGraduationTransaction({
        transactionBytes: instruction.data,
        accountKeys: instruction.accountKeys,
      });
      const poolAddress = decoded.migrationType === "cpmm"
        ? decoded.accounts.cpmmPool
        : decoded.accounts.ammPool;
      if (decoded.accounts.baseMint !== expectedMint
        || decoded.accounts.launchId !== expectedLaunchId) fail("identity");
      const [launchAccount, poolAccount, platformConfigAccount] = await fetchFinalizedAccounts(
        connection,
        [decoded.accounts.launchId, poolAddress, decoded.accounts.platformConfig],
        resolved.slot,
      );
      const accounts = decodeGraduationAccounts({
        launchAccount,
        poolAccount,
        platformConfigAccount,
      });
      if (accounts.launch.status !== "trade"
        || accounts.launch.mintA !== expectedMint
        || accounts.launch.migrationType !== decoded.migrationType
        || accounts.pool.address !== poolAddress) fail("graduation-account");
    }
    output.mint = expectedMint;
    output.launchId = expectedLaunchId;
    return Object.freeze({
      ...output,
      checks: Object.freeze({ ...output.checks }),
    });
  } catch (error) {
    if (error?.message?.startsWith("stage-observation-")) throw error;
    fail("failed");
  }
}
