import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

const EXPORTS = [
  ["launch/assets/x-avatar.png", 800, 800, "9e672cdc454e6249873cdf359b51a1f8f6a7f8a10f057d77f85ecce705bca8a0"],
  ["launch/assets/x-banner.png", 1500, 500, "e159e50b3a2ebdc72ba385520ce3786b39daa67dc1db6510d2ad52dd183958b2"],
  ["launch/assets/og-card.png", 1200, 630, "f1af6220ba591c856175bb3e54711654bf5c4b671b8407a71ba6f25a28b6087e"],
  ["web/assets/og-card.png", 1200, 630, "f1af6220ba591c856175bb3e54711654bf5c4b671b8407a71ba6f25a28b6087e"],
  ["web/assets/token.png", 800, 800, "9e672cdc454e6249873cdf359b51a1f8f6a7f8a10f057d77f85ecce705bca8a0"]
];

const AGENT_SOURCES = [
  "brand/hakkyagent.svg",
  "web/assets/hakkyagent.svg",
  "brand/x-banner.svg",
  "scripts/render-assets.mjs"
];

for (const [file, width, height] of EXPORTS) {
  test(`${file} has approved dimensions`, async () => {
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, height);
    assert.equal(metadata.format, "png");
  });
}

test("public square and OG exports are byte-identical to their launch copies", async () => {
  assert.deepEqual(
    await readFile("launch/assets/x-avatar.png"),
    await readFile("web/assets/token.png")
  );
  assert.deepEqual(
    await readFile("launch/assets/og-card.png"),
    await readFile("web/assets/og-card.png")
  );
});

test("canonical social sources preserve the exact approved copy", async () => {
  const banner = await readFile("brand/x-banner.svg", "utf8");
  const renderer = await readFile("scripts/render-assets.mjs", "utf8");
  for (const copy of [
    "HAKKYAGENT // PROOF SENTINEL",
    "RUGS HATE THIS",
    "LITTLE GUY.",
    "10,000,000 HAKKY · 0% TEAM · NO PRESALE",
    "KEEP CRYPTO CLEAN."
  ]) {
    assert.ok(banner.includes(copy), `banner is missing exact copy: ${copy}`);
    assert.ok(renderer.includes(copy), `renderer is missing exact copy: ${copy}`);
  }
});

test("canonical agent sources retire the former identity and numbered badge", async () => {
  for (const file of AGENT_SOURCES) {
    const source = await readFile(file, "utf8");
    for (const retired of ["AntiHakkySack", "ANTIHAKKYSACK", "Sack Sentinel", "Agent 001"]) {
      assert.ok(!source.includes(retired), `${file} contains retired identity: ${retired}`);
    }
    assert.doesNotMatch(source, /data-copy=["']001["']/, `${file} contains the retired 001 badge`);
  }
});

test("asset sources use only the approved Meme Broadcast palette", async () => {
  const approved = new Set([
    "#F8FF4A",
    "#FF7AEB",
    "#7138FF",
    "#160C2C",
    "#FF965D",
    "#FFFFFF"
  ]);
  for (const file of AGENT_SOURCES) {
    const source = await readFile(file, "utf8");
    const colors = source.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
    assert.deepEqual(
      [...new Set(colors.filter((color) => !approved.has(color.toUpperCase())))],
      [],
      `${file} contains an unapproved color`
    );
  }
});

test("asset sources use self-contained vector typography", async () => {
  for (const file of AGENT_SOURCES) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /font-family|<text\b|Arial/i, `${file} relies on a host font`);
  }
});

test("banner description uses neutral literal wording", async () => {
  const banner = await readFile("brand/x-banner.svg", "utf8");
  assert.doesNotMatch(banner, /fair-launch proof/i);
});

test("public HakkyAgent artwork is local, self-contained, and non-animated", async () => {
  const html = await readFile("web/index.html", "utf8");
  const agent = await readFile("web/assets/hakkyagent.svg", "utf8");
  assert.match(
    html,
    /<img src="\.\/assets\/hakkyagent\.svg" alt="HakkyAgent, the fictional HAKKY proof character"/u,
  );
  assert.doesNotMatch(agent, /(?:href|src)=["']https?:|<script\b|<animate\b|<set\b/iu);
});

for (const [file, , , expectedHash] of EXPORTS) {
  test(`${file} matches its committed golden SHA-256`, async () => {
    const hash = createHash("sha256").update(await readFile(file)).digest("hex");
    assert.equal(hash, expectedHash);
  });
}
