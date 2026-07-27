import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

import {
  assertImageIpfsReceiptV1,
  IMAGE_IPFS_RECEIPT_PATH,
  serializeImageIpfsReceiptV1,
  verifyImageIpfsV1,
} from "../src/image-ipfs-proof.mjs";
import {
  parseImageIpfsOptions,
  runImageIpfsVerification,
} from "../scripts/verify-image-ipfs.mjs";
import {
  APPROVED_IMAGE_CID,
  APPROVED_IMAGE_SHA256,
} from "../src/metadata-integrity.mjs";

const IMAGE_BYTES = await readFile(
  new URL("../web/assets/token.png", import.meta.url),
);
const CHECKED_AT = "2026-07-27T12:00:00.000Z";

function exactResponse(bytes = IMAGE_BYTES, overrides = {}) {
  return new Response(bytes, {
    status: overrides.status ?? 200,
    headers: {
      "content-length": String(bytes.byteLength),
      "content-type": overrides.contentType ?? "image/png",
      ...(overrides.headers ?? {}),
    },
  });
}

test("verifies the approved image through exactly two fixed IPFS gateways", async () => {
  const requested = [];
  const receipt = await verifyImageIpfsV1({
    cid: APPROVED_IMAGE_CID,
    imageBytes: IMAGE_BYTES,
    async fetchImpl(url, options) {
      requested.push({ url, options });
      return exactResponse();
    },
    now: () => new Date(CHECKED_AT),
  });

  assert.deepEqual(
    requested.map(({ url }) => url),
    [
      `https://ipfs.io/ipfs/${APPROVED_IMAGE_CID}`,
      `https://dweb.link/ipfs/${APPROVED_IMAGE_CID}`,
    ],
  );
  assert.ok(
    requested.every(
      ({ options }) =>
        options.method === "GET" &&
        options.redirect === "manual" &&
        options.signal instanceof AbortSignal,
    ),
  );
  assert.deepEqual(receipt, {
    schemaVersion: "hakky-image-ipfs-v1",
    cid: APPROVED_IMAGE_CID,
    source: {
      path: "web/assets/token.png",
      byteLength: 74230,
      sha256: APPROVED_IMAGE_SHA256,
    },
    gateways: [
      {
        id: "ipfs-io",
        url: `https://ipfs.io/ipfs/${APPROVED_IMAGE_CID}`,
        resolvedUrl: `https://ipfs.io/ipfs/${APPROVED_IMAGE_CID}`,
        contentType: "image/png",
        byteLength: 74230,
        sha256: APPROVED_IMAGE_SHA256,
      },
      {
        id: "dweb-link",
        url: `https://dweb.link/ipfs/${APPROVED_IMAGE_CID}`,
        resolvedUrl: `https://dweb.link/ipfs/${APPROVED_IMAGE_CID}`,
        contentType: "image/png",
        byteLength: 74230,
        sha256: APPROVED_IMAGE_SHA256,
      },
    ],
    verifiedAt: CHECKED_AT,
    mainnetActionsAuthorized: false,
  });
  assert.equal(assertImageIpfsReceiptV1(receipt), receipt);
});

test("follows only the bounded dweb path-to-subdomain redirect", async () => {
  const redirected = `https://${APPROVED_IMAGE_CID}.ipfs.dweb.link/`;
  const requested = [];
  const receipt = await verifyImageIpfsV1({
    cid: APPROVED_IMAGE_CID,
    imageBytes: IMAGE_BYTES,
    async fetchImpl(url) {
      requested.push(url);
      if (url === `https://dweb.link/ipfs/${APPROVED_IMAGE_CID}`) {
        return new Response(null, {
          status: 302,
          headers: { location: redirected },
        });
      }
      const response = exactResponse();
      if (url === redirected) {
        Object.defineProperty(response, "url", {
          configurable: true,
          value: redirected,
        });
      }
      return response;
    },
    now: () => new Date(CHECKED_AT),
  });

  assert.deepEqual(requested, [
    `https://ipfs.io/ipfs/${APPROVED_IMAGE_CID}`,
    `https://dweb.link/ipfs/${APPROVED_IMAGE_CID}`,
    redirected,
  ]);
  assert.equal(receipt.gateways[1].resolvedUrl, redirected);
  assert.equal(assertImageIpfsReceiptV1(receipt), receipt);
});

