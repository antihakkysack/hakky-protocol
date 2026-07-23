import { createHash, randomUUID } from "node:crypto";
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { isPublicHostname } from "../web/lib/public-host.js";

export const APPROVED_IMAGE_BYTE_LENGTH = 74_230;
export const APPROVED_IMAGE_SHA256 = "9e672cdc454e6249873cdf359b51a1f8f6a7f8a10f057d77f85ecce705bca8a0";
export const IMAGE_SOURCE_PATH = "web/assets/token.png";
export const METADATA_DIRECTORY = "artifacts/metadata";
export const METADATA_IMAGE_PATH = "artifacts/metadata/token.png";
export const METADATA_JSON_PATH = "artifacts/metadata/token.json";
export const METADATA_DRAFT_PATH = "artifacts/metadata/draft-manifest.json";
export const METADATA_MANIFEST_PATH = "artifacts/metadata/manifest.json";
export const METADATA_READBACK_PATH = "artifacts/metadata/readback.json";

const METADATA_NAME = "Hakky Protocol";
const METADATA_SYMBOL = "HAKKY";
const METADATA_DESCRIPTION = "HAKKY is a high-risk public-only Solana meme coin launch. HakkyAgent verifies published launch facts; it does not promise safety or returns.";
const METADATA_EXTERNAL_URL = "https://hakky.xyz";
const METADATA_TWITTER = "https://x.com/antihakkysack";
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const UTC_MILLISECOND_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expectedKeys, label) {
  if (!isPlainObject(value)) fail(`${label} must be an object`);
  const actualKeys = Object.keys(value).sort();
  const sortedExpected = [...expectedKeys].sort();
  const unknown = actualKeys.filter((key) => !sortedExpected.includes(key));
  const missing = sortedExpected.filter((key) => !actualKeys.includes(key));
  if (unknown.length > 0) fail(`${label} has unknown key(s): ${unknown.join(", ")}`);
  if (missing.length > 0) fail(`${label} is missing key(s): ${missing.join(", ")}`);
}

function assertSafeByteLength(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} must be a nonnegative safe integer`);
}

function assertDigest(value, label) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    fail(`${label} must be a lowercase 64-character SHA-256 digest`);
  }
}

function base32Decode(value) {
  let bits = 0;
  let accumulator = 0;
  const output = [];
  for (const character of value) {
    const digit = BASE32_ALPHABET.indexOf(character);
    if (digit < 0) fail("IPFS CID must use lowercase unpadded base32");
    accumulator = (accumulator << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      output.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  if (bits > 0 && (accumulator & ((1 << bits) - 1)) !== 0) fail("IPFS CID has noncanonical trailing bits");
  return Buffer.from(output);
}

function base32Encode(bytes) {
  let bits = 0;
  let accumulator = 0;
  let output = "";
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(accumulator >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(accumulator << (5 - bits)) & 31];
  return output;
}

function parseIpfsIdentity(rawUri) {
  const match = /^ipfs:\/\/(b[a-z2-7]+)$/u.exec(rawUri);
  if (!match) return null;
  const payload = match[1].slice(1);
  const decoded = base32Decode(payload);
  if (decoded.byteLength !== 36) fail("IPFS CID must decode to the exact 36-byte CIDv1 raw SHA-256 tuple");
  if (decoded[0] !== 0x01 || decoded[1] !== 0x55 || decoded[2] !== 0x12 || decoded[3] !== 0x20) {
    fail("IPFS CID must be CIDv1 raw with a sha2-256 multihash");
  }
  if (`b${base32Encode(decoded)}` !== match[1]) fail("IPFS CID is not canonical lowercase unpadded base32");
  return { kind: "ipfs", identity: match[1], digest: decoded.subarray(4).toString("hex") };
}

function parseArweaveIdentity(rawUri) {
  const match = /^https:\/\/arweave\.net\/([A-Za-z0-9_-]{43})$/u.exec(rawUri);
  if (!match) return null;
  const decoded = Buffer.from(match[1], "base64url");
  if (decoded.byteLength !== 32 || decoded.toString("base64url") !== match[1]) {
    fail("Arweave transaction ID must be canonical unpadded base64url encoding of 32 bytes");
  }
  return { kind: "arweave", identity: match[1] };
}

function parseContentIdentity(rawUri) {
  if (typeof rawUri !== "string" || rawUri.length === 0 || rawUri.trim() !== rawUri) {
    fail("URI must be a nonempty raw content-addressed string");
  }
  if (rawUri.includes("@")) fail("Content-addressed URI must not contain credentials");
  if (/%2f|%5c/iu.test(rawUri)) fail("Content-addressed URI must not contain encoded path separators");
  if (/(?:^|\/)\.\.?(?:\/|$)/u.test(rawUri)) fail("Content-addressed URI must not contain dot segments");
  const ipfs = parseIpfsIdentity(rawUri);
  if (ipfs) return ipfs;
  const arweave = parseArweaveIdentity(rawUri);
  if (arweave) return arweave;
  fail("URI must be an exact canonical content-addressed IPFS or Arweave identity");
}

export function sha256Hex(bytes) {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

export function validateContentAddressedUri(rawUri) {
  parseContentIdentity(rawUri);
  return new URL(rawUri);
}

function assertUriDigest(rawUri, expectedSha256, label) {
  assertDigest(expectedSha256, `${label} expected SHA-256`);
  const identity = parseContentIdentity(rawUri);
  if (identity.kind === "ipfs" && identity.digest !== expectedSha256) {
    fail(`${label} IPFS CID digest does not match the exact expected bytes`);
  }
  return identity;
}

function resolvedContentUrl(rawUri) {
  const identity = parseContentIdentity(rawUri);
  return identity.kind === "ipfs"
    ? `https://ipfs.io/ipfs/${identity.identity}`
    : `https://arweave.net/${identity.identity}`;
}

