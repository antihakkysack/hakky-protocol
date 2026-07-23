import assert from "node:assert/strict";
import test from "node:test";
import {
  parseOriginOptions,
  runOriginVerifier,
} from "../scripts/verify-raydium-origin.mjs";
import {
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
} from "../src/raydium-launchlab.mjs";
import { MAINNET_SESSION_PATHS } from "../src/mainnet-session-artifact.mjs";
import { verifyOfficialRaydiumOrigin } from "../src/raydium-origin.mjs";

const CHECKED_AT = "2026-07-23T01:00:00.000Z";
const INTRODUCTION_URL = "https://docs.raydium.io/introduction/what-is-raydium";
const PROGRAMS_URL = "https://docs.raydium.io/reference/program-addresses";
const INTRODUCTION = "Raydium's official application is https://raydium.io and no other domain.";
const PROGRAMS = `LaunchLab program: ${RAYDIUM_LAUNCHLAB_PROGRAM_ID}`;

function response(url, body, { status = 200, headers = {} } = {}) {
  const bytes = Buffer.from(body, "utf8");
  return {
    status,
    ok: status >= 200 && status < 300,
    url,
    headers: {
      get(name) {
        if (name.toLowerCase() === "content-length") return String(bytes.length);
        return headers[name.toLowerCase()] ?? null;
      },
    },
    async arrayBuffer() {
      return bytes;
    },
  };
}

function officialFetch() {
  const calls = [];
  return {
    calls,
    async fetch(url, options) {
      calls.push([url, options]);
      if (url === INTRODUCTION_URL) return response(url, INTRODUCTION);
      if (url === PROGRAMS_URL) return response(url, PROGRAMS);
      throw new Error("unexpected-url");
    },
  };
}

test("binds the exact official UI origin to current Raydium documentation", async () => {
  const source = officialFetch();
  const receipt = await verifyOfficialRaydiumOrigin({
    uiUrl: "https://raydium.io/launchpad/",
    fetchImpl: source.fetch,
    checkedAt: CHECKED_AT,
  });
  assert.deepEqual(source.calls.map(([url, options]) => [
    url,
    {
      method: options.method,
      redirect: options.redirect,
      signal: options.signal instanceof AbortSignal,
    },
  ]), [
    [INTRODUCTION_URL, { method: "GET", redirect: "manual", signal: true }],
    [PROGRAMS_URL, { method: "GET", redirect: "manual", signal: true }],
  ]);
  assert.deepEqual(Object.keys(receipt), [
    "schemaVersion",
    "checkedAt",
    "uiUrl",
    "uiOrigin",
    "docsUrl",
    "docsSha256",
    "documentedProgramId",
    "pinnedProgramId",
    "checks",
    "ok",
  ]);
  assert.equal(receipt.uiOrigin, "https://raydium.io");
  assert.equal(receipt.documentedProgramId, RAYDIUM_LAUNCHLAB_PROGRAM_ID);
  assert.equal(receipt.pinnedProgramId, RAYDIUM_LAUNCHLAB_PROGRAM_ID);
  assert.match(receipt.docsSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(receipt.checks, {
    officialUiOrigin: true,
    officialDocumentation: true,
    launchlabProgramDocumented: true,
    pinnedProgramMatches: true,
  });
  assert.equal(receipt.ok, true);
});

test("rejects lookalikes, authenticated URLs, documentation drift, and cross-origin redirects", async () => {
  for (const input of [
    {
      uiUrl: "https://launch.raydium.io/",
      fetchImpl: officialFetch().fetch,
      checkedAt: CHECKED_AT,
    },
    {
      uiUrl: "https://user@example@raydium.io/",
      fetchImpl: officialFetch().fetch,
      checkedAt: CHECKED_AT,
    },
    {
      uiUrl: "https://raydium.io/",
      fetchImpl: async (url) => response(
        url,
        url === INTRODUCTION_URL ? INTRODUCTION : "LaunchLab program changed",
      ),
      checkedAt: CHECKED_AT,
    },
    {
      uiUrl: "https://raydium.io/",
      fetchImpl: async (url) => response(url, "", {
        status: 302,
        headers: { location: "https://example.com/lookalike" },
      }),
      checkedAt: CHECKED_AT,
    },
    {
      uiUrl: "https://raydium.io/",
      fetchImpl: officialFetch().fetch,
      checkedAt: "not-a-time",
    },
  ]) {
    await assert.rejects(verifyOfficialRaydiumOrigin(input), /^Error: raydium-origin-/);
  }
});

test("the origin CLI has only the exact public URL and fixed output controls", async () => {
  const source = officialFetch();
  const writes = [];
  const receipt = await runOriginVerifier({
    argv: [
      "--ui-url", "https://raydium.io/launchpad/",
      "--out", MAINNET_SESSION_PATHS.officialOrigin,
    ],
    repositoryRoot: process.cwd(),
    fetchImpl: source.fetch,
    now: () => new Date(CHECKED_AT),
    writeImpl: async (input) => { writes.push(input); },
  });
  assert.equal(receipt.ok, true);
  assert.deepEqual(writes, [{
    repositoryRoot: process.cwd(),
    relativePath: MAINNET_SESSION_PATHS.officialOrigin,
    value: receipt,
  }]);
  assert.throws(() => parseOriginOptions([
    "--ui-url", "https://raydium.io/",
    "--out", MAINNET_SESSION_PATHS.officialOrigin,
    "--program", RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  ]), /Usage:/u);
});
