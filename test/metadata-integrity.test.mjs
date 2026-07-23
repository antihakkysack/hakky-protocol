import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import {
  assertMetadataDraftV1,
  assertMetadataManifestV1,
  assertMetadataReadbackV1,
  buildMetadata,
  finalizeMetadataManifest,
  prepareMetadataBundle,
  publishArtifactBytes,
  serializeMetadata,
  serializeMetadataDraft,
  serializeMetadataManifest,
  serializeMetadataReadback,
  sha256Hex,
  validateContentAddressedUri,
  verifyPublishedContent,
  verifyPublishedMetadata,
} from "../src/metadata-integrity.mjs";
import {
  parsePrepareOptions,
  runPrepare,
} from "../scripts/prepare-metadata.mjs";
import {
  parseFinalizeOptions,
  runFinalize,
} from "../scripts/finalize-metadata-manifest.mjs";
import {
  parseVerifyOptions,
  runVerify,
} from "../scripts/verify-metadata-upload.mjs";

const execFileAsync = promisify(execFile);
const APPROVED_IMAGE_LENGTH = 74_230;
const APPROVED_IMAGE_SHA256 = "9e672cdc454e6249873cdf359b51a1f8f6a7f8a10f057d77f85ecce705bca8a0";
const IMAGE_URI = "ipfs://bafkreie6m4wnyrkomjeyopg7gwnvdipy62t7riipav6xp6c6zttqlpfiua";
const ARWEAVE_URI = "https://arweave.net/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

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

function rawIpfsUri(bytes) {
  const digest = Buffer.from(sha256Hex(bytes), "hex");
  return `ipfs://b${base32LowerUnpadded(Buffer.concat([Buffer.from([1, 0x55, 0x12, 0x20]), digest]))}`;
}

function response({ status = 200, url, bytes = Buffer.alloc(0), location = null }) {
  return {
    status,
    ok: status >= 200 && status < 300,
    url,
    headers: { get(name) { return name.toLowerCase() === "location" ? location : null; } },
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
}

async function makeRepositoryRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-metadata-"));
  await mkdir(path.join(root, "web", "assets"), { recursive: true });
  await cp(path.join(process.cwd(), "web", "assets", "token.png"), path.join(root, "web", "assets", "token.png"));
  return root;
}

async function preparedRepository() {
  const repositoryRoot = await makeRepositoryRoot();
  const draft = await prepareMetadataBundle({
    repositoryRoot,
    imagePath: "web/assets/token.png",
    imageUri: IMAGE_URI,
    outDirectory: "artifacts/metadata",
  });
  const metadataBytes = await readFile(path.join(repositoryRoot, "artifacts", "metadata", "token.json"));
  const metadataUri = rawIpfsUri(metadataBytes);
  return { repositoryRoot, draft, metadataBytes, metadataUri };
}

function validReadback(manifest, verifiedAt = "2026-07-23T04:05:06.000Z") {
  return {
    schemaVersion: "metadata-readback-v1",
    image: {
      uri: manifest.image.uri,
      resolvedUrl: `https://ipfs.io/ipfs/${manifest.image.uri.slice("ipfs://".length)}`,
      byteLength: manifest.image.byteLength,
      sha256: manifest.image.sha256,
    },
    metadata: {
      uri: manifest.metadata.uri,
      resolvedUrl: `https://ipfs.io/ipfs/${manifest.metadata.uri.slice("ipfs://".length)}`,
      byteLength: manifest.metadata.byteLength,
      sha256: manifest.metadata.sha256,
    },
    creatorPayment: { signature: null, debitLamports: "0" },
    verifiedAt,
    ok: true,
  };
}

test("pins the approved deterministic image bytes", async () => {
  const bytes = await readFile("web/assets/token.png");
  assert.equal(bytes.byteLength, APPROVED_IMAGE_LENGTH);
  assert.equal(sha256Hex(bytes), APPROVED_IMAGE_SHA256);
  assert.equal(rawIpfsUri(bytes), IMAGE_URI);
});

test("serializes exact HAKKY metadata bytes deterministically", () => {
  const metadata = buildMetadata({ imageUri: IMAGE_URI });
  assert.deepEqual(metadata, {
    name: "Hakky Protocol",
    symbol: "HAKKY",
    description: "HAKKY is a high-risk public-only Solana meme coin launch. HakkyAgent verifies published launch facts; it does not promise safety or returns.",
    image: IMAGE_URI,
    external_url: "https://hakky.xyz",
    twitter: "https://x.com/antihakkysack",
  });
  assert.equal(serializeMetadata(metadata).toString("utf8").endsWith("\n"), true);
  assert.equal(sha256Hex(Buffer.from("HAKKY")), "4a72026d8c69a1cde54008588eee6fffda23290eec418820db8499c1956e3a10");
  const reordered = Object.fromEntries(Object.entries(metadata).reverse());
  assert.deepEqual(serializeMetadata(reordered), serializeMetadata(metadata));
});

