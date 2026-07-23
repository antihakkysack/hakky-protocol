import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile("web/index.html", "utf8");
const css = await readFile("web/styles.css", "utf8");

test("prelaunch warning is the hero's first element child with exact copy", () => {
  assert.match(
    html,
    /<section id="top"[^>]*>\s*<p class="status" data-launch-status role="alert">PRE-LAUNCH: No official mint address exists yet - ignore impostors\.<\/p>/,
  );
});

test("mobile warning enters flow before hero content while desktop strip remains absolute", () => {
  assert.match(css, /\.status\s*{[^}]*position:\s*absolute;/s);
  assert.match(
    css,
    /@media \(max-width: 440px\)[\s\S]*?\.status\s*{[^}]*position:\s*static;[^}]*grid-row:\s*1;[^}]*text-align:\s*left;/,
  );
});

test("the page forbids horizontal overflow and has no static trading href", () => {
  assert.match(css, /body\s*{[^}]*overflow-x:\s*hidden;/s);
  assert.doesNotMatch(html, /data-(?:solscan|raydium|pool-link)[^>]*\shref=/i);
});
