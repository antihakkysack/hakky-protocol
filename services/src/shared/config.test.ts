import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTRACT_MAX_RESERVE_AGE_SECONDS,
  parseConfig,
  PILOT_MAX_SATS,
} from "./config.js";

const validLiveEnvironment: NodeJS.ProcessEnv = {
  OPERATING_MODE: "live",
  CHAIN_ID: "1",
  RPC_URL: "https://ethereum.example",
  DEPOSIT_VERIFICATION_MODE: "bitcoin-core",
  BITCOIN_NETWORK: "main",
  BITCOIN_RPC_URL: "http://127.0.0.1:8332",
  BITCOIN_RPC_USER: "hakky",
  BITCOIN_RPC_PASSWORD: "secret",
  BITCOIN_RPC_WALLET: "hakky-pilot",
  BITCOIN_CUSTODY_ADDRESS: "bc1qexample",
  BITCOIN_MIN_CONFIRMATIONS: "6",
  BITCOIN_PAYOUT_MIN_CONFIRMATIONS: "6",
  ADDR_CLEAN_BTC: `0x${"01".repeat(20)}`,
  ADDR_RESERVE_ORACLE: `0x${"02".repeat(20)}`,
  ADDR_ATTESTATION_REGISTRY: `0x${"03".repeat(20)}`,
  ADDR_COMPLIANCE_POLICY: `0x${"04".repeat(20)}`,
  ADDR_RESERVE_VAULT: `0x${"05".repeat(20)}`,
  SCREENING_PROVIDER: "manual-evidence",
  REDEMPTION_MODE: "manual-verified",
  REDEMPTION_START_BLOCK: "12345678",
  EVM_EVENT_CONFIRMATIONS: "12",
  BITCOIN_FEE_BUFFER_SATS: "200000",
  WRITE_API_KEY: "x".repeat(32),
};

test("pilot ceiling is exactly one BTC", () => {
  assert.equal(PILOT_MAX_SATS, 100_000_000n);
  assert.equal(CONTRACT_MAX_RESERVE_AGE_SECONDS, 43_200);
});

test("live configuration accepts only the fail-closed mainnet profile", () => {
  const config = parseConfig(validLiveEnvironment);
  assert.equal(config.OPERATING_MODE, "live");
  assert.equal(config.CHAIN_ID, 1);
  assert.equal(config.BITCOIN_NETWORK, "main");
  assert.equal(config.BITCOIN_MIN_CONFIRMATIONS, 6);
});

test("mainnet settings cannot silently run without live-mode checks", () => {
  // OPERATING_MODE defaults to "demo" and every fail-closed check is gated behind it,
  // so a single dropped environment line would disable bytecode, chain-id, role, and
  // settlement verification while the rest of the config still points at mainnet --
  // and REDEMPTION_MODE would fall back to demo-auto, settling real redemptions
  // against a synthetic txid with no BTC ever sent.
  const { OPERATING_MODE: _dropped, ...withoutOperatingMode } = validLiveEnvironment;

  assert.throws(
    () => parseConfig(withoutOperatingMode),
    /OPERATING_MODE/,
    "mainnet CHAIN_ID and BITCOIN_NETWORK must not run without live mode",
  );

  // Either mainnet indicator alone is enough to demand it.
  assert.throws(
    () => parseConfig({ ...withoutOperatingMode, BITCOIN_NETWORK: "signet" }),
    /OPERATING_MODE/,
    "mainnet CHAIN_ID alone must demand live mode",
  );
  assert.throws(
    () => parseConfig({ ...withoutOperatingMode, CHAIN_ID: "11155111" }),
    /OPERATING_MODE/,
    "Bitcoin mainnet alone must demand live mode",
  );
});

test("non-mainnet demo configuration still parses", () => {
  // The guard must not make ordinary local/testnet development impossible.
  const demo = parseConfig({});
  assert.equal(demo.OPERATING_MODE, "demo");
  assert.equal(demo.BITCOIN_NETWORK, "regtest");
});

test("live configuration requires a funded fee buffer", () => {
  // Payouts pay the recipient exactly, so miner fees come out of custody while
  // liabilities fall by the payout amount alone. Without operator-funded headroom
  // the first redemption puts reserves permanently below liabilities.
  for (const missing of ["0", ""]) {
    assert.throws(
      () => parseConfig({ ...validLiveEnvironment, BITCOIN_FEE_BUFFER_SATS: missing }),
      /fee buffer/,
      `expected a zero/absent buffer (${JSON.stringify(missing)}) to be rejected in live mode`,
    );
  }

  assert.throws(
    () => parseConfig({ ...validLiveEnvironment, BITCOIN_FEE_BUFFER_SATS: "-1" }),
    /fee buffer/,
  );
  assert.throws(
    () => parseConfig({ ...validLiveEnvironment, BITCOIN_FEE_BUFFER_SATS: "not-a-number" }),
    /fee buffer/,
  );

  assert.equal(parseConfig(validLiveEnvironment).BITCOIN_FEE_BUFFER_SATS, "200000");
});

test("live write services require distinct role-specific signers", () => {
  assert.throws(
    () =>
      parseConfig({
        ...validLiveEnvironment,
        SERVICE_ROLE: "orchestrator",
      }),
    /dedicated signer private key/,
  );

  const config = parseConfig({
    ...validLiveEnvironment,
    SERVICE_ROLE: "orchestrator",
    ORCHESTRATOR_SIGNER_PRIVATE_KEY: `0x${"11".repeat(32)}`,
  });
  assert.equal(config.SERVICE_ROLE, "orchestrator");
});

test("live configuration rejects demo verification, screening, and settlement", () => {
  assert.throws(
    () =>
      parseConfig({
        ...validLiveEnvironment,
        CHAIN_ID: "11155111",
        DEPOSIT_VERIFICATION_MODE: "stub",
        BITCOIN_NETWORK: "regtest",
        BITCOIN_MIN_CONFIRMATIONS: "1",
        BITCOIN_PAYOUT_MIN_CONFIRMATIONS: "1",
        SCREENING_PROVIDER: "stub",
        REDEMPTION_MODE: "demo-auto",
        REDEMPTION_START_BLOCK: "0",
        EVM_EVENT_CONFIRMATIONS: "2",
        RESERVE_MAX_STALENESS_SECONDS: "50000",
        ADDR_RESERVE_VAULT: "",
        WRITE_API_KEY: "short",
      }),
    (error: unknown) => {
      const message = String(error);
      return (
        message.includes("Ethereum mainnet") &&
        message.includes("bitcoin-core") &&
        message.includes("Bitcoin mainnet") &&
        message.includes("at least 6 Bitcoin confirmations") &&
        message.includes("at least 6 Bitcoin payout confirmations") &&
        message.includes("stub provenance") &&
        message.includes("verified manual redemption") &&
        message.includes("ReserveVault deployment block") &&
        message.includes("at least 12 EVM event confirmations") &&
        message.includes("12-hour minting limit") &&
        message.includes("ADDR_RESERVE_VAULT") &&
        message.includes("at least 32 characters")
      );
    },
  );
});
