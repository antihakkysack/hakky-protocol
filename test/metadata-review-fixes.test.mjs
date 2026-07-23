import assert from "node:assert/strict";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  publishRepositoryArtifact,
  serializeMetadataDraft,
  sha256Hex,
  verifyPublishedContent,
} from "../src/metadata-integrity.mjs";
import { main as prepareMain, runPrepare } from "../scripts/prepare-metadata.mjs";

const IMAGE_URI = "ipfs://bafkreie6m4wnyrkomjeyopg7gwnvdipy62t7riipav6xp6c6zttqlpfiua";
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function base32LowerUnpadded(bytes) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function rawIpfsUri(bytes) {
  const digest = Buffer.from(sha256Hex(bytes), "hex");
  return `ipfs://b${base32LowerUnpadded(Buffer.concat([Buffer.from([1, 0x55, 0x12, 0x20]), digest]))}`;
}

function headers(values = {}) {
  const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get(name) { return normalized[name.toLowerCase()] ?? null; } };
}

function canonicalUrl(uri) {
  return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
}

async function tempRepository() {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-metadata-review-"));
  await mkdir(path.join(root, "web", "assets"), { recursive: true });
  await cp(path.join(process.cwd(), "web", "assets", "token.png"), path.join(root, "web", "assets", "token.png"));
  return root;
}

test("validated absolute publication cannot escape after a junction or symlink swap", async () => {
  const repositoryRoot = await tempRepository();
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), "hakky-metadata-outside-"));
  const relativePath = "artifacts/metadata/token.json";
  const metadataDirectory = path.join(repositoryRoot, "artifacts", "metadata");
  try {
    await assert.rejects(
      publishRepositoryArtifact({
        repositoryRoot,
        relativePath,
        bytes: Buffer.from("must remain confined\n"),
        boundaryHooks: {
          async afterInitialValidation() {
            await rm(metadataDirectory, { recursive: true });
            await symlink(outsideRoot, metadataDirectory, process.platform === "win32" ? "junction" : "dir");
          },
        },
      }),
      /symlink|junction|reparse|outside|repository/i,
    );
    await assert.rejects(access(path.join(outsideRoot, "token.json")), { code: "ENOENT" });
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

for (const hookName of ["beforeCommit", "afterCommit"]) {
  test(`${hookName} junction or symlink swap is detected without outside publication`, async () => {
    const repositoryRoot = await tempRepository();
    const outsideRoot = await mkdtemp(path.join(os.tmpdir(), `hakky-metadata-${hookName}-outside-`));
    const relativePath = "artifacts/metadata/token.json";
    const metadataDirectory = path.join(repositoryRoot, "artifacts", "metadata");
    try {
      await assert.rejects(publishRepositoryArtifact({
        repositoryRoot,
        relativePath,
        bytes: Buffer.from("must remain confined\n"),
        boundaryHooks: {
          async [hookName]() {
            await rm(metadataDirectory, { recursive: true });
            await symlink(outsideRoot, metadataDirectory, process.platform === "win32" ? "junction" : "dir");
          },
        },
      }), /symlink|junction|reparse|outside|repository/i);
      await assert.rejects(access(path.join(outsideRoot, "token.json")), { code: "ENOENT" });
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });
}

test("oversized Content-Length rejects before arrayBuffer is called", async () => {
  const expected = Buffer.from("bounded body\n");
  const expectedUri = rawIpfsUri(expected);
  let arrayBufferCalls = 0;
  await assert.rejects(verifyPublishedContent({
    expectedBytes: expected,
    expectedUri,
    fetchImpl: async (url) => ({
      status: 200,
      ok: true,
      url,
      headers: headers({ "content-length": "999999999" }),
      async arrayBuffer() {
        arrayBufferCalls += 1;
        return expected;
      },
    }),
  }), /Content-Length|body size|exceeds/i);
  assert.equal(arrayBufferCalls, 0);
});

for (const malformed of ["+12", "12.0", "1, 2", "-1", " 12", "12 "]) {
  test(`malformed Content-Length ${JSON.stringify(malformed)} rejects before body read`, async () => {
    const expected = Buffer.from("bounded body\n");
    const expectedUri = rawIpfsUri(expected);
    let arrayBufferCalls = 0;
    await assert.rejects(verifyPublishedContent({
      expectedBytes: expected,
      expectedUri,
      fetchImpl: async (url) => ({
        status: 200,
        ok: true,
        url,
        headers: headers({ "content-length": malformed }),
        async arrayBuffer() {
          arrayBufferCalls += 1;
          return expected;
        },
      }),
    }), /Content-Length/i);
    assert.equal(arrayBufferCalls, 0);
  });
}

test("streaming verification cancels immediately after expected length plus one", async () => {
  const expected = Buffer.from("streamed body\n");
  const expectedUri = rawIpfsUri(expected);
  let cancelled = false;
  const chunks = [expected, Buffer.from("x"), Buffer.from("unreachable")];
  await assert.rejects(verifyPublishedContent({
    expectedBytes: expected,
    expectedUri,
    fetchImpl: async (url) => ({
      status: 200,
      ok: true,
      url,
      headers: headers(),
      body: {
        getReader() {
          return {
            async read() {
              const value = chunks.shift();
              return value ? { done: false, value } : { done: true };
            },
            async cancel() { cancelled = true; },
            releaseLock() {},
          };
        },
      },
    }),
  }), /exceeds|byte length/i);
  assert.equal(cancelled, true);
  assert.equal(chunks.length, 1);
});

test("streaming verification accepts an exact bounded body and passes one abort signal", async () => {
  const expected = Buffer.from("exact stream\n");
  const expectedUri = rawIpfsUri(expected);
  const chunks = [expected.subarray(0, 4), expected.subarray(4)];
  const receipt = await verifyPublishedContent({
    expectedBytes: expected,
    expectedUri,
    timeoutMs: 250,
    fetchImpl: async (url, init) => {
      assert.equal(init.method, "GET");
      assert.equal(init.redirect, "manual");
      assert.equal(init.signal instanceof AbortSignal, true);
      return {
        status: 200,
        ok: true,
        url,
        headers: headers({ "content-length": String(expected.byteLength) }),
        body: {
          getReader() {
            return {
              async read() {
                const value = chunks.shift();
                return value ? { done: false, value } : { done: true };
              },
              async cancel() {},
              releaseLock() {},
            };
          },
        },
      };
    },
  });
  assert.equal(receipt.sha256, sha256Hex(expected));
});

test("arrayBuffer fallback requires an exact trustworthy Content-Length", async () => {
  const expected = Buffer.from("fallback body\n");
  const expectedUri = rawIpfsUri(expected);
  let unboundedCalls = 0;
  await assert.rejects(verifyPublishedContent({
    expectedBytes: expected,
    expectedUri,
    fetchImpl: async (url) => ({
      status: 200,
      ok: true,
      url,
      headers: headers(),
      async arrayBuffer() { unboundedCalls += 1; return expected; },
    }),
  }), /Content-Length|bounded body/i);
  assert.equal(unboundedCalls, 0);

  const receipt = await verifyPublishedContent({
    expectedBytes: expected,
    expectedUri,
    fetchImpl: async (url) => ({
      status: 200,
      ok: true,
      url,
      headers: headers({ "content-length": String(expected.byteLength) }),
      async arrayBuffer() { return expected; },
    }),
  });
  assert.equal(receipt.byteLength, expected.byteLength);
});

test("overall timeout aborts a hanging GET and clears the deadline", async () => {
  const expected = Buffer.from("timeout body\n");
  const expectedUri = rawIpfsUri(expected);
  let observedAbort = false;
  const verification = verifyPublishedContent({
    expectedBytes: expected,
    expectedUri,
    timeoutMs: 20,
    fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => {
        observedAbort = true;
        reject(init.signal.reason);
      }, { once: true });
    }),
  });
  await assert.rejects(Promise.race([
    verification,
    new Promise((_, reject) => setTimeout(() => reject(new Error("review hang sentinel")), 150)),
  ]), /timed out|timeout/i);
  assert.equal(observedAbort, true);
});

