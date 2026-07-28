import {
  APPROVED_IMAGE_BYTE_LENGTH,
  APPROVED_IMAGE_CID,
  APPROVED_IMAGE_SHA256,
  assertCanonicalCid,
  sha256Hex,
} from "./metadata-integrity.mjs";

export const IMAGE_IPFS_SCHEMA_VERSION = "hakky-image-ipfs-v1";
export const IMAGE_IPFS_SOURCE_PATH = "web/assets/token.png";
export const IMAGE_IPFS_CID_PATH =
  "artifacts/ipfs/pinata-upload-cid.txt";
export const IMAGE_IPFS_RECEIPT_PATH =
  "artifacts/ipfs/image-ipfs-v1.json";
export const IMAGE_IPFS_TIMEOUT_MS = 15_000;

const UTC_MILLISECOND_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const GATEWAYS = Object.freeze([
  Object.freeze({
    id: "ipfs-io",
    url: `https://ipfs.io/ipfs/${APPROVED_IMAGE_CID}`,
    allowedResolvedUrls: Object.freeze([
      `https://ipfs.io/ipfs/${APPROVED_IMAGE_CID}`,
    ]),
  }),
  Object.freeze({
    id: "dweb-link",
    url: `https://dweb.link/ipfs/${APPROVED_IMAGE_CID}`,
    allowedResolvedUrls: Object.freeze([
      `https://dweb.link/ipfs/${APPROVED_IMAGE_CID}`,
      `https://${APPROVED_IMAGE_CID}.ipfs.dweb.link/`,
    ]),
  }),
]);

function fail() {
  throw new Error("image-ipfs-proof-invalid");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expected) {
  if (!isPlainObject(value)) fail();
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail();
  }
}

function canonicalTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.toISOString();
  if (!UTC_MILLISECOND_PATTERN.test(timestamp)) fail();
  return timestamp;
}

