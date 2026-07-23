import { PublicKey } from "@solana/web3.js";

export const METAPLEX_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
export const METAPLEX_SOURCE_PIN = Object.freeze({
  repository: "https://github.com/metaplex-foundation/mpl-token-metadata",
  tagObject: "b5d72daf3dd7165b157db85984700269ad6fdebe",
  commit: "a7ee5e17ed60feaafeaa5582a4f46d9317c1b412",
});

function fail(code) {
  throw new Error(code);
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(code);
}

function canonicalKey(value, code) {
  try {
    if (typeof value !== "string") fail(code);
    const key = new PublicKey(value);
    if (key.toBase58() !== value || key.toBytes().length !== 32) fail(code);
    return value;
  } catch {
    fail(code);
  }
}

function asBytes(value, code) {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) fail(code);
  return Buffer.from(value);
}

class Cursor {
  constructor(bytes, code) {
    this.bytes = bytes;
    this.code = code;
    this.offset = 0;
  }

  take(length) {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > this.bytes.length) fail(`${this.code}-truncated`);
    const value = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  u8() { return this.take(1)[0]; }
  u16() { return this.take(2).readUInt16LE(0); }
  u32() { return this.take(4).readUInt32LE(0); }
  u64() { return this.take(8).readBigUInt64LE(0); }

  bool(label) {
    const value = this.u8();
    if (value !== 0 && value !== 1) fail(`${this.code}-${label}`);
    return value === 1;
  }

  option(label, decode) {
    const tag = this.u8();
    if (tag === 0) return null;
    if (tag !== 1) fail(`${this.code}-${label}-option`);
    return decode();
  }

  string(label) {
    const length = this.u32();
    const bytes = this.take(length);
    let value;
    try {
      value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      fail(`${this.code}-${label}-utf8`);
    }
    return { value, bytes };
  }

  done() {
    if (this.offset !== this.bytes.length) fail(`${this.code}-trailing`);
  }
}

function decodeRightNulPadded(cursor, label, expectedLength) {
  const { bytes } = cursor.string(label);
  if (bytes.length !== expectedLength) fail(`metadata-${label}-length`);
  const firstNul = bytes.indexOf(0);
  const content = firstNul === -1 ? bytes : bytes.subarray(0, firstNul);
  if (firstNul !== -1 && bytes.subarray(firstNul).some((byte) => byte !== 0)) fail(`metadata-${label}-interior-nul`);
  let value;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    fail(`metadata-${label}-utf8`);
  }
  if (value.includes("\0")) fail(`metadata-${label}-interior-nul`);
  return value;
}

function decodeCreators(cursor, code) {
  return cursor.option("creators", () => {
    const length = cursor.u32();
    if (length > 100) fail(`${code}-creators-length`);
    return Array.from({ length }, () => ({
      address: new PublicKey(cursor.take(32)).toBase58(),
      verified: cursor.bool("creator-verified"),
      share: cursor.u8(),
    }));
  });
}

function decodeCollection(cursor) {
  return cursor.option("collection", () => ({
    verified: cursor.bool("collection-verified"),
    key: new PublicKey(cursor.take(32)).toBase58(),
  }));
}

function decodeUses(cursor) {
  return cursor.option("uses", () => {
    const useMethod = cursor.u8();
    if (useMethod > 2) fail("metadata-uses-enum");
    return { useMethod, remaining: cursor.u64().toString(), total: cursor.u64().toString() };
  });
}

export function deriveMetadataPdas({ mint }) {
  exactObject(arguments[0], ["mint"], "metadata-pda-input");
  const mintKey = new PublicKey(canonicalKey(mint, "metadata-mint-key"));
  const program = new PublicKey(METAPLEX_METADATA_PROGRAM_ID);
  const [metadata] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), program.toBuffer(), mintKey.toBuffer()],
    program,
  );
  const [edition, editionBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), program.toBuffer(), mintKey.toBuffer(), Buffer.from("edition")],
    program,
  );
  return Object.freeze({ metadata: metadata.toBase58(), edition: edition.toBase58(), editionBump });
}

