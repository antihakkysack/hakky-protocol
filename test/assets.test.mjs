import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

for (const [file, width, height] of [
  ["launch/assets/x-avatar.png", 800, 800],
  ["launch/assets/x-banner.png", 1500, 500],
  ["launch/assets/og-card.png", 1200, 630],
  ["web/assets/og-card.png", 1200, 630],
  ["web/assets/token.png", 800, 800]
]) {
  test(`${file} has approved dimensions`, async () => {
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, height);
    assert.equal(metadata.format, "png");
  });
}
