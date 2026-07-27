import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const collectorModule = await import("../scripts/collect-reddit-lore.mjs").catch(() => ({
  DEFAULT_DEADLINE_MS: null,
  collectRedditLore: async () => ({
    schemaVersion: 0,
    collectedAt: null,
    sources: [],
    complete: false,
    items: [],
  }),
  writeCorpus: async () => {
    throw new Error("Reddit lore collector is missing");
  },
}));

const { DEFAULT_DEADLINE_MS, collectRedditLore, writeCorpus } = collectorModule;
const classificationModule = await import("../src/lore-classification.mjs").catch(() => ({
  APPROVED_DECISIONS: [],
  classifyLoreItem: () => null,
}));
const { APPROVED_DECISIONS, classifyLoreItem } = classificationModule;

function listing(after, children) {
  return {
    data: {
      after,
      children: children.map((data) => ({ kind: data.name.slice(0, 2), data })),
    },
  };
}

function responseFor(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return structuredClone(body);
    },
  };
}

test("collector follows every source cursor, sends no credentials, and de-duplicates fullnames", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const requestUrl = new URL(url);
    calls.push({ url: requestUrl, options });
    const secondPage = requestUrl.searchParams.get("after") === "next";
    const surface = requestUrl.pathname.includes("/comments")
      ? "comment"
      : "submission";
    const name = surface === "comment" ? "t1_same" : "t3_same";
    const data = surface === "comment"
      ? {
        name,
        body: "Connection is the operating system.",
        subreddit: "REDDTLAND",
        permalink: "/r/REDDTLAND/comments/example/thread/same/",
        created_utc: 1,
      }
      : {
        name,
        title: "No equals. No sequels.",
        selftext: "Every signal should arrive with its own fingerprints.",
        subreddit: "REDDTLAND",
        permalink: "/r/REDDTLAND/comments/example/signal/",
        url: "https://www.reddit.com/r/REDDTLAND/comments/example/signal/?utm_source=test",
        created_utc: 1,
      };
    return responseFor(listing(secondPage ? null : "next", [data]));
  };

  const result = await collectRedditLore({
    fetchImpl,
    now: () => new Date("2026-07-27T00:00:00.000Z"),
  });

  assert.equal(result.complete, true);
  assert.equal(result.sources.length, 4);
  assert.equal(result.sources.every((source) => source.complete), true);
  assert.deepEqual(result.items.map((item) => item.name), ["t1_same", "t3_same"]);
  assert.equal(calls.length, 8);
  for (const call of calls) {
    const headerNames = Object.keys(call.options.headers).map((name) => name.toLowerCase());
    assert.equal(headerNames.includes("authorization"), false);
    assert.equal(headerNames.includes("cookie"), false);
    assert.equal(call.options.redirect, "error");
    assert.ok(call.options.signal instanceof AbortSignal);
  }
  assert.equal(result.items[1].url, "https://www.reddit.com/r/REDDTLAND/comments/example/signal/");
});

test("collector marks a repeated cursor incomplete instead of looping", async () => {
  const fetchImpl = async () => responseFor(listing("repeat", [{
    name: "t3_repeat",
    title: "Repeated",
    selftext: "",
    subreddit: "REDDTLAND",
    permalink: "/r/REDDTLAND/comments/repeat/repeated/",
    created_utc: 1,
  }]));

  const result = await collectRedditLore({ fetchImpl });

  assert.equal(result.complete, false);
  assert.equal(
    result.sources.some((source) => /repeated cursor/i.test(source.stoppedReason ?? "")),
    true,
  );
});

test("default deadline allows a complete four-surface archive collection", async () => {
  assert.equal(DEFAULT_DEADLINE_MS, 60_000);

  const fetchImpl = async (url, options) => {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 5);
      options.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
    const requestUrl = new URL(url);
    const secondPage = requestUrl.searchParams.get("after") === "next";
    return responseFor(listing(secondPage ? null : "next", []));
  };

  const result = await collectRedditLore({ fetchImpl });

  assert.equal(result.complete, true);
  assert.equal(result.sources.length, 4);
  assert.equal(result.sources.reduce((sum, source) => sum + source.pages, 0), 8);
});