function assertProviderUrl(rawUrl, expectedUri) {
  if (typeof rawUrl !== "string" || rawUrl.length === 0 || /%2f|%5c/iu.test(rawUrl)) {
    fail("Resolved URL is not a canonical provider content identity");
  }
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") fail("Resolved content URL must use HTTPS");
  if (url.username || url.password) fail("Resolved content URL must not contain credentials");
  if (url.port) fail("Resolved content URL must not contain a port");
  if (url.search || url.hash) fail("Resolved content URL must not contain a query or fragment");
  if (!isPublicHostname(url.hostname)) fail("Resolved content URL hostname must be public");
  const canonical = resolvedContentUrl(expectedUri);
  if (rawUrl !== canonical || url.href !== canonical) {
    fail("Resolved URL changed provider, path, or content identity");
  }
  return canonical;
}

export function buildMetadata(input) {
  assertExactKeys(input, ["imageUri"], "metadata builder input");
  validateContentAddressedUri(input.imageUri);
  return {
    name: METADATA_NAME,
    symbol: METADATA_SYMBOL,
    description: METADATA_DESCRIPTION,
    image: input.imageUri,
    external_url: METADATA_EXTERNAL_URL,
    twitter: METADATA_TWITTER,
  };
}

function canonicalJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function canonicalMetadata(metadata) {
  assertExactKeys(metadata, ["name", "symbol", "description", "image", "external_url", "twitter"], "metadata");
  const expected = buildMetadata({ imageUri: metadata.image });
  for (const key of Object.keys(expected)) {
    if (metadata[key] !== expected[key]) fail(`metadata ${key} is not the approved HAKKY value`);
  }
  return expected;
}

export function serializeMetadata(metadata) {
  return canonicalJson(canonicalMetadata(metadata));
}

function canonicalImageObject(image) {
  return {
    sourcePath: image.sourcePath,
    uri: image.uri,
    byteLength: image.byteLength,
    sha256: image.sha256,
  };
}

function canonicalDraftMetadata(metadata) {
  return {
    sourcePath: metadata.sourcePath,
    byteLength: metadata.byteLength,
    sha256: metadata.sha256,
    name: metadata.name,
    symbol: metadata.symbol,
    imageUri: metadata.imageUri,
  };
}

