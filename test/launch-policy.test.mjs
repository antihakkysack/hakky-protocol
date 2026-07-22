import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";

const record = JSON.parse(await readFile(new URL("../web/data/launch.json", import.meta.url), "utf8"));

function createValidLiveRecord() {
  const changed = structuredClone(record);
  changed.status = "live";
  changed.token.mint = "11111111111111111111111111111111";
  changed.proof = {
    mint: changed.token.mint,
    launchId: "11111111111111111111111111111111",
    launchTransaction: "1111111111111111111111111111111111111111111111111111111111111111",
    solscanUrl: `https://solscan.io/token/${changed.token.mint}`,
    raydiumUrl: `https://raydium.io/launchpad/token/?mint=${changed.token.mint}`,
    verifiedAt: "2026-07-22T00:00:00.000Z",
    supplyBaseUnits: "1000000000000",
    decimals: 6,
    tokenProgram: "spl-token",
    mintAuthority: null,
    freezeAuthority: null,
    creatorBalanceBaseUnits: "0",
    metadataImmutable: true,
    metadataName: "Hakky Protocol",
    metadataSymbol: "HAKKY",
    metadataUri: "https://hakky.xyz/metadata.json",
    metadataImage: "https://hakky.xyz/assets/token.png",
    metadataWebsite: "https://hakky.xyz",
    metadataX: "https://x.com/antihakkysack",
    curveAllocationBps: 8000,
    liquidityAllocationBps: 2000,
    teamAllocationBps: 0,
    creatorFeeEnabled: false,
    lpPolicy: "burn",
    quoteAsset: "SOL",
    graduationTargetSol: 24,
    creatorFirstBuySol: 0,
    creatorSpendSol: 0.25,
  };
  return changed;
}

test("approved prelaunch record is valid", () => {
  assert.deepEqual(validateLaunchRecord(record), []);
});

test("rejects supply inflation and team allocation", () => {
  const changed = structuredClone(record);
  changed.token.supplyBaseUnits = "2000000000000";
  changed.launch.teamAllocationBps = 500;
  assert.deepEqual(validateLaunchRecord(changed), [
    "token.supplyBaseUnits must equal 1000000000000",
    "launch.teamAllocationBps must equal 0",
  ]);
});

test("rejects hidden token controls and private launch paths", () => {
  const changed = structuredClone(record);
  changed.token.mintAuthority = "active";
  changed.token.transferFeeBps = 100;
  changed.token.transferHook = true;
  changed.launch.presale = true;
  assert.deepEqual(validateLaunchRecord(changed), [
    "token.mintAuthority must equal null",
    "token.transferFeeBps must equal 0",
    "token.transferHook must equal false",
    "launch.presale must equal false",
  ]);
});

test("rejects missing or mismatched canonical metadata", () => {
  const changed = structuredClone(record);
  changed.token.metadataImage = null;
  changed.token.metadataWebsite = "https://example.com";
  changed.token.metadataX = "https://x.com/someoneelse";
  assert.ok(validateLaunchRecord(changed).includes("token.metadataImage must equal https://hakky.xyz/assets/token.png"));
  assert.ok(validateLaunchRecord(changed).includes("token.metadataWebsite must equal https://hakky.xyz"));
  assert.ok(validateLaunchRecord(changed).includes("token.metadataX must equal https://x.com/antihakkysack"));
});

test("live state requires verified proof fields", () => {
  const changed = structuredClone(record);
  changed.status = "live";
  assert.ok(validateLaunchRecord(changed).includes("live status requires proof"));
});

test("accepts a live record only with complete observed proof", () => {
  const changed = createValidLiveRecord();
  assert.deepEqual(validateLaunchRecord(changed), []);
});

test("rejects alphabet-valid identifiers with incorrect decoded lengths and malformed metadata URI", () => {
  const changed = createValidLiveRecord();
  changed.proof.mint = "22222222222222222222222222222222";
  changed.proof.launchId = "22222222222222222222222222222222";
  changed.proof.launchTransaction = "2222222222222222222222222222222222222222222222222222222222";
  changed.proof.metadataUri = "https://";
  const issues = validateLaunchRecord(changed);
  assert.ok(issues.includes("proof.mint must be a Solana base58 public key"));
  assert.ok(issues.includes("proof.launchId must be a Solana base58 public key"));
  assert.ok(issues.includes("proof.launchTransaction must be a Solana base58 signature"));
  assert.ok(issues.includes("proof.metadataUri must be a public HTTPS or IPFS URL"));
});

test("rejects bracketed IPv6 metadata URI hosts", () => {
  for (const metadataUri of [
    "https://[::1]/metadata.json",
    "https://[fc00::1]/metadata.json",
    "https://[fe80::1]/metadata.json",
  ]) {
    const changed = createValidLiveRecord();
    changed.proof.metadataUri = metadataUri;
    assert.ok(validateLaunchRecord(changed).includes("proof.metadataUri must be a public HTTPS or IPFS URL"));
  }
});

test("rejects malformed or unrelated live proof", () => {
  const changed = structuredClone(record);
  changed.status = "live";
  changed.token.mint = "11111111111111111111111111111111";
  changed.proof = {
    mint: "not-base58!",
    launchId: "short",
    launchTransaction: "also-short",
    solscanUrl: "http://solscan.io/token/other",
    raydiumUrl: "https://example.com/launchpad?mint=other",
    verifiedAt: "2026-07-22",
    supplyBaseUnits: "1000000000000",
    decimals: 6,
    tokenProgram: "spl-token",
    mintAuthority: null,
    freezeAuthority: null,
    creatorBalanceBaseUnits: "0",
    metadataImmutable: true,
    metadataName: "Hakky Protocol",
    metadataSymbol: "HAKKY",
    metadataUri: "https://hakky.xyz/metadata.json",
    metadataImage: "https://hakky.xyz/assets/token.png",
    metadataWebsite: "https://hakky.xyz",
    metadataX: "https://x.com/antihakkysack",
    curveAllocationBps: 8000,
    liquidityAllocationBps: 2000,
    teamAllocationBps: 0,
    creatorFeeEnabled: false,
    lpPolicy: "burn",
    quoteAsset: "SOL",
    graduationTargetSol: 24,
    creatorFirstBuySol: 0,
    creatorSpendSol: -0.01,
  };
  const issues = validateLaunchRecord(changed);
  assert.ok(issues.includes("proof.mint must be a Solana base58 public key"));
  assert.ok(issues.includes("proof.launchId must be a Solana base58 public key"));
  assert.ok(issues.includes("proof.launchTransaction must be a Solana base58 signature"));
  assert.ok(issues.includes("proof.solscanUrl must be an HTTPS solscan.io URL for proof.mint"));
  assert.ok(issues.includes("proof.raydiumUrl must be an HTTPS raydium.io URL for proof.mint"));
  assert.ok(issues.includes("proof.verifiedAt must be an exact ISO-8601 timestamp"));
  assert.ok(issues.includes("proof.creatorSpendSol must be a finite number from 0 to 1"));
});
