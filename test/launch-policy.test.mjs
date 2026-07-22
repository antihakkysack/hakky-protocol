import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";
import { createValidLiveRecord } from "../test-support/launch-fixtures.mjs";

const record = JSON.parse(await readFile(new URL("../web/data/launch.json", import.meta.url), "utf8"));

test("approved prelaunch record is valid", () => {
  assert.deepEqual(validateLaunchRecord(record), []);
});

test("launch records reject unknown fields at every schema layer", () => {
  const layers = [
    ["launch record", (changed) => { changed.extra = true; }],
    ["project", (changed) => { changed.project.extra = true; }],
    ["token", (changed) => { changed.token.extra = true; }],
    ["launch", (changed) => { changed.launch.extra = true; }],
    ["proof", (changed) => { changed.proof.extra = true; }],
  ];
  for (const [label, mutate] of layers) {
    const changed = label === "proof" ? createValidLiveRecord(record) : structuredClone(record);
    mutate(changed);
    assert.ok(
      validateLaunchRecord(changed).includes(`${label} has unexpected field extra`),
      `${label} accepted an unknown field`,
    );
  }
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
  const changed = createValidLiveRecord(record);
  assert.deepEqual(validateLaunchRecord(changed), []);
});

test("live web proof requires creator identity, canonical proof timestamps, and transaction URL", () => {
  const changed = createValidLiveRecord(record);
  delete changed.proof.creator;
  delete changed.proof.mintVerifiedAt;
  delete changed.proof.launchVerifiedAt;
  delete changed.proof.solscanTransactionUrl;
  assert.deepEqual(validateLaunchRecord(changed).filter((issue) => issue.includes("requires proof.")), [
    "live status requires proof.creator",
    "live status requires proof.solscanTransactionUrl",
    "live status requires proof.mintVerifiedAt",
    "live status requires proof.launchVerifiedAt",
  ]);
});

test("rejects live verification timestamps that are not ordered", () => {
  const changed = createValidLiveRecord(record);
  changed.proof.mintVerifiedAt = "2026-07-22T00:03:00.000Z";
  changed.proof.launchVerifiedAt = "2026-07-22T00:04:00.000Z";
  assert.ok(validateLaunchRecord(changed).includes(
    "proof timestamps must satisfy mintVerifiedAt <= launchVerifiedAt <= verifiedAt",
  ));
});

test("rejects noncanonical Solscan and Raydium URL variants", () => {
  const variants = [
    ["solscanUrl", `https://user@solscan.io/token/11111111111111111111111111111111`],
    ["solscanUrl", `https://solscan.io:444/token/11111111111111111111111111111111`],
    ["solscanUrl", `https://solscan.io/search?q=11111111111111111111111111111111`],
    ["solscanUrl", `https://solscan.io/token/11111111111111111111111111111111#claim`],
    ["solscanTransactionUrl", `https://solscan.io/tx/not-the-signature?sig=${"1".repeat(64)}`],
    ["raydiumUrl", `https://raydium.io/anything/11111111111111111111111111111111`],
    ["raydiumUrl", `https://raydium.io/launchpad/token/?other=11111111111111111111111111111111`],
    ["raydiumUrl", `https://raydium.io/launchpad/token/?mint=11111111111111111111111111111111#trade`],
  ];
  for (const [field, value] of variants) {
    const changed = createValidLiveRecord(record);
    changed.proof[field] = value;
    assert.ok(
      validateLaunchRecord(changed).some((issue) => issue.startsWith(`proof.${field} must be`)),
      `${field} accepted ${value}`,
    );
  }
});

