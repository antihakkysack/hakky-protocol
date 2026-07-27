import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile("web/index.html", "utf8");
const css = await readFile("web/styles.css", "utf8");

test("the exact warning is the first visible page message", () => {
  assert.match(
    html,
    /<body data-record-state="loading">\s*<a class="skip-link"[^>]*>Skip to content<\/a>\s*<p class="prelaunch-strip" data-launch-status role="alert">PRELAUNCH: No official HAKKY program or mint is published\. Ignore addresses from replies, ads, or DMs\.<\/p>/u,
  );
});

test("the semantic sections and primary navigation follow the approved order", () => {
  assert.match(
    html,
    /<header class="site-header">[\s\S]*?<nav aria-label="Primary">[\s\S]*?href="#origin-log"[\s\S]*?href="#market-route"[\s\S]*?href="#planned-facts"[\s\S]*?href="#proof-terminal"[\s\S]*?<\/nav>/u,
  );
  assert.match(
    html,
    /<main id="main-content">[\s\S]*?id="top"[\s\S]*?id="origin-log"[\s\S]*?id="doctrine"[\s\S]*?id="market-route"[\s\S]*?id="planned-facts"[\s\S]*?id="proof-terminal"[\s\S]*?id="straight-answers"[\s\S]*?<\/main>/u,
  );
});

test("all essential content is server-visible and locally styled", () => {
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css">/u);
  assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/u);
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)="https?:/iu);
  assert.match(css, /body\s*\{[^}]*overflow-x:\s*hidden;/su);
});

test("the page has no form controls or static trading destination", () => {
  assert.doesNotMatch(html, /<(?:form|input|button|select|textarea)\b/iu);
  assert.doesNotMatch(html, /href="[^"]*(?:swap|trade|launchpad|raydium|jupiter)/iu);
});