function canonicalManifestMetadata(metadata) {
  return {
    sourcePath: metadata.sourcePath,
    uri: metadata.uri,
    byteLength: metadata.byteLength,
    sha256: metadata.sha256,
    name: metadata.name,
    symbol: metadata.symbol,
    imageUri: metadata.imageUri,
  };
}

export function serializeMetadataDraft(draft) {
  return canonicalJson({
    schemaVersion: draft.schemaVersion,
    image: canonicalImageObject(draft.image),
    metadata: canonicalDraftMetadata(draft.metadata),
  });
}

export function serializeMetadataManifest(manifest) {
  return canonicalJson({
    schemaVersion: manifest.schemaVersion,
    image: canonicalImageObject(manifest.image),
    metadata: canonicalManifestMetadata(manifest.metadata),
  });
}

function canonicalReadbackContent(content) {
  return {
    uri: content.uri,
    resolvedUrl: content.resolvedUrl,
    byteLength: content.byteLength,
    sha256: content.sha256,
  };
}

export function serializeMetadataReadback(readback) {
  return canonicalJson({
    schemaVersion: readback.schemaVersion,
    image: canonicalReadbackContent(readback.image),
    metadata: canonicalReadbackContent(readback.metadata),
    creatorPayment: {
      signature: readback.creatorPayment.signature,
      debitLamports: readback.creatorPayment.debitLamports,
    },
    verifiedAt: readback.verifiedAt,
    ok: readback.ok,
  });
}

function assertImageObject(image) {
  assertExactKeys(image, ["sourcePath", "uri", "byteLength", "sha256"], "image");
  if (image.sourcePath !== METADATA_IMAGE_PATH) fail(`image sourcePath must be exactly ${METADATA_IMAGE_PATH}`);
  validateContentAddressedUri(image.uri);
  assertSafeByteLength(image.byteLength, "image byteLength");
  assertDigest(image.sha256, "image sha256");
  if (image.byteLength !== APPROVED_IMAGE_BYTE_LENGTH) fail("image byteLength does not match the approved image");
  if (image.sha256 !== APPROVED_IMAGE_SHA256) fail("image sha256 does not match the approved image digest");
  assertUriDigest(image.uri, APPROVED_IMAGE_SHA256, "image");
}

function assertDraftMetadata(metadata, imageUri) {
  assertExactKeys(metadata, ["sourcePath", "byteLength", "sha256", "name", "symbol", "imageUri"], "draft metadata");
  if (metadata.sourcePath !== METADATA_JSON_PATH) fail(`metadata sourcePath must be exactly ${METADATA_JSON_PATH}`);
  assertSafeByteLength(metadata.byteLength, "metadata byteLength");
  assertDigest(metadata.sha256, "metadata sha256");
  if (metadata.name !== METADATA_NAME) fail(`metadata name must be exactly ${METADATA_NAME}`);
  if (metadata.symbol !== METADATA_SYMBOL) fail(`metadata symbol must be exactly ${METADATA_SYMBOL}`);
  if (metadata.imageUri !== imageUri) fail("metadata imageUri must equal image uri byte-for-byte");
  const expectedBytes = serializeMetadata(buildMetadata({ imageUri }));
  if (metadata.byteLength !== expectedBytes.byteLength) fail("metadata byteLength does not match canonical metadata bytes");
  if (metadata.sha256 !== sha256Hex(expectedBytes)) fail("metadata sha256 does not match canonical metadata bytes");
  return expectedBytes;
}

export function assertMetadataDraftV1(value) {
  assertExactKeys(value, ["schemaVersion", "image", "metadata"], "metadata draft");
  if (value.schemaVersion !== "metadata-draft-v1") fail("metadata draft schemaVersion must be metadata-draft-v1");
  assertImageObject(value.image);
  assertDraftMetadata(value.metadata, value.image.uri);
  return value;
}

