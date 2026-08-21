import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const profile = JSON.parse(await fs.readFile(path.join(repoRoot, "src", "data", "profile.json"), "utf8"));

const escapeXml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#f5f1e8"/>
  <circle cx="640" cy="170" r="4" fill="#211f1a"/>
  <circle cx="700" cy="150" r="3" fill="#a84b38"/>
  <circle cx="760" cy="185" r="5" fill="#211f1a"/>
  <circle cx="600" cy="210" r="3" fill="#a84b38"/>
  <circle cx="820" cy="220" r="4" fill="#211f1a"/>
  <circle cx="680" cy="240" r="6" fill="#a84b38"/>
  <circle cx="740" cy="260" r="3" fill="#211f1a"/>
  <text x="600" y="380" font-family="Georgia, 'Songti SC', 'Noto Serif CJK SC', serif" font-size="92" fill="#211f1a" text-anchor="middle">${escapeXml(profile.name)}</text>
  <text x="600" y="440" font-family="Georgia, 'Songti SC', 'Noto Serif CJK SC', serif" font-size="30" fill="#5c5952" text-anchor="middle">${escapeXml(profile.headline)}</text>
  <text x="600" y="510" font-family="Georgia, 'Songti SC', 'Noto Serif CJK SC', serif" font-size="26" fill="#a84b38" text-anchor="middle" letter-spacing="3">${escapeXml(profile.brand)}</text>
</svg>`;

const outputPath = path.join(repoRoot, "public", "og-default.png");
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outputPath);

const metadata = await sharp(outputPath).metadata();
if (metadata.width !== 1200 || metadata.height !== 630) throw new Error(`unexpected og-default.png size: ${metadata.width}x${metadata.height}`);
console.log(`og-default.png generated: ${outputPath} (${metadata.width}x${metadata.height})`);
