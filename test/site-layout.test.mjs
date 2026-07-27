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
  assert.match(css, /body\s*\{[^}]*overflow-x:\s*(?:clip|hidden);/su);
});

test("the page has no form controls or static trading destination", () => {
  assert.doesNotMatch(html, /<(?:form|input|button|select|textarea)\b/iu);
  assert.doesNotMatch(html, /href="[^"]*(?:swap|trade|launchpad|raydium|jupiter)/iu);
});

test("the cyber-tactical palette and accessibility contracts are explicit", () => {
  assert.match(css, /--void:\s*#0d0818/u);
  assert.match(css, /--signal:\s*#a7ff91/u);
  assert.match(css, /--alert:\s*#ff7aeb/u);
  assert.match(css, /--proof:\s*#f8ff4a/u);
  assert.match(css, /--electric:\s*#7138ff/u);
  assert.match(css, /overflow-x:\s*(?:clip|hidden)/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /min-height:\s*44px/u);
});

test("the responsive system supports narrow screens and reduced motion", () => {
  assert.match(css, /@media \(max-width:\s*600px\)/u);
  assert.match(css, /@media \(max-width:\s*360px\)/u);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/u);
  assert.match(
    css,
    /@media \(max-width:\s*600px\)[\s\S]*?\.site-header,[\s\S]*?\.hero,[\s\S]*?\.planned-facts-grid\s*\{[^}]*grid-template-columns:\s*1fr;/u,
  );
  assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com|<script[^>]+https?:/iu);
});