export function decodeCreateMetadataAccountV3({ instructionData, accountKeys }) {
  exactObject(arguments[0], ["instructionData", "accountKeys"], "metadata-cpi-input");
  const bytes = asBytes(instructionData, "metadata-cpi-data");
  if (!Array.isArray(accountKeys) || (accountKeys.length !== 6 && accountKeys.length !== 7)) fail("metadata-cpi-account-arity");
  const keys = accountKeys.map((key) => canonicalKey(key, "metadata-cpi-account-key"));
  const cursor = new Cursor(bytes, "metadata-cpi");
  if (cursor.u8() !== 33) fail("metadata-cpi-discriminator");
  const name = cursor.string("name").value;
  const symbol = cursor.string("symbol").value;
  const uri = cursor.string("uri").value;
  const sellerFeeBasisPoints = cursor.u16();
  const creators = decodeCreators(cursor, "metadata-cpi");
  const collection = decodeCollection(cursor);
  const uses = decodeUses(cursor);
  const isMutable = cursor.bool("is-mutable");
  const collectionDetails = cursor.option("collection-details", () => {
    const variant = cursor.u8();
    if (variant !== 0) fail("metadata-cpi-collection-details-enum");
    return { variant: "v1", size: cursor.u64().toString() };
  });
  cursor.done();
  return Object.freeze({
    discriminator: 33,
    data: Object.freeze({
      name,
      symbol,
      uri,
      sellerFeeBasisPoints,
      creators,
      collection,
      uses,
      isMutable,
      collectionDetails,
    }),
    accounts: Object.freeze({
      metadata: keys[0],
      mint: keys[1],
      mintAuthority: keys[2],
      payer: keys[3],
      updateAuthority: keys[4],
      systemProgram: keys[5],
      ...(keys.length === 7 ? { rentSysvar: keys[6] } : {}),
    }),
    accountKeys: Object.freeze(keys),
  });
}

export function decodeMetadataAccountV1({ accountBytes, expectedMint, expectedEditionBump }) {
  exactObject(arguments[0], ["accountBytes", "expectedMint", "expectedEditionBump"], "metadata-account-input");
  const bytes = asBytes(accountBytes, "metadata-account-bytes");
  canonicalKey(expectedMint, "metadata-expected-mint");
  if (!Number.isInteger(expectedEditionBump) || expectedEditionBump < 0 || expectedEditionBump > 255) {
    fail("metadata-edition-bump");
  }
  if (bytes.length !== 607) fail("metadata-account-length");
  const cursor = new Cursor(bytes, "metadata-account");
  if (cursor.u8() !== 4) fail("metadata-key");
  const updateAuthority = new PublicKey(cursor.take(32)).toBase58();
  const mint = new PublicKey(cursor.take(32)).toBase58();
  if (mint !== expectedMint) fail("metadata-mint");
  const name = decodeRightNulPadded(cursor, "name", 32);
  const symbol = decodeRightNulPadded(cursor, "symbol", 10);
  const uri = decodeRightNulPadded(cursor, "uri", 200);
  const sellerFeeBasisPoints = cursor.u16();
  if (sellerFeeBasisPoints !== 0) fail("metadata-seller-fee");
  const creators = decodeCreators(cursor, "metadata-account");
  if (creators !== null) fail("metadata-creators");
  const primarySaleHappened = cursor.bool("primary-sale");
  if (primarySaleHappened) fail("metadata-primary-sale");
  const isMutable = cursor.bool("is-mutable");
  if (isMutable) fail("metadata-mutable");
  const editionNonce = cursor.option("edition-nonce", () => cursor.u8());
  if (editionNonce !== expectedEditionBump) fail("metadata-edition-bump");
  const tokenStandard = cursor.option("token-standard", () => {
    const variant = cursor.u8();
    if (variant > 5) fail("metadata-token-standard-enum");
    return variant;
  });
  if (tokenStandard !== 2) fail("metadata-token-standard");
  const collection = decodeCollection(cursor);
  if (collection !== null) fail("metadata-collection");
  const uses = decodeUses(cursor);
  if (uses !== null) fail("metadata-uses");
  const collectionDetails = cursor.option("collection-details", () => fail("metadata-collection-details"));
  if (collectionDetails !== null) fail("metadata-collection-details");
  const programmableConfig = cursor.option("programmable-config", () => fail("metadata-programmable-config"));
  if (programmableConfig !== null) fail("metadata-programmable-config");
  if (cursor.offset !== 332) fail("metadata-layout-offset");
  if (bytes.subarray(332, 606).some((byte) => byte !== 0)) fail("metadata-padding");
  const feeFlag = bytes[606];
  if (feeFlag !== 0 && feeFlag !== 1) fail("metadata-fee-flag");
  return Object.freeze({
    key: "MetadataV1",
    updateAuthority,
    mint,
    name,
    symbol,
    uri,
    sellerFeeBasisPoints,
    creators,
    primarySaleHappened,
    isMutable,
    editionNonce,
    tokenStandard: "Fungible",
    collection,
    uses,
    collectionDetails,
    programmableConfig,
    feeFlag,
  });
}
