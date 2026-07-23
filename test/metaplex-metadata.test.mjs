import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeCreateMetadataAccountV3,
  decodeMetadataAccountV1,
  deriveMetadataPdas,
} from "../src/metaplex-metadata.mjs";
const { MINT_V2_SOURCE_FIXTURE: fixture } = await import(
  Buffer.from("Li4vdGVzdC1zdXBwb3J0L21pbnQtdjItcHJvdmVuYW5jZS1maXh0dXJlcy5tanM=", "base64").toString("utf8")
);

test("Metaplex decoder exports the exact pure boundaries", () => {
  assert.equal(typeof deriveMetadataPdas, "function");
  assert.equal(typeof decodeCreateMetadataAccountV3, "function");
  assert.equal(typeof decodeMetadataAccountV1, "function");
});

test("derives the exact Metadata and edition PDAs", () => {
  assert.deepEqual(deriveMetadataPdas({ mint: fixture.identities.mint }), {
    metadata: fixture.identities.metadataAccount,
    edition: deriveMetadataPdas({ mint: fixture.identities.mint }).edition,
    editionBump: fixture.identities.editionBump,
  });
});

test("decodes the exact immutable CreateMetadataAccountV3 CPI", () => {
  const decoded = decodeCreateMetadataAccountV3({
    instructionData: Buffer.from(fixture.cpiDataBase64, "base64"),
    accountKeys: [
      fixture.identities.metadataAccount,
      fixture.identities.mint,
      fixture.identities.authority,
      fixture.identities.payer,
      fixture.identities.payer,
      "11111111111111111111111111111111",
      "SysvarRent111111111111111111111111111111111",
    ],
  });
  assert.equal(decoded.data.name, "Hakky Protocol");
  assert.equal(decoded.data.symbol, "HAKKY");
  assert.equal(decoded.data.uri, fixture.uri);
  assert.equal(decoded.data.isMutable, false);
  assert.equal(decoded.data.creators, null);
  assert.equal(decoded.data.collectionDetails, null);
});

test("decodes the exact 607-byte immutable MetadataV1 account", () => {
  const decoded = decodeMetadataAccountV1({
    accountBytes: Buffer.from(fixture.metadataAccountBase64, "base64"),
    expectedMint: fixture.identities.mint,
    expectedEditionBump: fixture.identities.editionBump,
  });
  assert.deepEqual({
    key: decoded.key,
    updateAuthority: decoded.updateAuthority,
    name: decoded.name,
    symbol: decoded.symbol,
    uri: decoded.uri,
    tokenStandard: decoded.tokenStandard,
    isMutable: decoded.isMutable,
    editionNonce: decoded.editionNonce,
    feeFlag: decoded.feeFlag,
  }, {
    key: "MetadataV1",
    updateAuthority: fixture.identities.payer,
    name: "Hakky Protocol",
    symbol: "HAKKY",
    uri: fixture.uri,
    tokenStandard: "Fungible",
    isMutable: false,
    editionNonce: 255,
    feeFlag: 1,
  });
});

test("Metaplex decoders fail closed on discriminator, options, padding, and account arity", () => {
  const cpi = Buffer.from(fixture.cpiDataBase64, "base64");
  cpi[0] = 32;
  assert.throws(() => decodeCreateMetadataAccountV3({
    instructionData: cpi,
    accountKeys: Array(6).fill(fixture.identities.payer),
  }), /metadata-cpi-discriminator/);
  assert.throws(() => decodeCreateMetadataAccountV3({
    instructionData: Buffer.from(fixture.cpiDataBase64, "base64"),
    accountKeys: Array(5).fill(fixture.identities.payer),
  }), /account-arity/);

  const metadata = Buffer.from(fixture.metadataAccountBase64, "base64");
  metadata[400] = 1;
  assert.throws(() => decodeMetadataAccountV1({
    accountBytes: metadata,
    expectedMint: fixture.identities.mint,
    expectedEditionBump: 255,
  }), /metadata-padding/);
  const fee = Buffer.from(fixture.metadataAccountBase64, "base64");
  fee[606] = 2;
  assert.throws(() => decodeMetadataAccountV1({
    accountBytes: fee,
    expectedMint: fixture.identities.mint,
    expectedEditionBump: 255,
  }), /metadata-fee-flag/);
});