test("accepts only canonical raw CIDv1 and exact Arweave identities", () => {
  assert.equal(validateContentAddressedUri(IMAGE_URI).protocol, "ipfs:");
  assert.equal(validateContentAddressedUri(ARWEAVE_URI).href, ARWEAVE_URI);
  for (const [label, uri] of [
    ["ordinary HTTPS", "https://hakky.xyz/assets/token.png"],
    ["CID case drift", IMAGE_URI.toUpperCase()],
    ["CIDv0", "ipfs://QmYwAPJzv5CZsnAzt8auVZRnG1BB4fmG2tDkUo6fWwZ7"],
    ["wrong CID codec", `ipfs://b${base32LowerUnpadded(Buffer.concat([Buffer.from([1, 0x70, 0x12, 0x20]), Buffer.alloc(32)]))}`],
    ["CID path", `${IMAGE_URI}/token.png`],
    ["CID query", `${IMAGE_URI}?download=1`],
    ["CID fragment", `${IMAGE_URI}#x`],
    ["Arweave short identity", "https://arweave.net/short"],
    ["Arweave extra path", `${ARWEAVE_URI}/token.json`],
    ["Arweave port", ARWEAVE_URI.replace("arweave.net", "arweave.net:444")],
    ["Arweave query", `${ARWEAVE_URI}?download=1`],
    ["Arweave fragment", `${ARWEAVE_URI}#x`],
    ["Arweave credentials", ARWEAVE_URI.replace("https://", "https://sample-user@")],
    ["encoded separator", `${ARWEAVE_URI}%2fextra`],
    ["dot segment", `https://arweave.net/../${ARWEAVE_URI.split("/").at(-1)}`],
  ]) {
    assert.throws(() => validateContentAddressedUri(uri), undefined, label);
  }
});