test("streaming verification cancels immediately after the exact bound plus one", async () => {
  let reads = 0;
  let cancellations = 0;
  const chunks = [
    IMAGE_BYTES,
    Uint8Array.of(0),
    Uint8Array.of(1, 2, 3),
  ];

  await assert.rejects(
    verifyImageIpfsV1({
      cid: APPROVED_IMAGE_CID,
      imageBytes: IMAGE_BYTES,
      async fetchImpl(url) {
        if (url.startsWith("https://ipfs.io/")) return exactResponse();
        return {
          status: 200,
          ok: true,
          url,
          headers: new Headers({
            "content-length": String(IMAGE_BYTES.byteLength),
            "content-type": "image/png",
          }),
          body: {
            getReader() {
              return {
                async read() {
                  const value = chunks[reads];
                  reads += 1;
                  return value === undefined
                    ? { done: true, value: undefined }
                    : { done: false, value };
                },
                async cancel() {
                  cancellations += 1;
                },
                releaseLock() {},
              };
            },
          },
          async arrayBuffer() {
            throw new Error("unbounded-array-buffer-read");
          },
        };
      },
      now: () => new Date(CHECKED_AT),
    }),
    /image-ipfs-proof-invalid/u,
  );

  assert.equal(reads, 2);
  assert.equal(cancellations, 1);
});

test("verification refuses an unbounded arrayBuffer-only gateway body", async () => {
  let arrayBufferCalls = 0;
  await assert.rejects(
    verifyImageIpfsV1({
      cid: APPROVED_IMAGE_CID,
      imageBytes: IMAGE_BYTES,
      async fetchImpl(url) {
        return {
          status: 200,
          ok: true,
          url,
          headers: new Headers({
            "content-length": String(IMAGE_BYTES.byteLength),
            "content-type": "image/png",
          }),
          body: null,
          async arrayBuffer() {
            arrayBufferCalls += 1;
            return IMAGE_BYTES;
          },
        };
      },
      now: () => new Date(CHECKED_AT),
    }),
    /image-ipfs-proof-invalid/u,
  );
  assert.equal(arrayBufferCalls, 0);
});

test("image verification CLI accepts only the fixed CID-file path", () => {
  assert.deepEqual(
    parseImageIpfsOptions([
      "--cid-file",
      "artifacts/ipfs/pinata-upload-cid.txt",
    ]),
    { cidFilePath: "artifacts/ipfs/pinata-upload-cid.txt" },
  );
  for (const argv of [
    [],
    ["--cid-file", "cid.txt"],
    ["--cid-file", "artifacts/ipfs/pinata-upload-cid.txt", "--upload", "yes"],
    ["--wallet", "phantom"],
    ["--payment", "1"],
  ]) {
    assert.throws(() => parseImageIpfsOptions(argv), /Usage|fixed path|Unknown/u);
  }
  assert.equal(typeof runImageIpfsVerification, "function");
});

test("image verification CLI reads exact local evidence and publishes one closed receipt", async (t) => {
  const repositoryRoot = await mkdtemp(
    path.join(tmpdir(), "hakky-image-ipfs-"),
  );
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  await mkdir(path.join(repositoryRoot, "web", "assets"), { recursive: true });
  await mkdir(path.join(repositoryRoot, "artifacts", "ipfs"), {
    recursive: true,
  });
  await writeFile(
    path.join(repositoryRoot, "web", "assets", "token.png"),
    IMAGE_BYTES,
  );
  await writeFile(
    path.join(
      repositoryRoot,
      "artifacts",
      "ipfs",
      "pinata-upload-cid.txt",
    ),
    `${APPROVED_IMAGE_CID}\n`,
    "utf8",
  );

  const receipt = await runImageIpfsVerification({
    argv: ["--cid-file", "artifacts/ipfs/pinata-upload-cid.txt"],
    repositoryRoot,
    fetchImpl: async () => exactResponse(),
    now: () => new Date(CHECKED_AT),
  });

  assert.equal(assertImageIpfsReceiptV1(receipt), receipt);
  assert.deepEqual(
    await readFile(path.join(repositoryRoot, ...IMAGE_IPFS_RECEIPT_PATH.split("/"))),
    serializeImageIpfsReceiptV1(receipt),
  );

  const repeated = await runImageIpfsVerification({
    argv: ["--cid-file", "artifacts/ipfs/pinata-upload-cid.txt"],
    repositoryRoot,
    fetchImpl: async () => exactResponse(),
    now: () => new Date(CHECKED_AT),
  });
  assert.deepEqual(repeated, receipt);

  await assert.rejects(
    runImageIpfsVerification({
      argv: ["--cid-file", "artifacts/ipfs/pinata-upload-cid.txt"],
      repositoryRoot,
      fetchImpl: async () => exactResponse(),
      now: () => new Date("2026-07-27T12:00:01.000Z"),
    }),
    /image-ipfs-receipt-conflict/u,
  );
  assert.deepEqual(
    await readFile(path.join(repositoryRoot, ...IMAGE_IPFS_RECEIPT_PATH.split("/"))),
    serializeImageIpfsReceiptV1(receipt),
  );
});