test("collector records an HTTP failure without echoing response bodies", async () => {
  const result = await collectRedditLore({
    fetchImpl: async () => responseFor({ secret: "do not echo" }, { status: 403 }),
  });

  assert.equal(result.complete, false);
  assert.match(JSON.stringify(result.sources), /HTTP 403/);
  assert.doesNotMatch(JSON.stringify(result), /do not echo/);
});

test("collector falls back to a provenance-labelled archive when Reddit returns 403", async () => {
  const fetchImpl = async (url) => {
    const requestUrl = new URL(url);
    if (requestUrl.hostname === "www.reddit.com") {
      return responseFor({}, { status: 403 });
    }
    const isComment = requestUrl.pathname.includes("/comments/");
    return responseFor({
      data: [{
        name: isComment ? "t1_archive" : "t3_archive",
        body: isComment ? "Archived comment" : undefined,
        title: isComment ? undefined : "Archived signal",
        selftext: isComment ? undefined : "Archived post body",
        subreddit: "REDDTLAND",
        permalink: isComment
          ? "/r/REDDTLAND/comments/archive/thread/archive/"
          : "/r/REDDTLAND/comments/archive/archived_signal/",
        created_utc: 3,
      }],
    });
  };

  const result = await collectRedditLore({ fetchImpl });

  assert.equal(result.complete, true);
  assert.equal(result.sources.every((source) => source.provider === "arctic-shift"), true);
  assert.equal(result.sources.every((source) => /HTTP 403/.test(source.primaryError)), true);
  assert.deepEqual(result.items.map((item) => item.name), ["t1_archive", "t3_archive"]);
});

test("collector normalizes only the approved public fields", async () => {
  const fetchImpl = async () => responseFor(listing(null, [{
    name: "t1_fields",
    body: "Public body",
    subreddit: "REDDTLAND",
    permalink: "/r/REDDTLAND/comments/fields/thread/fields/?context=3",
    link_id: "t3_parent",
    parent_id: "t1_parent",
    author: "must-not-be-copied",
    secure_media: { private: "must-not-be-copied" },
    created_utc: 2,
  }]));

  const result = await collectRedditLore({ fetchImpl });
  const item = result.items[0];

  assert.deepEqual(Object.keys(item), [
    "source",
    "name",
    "createdUtc",
    "subreddit",
    "title",
    "selftext",
    "body",
    "url",
    "permalink",
    "postHint",
    "isVideo",
    "crosspostParent",
    "linkId",
    "parentId",
    "removedByCategory",
  ]);
  assert.equal(item.permalink, "https://www.reddit.com/r/REDDTLAND/comments/fields/thread/fields/");
  assert.doesNotMatch(JSON.stringify(item), /must-not-be-copied/);
});

test("corpus writer creates the canonical ignored artifact bytes", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "hakky-lore-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const corpus = {
    schemaVersion: 1,
    collectedAt: "2026-07-27T00:00:00.000Z",
    sources: [],
    complete: true,
    items: [],
  };

  const outputPath = await writeCorpus(corpus, { root });

  assert.equal(outputPath, path.join(root, "artifacts", "reddit-lore", "corpus.json"));
  assert.equal(
    await readFile(outputPath, "utf8"),
    `${JSON.stringify(corpus, null, 2)}\n`,
  );
});

test("committed lore ledger declares complete coverage and approved decisions", async () => {
  const ledger = await readFile("docs/lore/reddit-corpus-ledger.md", "utf8").catch(() => "");
  const statuses = new Set([
    "included",
    "included-as-theme",
    "excluded-music-or-video",
    "excluded-duplicate-or-crosspost",
    "excluded-incidental-reply",
    "excluded-unrelated",
    "excluded-harmful-or-actionable",
    "excluded-unsupported-real-world-claim",
    "excluded-targeting-or-harassment",
    "excluded-third-party-copyright",
    "unavailable-or-removed",
  ]);

  assert.match(ledger, /Collection complete: yes/);
  assert.match(ledger, /Retrieved unique items: 1,490/);
  assert.doesNotMatch(ledger, /Left-Agency-9292|reddit\.com/iu);
  const itemLines = ledger
    .split(/\r?\n/u)
    .filter((line) => /^\| item-\d{4} /u.test(line));
  assert.equal(itemLines.length, 1490);
  assert.equal(new Set(itemLines.map((line) => line.split("|")[1].trim())).size, 1490);
  for (const line of itemLines) {
    const decisions = [...statuses].filter((decision) => line.includes(`| ${decision} |`));
    assert.deepEqual(decisions.length, 1, `ledger row must contain one approved decision: ${line}`);
    assert.equal((line.match(/(?<!\\)\|/gu) ?? []).length, 7, `ledger row has the wrong column count: ${line}`);
  }
});