test("remote verification binds a raw CID digest before the first GET", async () => {
  const expected = Buffer.from("{\"name\":\"Hakky Protocol\"}\n");
  const expectedUri = rawIpfsUri(expected);
  let calls = 0;
  const receipt = await verifyPublishedContent({
    expectedBytes: expected,
    expectedUri,
    fetchImpl: async (url, init) => {
      calls += 1;
      assert.equal(init.method, "GET");
      assert.equal(init.redirect, "manual");
      return response({ status: 200, url, bytes: expected });
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(receipt, {
    uri: expectedUri,
    resolvedUrl: `https://ipfs.io/ipfs/${expectedUri.slice("ipfs://".length)}`,
    byteLength: expected.byteLength,
    sha256: sha256Hex(expected),
  });

  calls = 0;
  await assert.rejects(verifyPublishedContent({
    expectedBytes: Buffer.from("changed"),
    expectedUri,
    fetchImpl: async () => { calls += 1; },
  }), /digest/i);
  assert.equal(calls, 0);
});

test("Arweave verification preserves the exact transaction identity and still checks bytes", async () => {
  const expected = Buffer.from("arweave exact bytes\n");
  const receipt = await verifyPublishedContent({
    expectedBytes: expected,
    expectedUri: ARWEAVE_URI,
    fetchImpl: async (url, init) => {
      assert.equal(url, ARWEAVE_URI);
      assert.deepEqual(init, { method: "GET", redirect: "manual" });
      return response({ url, bytes: expected });
    },
  });
  assert.deepEqual(receipt, {
    uri: ARWEAVE_URI,
    resolvedUrl: ARWEAVE_URI,
    byteLength: expected.byteLength,
    sha256: sha256Hex(expected),
  });
});

test("remote verification rejects response drift and non-success responses", async () => {
  const expected = Buffer.from("exact bytes\n");
  const expectedUri = rawIpfsUri(expected);
  const canonical = `https://ipfs.io/ipfs/${expectedUri.slice("ipfs://".length)}`;
  for (const [label, fetchImpl, pattern] of [
    ["size", async (url) => response({ url, bytes: Buffer.from("x") }), /byte length/i],
    ["hash", async (url) => response({ url, bytes: Buffer.from("same size?\n") }), /byte length|digest/i],
    ["status", async (url) => response({ status: 503, url }), /HTTP 503/i],
    ["final URL", async () => response({ url: `${canonical}/drift`, bytes: expected }), /resolved URL|identity/i],
  ]) {
    await assert.rejects(verifyPublishedContent({ expectedBytes: expected, expectedUri, fetchImpl }), pattern, label);
  }
});

test("manual redirects are bounded and cannot drift provider or identity", async () => {
  const expected = Buffer.from("redirect bytes\n");
  const expectedUri = rawIpfsUri(expected);
  const canonical = `https://ipfs.io/ipfs/${expectedUri.slice("ipfs://".length)}`;
  for (const [label, location] of [
    ["loop", canonical],
    ["different host", canonical.replace("ipfs.io", "gateway.pinata.cloud")],
    ["private host", canonical.replace("ipfs.io", "127.0.0.1")],
    ["different identity", canonical.replace(expectedUri.slice(-8), IMAGE_URI.slice(-8))],
    ["encoded separator", `${canonical}%2fextra`],
    ["extra path", `${canonical}/extra`],
    ["query", `${canonical}?x=1`],
  ]) {
    let calls = 0;
    await assert.rejects(verifyPublishedContent({
      expectedBytes: expected,
      expectedUri,
      fetchImpl: async (url) => {
        calls += 1;
        return response({ status: 302, url, location });
      },
    }), undefined, label);
    assert.equal(calls, 1, label);
  }
});

test("canonical draft and manifest validators reconstruct metadata bytes", async () => {
  const imageBytes = await readFile("web/assets/token.png");
  const metadataBytes = serializeMetadata(buildMetadata({ imageUri: IMAGE_URI }));
  const draft = {
    schemaVersion: "metadata-draft-v1",
    image: {
      sourcePath: "artifacts/metadata/token.png",
      uri: IMAGE_URI,
      byteLength: imageBytes.byteLength,
      sha256: sha256Hex(imageBytes),
    },
    metadata: {
      sourcePath: "artifacts/metadata/token.json",
      byteLength: metadataBytes.byteLength,
      sha256: sha256Hex(metadataBytes),
      name: "Hakky Protocol",
      symbol: "HAKKY",
      imageUri: IMAGE_URI,
    },
  };
  assert.equal(assertMetadataDraftV1(structuredClone(draft)).schemaVersion, "metadata-draft-v1");
  const metadataUri = rawIpfsUri(metadataBytes);
  const manifest = finalizeMetadataManifest({ draft, metadataUri });
  assert.equal(assertMetadataManifestV1(structuredClone(manifest)).metadata.uri, metadataUri);
  assert.deepEqual(serializeMetadataDraft(Object.fromEntries(Object.entries(draft).reverse())), serializeMetadataDraft(draft));
  assert.deepEqual(serializeMetadataManifest(Object.fromEntries(Object.entries(manifest).reverse())), serializeMetadataManifest(manifest));
});

for (const [name, mutate, pattern] of [
  ["draft schema version", (value) => { value.schemaVersion = "metadata-draft-v2"; }, /schemaVersion/],
  ["draft unknown root key", (value) => { value.extra = true; }, /unknown/i],
  ["draft image source path", (value) => { value.image.sourcePath = "artifacts/metadata/Token.png"; }, /sourcePath/],
  ["draft image URI relation", (value) => { value.metadata.imageUri = ARWEAVE_URI; }, /imageUri/],
  ["draft image size", (value) => { value.image.byteLength += 1; }, /byteLength/],
  ["draft image digest", (value) => { value.image.sha256 = "0".repeat(64); }, /sha256|digest/],
  ["draft metadata source path", (value) => { value.metadata.sourcePath = "artifacts/metadata/Token.json"; }, /sourcePath/],
  ["draft metadata size", (value) => { value.metadata.byteLength += 1; }, /byteLength/],
  ["draft metadata digest", (value) => { value.metadata.sha256 = "0".repeat(64); }, /sha256|digest/],
  ["draft metadata name", (value) => { value.metadata.name = "Other"; }, /name/],
  ["draft metadata symbol", (value) => { value.metadata.symbol = "OTHER"; }, /symbol/],
  ["draft unsafe integer", (value) => { value.metadata.byteLength = Number.MAX_SAFE_INTEGER + 1; }, /safe integer/],
  ["draft malformed digest", (value) => { value.metadata.sha256 = "A".repeat(64); }, /sha256/],
  ["draft unknown nested key", (value) => { value.metadata.uri = IMAGE_URI; }, /unknown/i],
]) {
  test(`rejects ${name}`, async () => {
    const { draft } = await preparedRepository();
    mutate(draft);
    assert.throws(() => assertMetadataDraftV1(draft), pattern);
  });
}

for (const [name, mutate, pattern] of [
  ["manifest schema version", (value) => { value.schemaVersion = "metadata-manifest-v2"; }, /schemaVersion/],
  ["manifest unknown root key", (value) => { value.extra = true; }, /unknown/i],
  ["manifest image source path", (value) => { value.image.sourcePath = "artifacts/metadata/Token.png"; }, /sourcePath/],
  ["manifest image URI", (value) => { value.image.uri = ARWEAVE_URI; }, /imageUri/],
  ["manifest image byte length", (value) => { value.image.byteLength += 1; }, /byteLength/],
  ["manifest image digest", (value) => { value.image.sha256 = "0".repeat(64); }, /sha256|digest/],
  ["manifest metadata URI", (value) => { value.metadata.uri = IMAGE_URI; }, /digest|metadata/],
  ["manifest image URI relation", (value) => { value.metadata.imageUri = ARWEAVE_URI; }, /imageUri/],
  ["manifest metadata source path", (value) => { value.metadata.sourcePath = "artifacts/metadata/Token.json"; }, /sourcePath/],
  ["manifest metadata byte length", (value) => { value.metadata.byteLength += 1; }, /byteLength/],
  ["manifest metadata digest", (value) => { value.metadata.sha256 = "0".repeat(64); }, /sha256|digest/],
  ["manifest metadata name", (value) => { value.metadata.name = "Other"; }, /name/],
  ["manifest metadata symbol", (value) => { value.metadata.symbol = "OTHER"; }, /symbol/],
  ["manifest unknown nested key", (value) => { value.image.extra = true; }, /unknown/i],
]) {
  test(`rejects ${name}`, async () => {
    const { draft, metadataUri } = await preparedRepository();
    const manifest = finalizeMetadataManifest({ draft, metadataUri });
    mutate(manifest);
    assert.throws(() => assertMetadataManifestV1(manifest), pattern);
  });
}

test("readback validator pins manifest identity, equality, timestamp, and zero creator payment", async () => {
  const { draft, metadataUri } = await preparedRepository();
  const manifest = finalizeMetadataManifest({ draft, metadataUri });
  const readback = validReadback(manifest);
  assert.equal(assertMetadataReadbackV1({ manifest, readback }).ok, true);
  assert.deepEqual(serializeMetadataReadback(Object.fromEntries(Object.entries(readback).reverse())), serializeMetadataReadback(readback));
});

for (const [name, mutate, pattern] of [
  ["readback schema version", (value) => { value.schemaVersion = "metadata-readback-v2"; }, /schemaVersion/],
  ["readback root unknown key", (value) => { value.extra = true; }, /unknown/i],
  ["readback image URI", (value) => { value.image.uri = ARWEAVE_URI; }, /image.*uri|URI/i],
  ["readback image resolved identity", (value) => { value.image.resolvedUrl += "/drift"; }, /resolvedUrl/],
  ["readback image byte length", (value) => { value.image.byteLength += 1; }, /byteLength/],
  ["readback image digest", (value) => { value.image.sha256 = "0".repeat(64); }, /sha256/],
  ["readback metadata URI", (value) => { value.metadata.uri = ARWEAVE_URI; }, /metadata.*uri|URI/i],
  ["readback metadata resolved identity", (value) => { value.metadata.resolvedUrl += "/drift"; }, /resolvedUrl/],
  ["readback metadata byte length", (value) => { value.metadata.byteLength += 1; }, /byteLength/],
  ["readback metadata digest", (value) => { value.metadata.sha256 = "0".repeat(64); }, /sha256/],
  ["readback payment signature", (value) => { value.creatorPayment.signature = "public-signature"; }, /signature/],
  ["readback payment debit", (value) => { value.creatorPayment.debitLamports = "1"; }, /debitLamports/],
  ["readback timestamp", (value) => { value.verifiedAt = "2026-07-23T04:05:06Z"; }, /verifiedAt/],
  ["readback ok", (value) => { value.ok = false; }, /ok/],
  ["readback nested unknown key", (value) => { value.creatorPayment.wallet = null; }, /unknown/i],
]) {
  test(`rejects ${name}`, async () => {
    const { draft, metadataUri } = await preparedRepository();
    const manifest = finalizeMetadataManifest({ draft, metadataUri });
    const readback = validReadback(manifest);
    mutate(readback);
    assert.throws(() => assertMetadataReadbackV1({ manifest, readback }), pattern);
  });
}

test("prepare copies approved bytes, publishes canonical JSON, and commits the draft last", async () => {
  const repositoryRoot = await makeRepositoryRoot();
  const committed = [];
  const draft = await prepareMetadataBundle({
    repositoryRoot,
    imagePath: "web/assets/token.png",
    imageUri: IMAGE_URI,
    outDirectory: "artifacts/metadata",
    onCommit(relativePath) { committed.push(relativePath); },
  });
  assert.deepEqual(committed, [
    "artifacts/metadata/token.png",
    "artifacts/metadata/token.json",
    "artifacts/metadata/draft-manifest.json",
  ]);
  assert.deepEqual(await readFile(path.join(repositoryRoot, draft.image.sourcePath)), await readFile(path.join(repositoryRoot, "web/assets/token.png")));
  assert.deepEqual(await readFile(path.join(repositoryRoot, draft.metadata.sourcePath)), serializeMetadata(buildMetadata({ imageUri: IMAGE_URI })));
  assert.deepEqual(await readFile(path.join(repositoryRoot, "artifacts/metadata/draft-manifest.json")), serializeMetadataDraft(draft));

  const replay = await prepareMetadataBundle({
    repositoryRoot,
    imagePath: "web/assets/token.png",
    imageUri: IMAGE_URI,
    outDirectory: "artifacts/metadata",
  });
  assert.deepEqual(replay, draft);
  assert.deepEqual((await readdir(path.join(repositoryRoot, "artifacts", "metadata"))).sort(), [
    "draft-manifest.json", "token.json", "token.png",
  ]);
});

test("prepare rejects a forged source even when caller-controlled draft fields could agree", async () => {
  const repositoryRoot = await makeRepositoryRoot();
  const imagePath = path.join(repositoryRoot, "web/assets/token.png");
  const changed = Buffer.from(await readFile(imagePath));
  changed[100] ^= 1;
  await writeFile(imagePath, changed);
  await assert.rejects(prepareMetadataBundle({
    repositoryRoot,
    imagePath: "web/assets/token.png",
    imageUri: rawIpfsUri(changed),
    outDirectory: "artifacts/metadata",
  }), /approved.*image/i);
  await assert.rejects(access(path.join(repositoryRoot, "artifacts/metadata/draft-manifest.json")), { code: "ENOENT" });
});

test("prepare rejects a syntactically valid raw CID with the wrong embedded digest before publication", async () => {
  const repositoryRoot = await makeRepositoryRoot();
  await assert.rejects(prepareMetadataBundle({
    repositoryRoot,
    imagePath: "web/assets/token.png",
    imageUri: rawIpfsUri(Buffer.from("not the approved image")),
    outDirectory: "artifacts/metadata",
  }), /CID digest/i);
  await assert.rejects(access(path.join(repositoryRoot, "artifacts/metadata/token.png")), { code: "ENOENT" });
});

test("exclusive publisher is idempotent for exact bytes and preserves divergent existing bytes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-publisher-"));
  const outputPath = path.join(root, "artifact.bin");
  const exact = Buffer.from("exact\n");
  await publishArtifactBytes(outputPath, exact);
  const replay = await publishArtifactBytes(outputPath, exact);
  assert.equal(replay.idempotent, true);
  await assert.rejects(publishArtifactBytes(outputPath, Buffer.from("other\n")), /different bytes/i);
  assert.deepEqual(await readFile(outputPath), exact);
});