test("image IPFS schema accepts only the closed non-authorizing receipt", async () => {
  const schema = JSON.parse(
    await readFile(
      new URL(
        "../schemas/release/image-ipfs-v1.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
    schema,
  );
  const receipt = await verifyImageIpfsV1({
    cid: APPROVED_IMAGE_CID,
    imageBytes: IMAGE_BYTES,
    fetchImpl: async () => exactResponse(),
    now: () => new Date(CHECKED_AT),
  });
  assert.equal(validate(receipt), true, JSON.stringify(validate.errors));
  for (const mutate of [
    (value) => {
      value.mainnetActionsAuthorized = true;
    },
    (value) => {
      value.payment = { lamports: "0" };
    },
    (value) => {
      value.gateways.pop();
    },
    (value) => {
      value.gateways[1].id = "ipfs-io";
    },
  ]) {
    const candidate = structuredClone(receipt);
    mutate(candidate);
    assert.equal(validate(candidate), false);
  }
});

test("verification rejects CID, MIME, byte, and provider drift", async () => {
  await assert.rejects(
    verifyImageIpfsV1({
      cid: `b${"a".repeat(58)}`,
      imageBytes: IMAGE_BYTES,
      fetchImpl: async () => exactResponse(),
    }),
    /image-ipfs-proof-invalid/u,
  );
  await assert.rejects(
    verifyImageIpfsV1({
      cid: APPROVED_IMAGE_CID,
      imageBytes: IMAGE_BYTES,
      fetchImpl: async () =>
        exactResponse(IMAGE_BYTES, { contentType: "application/octet-stream" }),
    }),
    /image-ipfs-proof-invalid/u,
  );
  const changedBytes = Buffer.from(IMAGE_BYTES);
  changedBytes[changedBytes.length - 1] ^= 1;
  await assert.rejects(
    verifyImageIpfsV1({
      cid: APPROVED_IMAGE_CID,
      imageBytes: IMAGE_BYTES,
      fetchImpl: async () => exactResponse(changedBytes),
    }),
    /image-ipfs-proof-invalid/u,
  );
  await assert.rejects(
    verifyImageIpfsV1({
      cid: APPROVED_IMAGE_CID,
      imageBytes: IMAGE_BYTES,
      async fetchImpl(url) {
        if (url.startsWith("https://ipfs.io/")) return exactResponse();
        return new Response(null, {
          status: 302,
          headers: {
            location: `https://example.com/ipfs/${APPROVED_IMAGE_CID}`,
          },
        });
      },
    }),
    /image-ipfs-proof-invalid/u,
  );
});

test("malformed CID-file bytes stop before fetch or receipt publication", async (t) => {
  const repositoryRoot = await mkdtemp(
    path.join(tmpdir(), "hakky-image-ipfs-invalid-"),
  );
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  await mkdir(path.join(repositoryRoot, "web", "assets"), { recursive: true });
  await mkdir(path.join(repositoryRoot, "artifacts", "ipfs"), {
    recursive: true,
  });
  await writeFile(
    path.join(repositoryRoot, "web", "assets", "token.png"),
    IMAGE_BYTES,
  );
  await writeFile(
    path.join(
      repositoryRoot,
      "artifacts",
      "ipfs",
      "pinata-upload-cid.txt",
    ),
    `${APPROVED_IMAGE_CID}\r\n`,
    "utf8",
  );
  let fetchCalls = 0;
  await assert.rejects(
    runImageIpfsVerification({
      argv: ["--cid-file", "artifacts/ipfs/pinata-upload-cid.txt"],
      repositoryRoot,
      async fetchImpl() {
        fetchCalls += 1;
        return exactResponse();
      },
    }),
    /image-ipfs-cid-file-invalid/u,
  );
  assert.equal(fetchCalls, 0);
  await assert.rejects(
    readFile(
      path.join(repositoryRoot, ...IMAGE_IPFS_RECEIPT_PATH.split("/")),
    ),
    { code: "ENOENT" },
  );
});

test("runtime receipt validation rejects authorization and unknown evidence fields", async () => {
  const receipt = await verifyImageIpfsV1({
    cid: APPROVED_IMAGE_CID,
    imageBytes: IMAGE_BYTES,
    fetchImpl: async () => exactResponse(),
    now: () => new Date(CHECKED_AT),
  });
  for (const mutate of [
    (value) => {
      value.mainnetActionsAuthorized = true;
    },
    (value) => {
      value.wallet = "phantom";
    },
    (value) => {
      value.gateways[0].payment = "0";
    },
    (value) => {
      value.gateways.reverse();
    },
  ]) {
    const candidate = structuredClone(receipt);
    mutate(candidate);
    assert.throws(
      () => assertImageIpfsReceiptV1(candidate),
      /image-ipfs-proof-invalid/u,
    );
  }
});
