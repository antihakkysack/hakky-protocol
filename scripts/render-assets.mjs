import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const PNG_OPTIONS = {
  compressionLevel: 9,
  adaptiveFiltering: false,
  palette: false
};

await Promise.all([
  mkdir("launch/assets", { recursive: true }),
  mkdir("web/assets", { recursive: true })
]);

const mascot = await readFile("brand/sack-sentinel.svg");
const banner = await readFile("brand/x-banner.svg");

const squareBackground = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" rx="94" fill="#F8FF4A"/>
  <path d="M0 570 285 800H0z" fill="#FF7AEB"/>
  <path d="M612 0h188v310z" fill="#7138FF"/>
  <path d="M0 0h800v800H0z" fill="none" stroke="#160C2C" stroke-width="22"/>
  <g fill="#160C2C">
    <circle cx="86" cy="104" r="12"/><circle cx="126" cy="104" r="12"/><circle cx="166" cy="104" r="12"/>
  </g>
  <path d="m650 596 22 45 49 7-36 35 9 49-44-23-44 23 9-49-36-35 49-7z" fill="#FFFFFF" stroke="#160C2C" stroke-width="10"/>
</svg>`);

const mascotLayer = await sharp(mascot).resize(800, 800).png(PNG_OPTIONS).toBuffer();
const square = await sharp(squareBackground)
  .composite([{ input: mascotLayer, left: 0, top: 0 }])
  .png(PNG_OPTIONS)
  .toBuffer();

await Promise.all([
  writeFile("launch/assets/x-avatar.png", square),
  writeFile("web/assets/token.png", square),
  sharp(banner).resize(1500, 500).png(PNG_OPTIONS).toFile("launch/assets/x-banner.png")
]);

const ogBackground = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#7138FF"/>
  <path d="M770 0h430v630L910 470z" fill="#FF7AEB"/>
  <rect x="42" y="42" width="1116" height="546" rx="34" fill="#F8FF4A" stroke="#160C2C" stroke-width="12"/>
  <path d="M786 48h366v534H954z" fill="#FF7AEB"/>
  <path d="M1010 48h142v534H886z" fill="#7138FF"/>
  <rect x="86" y="86" width="433" height="45" rx="7" fill="#160C2C"/>
  <text x="108" y="117" font-family="Arial, sans-serif" font-size="19" font-weight="900" letter-spacing="3" fill="#FFFFFF">ANTIHAKKYSACK // AGENT 001</text>
  <text x="82" y="241" font-family="Arial Black, Arial, sans-serif" font-size="67" font-weight="900" letter-spacing="-2" fill="#160C2C">RUGS HATE THIS</text>
  <text x="82" y="315" font-family="Arial Black, Arial, sans-serif" font-size="67" font-weight="900" letter-spacing="-2" fill="#160C2C">LITTLE GUY.</text>
  <rect x="86" y="354" width="700" height="66" rx="9" fill="#160C2C"/>
  <text x="111" y="397" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#FFFFFF">1,000,000 HAKKY · 0% TEAM · NO PRESALE</text>
  <text x="88" y="486" font-family="Arial, sans-serif" font-size="22" font-weight="900" letter-spacing="5" fill="#160C2C">KEEP CRYPTO CLEAN.</text>
</svg>`);

const ogMascotLayer = await sharp(mascot)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize({ height: 500 })
  .png(PNG_OPTIONS)
  .toBuffer();

const ogCard = await sharp(ogBackground)
  .composite([{ input: ogMascotLayer, left: 805, top: 81 }])
  .png(PNG_OPTIONS)
  .toBuffer();

await Promise.all([
  writeFile("launch/assets/og-card.png", ogCard),
  writeFile("web/assets/og-card.png", ogCard)
]);
