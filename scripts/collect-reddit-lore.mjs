import { randomUUID } from "node:crypto";
import {
  mkdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REDDIT_ORIGIN = "https://www.reddit.com";
export const DEFAULT_DEADLINE_MS = 60_000;

export const SOURCES = Object.freeze([
  Object.freeze({
    id: "profile-submissions",
    url: `${REDDIT_ORIGIN}/user/Left-Agency-9292/submitted.json?raw_json=1&limit=100`,
    archiveUrl: "https://arctic-shift.photon-reddit.com/api/posts/search?author=Left-Agency-9292&limit=100&sort=asc",
  }),
  Object.freeze({
    id: "profile-comments",
    url: `${REDDIT_ORIGIN}/user/Left-Agency-9292/comments.json?raw_json=1&limit=100`,
    archiveUrl: "https://arctic-shift.photon-reddit.com/api/comments/search?author=Left-Agency-9292&limit=100&sort=asc",
  }),
  Object.freeze({
    id: "reddtland-submissions",
    url: `${REDDIT_ORIGIN}/r/REDDTLAND/new.json?raw_json=1&limit=100`,
    archiveUrl: "https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=REDDTLAND&limit=100&sort=asc",
  }),
  Object.freeze({
    id: "reddtland-comments",
    url: `${REDDIT_ORIGIN}/r/REDDTLAND/comments.json?raw_json=1&limit=100`,
    archiveUrl: "https://arctic-shift.photon-reddit.com/api/comments/search?subreddit=REDDTLAND&limit=100&sort=asc",
  }),
]);

function nullableString(value) {
  return typeof value === "string" ? value : null;
}

function canonicalUrl(value, { redditRelative = false } = {}) {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const url = redditRelative ? new URL(value, REDDIT_ORIGIN) : new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeItem(source, data) {
  return {
    source,
    name: nullableString(data.name),
    createdUtc: Number.isFinite(data.created_utc) ? data.created_utc : null,
    subreddit: nullableString(data.subreddit),
    title: nullableString(data.title),
    selftext: nullableString(data.selftext),
    body: nullableString(data.body),
    url: canonicalUrl(data.url),
    permalink: canonicalUrl(data.permalink, { redditRelative: true }),
    postHint: nullableString(data.post_hint),
    isVideo: typeof data.is_video === "boolean" ? data.is_video : null,
    crosspostParent: nullableString(data.crosspost_parent),
    linkId: nullableString(data.link_id),
    parentId: nullableString(data.parent_id),
    removedByCategory: nullableString(data.removed_by_category),
  };
}

function errorMessage(error) {
  if (error?.name === "AbortError") return "shared collection deadline exceeded";
  return error instanceof Error ? error.message : String(error);
}

async function collectRedditSource({
  source,
  fetchImpl,
  controller,
  maxPages,
  seen,
  items,
}) {
  let after = null;
  let pages = 0;
  const cursors = new Set();
  let stoppedReason = null;

  try {
    while (pages < maxPages) {
      const url = new URL(source.url);
      if (after !== null) url.searchParams.set("after", after);
      const response = await fetchImpl(url, {
        headers: {
          "User-Agent": "hakky-lore-ledger/1.0 (public read-only collector)",
        },
        redirect: "error",
        signal: controller.signal,
      });
      if (!response?.ok) {
        throw new Error(`${source.id} returned HTTP ${response?.status ?? "unknown"}`);
      }

      const listing = await response.json();
      const children = listing?.data?.children;
      if (!Array.isArray(children)) {
        throw new Error(`${source.id} returned an invalid listing`);
      }

      for (const child of children) {
        const data = child?.data;
        if (!data || typeof data.name !== "string" || seen.has(data.name)) continue;
        seen.add(data.name);
        items.push(normalizeItem(source.id, data));
      }

      pages += 1;
      after = listing.data.after;
      if (after === null) break;
      if (typeof after !== "string" || cursors.has(after)) {
        stoppedReason = `${source.id} returned an invalid or repeated cursor`;
        break;
      }
      cursors.add(after);
    }

    if (after !== null && stoppedReason === null && pages === maxPages) {
      stoppedReason = `${source.id} exceeded ${maxPages} pages`;
    }
  } catch (error) {
    stoppedReason = `${source.id}: ${errorMessage(error)}`;
  }

  return {
    id: source.id,
    provider: "reddit",
    pages,
    complete: after === null && stoppedReason === null,
    stoppedReason,
    primaryError: null,
  };
}

async function collectArchiveSource({
  source,
  fetchImpl,
  controller,
  maxPages,
  seen,
  items,
  primaryError,
}) {
  let after = null;
  let pages = 0;
  let stoppedReason = null;

  try {
    while (pages < maxPages) {
      const url = new URL(source.archiveUrl);
      if (after !== null) url.searchParams.set("after", String(after));
      const response = await fetchImpl(url, {
        headers: {
          "User-Agent": "hakky-lore-ledger/1.0 (public read-only collector)",
        },
        redirect: "error",
        signal: controller.signal,
      });
      if (!response?.ok) {
        throw new Error(`${source.id} archive returned HTTP ${response?.status ?? "unknown"}`);
      }

      const payload = await response.json();
      const rows = payload?.data;
      if (!Array.isArray(rows)) {
        throw new Error(`${source.id} archive returned an invalid listing`);
      }
      for (const data of rows) {
        if (!data || typeof data.name !== "string" || seen.has(data.name)) continue;
        seen.add(data.name);
        items.push(normalizeItem(source.id, data));
      }

      pages += 1;
      if (rows.length < 100) {
        after = null;
        break;
      }

      const lastTimestamp = rows.at(-1)?.created_utc;
      if (!Number.isFinite(lastTimestamp) || (after !== null && lastTimestamp <= after)) {
        stoppedReason = `${source.id} archive did not advance its timestamp cursor`;
        break;
      }
      after = lastTimestamp;
    }

    if (after !== null && stoppedReason === null && pages === maxPages) {
      stoppedReason = `${source.id} archive exceeded ${maxPages} pages`;
    }
  } catch (error) {
    stoppedReason = `${source.id} archive: ${errorMessage(error)}`;
  }

  return {
    id: source.id,
    provider: "arctic-shift",
    pages,
    complete: after === null && stoppedReason === null,
    stoppedReason,
    primaryError,
  };
}

export async function collectRedditLore({
  fetchImpl = fetch,
  now = () => new Date(),
  maxPagesPerSource = 50,
  deadlineMs = DEFAULT_DEADLINE_MS,
} = {}) {
  if (!Number.isSafeInteger(maxPagesPerSource) || maxPagesPerSource < 1) {
    throw new Error("maxPagesPerSource must be a positive safe integer");
  }
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1) {
    throw new Error("deadlineMs must be a positive safe integer");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  const seen = new Set();
  const items = [];
  const sources = [];

  try {
    for (const source of SOURCES) {
      const primary = await collectRedditSource({
        source,
        fetchImpl,
        controller,
        maxPages: maxPagesPerSource,
        seen,
        items,
      });
      if (primary.complete || !/HTTP 403/.test(primary.stoppedReason ?? "")) {
        sources.push(primary);
        continue;
      }
      sources.push(await collectArchiveSource({
        source,
        fetchImpl,
        controller,
        maxPages: maxPagesPerSource,
        seen,
        items,
        primaryError: primary.stoppedReason,
      }));
    }
  } finally {
    clearTimeout(timer);
  }

  return {
    schemaVersion: 1,
    collectedAt: now().toISOString(),
    sources,
    complete: sources.length === SOURCES.length
      && sources.every((source) => source.complete),
    items: items.sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export async function writeCorpus(corpus, { root = PROJECT_ROOT } = {}) {
  const directory = path.join(root, "artifacts", "reddit-lore");
  const outputPath = path.join(directory, "corpus.json");
  const temporaryPath = path.join(directory, `.corpus-${randomUUID()}.tmp`);
  const bytes = `${JSON.stringify(corpus, null, 2)}\n`;
  await mkdir(directory, { recursive: true });

  try {
    await writeFile(temporaryPath, bytes, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
  return outputPath;
}

export async function main({
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const corpus = await collectRedditLore();
  const outputPath = await writeCorpus(corpus);
  const summary = {
    ok: corpus.complete,
    outputPath: path.relative(PROJECT_ROOT, outputPath).replaceAll("\\", "/"),
    collectedAt: corpus.collectedAt,
    itemCount: corpus.items.length,
    sources: corpus.sources,
  };
  (corpus.complete ? stdout : stderr).write(`${JSON.stringify(summary, null, 2)}\n`);
  return corpus.complete ? 0 : 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(`${errorMessage(error)}\n`);
      process.exitCode = 1;
    });
}