export function finalizeMetadataManifest({ draft, metadataUri }) {
  assertMetadataDraftV1(draft);
  const metadataBytes = serializeMetadata(buildMetadata({ imageUri: draft.image.uri }));
  validateContentAddressedUri(metadataUri);
  assertUriDigest(metadataUri, sha256Hex(metadataBytes), "metadata");
  return {
    schemaVersion: "metadata-manifest-v1",
    image: canonicalImageObject(draft.image),
    metadata: {
      sourcePath: draft.metadata.sourcePath,
      uri: metadataUri,
      byteLength: draft.metadata.byteLength,
      sha256: draft.metadata.sha256,
      name: draft.metadata.name,
      symbol: draft.metadata.symbol,
      imageUri: draft.metadata.imageUri,
    },
  };
}

export function assertMetadataManifestV1(value) {
  assertExactKeys(value, ["schemaVersion", "image", "metadata"], "metadata manifest");
  if (value.schemaVersion !== "metadata-manifest-v1") fail("metadata manifest schemaVersion must be metadata-manifest-v1");
  assertImageObject(value.image);
  assertExactKeys(value.metadata, ["sourcePath", "uri", "byteLength", "sha256", "name", "symbol", "imageUri"], "manifest metadata");
  const metadataBytes = assertDraftMetadata({
    sourcePath: value.metadata.sourcePath,
    byteLength: value.metadata.byteLength,
    sha256: value.metadata.sha256,
    name: value.metadata.name,
    symbol: value.metadata.symbol,
    imageUri: value.metadata.imageUri,
  }, value.image.uri);
  validateContentAddressedUri(value.metadata.uri);
  assertUriDigest(value.metadata.uri, sha256Hex(metadataBytes), "metadata");
  return value;
}

function assertReadbackContent(content, manifestContent, label) {
  assertExactKeys(content, ["uri", "resolvedUrl", "byteLength", "sha256"], `${label} readback`);
  validateContentAddressedUri(content.uri);
  if (content.uri !== manifestContent.uri) fail(`${label} readback URI does not match manifest URI`);
  if (content.resolvedUrl !== resolvedContentUrl(content.uri)) fail(`${label} readback resolvedUrl is not the canonical content identity`);
  assertProviderUrl(content.resolvedUrl, content.uri);
  assertSafeByteLength(content.byteLength, `${label} readback byteLength`);
  assertDigest(content.sha256, `${label} readback sha256`);
  if (content.byteLength !== manifestContent.byteLength) fail(`${label} readback byteLength does not match manifest`);
  if (content.sha256 !== manifestContent.sha256) fail(`${label} readback sha256 does not match manifest`);
}

export function assertMetadataReadbackV1({ manifest, readback }) {
  assertMetadataManifestV1(manifest);
  assertExactKeys(readback, ["schemaVersion", "image", "metadata", "creatorPayment", "verifiedAt", "ok"], "metadata readback");
  if (readback.schemaVersion !== "metadata-readback-v1") fail("metadata readback schemaVersion must be metadata-readback-v1");
  assertReadbackContent(readback.image, manifest.image, "image");
  assertReadbackContent(readback.metadata, manifest.metadata, "metadata");
  assertExactKeys(readback.creatorPayment, ["signature", "debitLamports"], "creatorPayment");
  if (readback.creatorPayment.signature !== null) fail("creatorPayment signature must be exactly null");
  if (readback.creatorPayment.debitLamports !== "0") fail("creatorPayment debitLamports must be exactly 0");
  if (typeof readback.verifiedAt !== "string" || !UTC_MILLISECOND_PATTERN.test(readback.verifiedAt)) {
    fail("verifiedAt must be an exact UTC millisecond timestamp");
  }
  const parsed = new Date(readback.verifiedAt);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== readback.verifiedAt) {
    fail("verifiedAt must be a valid canonical UTC millisecond timestamp");
  }
  if (readback.ok !== true) fail("metadata readback ok must be true only after exact equality");
  return readback;
}

