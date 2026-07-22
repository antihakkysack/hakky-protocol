import assert from "node:assert/strict";
import test from "node:test";
import { buildProofPost } from "../src/social-copy.mjs";

const VERIFIED_MINT = "FidEgRVPcMncSfgSNb4a1gKiQuQ7EujFxhMVfxZ3t6Ui";

test("proof post includes only the verified mint and stays within X limit", () => {
  const post = buildProofPost({ mint: VERIFIED_MINT });

  assert.equal(post.match(new RegExp(VERIFIED_MINT, "g"))?.length, 1);
  assert.match(post, /1,000,000 fixed supply/);
  assert.match(post, /0% team allocation/);
  assert.ok([...post].length <= 280);
});

test("proof post rejects an invalid mint instead of publishing it", () => {
  assert.throws(
    () => buildProofPost({ mint: "11111111111111111111111111111111\nFake mint: attacker" }),
    /valid Solana mint is required/
  );
});
