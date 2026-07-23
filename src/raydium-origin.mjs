import { createHash } from "node:crypto";
import { RAYDIUM_LAUNCHLAB_PROGRAM_ID } from "./raydium-launchlab.mjs";

const INTRODUCTION_URL = "https://docs.raydium.io/introduction/what-is-raydium";
const PROGRAMS_URL = "https://docs.raydium.io/reference/program-addresses";
const DOCS_ORIGIN = "https://docs.raydium.io";
const MAX_DOC_BYTES = 512_000;
const FETCH_TIMEOUT_MS = 15_000;
const INPUT_FIELDS = Object.freeze(["uiUrl", "fetchImpl", "checkedAt"]);

function fail(code) {
  throw new Error(`raydium-origin-${code}`);
}

function exactTimestamp(value) {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function parseUiUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail("ui-url");
  }
  if (parsed.origin !== "https://raydium.io"
    || parsed.username !== "" || parsed.password !== ""
    || parsed.port !== "" || parsed.hash !== "") fail("ui-url");
  return parsed.href;
}

function canonicalContentLength(response) {
  const raw = response?.headers?.get?.("content-length");
  if (typeof raw !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(raw)) fail("content-length");
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_DOC_BYTES) fail("content-length");
  return value;
}

async function fetchOneDocument(startUrl, fetchImpl) {
  let currentUrl = startUrl;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const controller = new AbortController();
    let timeout;
    try {
      const deadline = new Promise((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("timeout"));
        }, FETCH_TIMEOUT_MS);
      });
      const response = await Promise.race([
        fetchImpl(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
        }),
        deadline,
      ]);
      if (!response || !Number.isInteger(response.status)) fail("response");
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers?.get?.("location");
        if (typeof location !== "string" || redirects === 3) fail("redirect");
        const next = new URL(location, currentUrl);
        if (next.origin !== DOCS_ORIGIN || next.username || next.password || next.hash) fail("redirect");
        currentUrl = next.href;
        continue;
      }
      if (!response.ok || response.status !== 200 || response.url !== currentUrl) fail("response");
      const expectedLength = canonicalContentLength(response);
      const bytes = Buffer.from(await Promise.race([response.arrayBuffer(), deadline]));
      if (bytes.length !== expectedLength) fail("content-length");
      return { url: currentUrl, bytes };
    } catch (error) {
      if (error?.message?.startsWith("raydium-origin-")) throw error;
      fail("fetch");
    } finally {
      clearTimeout(timeout);
    }
  }
  fail("redirect");
}

function decodedText(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("document-encoding");
  }
}

export async function verifyOfficialRaydiumOrigin(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)
    || Object.keys(input).sort().join(",") !== [...INPUT_FIELDS].sort().join(",")) fail("input");
  const { uiUrl, fetchImpl, checkedAt } = input;
  if (typeof fetchImpl !== "function" || !exactTimestamp(checkedAt)) fail("input");
  const normalizedUiUrl = parseUiUrl(uiUrl);
  const introduction = await fetchOneDocument(INTRODUCTION_URL, fetchImpl);
  const programs = await fetchOneDocument(PROGRAMS_URL, fetchImpl);
  const introductionText = decodedText(introduction.bytes);
  const programsText = decodedText(programs.bytes);
  if (!/official/iu.test(introductionText)
    || !introductionText.includes("https://raydium.io")) fail("official-doc");
  if (!/LaunchLab/iu.test(programsText)
    || !programsText.includes(RAYDIUM_LAUNCHLAB_PROGRAM_ID)) fail("program-doc");
  const docsSha256 = createHash("sha256")
    .update(Buffer.from(`${introduction.url}\n`, "utf8"))
    .update(introduction.bytes)
    .update(Buffer.from(`\n${programs.url}\n`, "utf8"))
    .update(programs.bytes)
    .digest("hex");
  const checks = {
    officialUiOrigin: true,
    officialDocumentation: true,
    launchlabProgramDocumented: true,
    pinnedProgramMatches: true,
  };
  const receipt = {
    schemaVersion: "official-raydium-origin-v1",
    checkedAt,
    uiUrl: normalizedUiUrl,
    uiOrigin: "https://raydium.io",
    docsUrl: programs.url,
    docsSha256,
    documentedProgramId: RAYDIUM_LAUNCHLAB_PROGRAM_ID,
    pinnedProgramId: RAYDIUM_LAUNCHLAB_PROGRAM_ID,
    checks,
    ok: true,
  };
  return Object.freeze({
    ...receipt,
    checks: Object.freeze({ ...checks }),
  });
}