test("open, write, fsync, and link failures never publish an artifact", async () => {
  for (const failureStage of ["open", "write", "sync", "link"]) {
    const root = await mkdtemp(path.join(os.tmpdir(), `hakky-publisher-${failureStage}-`));
    const outputPath = path.join(root, "artifact.bin");
    const failure = Object.assign(new Error(`synthetic ${failureStage} failure`), { code: "EIO" });
    const dependencies = {
      openImpl: async (...args) => {
        if (failureStage === "open") throw failure;
        const handle = await (await import("node:fs/promises")).open(...args);
        return {
          writeFile: failureStage === "write" ? async () => { throw failure; } : (...values) => handle.writeFile(...values),
          sync: failureStage === "sync" ? async () => { throw failure; } : (...values) => handle.sync(...values),
          close: (...values) => handle.close(...values),
        };
      },
      linkImpl: failureStage === "link" ? async () => { throw failure; } : undefined,
    };
    await assert.rejects(publishArtifactBytes(outputPath, Buffer.from("candidate\n"), dependencies), new RegExp(`synthetic ${failureStage} failure`));
    await assert.rejects(access(outputPath), { code: "ENOENT" });
    assert.deepEqual((await readdir(root)).filter((name) => name.endsWith(".tmp")), []);
  }
});

