import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("the active release procedure covers every lifecycle and external-action gate", async () => {
  const launch = await readFile("docs/LAUNCH.md", "utf8");
  for (const label of [
    "curve-live/verified",
    "curve-live/unavailable",
    "graduated/verified",
    "graduated/unavailable",
  ]) {
    assert.match(launch, new RegExp(label.replace("/", "\\/"), "u"));
  }
  for (const required of [
    /Never regress to `prelaunch` or `curve-live` after a later stage is observed\./u,
    /content-addressed continuity receipt/u,
    /same-stage unavailable record/u,
    /complete canonical artifact set/u,
    /separate action-time approval to push/u,
    /separate action-time approval before creating or updating the PR/u,
    /expressly authorizes both the merge and its automatic Pages deployment/u,
    /separate approvals for the X post and pin replacement/u,
    /both viewports/u,
    /same-stage unavailable rollback/u,
  ]) {
    assert.match(launch, required);
  }
});

test("active operator documents use stage-correct authority and graduation language", async () => {
  const files = await Promise.all([
    "README.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "docs/LAUNCH.md",
    "proof/README.md",
    "launch/README.md",
  ].map((file) => readFile(file, "utf8")));
  const joined = files.join("\n");
  assert.match(joined, /LaunchLab PDA mint authority/u);
  assert.match(joined, /24 SOL configured minimum/u);
  assert.match(joined, /observed graduation balance/u);
  assert.match(joined, /Burn & Earn permanent lock/u);
  assert.match(joined, /not an SPL burn/u);
  assert.match(joined, /mutable PlatformConfig/u);
  assert.match(joined, /raw unsigned transaction/u);
  assert.match(joined, /atomic immutable metadata/u);
  assert.match(joined, /full-lock LP disposition/u);
  assert.match(joined, /2026-08-23/u);
  assert.match(joined, /npm audit fix --force/u);
});
