import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildProofPost } from "../src/social-copy.mjs";

const VERIFIED_MINT = "FidEgRVPcMncSfgSNb4a1gKiQuQ7EujFxhMVfxZ3t6Ui";

test("proof post includes only the verified mint and stays within X limit", () => {
  const post = buildProofPost({ mint: VERIFIED_MINT });

  assert.equal(post.match(new RegExp(VERIFIED_MINT, "g"))?.length, 1);
  assert.match(post, /10,000,000 fixed supply/);
  assert.match(post, /0% team allocation/);
  assert.ok([...post].length <= 280);
});

test("proof post rejects an invalid mint instead of publishing it", () => {
  assert.throws(
    () => buildProofPost({ mint: "11111111111111111111111111111111\nFake mint: attacker" }),
    /valid Solana mint is required/
  );
});

test("prelaunch social copy uses the exact call sign and publishes no address or action", async () => {
  const post = await readFile("launch/prelaunch-post.md", "utf8");
  for (const line of [
    "We are not anonymous.",
    "We are HAKKY.",
    "And the whole wide world",
    "just. got. sacked.",
  ]) {
    assert.equal(post.split(line).length - 1, 1);
  }
  assert.match(post, /Planned: 10,000,000 HAKKY/u);
  assert.match(post, /8,000,000 curve \/ 2,000,000 permanent-pool seed \/ 0 team/u);
  assert.match(post, /0% curve fee \/ 0\.25% pool-retained fee/u);
  assert.match(post, /No official program or mint is published/u);
  assert.doesNotMatch(post, /[1-9A-HJ-NP-Za-km-z]{32,44}|buy|trade|swap|LaunchLab|Raydium/iu);
});