test("cleanup failure reports the committed exact bytes without replacement ambiguity", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-publisher-cleanup-"));
  const outputPath = path.join(root, "artifact.bin");
  const exact = Buffer.from("candidate\n");
  let ownedTemporaryPath;
  const result = await publishArtifactBytes(outputPath, exact, {
    unlinkImpl: async (candidate) => {
      ownedTemporaryPath = candidate;
      throw Object.assign(new Error("synthetic cleanup failure"), { code: "EIO" });
    },
  });
  assert.deepEqual(await readFile(outputPath), exact);
  assert.deepEqual(result.warnings.map(({ code }) => code), ["TEMP_UNLINK_FAILED"]);
  assert.equal(result.warnings[0].temporaryPath, ownedTemporaryPath);
  assert.deepEqual(await readFile(ownedTemporaryPath), exact);
  await (await import("node:fs/promises")).unlink(ownedTemporaryPath);
});

test("prepare resumes an exact partial prior run and rejects a divergent partial leaf", async () => {
  const repositoryRoot = await makeRepositoryRoot();
  const directory = path.join(repositoryRoot, "artifacts", "metadata");
  await mkdir(directory, { recursive: true });
  const exactImage = await readFile(path.join(repositoryRoot, "web/assets/token.png"));
  await writeFile(path.join(directory, "token.png"), exactImage);
  await prepareMetadataBundle({
    repositoryRoot,
    imagePath: "web/assets/token.png",
    imageUri: IMAGE_URI,
    outDirectory: "artifacts/metadata",
  });
  assert.deepEqual((await readdir(directory)).sort(), ["draft-manifest.json", "token.json", "token.png"]);

  const divergentRoot = await makeRepositoryRoot();
  const divergentDirectory = path.join(divergentRoot, "artifacts", "metadata");
  await mkdir(divergentDirectory, { recursive: true });
  const sentinel = Buffer.from("divergent existing metadata\n");
  await writeFile(path.join(divergentDirectory, "token.json"), sentinel);
  await assert.rejects(prepareMetadataBundle({
    repositoryRoot: divergentRoot,
    imagePath: "web/assets/token.png",
    imageUri: IMAGE_URI,
    outDirectory: "artifacts/metadata",
  }), /different bytes/i);
  assert.deepEqual(await readFile(path.join(divergentDirectory, "token.json")), sentinel);
  await assert.rejects(access(path.join(divergentDirectory, "draft-manifest.json")), { code: "ENOENT" });
});

