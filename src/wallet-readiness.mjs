import { MAINNET_BETA_GENESIS_HASH } from "./solana-rpc.mjs";
import { decodeBase58 } from "./solana-transaction.mjs";

const INPUT_FIELDS = Object.freeze([
  "rpcClient",
  "creatorAddress",
  "requiredLamports",
  "checkedAt",
]);
const REQUIRED_LAMPORTS = 1_000_000_000;

function fail(code) {
  throw new Error(`wallet-readiness-${code}`);
}

function exactTimestamp(value) {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export async function fetchWalletReadiness(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)
    || Object.keys(input).sort().join(",") !== [...INPUT_FIELDS].sort().join(",")) {
    fail("input");
  }
  const {
    rpcClient,
    creatorAddress,
    requiredLamports,
    checkedAt,
  } = input;
  if (!rpcClient || typeof rpcClient.call !== "function"
    || typeof rpcClient.hostname !== "string"
    || rpcClient.hostname !== rpcClient.hostname.toLowerCase()
    || !/^[a-z0-9.-]+$/u.test(rpcClient.hostname)
    || requiredLamports !== REQUIRED_LAMPORTS
    || !exactTimestamp(checkedAt)) fail("input");
  try {
    decodeBase58(creatorAddress, { length: 32, code: "wallet-creator" });
  } catch {
    fail("creator");
  }

  let genesisHash;
  let balance;
  try {
    genesisHash = await rpcClient.call("getGenesisHash", []);
    balance = await rpcClient.call("getBalance", [
      creatorAddress,
      { commitment: "finalized" },
    ]);
  } catch {
    fail("rpc");
  }
  if (genesisHash !== MAINNET_BETA_GENESIS_HASH) fail("network");
  if (!Number.isSafeInteger(balance?.context?.slot) || balance.context.slot < 0
    || !Number.isSafeInteger(balance?.value) || balance.value < 0) fail("balance");
  const sufficientBalance = balance.value >= requiredLamports;
  const result = {
    schemaVersion: "wallet-readiness-v1",
    network: "mainnet-beta",
    creator: creatorAddress,
    genesisHash,
    finalizedBalanceLamports: String(balance.value),
    requiredLamports: String(requiredLamports),
    finalizedSlot: balance.context.slot,
    checkedAt,
    rpcHost: rpcClient.hostname,
    checks: {
      mainnetGenesis: true,
      creatorMatches: true,
      finalizedBalance: true,
      sufficientBalance,
    },
    ok: sufficientBalance,
  };
  return Object.freeze({
    ...result,
    checks: Object.freeze({ ...result.checks }),
  });
}