test("rejects alphabet-valid identifiers with incorrect decoded lengths and malformed metadata URI", () => {
  const changed = createValidLiveRecord(record);
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

test("rejects special-use, documentation, reserved, and multicast IPv6 metadata hosts", () => {
  for (const metadataUri of [
    "https://[::]/metadata.json",
    "https://[::1]/metadata.json",
    "https://[64:ff9b::1]/metadata.json",
    "https://[64:ff9b:1::1]/metadata.json",
    "https://[100::1]/metadata.json",
    "https://[100:0:0:1::1]/metadata.json",
    "https://[2001::1]/metadata.json",
    "https://[2001:db8::1]/metadata.json",
    "https://[2002::1]/metadata.json",
    "https://[2620:4f:8000::1]/metadata.json",
    "https://[3ffe::1]/metadata.json",
    "https://[3fff::1]/metadata.json",
    "https://[5f00::1]/metadata.json",
    "https://[fc00::1]/metadata.json",
    "https://[fe80::1]/metadata.json",
    "https://[fec0::1]/metadata.json",
    "https://[ff02::1]/metadata.json",
  ]) {
    const changed = createValidLiveRecord(record);
    changed.proof.metadataUri = metadataUri;
    assert.ok(validateLaunchRecord(changed).includes("proof.metadataUri must be a public HTTPS or IPFS URL"));
  }
});

test("rejects every relevant IPv4 special-use and reserved metadata range", () => {
  for (const metadataUri of [
    "https://0.0.0.1/metadata.json",
    "https://10.0.0.1/metadata.json",
    "https://100.64.0.1/metadata.json",
    "https://127.0.0.1/metadata.json",
    "https://169.254.0.1/metadata.json",
    "https://172.16.0.1/metadata.json",
    "https://192.0.0.1/metadata.json",
    "https://192.0.2.1/metadata.json",
    "https://192.31.196.1/metadata.json",
    "https://192.52.193.1/metadata.json",
    "https://192.88.99.1/metadata.json",
    "https://192.168.0.1/metadata.json",
    "https://192.175.48.1/metadata.json",
    "https://198.18.0.1/metadata.json",
    "https://198.51.100.1/metadata.json",
    "https://203.0.113.1/metadata.json",
    "https://224.0.0.1/metadata.json",
    "https://239.255.255.255/metadata.json",
    "https://240.0.0.1/metadata.json",
    "https://255.255.255.255/metadata.json",
  ]) {
    const changed = createValidLiveRecord(record);
    changed.proof.metadataUri = metadataUri;
    assert.ok(
      validateLaunchRecord(changed).includes("proof.metadataUri must be a public HTTPS or IPFS URL"),
      `accepted special-use IPv4 metadata host: ${metadataUri}`,
    );
  }
});

test("rejects special-use and non-public metadata hostnames", () => {
  for (const metadataUri of [
    "https://metadata.test/metadata.json",
    "https://metadata.invalid/metadata.json",
    "https://metadata.example/metadata.json",
    "https://example.com/metadata.json",
    "https://cdn.example.net/metadata.json",
    "https://cdn.example.org/metadata.json",
    "https://localhost/metadata.json",
    "https://metadata.localhost/metadata.json",
    "https://metadata.local/metadata.json",
    "https://metadata.onion/metadata.json",
    "https://home.arpa/metadata.json",
    "https://metadata.alt/metadata.json",
    "https://intranet/metadata.json",
  ]) {
    const changed = createValidLiveRecord(record);
    changed.proof.metadataUri = metadataUri;
    assert.ok(
      validateLaunchRecord(changed).includes("proof.metadataUri must be a public HTTPS or IPFS URL"),
      `accepted special-use metadata hostname: ${metadataUri}`,
    );
  }
});

test("rejects trailing-dot and normalized private metadata hosts", () => {
  for (const metadataUri of [
    "https://localhost./metadata.json",
    "https://foo.localhost./metadata.json",
    "https://127.1/metadata.json",
    "https://2130706433/metadata.json",
    "https://0x7f000001/metadata.json",
    "https://017700000001/metadata.json",
    "https://10.1/metadata.json",
    "https://192.168.1/metadata.json",
    "https://[::ffff:127.0.0.1]/metadata.json",
    "https://[::ffff:7f00:1]/metadata.json",
  ]) {
    const changed = createValidLiveRecord(record);
    changed.proof.metadataUri = metadataUri;
    assert.ok(
      validateLaunchRecord(changed).includes("proof.metadataUri must be a public HTTPS or IPFS URL"),
      `accepted non-public metadata host: ${metadataUri}`,
    );
  }
});

test("complete live records continue to accept current public metadata hosts", () => {
  for (const metadataUri of [
    "https://hakky.xyz/metadata.json",
    "https://cdn.hakky.xyz/hakky/metadata.json",
    "https://8.8.8.8/hakky/metadata.json",
    "https://[2606:4700:4700::1111]/hakky/metadata.json",
  ]) {
    const changed = createValidLiveRecord(record);
    changed.proof.metadataUri = metadataUri;
    assert.deepEqual(validateLaunchRecord(changed), [], `rejected public metadata URI: ${metadataUri}`);
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
  assert.ok(issues.includes("proof.solscanUrl must be the canonical HTTPS Solscan token route for proof.mint"));
  assert.ok(issues.includes("proof.raydiumUrl must be the canonical HTTPS Raydium LaunchLab token route for proof.mint"));
  assert.ok(issues.includes("proof.verifiedAt must be an exact ISO-8601 timestamp"));
  assert.ok(issues.includes("proof.creatorSpendSol must be a finite number from 0 to 1"));
});