export async function verifyPublishedContent({
  expectedBytes,
  expectedByteLength,
  expectedSha256,
  expectedUri,
  fetchImpl = globalThis.fetch,
  maxRedirects = 3,
}) {
  let exactBytes;
  if (expectedBytes !== undefined) {
    exactBytes = Buffer.from(expectedBytes);
    expectedByteLength = exactBytes.byteLength;
    expectedSha256 = sha256Hex(exactBytes);
  }
  assertSafeByteLength(expectedByteLength, "expected byteLength");
  assertDigest(expectedSha256, "expected sha256");
  validateContentAddressedUri(expectedUri);
  assertUriDigest(expectedUri, expectedSha256, "published content");
  if (typeof fetchImpl !== "function") fail("fetchImpl must be a function");
  if (!Number.isSafeInteger(maxRedirects) || maxRedirects < 0 || maxRedirects > 3) {
    fail("maxRedirects must be a safe integer from 0 through 3");
  }

  let currentUrl = resolvedContentUrl(expectedUri);
  const visited = new Set();
  for (let redirectCount = 0; ; redirectCount += 1) {
    assertProviderUrl(currentUrl, expectedUri);
    if (visited.has(currentUrl)) fail("Redirect loop detected");
    visited.add(currentUrl);
    const result = await fetchImpl(currentUrl, { method: "GET", redirect: "manual" });
    const status = Number.isInteger(result?.status) ? result.status : (result?.ok ? 200 : 0);
    if (status >= 300 && status < 400) {
      if (redirectCount >= maxRedirects) fail(`Remote verification exceeded ${maxRedirects} redirects`);
      const location = result?.headers?.get?.("location");
      if (!location) fail("Redirect response omitted Location");
      const nextUrl = new URL(location, currentUrl).href;
      assertProviderUrl(nextUrl, expectedUri);
      if (visited.has(nextUrl)) fail("Redirect loop detected");
      currentUrl = nextUrl;
      continue;
    }
    if (!(status >= 200 && status < 300) || result?.ok === false) fail(`Remote verification failed with HTTP ${status}`);
    const responseUrl = result?.url || currentUrl;
    assertProviderUrl(responseUrl, expectedUri);
    if (responseUrl !== currentUrl) fail("Remote response resolved URL changed content identity");
    const observed = Buffer.from(await result.arrayBuffer());
    if (observed.byteLength !== expectedByteLength) fail("Published content byte length does not match expected bytes");
    const observedSha256 = sha256Hex(observed);
    if (observedSha256 !== expectedSha256) fail("Published content digest does not match expected bytes");
    if (exactBytes && !observed.equals(exactBytes)) fail("Published content bytes are not exactly equal");
    return {
      uri: expectedUri,
      resolvedUrl: currentUrl,
      byteLength: observed.byteLength,
      sha256: observedSha256,
    };
  }
}

export async function verifyPublishedMetadata({ manifest, fetchImpl = globalThis.fetch, now = () => new Date() }) {
  assertMetadataManifestV1(manifest);
  const image = await verifyPublishedContent({
    expectedByteLength: manifest.image.byteLength,
    expectedSha256: manifest.image.sha256,
    expectedUri: manifest.image.uri,
    fetchImpl,
  });
  const metadata = await verifyPublishedContent({
    expectedByteLength: manifest.metadata.byteLength,
    expectedSha256: manifest.metadata.sha256,
    expectedUri: manifest.metadata.uri,
    fetchImpl,
  });
  const observedNow = typeof now === "function" ? now() : now;
  const date = observedNow instanceof Date ? observedNow : new Date(observedNow);
  if (Number.isNaN(date.getTime())) fail("now must produce a valid timestamp");
  const readback = {
    schemaVersion: "metadata-readback-v1",
    image,
    metadata,
    creatorPayment: { signature: null, debitLamports: "0" },
    verifiedAt: date.toISOString(),
    ok: true,
  };
  return assertMetadataReadbackV1({ manifest, readback });
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export async function resolveRepositoryPath(repositoryRoot, relativePath) {
  if (typeof repositoryRoot !== "string" || !path.isAbsolute(repositoryRoot)) fail("repositoryRoot must be an absolute path");
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\\") || path.posix.isAbsolute(relativePath)) {
    fail("Artifact path must be an exact repository-relative slash path");
  }
  if (/^[A-Za-z]:/u.test(relativePath) || relativePath.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail("Artifact path must not be absolute, drive-relative, empty, or traversing");
  }
  const rootPath = path.resolve(repositoryRoot);
  const rootStat = await lstat(rootPath);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail("Verified repository root must be a real directory, not a symlink or reparse point");
  const realRoot = await realpath(rootPath);
  const candidate = path.resolve(rootPath, ...relativePath.split("/"));
  if (!isPathInside(rootPath, candidate)) fail("Artifact path resolves outside the repository");

  let current = rootPath;
  for (const segment of relativePath.split("/")) {
    current = path.join(current, segment);
    try {
      const stats = await lstat(current);
      if (stats.isSymbolicLink()) fail(`Artifact path ancestor is a symlink, junction, or reparse point: ${segment}`);
      const resolved = await realpath(current);
      if (!isPathInside(realRoot, resolved)) fail("Artifact path ancestor resolves outside the repository");
    } catch (error) {
      if (error?.code === "ENOENT") break;
      throw error;
    }
  }
  return candidate;
}