test("local internal ledger is hash-bound and retains complete audit rows when collected", async () => {
  const publicLedger = await readFile("docs/lore/reddit-corpus-ledger.md", "utf8");
  assert.match(publicLedger, /Internal ledger SHA-256: `[0-9a-f]{64}`/u);

  const ledger = await readFile("artifacts/reddit-lore/decision-ledger.md", "utf8")
    .catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
  if (ledger === null) return;

  const itemLines = ledger
    .split(/\r?\n/u)
    .filter((line) => /^\| `t[13]_/.test(line));
  assert.equal(itemLines.length, 1490);
  assert.match(ledger, /Canonical permalink/);
});

test("classifier preserves the reviewed lore themes and their destinations", () => {
  const reviewed = [
    ["t1_o938291", "included", "Transmission 001"],
    ["t3_1nn8nw2", "included-as-theme", "Transmission 002 / 003"],
    ["t3_1n7w8cx", "included", "Transmission 003"],
    ["t3_1nofzvi", "included-as-theme", "Transmission 004"],
    ["t3_1noeear", "included-as-theme", "Transmission 005"],
    ["t1_nc5bq6h", "included-as-theme", "Transmission 006"],
    ["t3_1mucjjl", "included-as-theme", "Transmission 006"],
  ];

  for (const [name, decision, destination] of reviewed) {
    const result = classifyLoreItem({
      name,
      source: name.startsWith("t1_") ? "profile-comments" : "profile-submissions",
      title: "Reviewed",
      selftext: "",
      body: "",
      url: null,
      postHint: null,
      isVideo: false,
      crosspostParent: null,
      removedByCategory: null,
    });
    assert.equal(result?.decision, decision);
    assert.equal(result?.destination, destination);
  }
});

test("classifier applies every exclusion boundary deterministically", () => {
  const base = {
    name: "t3_test",
    source: "profile-submissions",
    title: "Ordinary post",
    selftext: "",
    body: null,
    url: null,
    postHint: null,
    isVideo: false,
    crosspostParent: null,
    removedByCategory: null,
  };
  const cases = [
    [{ ...base, removedByCategory: "moderator" }, "unavailable-or-removed"],
    [{ ...base, isVideo: true }, "excluded-music-or-video"],
    [{ ...base, crosspostParent: "t3_parent" }, "excluded-duplicate-or-crosspost"],
    [{ ...base, source: "reddtland-submissions" }, "excluded-third-party-copyright"],
    [{ ...base, selftext: "Fast for seven days without water." }, "excluded-harmful-or-actionable"],
    [{ ...base, selftext: "Guaranteed crypto trading returns with this stop loss." }, "excluded-harmful-or-actionable"],
    [{ ...base, selftext: "This real person is an idiot and must be punished." }, "excluded-targeting-or-harassment"],
    [{ ...base, selftext: "Astrology proves this historical event is scientifically true." }, "excluded-unsupported-real-world-claim"],
    [{ ...base, name: "t1_reply", source: "profile-comments" }, "excluded-incidental-reply"],
    [base, "excluded-unrelated"],
  ];

  assert.deepEqual(
    cases.map(([item]) => classifyLoreItem(item)?.decision),
    cases.map(([, decision]) => decision),
  );
  assert.deepEqual(new Set(APPROVED_DECISIONS), new Set([
    "included",
    "included-as-theme",
    "excluded-music-or-video",
    "excluded-duplicate-or-crosspost",
    "excluded-incidental-reply",
    "excluded-unrelated",
    "excluded-harmful-or-actionable",
    "excluded-unsupported-real-world-claim",
    "excluded-targeting-or-harassment",
    "excluded-third-party-copyright",
    "unavailable-or-removed",
  ]));
});

test("public site never exposes the Reddit identity or links", async () => {
  const html = await readFile("web/index.html", "utf8");
  assert.doesNotMatch(html, /Left-Agency-9292|reddit\.com/iu);
});