function awaitWithAbort(value, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(value).then(
      (result) => {
        signal.removeEventListener("abort", onAbort);
        resolve(result);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

async function readExactImageBody(response, signal) {
  const reader = response?.body?.getReader?.();
  if (!reader) fail();

  const chunks = [];
  let total = 0;
  let cancelled = false;
  try {
    while (true) {
      const result = await awaitWithAbort(reader.read(), signal);
      if (!isPlainObject(result) || typeof result.done !== "boolean") fail();
      if (result.done) break;
      if (!(result.value instanceof Uint8Array)) fail();
      const chunk = Buffer.from(result.value);
      total += chunk.byteLength;
      if (total > APPROVED_IMAGE_BYTE_LENGTH) {
        await awaitWithAbort(
          reader.cancel("image-ipfs-body-exceeded-bound"),
          signal,
        );
        cancelled = true;
        fail();
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (!cancelled) {
      try {
        await awaitWithAbort(reader.cancel(error), signal);
      } catch {
        // Preserve the bounded verification failure.
      }
    }
    if (error?.message === "image-ipfs-proof-invalid") throw error;
    fail();
  } finally {
    try {
      reader.releaseLock?.();
    } catch {
      // Cleanup-only lock failures do not change verification.
    }
  }
  if (total !== APPROVED_IMAGE_BYTE_LENGTH) fail();
  return Buffer.concat(chunks, total);
}

function assertGatewayReceipt(value, expectedGateway) {
  assertExactKeys(value, [
    "id",
    "url",
    "resolvedUrl",
    "contentType",
    "byteLength",
    "sha256",
  ]);
  if (
    value.id !== expectedGateway.id ||
    value.url !== expectedGateway.url ||
    !expectedGateway.allowedResolvedUrls.includes(value.resolvedUrl) ||
    value.contentType !== "image/png" ||
    value.byteLength !== APPROVED_IMAGE_BYTE_LENGTH ||
    value.sha256 !== APPROVED_IMAGE_SHA256
  ) {
    fail();
  }
}

export function assertImageIpfsReceiptV1(value) {
  assertExactKeys(value, [
    "schemaVersion",
    "cid",
    "source",
    "gateways",
    "verifiedAt",
    "mainnetActionsAuthorized",
  ]);
  if (
    value.schemaVersion !== IMAGE_IPFS_SCHEMA_VERSION ||
    value.cid !== APPROVED_IMAGE_CID ||
    value.mainnetActionsAuthorized !== false ||
    !UTC_MILLISECOND_PATTERN.test(value.verifiedAt) ||
    new Date(value.verifiedAt).toISOString() !== value.verifiedAt
  ) {
    fail();
  }
  assertCanonicalCid(value.cid);
  assertExactKeys(value.source, ["path", "byteLength", "sha256"]);
  if (
    value.source.path !== IMAGE_IPFS_SOURCE_PATH ||
    value.source.byteLength !== APPROVED_IMAGE_BYTE_LENGTH ||
    value.source.sha256 !== APPROVED_IMAGE_SHA256
  ) {
    fail();
  }
  if (!Array.isArray(value.gateways) || value.gateways.length !== GATEWAYS.length) {
    fail();
  }
  value.gateways.forEach((gateway, index) =>
    assertGatewayReceipt(gateway, GATEWAYS[index]),
  );
  return value;
}

export function serializeImageIpfsReceiptV1(value) {
  assertImageIpfsReceiptV1(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function verifyGateway({ gateway, imageBytes, fetchImpl, signal }) {
  let currentUrl = gateway.url;
  let response;
  for (let redirectCount = 0; ; redirectCount += 1) {
    response = await fetchImpl(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal,
    });
    const status = Number.isInteger(response?.status)
      ? response.status
      : response?.ok
        ? 200
        : 0;
    if (status >= 300 && status < 400) {
      if (redirectCount >= 1) fail();
      const location = response?.headers?.get?.("location");
      if (typeof location !== "string" || location.length === 0) fail();
      const nextUrl = new URL(location, currentUrl).href;
      if (!gateway.allowedResolvedUrls.includes(nextUrl) || nextUrl === currentUrl) {
        fail();
      }
      try {
        await response?.body?.cancel?.("redirect-body-not-content");
      } catch {
        fail();
      }
      currentUrl = nextUrl;
      continue;
    }
    if (status < 200 || status >= 300 || response?.ok === false) fail();
    const resolvedUrl = response.url || currentUrl;
    if (
      resolvedUrl !== currentUrl ||
      !gateway.allowedResolvedUrls.includes(resolvedUrl)
    ) {
      fail();
    }
    break;
  }
  const contentType = response?.headers?.get?.("content-type");
  if (contentType !== "image/png") fail();
  const contentLength = response?.headers?.get?.("content-length");
  if (contentLength !== String(APPROVED_IMAGE_BYTE_LENGTH)) fail();
  const observed = await readExactImageBody(response, signal);
  if (
    observed.byteLength !== APPROVED_IMAGE_BYTE_LENGTH ||
    sha256Hex(observed) !== APPROVED_IMAGE_SHA256 ||
    !observed.equals(imageBytes)
  ) {
    fail();
  }
  return {
    id: gateway.id,
    url: gateway.url,
    resolvedUrl: response.url || currentUrl,
    contentType,
    byteLength: observed.byteLength,
    sha256: sha256Hex(observed),
  };
}

export async function verifyImageIpfsV1({
  cid,
  imageBytes,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  timeoutMs = IMAGE_IPFS_TIMEOUT_MS,
}) {
  if (
    cid !== APPROVED_IMAGE_CID ||
    typeof fetchImpl !== "function" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 60_000
  ) {
    fail();
  }
  assertCanonicalCid(cid);
  const exactImage = Buffer.from(imageBytes);
  if (
    exactImage.byteLength !== APPROVED_IMAGE_BYTE_LENGTH ||
    sha256Hex(exactImage) !== APPROVED_IMAGE_SHA256
  ) {
    fail();
  }
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("image-ipfs-proof-timeout")),
    timeoutMs,
  );
  try {
    const gateways = [];
    for (const gateway of GATEWAYS) {
      gateways.push(
        await verifyGateway({
          gateway,
          imageBytes: exactImage,
          fetchImpl,
          signal: controller.signal,
        }),
      );
    }
    return assertImageIpfsReceiptV1({
      schemaVersion: IMAGE_IPFS_SCHEMA_VERSION,
      cid,
      source: {
        path: IMAGE_IPFS_SOURCE_PATH,
        byteLength: exactImage.byteLength,
        sha256: sha256Hex(exactImage),
      },
      gateways,
      verifiedAt: canonicalTimestamp(
        typeof now === "function" ? now() : now,
      ),
      mainnetActionsAuthorized: false,
    });
  } finally {
    clearTimeout(timer);
  }
}