test("prepare never publishes the draft if an earlier artifact commit fails", async () => {
  const repositoryRoot = await makeRepositoryRoot();
  let links = 0;
  await assert.rejects(prepareMetadataBundle({
    repositoryRoot,
    imagePath: "web/assets/token.png",
    imageUri: IMAGE_URI,
    outDirectory: "artifacts/metadata",
    publisherDependencies: {
      linkImpl: async (...args) => {
        links += 1;
        if (links === 2) throw Object.assign(new Error("synthetic metadata link failure"), { code: "EIO" });
        return (await import("node:fs/promises")).link(...args);
      },
    },
  }), /synthetic metadata link failure/);
  assert.deepEqual(await readFile(path.join(repositoryRoot, "artifacts/metadata/token.png")), await readFile(path.join(repositoryRoot, "web/assets/token.png")));
  await assert.rejects(access(path.join(repositoryRoot, "artifacts/metadata/draft-manifest.json")), { code: "ENOENT" });
});

test("finalize rehashes both local artifacts and writes only the canonical manifest", async () => {
  const { repositoryRoot, draft, metadataUri } = await preparedRepository();
  const manifest = await runFinalize({
    argv: ["--draft-manifest", "artifacts/metadata/draft-manifest.json", "--metadata-uri", metadataUri, "--out", "artifacts/metadata/manifest.json"],
    repositoryRoot,
    networkImpl: async () => { throw new Error("finalize must not use network"); },
  });
  assert.deepEqual(manifest, finalizeMetadataManifest({ draft, metadataUri }));
  assert.deepEqual(await readFile(path.join(repositoryRoot, "artifacts/metadata/manifest.json")), serializeMetadataManifest(manifest));
});

test("finalize rejects changed local metadata and consistently forged draft fields", async () => {
  const { repositoryRoot, draft, metadataUri } = await preparedRepository();
  const changed = Buffer.from("forged metadata\n");
  await writeFile(path.join(repositoryRoot, "artifacts/metadata/token.json"), changed);
  draft.metadata.byteLength = changed.byteLength;
  draft.metadata.sha256 = sha256Hex(changed);
  await writeFile(path.join(repositoryRoot, "artifacts/metadata/draft-manifest.json"), serializeMetadataDraft(draft));
  await assert.rejects(runFinalize({
    argv: ["--draft-manifest", "artifacts/metadata/draft-manifest.json", "--metadata-uri", metadataUri, "--out", "artifacts/metadata/manifest.json"],
    repositoryRoot,
  }), /canonical metadata|byteLength|sha256/i);
  await assert.rejects(access(path.join(repositoryRoot, "artifacts/metadata/manifest.json")), { code: "ENOENT" });
});

