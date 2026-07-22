import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";

const record = JSON.parse(await readFile(new URL("../web/data/launch.json", import.meta.url), "utf8"));

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

test("live state requires verified proof fields", () => {
  const changed = structuredClone(record);
  changed.status = "live";
  assert.ok(validateLaunchRecord(changed).includes("live status requires proof"));
});

test("accepts a live record only with complete observed proof", () => {
  const changed = structuredClone(record);
  changed.status = "live";
  changed.token.mint = "11111111111111111111111111111111";
  changed.proof = {
    mint: changed.token.mint,
    launchId: "Launch111111111111111111111111111111111",
    launchTransaction: "Signature111111111111111111111111111111111111111111111111111111111111111111",
    solscanUrl: `https://solscan.io/token/${changed.token.mint}`,
    raydiumUrl: "https://raydium.io/launchpad/token/?mint=11111111111111111111111111111111",
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
  assert.deepEqual(validateLaunchRecord(changed), []);
});
