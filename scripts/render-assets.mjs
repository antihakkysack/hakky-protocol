import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { vectorText } from "./vector-type.mjs";

const PNG_OPTIONS = {
  compressionLevel: 9,
  adaptiveFiltering: false,
  palette: false
};

await Promise.all([
  mkdir("launch/assets", { recursive: true }),
  mkdir("web/assets", { recursive: true })
]);

const ogLabel = vectorText("HAKKYAGENT // PROOF SENTINEL", {
  x: 108, y: 98, height: 16, letterSpacing: 1.4, color: "#FFFFFF"
}).svg;
const ogHeadlineOne = vectorText("RUGS HATE THIS", {
  x: 82, y: 176, height: 46, letterSpacing: 2, color: "#160C2C", strokeWidth: 1
}).svg;
const ogHeadlineTwo = vectorText("LITTLE GUY.", {
  x: 82, y: 254, height: 46, letterSpacing: 2, color: "#160C2C", strokeWidth: 1
}).svg;
const ogAllocation = vectorText("10,000,000 HAKKY · 0% TEAM · NO PRESALE", {
  x: 111, y: 375, height: 17, letterSpacing: 1, color: "#FFFFFF"
}).svg;
const ogTagline = vectorText("KEEP CRYPTO CLEAN.", {
  x: 88, y: 468, height: 16, letterSpacing: 2.5, color: "#160C2C"
}).svg;

const mascot = await readFile("brand/hakkyagent.svg");
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
  ${ogLabel}
  ${ogHeadlineOne}
  ${ogHeadlineTwo}
  <rect x="86" y="354" width="700" height="66" rx="9" fill="#160C2C"/>
  ${ogAllocation}
  ${ogTagline}
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