export async function publishArtifactBytes(outputPath, bytes, {
  linkImpl = link,
  mkdirImpl = mkdir,
  openImpl = open,
  randomUUIDImpl = randomUUID,
  readFileImpl = readFile,
  unlinkImpl = unlink,
} = {}) {
  const exactBytes = Buffer.from(bytes);
  const directory = path.dirname(outputPath);
  await mkdirImpl(directory, { recursive: true });
  try {
    const existing = await readFileImpl(outputPath);
    if (Buffer.from(existing).equals(exactBytes)) {
      return { published: true, idempotent: true, outputPath, warnings: [] };
    }
    fail("Existing artifact has different bytes and will not be replaced");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const temporaryPath = path.join(directory, `.${path.basename(outputPath)}.${randomUUIDImpl()}.tmp`);
  let handle;
  let ownsTemporaryPath = false;
  let operationError;
  let published = false;
  let idempotent = false;
  try {
    handle = await openImpl(temporaryPath, "wx", 0o600);
    ownsTemporaryPath = true;
    await handle.writeFile(exactBytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    try {
      await linkImpl(temporaryPath, outputPath);
      published = true;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = await readFileImpl(outputPath);
      if (!Buffer.from(existing).equals(exactBytes)) throw new Error("Existing artifact has different bytes and will not be replaced");
      published = true;
      idempotent = true;
    }
  } catch (error) {
    operationError = error;
  }

  if (handle) {
    try {
      await handle.close();
    } catch (error) {
      operationError ??= error;
    }
  }

  let unlinkError;
  if (ownsTemporaryPath) {
    try {
      await unlinkImpl(temporaryPath);
    } catch (error) {
      if (error?.code !== "ENOENT") unlinkError = error;
    }
  }
  if (operationError) throw operationError;
  if (!published) throw unlinkError ?? new Error("Artifact publication did not reach the hard-link commit point");
  const warnings = unlinkError ? [{
    code: "TEMP_UNLINK_FAILED",
    message: "Artifact is published. Temporary cleanup failed. Do not retry publication; remove only the owned temporary file.",
    temporaryPath,
  }] : [];
  return { published: true, idempotent, outputPath, warnings };
}

function assertFixedPreparePaths(imagePath, outDirectory) {
  if (imagePath !== IMAGE_SOURCE_PATH) fail(`--image must be the fixed path ${IMAGE_SOURCE_PATH}`);
  if (outDirectory !== METADATA_DIRECTORY) fail(`--out must be the fixed path ${METADATA_DIRECTORY}`);
}

function assertApprovedImage(bytes) {
  if (bytes.byteLength !== APPROVED_IMAGE_BYTE_LENGTH || sha256Hex(bytes) !== APPROVED_IMAGE_SHA256) {
    fail("Image bytes do not match the approved deterministic image");
  }
}

export async function prepareMetadataBundle({
  repositoryRoot,
  imagePath,
  imageUri,
  outDirectory,
  publisherDependencies,
  onCommit = () => {},
}) {
  assertFixedPreparePaths(imagePath, outDirectory);
  validateContentAddressedUri(imageUri);
  const sourcePath = await resolveRepositoryPath(repositoryRoot, IMAGE_SOURCE_PATH);
  const metadataDirectoryPath = await resolveRepositoryPath(repositoryRoot, METADATA_DIRECTORY);
  await mkdir(metadataDirectoryPath, { recursive: true });
  await resolveRepositoryPath(repositoryRoot, METADATA_DIRECTORY);
  const imageOutputPath = await resolveRepositoryPath(repositoryRoot, METADATA_IMAGE_PATH);
  const jsonOutputPath = await resolveRepositoryPath(repositoryRoot, METADATA_JSON_PATH);
  const draftOutputPath = await resolveRepositoryPath(repositoryRoot, METADATA_DRAFT_PATH);
  const imageBytes = await readFile(sourcePath);
  assertApprovedImage(imageBytes);
  assertUriDigest(imageUri, APPROVED_IMAGE_SHA256, "image");
  const metadataBytes = serializeMetadata(buildMetadata({ imageUri }));
  const draft = {
    schemaVersion: "metadata-draft-v1",
    image: {
      sourcePath: METADATA_IMAGE_PATH,
      uri: imageUri,
      byteLength: imageBytes.byteLength,
      sha256: sha256Hex(imageBytes),
    },
    metadata: {
      sourcePath: METADATA_JSON_PATH,
      byteLength: metadataBytes.byteLength,
      sha256: sha256Hex(metadataBytes),
      name: METADATA_NAME,
      symbol: METADATA_SYMBOL,
      imageUri,
    },
  };
  assertMetadataDraftV1(draft);

  for (const [relativePath, outputPath, bytes] of [
    [METADATA_IMAGE_PATH, imageOutputPath, imageBytes],
    [METADATA_JSON_PATH, jsonOutputPath, metadataBytes],
  ]) {
    await publishArtifactBytes(outputPath, bytes, publisherDependencies);
    onCommit(relativePath);
  }
  const committedImage = await readFile(imageOutputPath);
  const committedMetadata = await readFile(jsonOutputPath);
  if (!committedImage.equals(imageBytes) || !committedMetadata.equals(metadataBytes)) {
    fail("Committed metadata inputs changed before draft publication");
  }
  await publishArtifactBytes(draftOutputPath, serializeMetadataDraft(draft), publisherDependencies);
  onCommit(METADATA_DRAFT_PATH);
  return draft;
}

export async function readCanonicalArtifact(repositoryRoot, relativePath, serializer, validator) {
  const absolutePath = await resolveRepositoryPath(repositoryRoot, relativePath);
  const bytes = await readFile(absolutePath);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`${relativePath} must contain valid UTF-8 JSON`);
  }
  validator(value);
  if (!bytes.equals(serializer(value))) fail(`${relativePath} is not canonical serialized JSON`);
  return { absolutePath, bytes, value };
}

export async function assertLocalMetadataArtifacts({ repositoryRoot, draft }) {
  assertMetadataDraftV1(draft);
  const sourcePath = await resolveRepositoryPath(repositoryRoot, IMAGE_SOURCE_PATH);
  const imagePath = await resolveRepositoryPath(repositoryRoot, METADATA_IMAGE_PATH);
  const metadataPath = await resolveRepositoryPath(repositoryRoot, METADATA_JSON_PATH);
  const [sourceBytes, imageBytes, metadataBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(imagePath),
    readFile(metadataPath),
  ]);
  assertApprovedImage(sourceBytes);
  assertApprovedImage(imageBytes);
  if (!sourceBytes.equals(imageBytes)) fail("Prepared token.png is not byte-identical to the approved source image");
  const expectedMetadata = serializeMetadata(buildMetadata({ imageUri: draft.image.uri }));
  if (!metadataBytes.equals(expectedMetadata)) fail("Prepared token.json is not the exact canonical metadata bytes");
  if (draft.metadata.byteLength !== metadataBytes.byteLength || draft.metadata.sha256 !== sha256Hex(metadataBytes)) {
    fail("Draft metadata byteLength or sha256 does not match token.json");
  }
  return { imageBytes, metadataBytes };
}
