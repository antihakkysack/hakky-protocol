import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

const EXPORTS = [
  ["launch/assets/x-avatar.png", 800, 800, "bdba98faca3723a15345bfb3ecb5d1f3b62528a8b0b49e31e6a48f9b33babd46"],
  ["launch/assets/x-banner.png", 1500, 500, "620d28b6c4aecdab54b4b1326f6615ab4a35cb9367805db9025358c06eee670d"],
  ["launch/assets/og-card.png", 1200, 630, "f96cebc814d0a18b6209dd189c5841da060016514527a2da84da69f06d7251e1"],
  ["web/assets/og-card.png", 1200, 630, "f96cebc814d0a18b6209dd189c5841da060016514527a2da84da69f06d7251e1"],
  ["web/assets/token.png", 800, 800, "bdba98faca3723a15345bfb3ecb5d1f3b62528a8b0b49e31e6a48f9b33babd46"]
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
    "ANTIHAKKYSACK // AGENT 001",
    "RUGS HATE THIS",
    "LITTLE GUY.",
    "1,000,000 HAKKY · 0% TEAM · NO PRESALE",
    "KEEP CRYPTO CLEAN."
  ]) {
    assert.ok(banner.includes(copy), `banner is missing exact copy: ${copy}`);
    assert.ok(renderer.includes(copy), `renderer is missing exact copy: ${copy}`);
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
  for (const file of [
    "brand/sack-sentinel.svg",
    "web/assets/sack-sentinel.svg",
    "brand/x-banner.svg",
    "scripts/render-assets.mjs"
  ]) {
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
  for (const file of [
    "brand/sack-sentinel.svg",
    "web/assets/sack-sentinel.svg",
    "brand/x-banner.svg",
    "scripts/render-assets.mjs"
  ]) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /font-family|<text\b|Arial/i, `${file} relies on a host font`);
  }
});

test("banner description uses neutral literal wording", async () => {
  const banner = await readFile("brand/x-banner.svg", "utf8");
  assert.doesNotMatch(banner, /fair-launch proof/i);
});

for (const [file, , , expectedHash] of EXPORTS) {
  test(`${file} matches its committed golden SHA-256`, async () => {
    const hash = createHash("sha256").update(await readFile(file)).digest("hex");
    assert.equal(hash, expectedHash);
  });
}