test("the same overall deadline covers a slow redirect response", async () => {
  const expected = Buffer.from("redirect deadline\n");
  const expectedUri = rawIpfsUri(expected);
  let observedAbort = false;
  await assert.rejects(Promise.race([
    verifyPublishedContent({
      expectedBytes: expected,
      expectedUri,
      timeoutMs: 20,
      fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          observedAbort = true;
          reject(init.signal.reason);
        }, { once: true });
      }),
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("redirect deadline sentinel")), 150)),
  ]), /timed out|timeout/i);
  assert.equal(observedAbort, true);
});

test("permanent tests do not require real production metadata leaves to stay absent", async () => {
  const source = await readFile("test/metadata-integrity.test.mjs", "utf8");
  assert.doesNotMatch(source, /remain absent from the real worktree|access\(relativePath\)/u);
  assert.match(source, /check-ignore/u);
  assert.match(source, /git.*ls-files|ls-files/u);
});

test("no-mutation tests instrument real boundaries instead of ignored sentinel properties", async () => {
  const source = await readFile("test/metadata-integrity.test.mjs", "utf8");
  assert.doesNotMatch(source, /networkImpl|rpcImpl|walletImpl|uploadImpl/u);
  assert.match(source, /globalThis\.fetch/u);
});

test("all metadata CLIs use one shared exact option parser", async () => {
  const sources = await Promise.all([
    "scripts/prepare-metadata.mjs",
    "scripts/finalize-metadata-manifest.mjs",
    "scripts/verify-metadata-upload.mjs",
  ].map((file) => readFile(file, "utf8")));
  assert.equal(sources.filter((source) => source.includes("function parseNamedOptions")).length, 0);
  assert.equal(sources.every((source) => source.includes("exact-cli-options.mjs")), true);
});

test("cleanup warnings surface through the preparation callback without changing the draft schema", async () => {
  const repositoryRoot = await tempRepository();
  const warnings = [];
  const draft = await runPrepare({
    argv: ["--image", "web/assets/token.png", "--image-uri", IMAGE_URI, "--out", "artifacts/metadata"],
    repositoryRoot,
    onWarning(warning) { warnings.push(warning); },
    publisherDependencies: {
      unlinkImpl: async () => { throw Object.assign(new Error("synthetic cleanup failure"), { code: "EIO" }); },
    },
  });
  assert.deepEqual(Object.keys(draft).sort(), ["image", "metadata", "schemaVersion"]);
  assert.equal(warnings.length, 3);
  assert.equal(warnings.every(({ code }) => code === "TEMP_UNLINK_FAILED"), true);

  let stdout = "";
  let stderr = "";
  const status = await prepareMain({
    stdout: { write(value) { stdout += value; } },
    stderr: { write(value) { stderr += value; } },
    runImpl: async ({ onWarning }) => {
      onWarning(warnings[0]);
      return draft;
    },
  });
  assert.equal(status, 0);
  assert.match(stdout, /metadata-draft-v1/);
  assert.match(stderr, /Temporary cleanup failed/);
  assert.match(stderr, /Temporary path:/);
});

test("serializer preconditions reject malformed roots explicitly", () => {
  assert.throws(() => serializeMetadataDraft({}), /metadata draft|schemaVersion|image|metadata/i);
});
