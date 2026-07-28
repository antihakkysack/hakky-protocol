import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  APPROVED_IMAGE_CID,
  APPROVED_IMAGE_SHA256,
  HAKKY_METADATA_PATH,
  HAKKY_METADATA_URI,
  assertCanonicalHakkyMetadataBytes,
  canonicalHakkyMetadata,
} from "../src/metadata-integrity.mjs";

const EXPECTED_KEYS = ["name", "symbol", "description", "image"];

function base32LowerUnpadded(bytes) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

test("served HAKKY metadata is the exact approved UTF-8 byte contract", async () => {
  const bytes = await readFile(HAKKY_METADATA_PATH);
  const metadata = assertCanonicalHakkyMetadataBytes(bytes);

  assert.deepEqual(Object.keys(metadata), EXPECTED_KEYS);
  assert.equal(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, false);
  assert.equal(bytes.toString("utf8").endsWith("\n"), true);
  assert.equal(bytes.toString("utf8").slice(0, -1).includes("\n"), false);
  assert.equal(bytes.toString("utf8"), canonicalHakkyMetadata(APPROVED_IMAGE_CID));
  assert.equal(metadata.image, `ipfs://${APPROVED_IMAGE_CID}`);
  assert.equal(HAKKY_METADATA_URI, "https://hakky.xyz/metadata/hakky-v1.json");
});

test("approved image bytes derive the exact metadata image CID", async () => {
  const bytes = await readFile("web/assets/token.png");
  const digest = createHash("sha256").update(bytes).digest();
  assert.equal(digest.toString("hex"), APPROVED_IMAGE_SHA256);
  const cid = `b${base32LowerUnpadded(
    Buffer.concat([Buffer.from([0x01, 0x55, 0x12, 0x20]), digest]),
  )}`;
  assert.equal(cid, APPROVED_IMAGE_CID);
});

test("canonical metadata rejects alternate and noncanonical CIDs", () => {
  for (const invalid of [
    `ipfs://${APPROVED_IMAGE_CID}`,
    APPROVED_IMAGE_CID.toUpperCase(),
    `${APPROVED_IMAGE_CID}/token.png`,
    `${APPROVED_IMAGE_CID}?download=1`,
    "<VERIFIED_IMAGE_CID>",
  ]) {
    assert.throws(() => canonicalHakkyMetadata(invalid), /CID/i);
  }
});

test("exact byte verifier rejects extra fields and representation drift", () => {
  const exact = canonicalHakkyMetadata(APPROVED_IMAGE_CID);
  for (const changed of [
    exact.replace(',"image"', ',"external_url":"https://hakky.xyz","image"'),
    exact.replace(',"image"', ',"twitter":"https://x.com/antihakkysack","image"'),
    exact.replace(',"image"', ',"creators":[],"image"'),
    exact.replace(',"image"', ',"attributes":[],"image"'),
    exact.trimEnd(),
    `\ufeff${exact}`,
    `${exact}\n`,
  ]) {
    assert.throws(
      () => assertCanonicalHakkyMetadataBytes(Buffer.from(changed, "utf8")),
      /metadata|BOM/i,
    );
  }
});
