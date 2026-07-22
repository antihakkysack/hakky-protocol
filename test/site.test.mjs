import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildLaunchView } from "../web/app.js";

const html = await readFile("web/index.html", "utf8");
const record = JSON.parse(await readFile("web/data/launch.json", "utf8"));

test("homepage contains the approved story and safety contract", () => {
  for (const text of [
    "Rugs hate this little guy.",
    "The first thing it cleaned was its own launch.",
    "1,000,000",
    "0% team",
    "no presale",
    "No official mint address exists yet",
    "no promised utility or returns",
  ]) {
    assert.match(
      html.toLowerCase(),
      new RegExp(text.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("prelaunch view never exposes buy links", () => {
  const view = buildLaunchView(record);
  assert.equal(view.live, false);
  assert.equal(view.mint, null);
  assert.equal(view.raydiumUrl, null);
});