test("verification GETs exact remote bytes and fixes creator payment to null and zero", async () => {
  const { repositoryRoot, draft, metadataBytes, metadataUri } = await preparedRepository();
  const manifest = finalizeMetadataManifest({ draft, metadataUri });
  await writeFile(path.join(repositoryRoot, "artifacts/metadata/manifest.json"), serializeMetadataManifest(manifest));
  const imageBytes = await readFile(path.join(repositoryRoot, "artifacts/metadata/token.png"));
  const requests = [];
  const readback = await runVerify({
    argv: ["--manifest", "artifacts/metadata/manifest.json", "--out", "artifacts/metadata/readback.json"],
    repositoryRoot,
    now: () => new Date("2026-07-23T04:05:06.000Z"),
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      const bytes = url.includes(IMAGE_URI.slice("ipfs://".length)) ? imageBytes : metadataBytes;
      return response({ url, bytes });
    },
    rpcImpl: async () => { throw new Error("verify must not use RPC"); },
    walletImpl: async () => { throw new Error("verify must not use wallet"); },
    uploadImpl: async () => { throw new Error("verify must not upload"); },
  });
  assert.equal(requests.length, 2);
  assert.equal(requests.every(({ init }) => init.method === "GET" && init.redirect === "manual"), true);
  assert.deepEqual(readback.creatorPayment, { signature: null, debitLamports: "0" });
  assert.equal(readback.ok, true);
  assert.deepEqual(await readFile(path.join(repositoryRoot, "artifacts/metadata/readback.json")), serializeMetadataReadback(readback));
});

test("verifyPublishedMetadata emits no readback unless both content objects match", async () => {
  const { repositoryRoot, draft, metadataBytes, metadataUri } = await preparedRepository();
  const manifest = finalizeMetadataManifest({ draft, metadataUri });
  await writeFile(path.join(repositoryRoot, "artifacts/metadata/manifest.json"), serializeMetadataManifest(manifest));
  const imageBytes = await readFile("web/assets/token.png");
  await assert.rejects(verifyPublishedMetadata({
    manifest,
    now: () => new Date("2026-07-23T04:05:06.000Z"),
    fetchImpl: async (url) => response({
      url,
      bytes: url.includes(IMAGE_URI.slice("ipfs://".length)) ? imageBytes : Buffer.from(metadataBytes).fill(0, 0, 1),
    }),
  }), /digest/i);
  await assert.rejects(runVerify({
    argv: ["--manifest", "artifacts/metadata/manifest.json", "--out", "artifacts/metadata/readback.json"],
    repositoryRoot,
    fetchImpl: async (url) => response({
      url,
      bytes: url.includes(IMAGE_URI.slice("ipfs://".length)) ? imageBytes : Buffer.from(metadataBytes).fill(0, 0, 1),
    }),
  }), /digest/i);
  await assert.rejects(access(path.join(repositoryRoot, "artifacts/metadata/readback.json")), { code: "ENOENT" });
});

