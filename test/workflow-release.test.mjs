import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ACTIVE_OPERATOR_FILES = Object.freeze([
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "docs/TOKEN.md",
  "docs/LAUNCH.md",
  "proof/README.md",
  "web/README.md",
  "launch/README.md",
  "launch/content-calendar.md",
  "launch/prelaunch-post.md",
]);

test("quality runs for pull requests and main", async () => {
  const workflow = await readFile(".github/workflows/quality.yml", "utf8");
  assert.match(workflow, /pull_request:/u);
  assert.match(workflow, /push:\s+[\s\S]*branches: \[main\]/u);
});

test("Pages deploys from main only and waits for reusable quality", async () => {
  const workflow = await readFile(".github/workflows/pages.yml", "utf8");
  assert.match(workflow, /push:\s+[\s\S]*branches: \[main\]/u);
  assert.doesNotMatch(workflow, /pull_request:|workflow_dispatch:/u);
  assert.match(workflow, /quality:\s+[\s\S]*uses: \.\/\.github\/workflows\/quality\.yml/u);
  assert.match(workflow, /deploy:\s+[\s\S]*needs: quality/u);
});

test("the superseded rollout cannot be treated as the active launch runbook", async () => {
  const scanner = await readFile("scripts/check-repo.mjs", "utf8");
  const oldPlan = await readFile(
    "docs/superpowers/plans/2026-07-22-hakky-live-launch.md",
    "utf8",
  );
  assert.match(scanner, /2026-07-23-hakky-launch-readiness-operations\.md/u);
  assert.doesNotMatch(
    scanner,
    /LIVE_LAUNCH_PLAN = "docs\/superpowers\/plans\/2026-07-22-hakky-live-launch\.md"/u,
  );
  assert.match(oldPlan, /> \*\*Superseded:\*\* Do not execute this plan\./u);
});

test("the active release procedure covers the immutable lifecycle and external-action gates", async () => {
  const launch = await readFile("docs/LAUNCH.md", "utf8");
  for (const label of [
    "prelaunch",
    "curve-live",
    "pool-live",
    "verified",
    "unavailable",
  ]) {
    assert.match(launch, new RegExp(label, "u"));
  }
  for (const required of [
    /proof\/mainnet-program\.json/u,
    /proof\/mainnet-market\.json/u,
    /proof\/mainnet-pool\.json/u,
    /must never regress/u,
    /same-stage `unavailable`/u,
    /separate\s+action-time\s+approval\s+to\s+push/u,
    /separate\s+action-time\s+approval\s+to\s+create\s+or\s+update\s+a\s+pull\s+request/u,
    /both\s+merge\s+and\s+automatic\s+Pages\s+deployment/u,
    /separate\s+approval\s+to\s+post\s+or\s+pin\s+on\s+X/u,
    /1440\s+x\s+1000/u,
    /390\s+x\s+844/u,
  ]) {
    assert.match(launch, required);
  }
});

test("active operator documents use only immutable curve-to-pool language", async () => {
  const files = await Promise.all(
    ACTIVE_OPERATOR_FILES.map((file) => readFile(file, "utf8")),
  );
  const joined = files.join("\n");
  assert.doesNotMatch(
    joined,
    /LaunchLab|Raydium|graduat(?:e|ed|ion)|migration|PlatformConfig|Burn & Earn|LP disposition/iu,
  );
  assert.match(joined, /10,000,000 HAKKY/u);
  assert.match(joined, /8,000,000 HAKKY/u);
  assert.match(joined, /2,000,000 HAKKY/u);
  assert.match(joined, /0\.25% pool-retained fee/u);
  assert.match(joined, /null upgrade authority/u);
  assert.match(joined, /no (?:privileged )?withdrawal/u);
  assert.match(joined, /separate action-time approval/u);
});

test("active operator documents disclose exact dust and rounding behavior", async () => {
  const files = await Promise.all([
    "docs/LAUNCH.md",
    "launch/README.md",
  ].map((file) => readFile(file, "utf8")));
  for (const source of files) {
    assert.match(
      source,
      /curve\s+buy needs at least 1,334 HAKKY base units to move\s+one lamport/u,
    );
    assert.match(
      source,
      /initial pool sell needs 85 base units to return\s+one lamport/u,
    );
    assert.match(
      source,
      /fee rounding makes one-unit pool inputs ineffective/u,
    );
  }
});

test("publication runbooks keep every save, post, and pin separately approved", async () => {
  const launch = await readFile("docs/LAUNCH.md", "utf8");
  assert.match(launch, /separate approval to publish the site/u);
  assert.match(launch, /another separate approval to publish official addresses/u);
  assert.match(launch, /another separate approval for the social announcement/u);

  const calendar = await readFile("launch/content-calendar.md", "utf8");
  for (const operation of ["display name", "bio", "link", "avatar", "banner"]) {
    assert.match(
      calendar,
      new RegExp(`separate approval, update the ${operation}`, "u"),
    );
  }
  assert.match(calendar, /separate approval, publish that exact proof post/u);
  assert.match(calendar, /another separate approval, pin that exact proof post/u);
  assert.doesNotMatch(calendar, /publish and pin/u);
});

test("the active runbook names the current canonical proof schema versions", async () => {
  const launch = await readFile("docs/LAUNCH.md", "utf8");
  assert.match(
    launch,
    /The public launch record uses strict schema version `3`\./u,
  );
  assert.match(
    launch,
    /The canonical program, market, and pool artifacts each use strict schema version `1`\./u,
  );
});