test("metadata CLIs have no Solana, wallet, payment, send, simulate, or upload implementation branch", async () => {
  for (const scriptPath of [
    "scripts/prepare-metadata.mjs",
    "scripts/finalize-metadata-manifest.mjs",
    "scripts/verify-metadata-upload.mjs",
  ]) {
    const source = await readFile(scriptPath, "utf8");
    assert.doesNotMatch(source, /@solana\/|Connection|Keypair|sendTransaction|simulateTransaction|signTransaction/u, scriptPath);
  }
  for (const scriptPath of [
    "scripts/prepare-metadata.mjs",
    "scripts/finalize-metadata-manifest.mjs",
  ]) {
    const source = await readFile(scriptPath, "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(|https?\.request|\.upload\s*\(/u, scriptPath);
  }
});

test("all CLIs accept only exact fixed paths and reject upload, wallet, payment, RPC, and unknown options", () => {
  assert.deepEqual(parsePrepareOptions(["--image", "web/assets/token.png", "--image-uri", IMAGE_URI, "--out", "artifacts/metadata"]), {
    imagePath: "web/assets/token.png", imageUri: IMAGE_URI, outDirectory: "artifacts/metadata",
  });
  assert.deepEqual(parseFinalizeOptions(["--draft-manifest", "artifacts/metadata/draft-manifest.json", "--metadata-uri", ARWEAVE_URI, "--out", "artifacts/metadata/manifest.json"]), {
    draftManifestPath: "artifacts/metadata/draft-manifest.json", metadataUri: ARWEAVE_URI, outputPath: "artifacts/metadata/manifest.json",
  });
  assert.deepEqual(parseVerifyOptions(["--manifest", "artifacts/metadata/manifest.json", "--out", "artifacts/metadata/readback.json"]), {
    manifestPath: "artifacts/metadata/manifest.json", outputPath: "artifacts/metadata/readback.json",
  });

  const disallowed = ["--creator", "--payment", "--signature", "--rpc", "--provider-token", "--upload", "--wallet", "--send", "--sign", "--simulate"];
  for (const option of disallowed) {
    assert.throws(() => parsePrepareOptions([option, "x"]), /Usage:/, option);
    assert.throws(() => parseFinalizeOptions([option, "x"]), /Usage:/, option);
    assert.throws(() => parseVerifyOptions([option, "x"]), /Usage:/, option);
  }
  assert.throws(() => parsePrepareOptions(["--image=web/assets/token.png", "--image-uri", IMAGE_URI, "--out", "artifacts/metadata"]), /Usage:/);
  assert.throws(() => parsePrepareOptions(["--image", "web/assets/token.png", "--image", "web/assets/token.png", "--out", "artifacts/metadata"]), /Usage:/);
  assert.throws(() => parseFinalizeOptions(["positional", "extra"]), /Usage:/);
  assert.throws(() => parseVerifyOptions(["--manifest", "artifacts/metadata/manifest.json", "--out", "artifacts/metadata/readback.json", "extra"]), /Usage:/);
});

test("fixed paths reject absolute, UNC, device, drive-relative, traversal, separator, and case drift", () => {
  const invalidImages = [
    path.resolve("web/assets/token.png"),
    "//server/share/token.png",
    "\\\\?\\C:\\token.png",
    "C:token.png",
    "web/assets/../assets/token.png",
    "web\\assets\\token.png",
    "web/assets/Token.png",
  ];
  for (const invalid of invalidImages) {
    assert.throws(() => parsePrepareOptions(["--image", invalid, "--image-uri", IMAGE_URI, "--out", "artifacts/metadata"]), /fixed|Usage|path/i, invalid);
  }
  assert.throws(() => parsePrepareOptions(["--image", "web/assets/token.png", "--image-uri", IMAGE_URI, "--out", "artifacts/Metadata"]), /fixed|path/i);
  assert.throws(() => parseFinalizeOptions(["--draft-manifest", "artifacts/metadata/../metadata/draft-manifest.json", "--metadata-uri", ARWEAVE_URI, "--out", "artifacts/metadata/manifest.json"]), /fixed|path/i);
  assert.throws(() => parseVerifyOptions(["--manifest", "artifacts\\metadata\\manifest.json", "--out", "artifacts/metadata/readback.json"]), /fixed|path/i);
});

test("repository path checks reject symlink and junction ancestors", async (t) => {
  for (const type of process.platform === "win32" ? ["junction"] : ["dir"]) {
    await t.test(type, async () => {
      const root = await makeRepositoryRoot();
      const outside = await mkdtemp(path.join(os.tmpdir(), "hakky-outside-"));
      await mkdir(path.join(root, "artifacts"), { recursive: true });
      await symlink(outside, path.join(root, "artifacts", "metadata"), type);
      await assert.rejects(prepareMetadataBundle({
        repositoryRoot: root,
        imagePath: "web/assets/token.png",
        imageUri: IMAGE_URI,
        outDirectory: "artifacts/metadata",
      }), /symlink|junction|reparse|outside/i);
    });
  }
});

test("prepare and finalize never call an injected network function", async () => {
  const repositoryRoot = await makeRepositoryRoot();
  let networkCalls = 0;
  await runPrepare({
    argv: ["--image", "web/assets/token.png", "--image-uri", IMAGE_URI, "--out", "artifacts/metadata"],
    repositoryRoot,
    networkImpl: async () => { networkCalls += 1; },
  });
  const metadataBytes = await readFile(path.join(repositoryRoot, "artifacts/metadata/token.json"));
  await runFinalize({
    argv: ["--draft-manifest", "artifacts/metadata/draft-manifest.json", "--metadata-uri", rawIpfsUri(metadataBytes), "--out", "artifacts/metadata/manifest.json"],
    repositoryRoot,
    networkImpl: async () => { networkCalls += 1; },
  });
  assert.equal(networkCalls, 0);
});

test("all metadata artifacts stay ignored and absent from the real worktree", async () => {
  for (const relativePath of [
    "artifacts/metadata/token.png",
    "artifacts/metadata/token.json",
    "artifacts/metadata/draft-manifest.json",
    "artifacts/metadata/manifest.json",
    "artifacts/metadata/readback.json",
  ]) {
    await assert.rejects(access(relativePath), { code: "ENOENT" });
    const { stdout } = await execFileAsync("git", ["check-ignore", relativePath], { cwd: process.cwd() });
    assert.equal(stdout.trim(), relativePath);
    const tracked = await execFileAsync("git", ["ls-files", "--error-unmatch", relativePath], { cwd: process.cwd() }).then(() => true, () => false);
    assert.equal(tracked, false);
  }
});
