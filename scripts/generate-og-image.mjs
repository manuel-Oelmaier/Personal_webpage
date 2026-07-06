#!/usr/bin/env node
/**
 * Build public/og/home.jpg (1200×630) from src/assets/manu.jpg.
 * Re-run after replacing the hero photo.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src/assets/manu.jpg');
const outDir = join(root, 'public/og');
const out = join(outDir, 'home.jpg');

const W = 1200;
const H = 630;
const bg = '#25222b';

mkdirSync(outDir, { recursive: true });

const photoSize = 480;
const photoLeft = 72;
const photoTop = Math.round((H - photoSize) / 2);

const photo = await sharp(src)
  .resize(photoSize, photoSize, { fit: 'cover' })
  .png()
  .toBuffer();

const textSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .role { fill: #e8eaed; font: 600 42px sans-serif; }
    .proof { fill: #b8c0cc; font: 400 26px sans-serif; }
    .meta { fill: #8a939e; font: 400 22px sans-serif; }
  </style>
  <text x="590" y="220" class="role">Software Engineer · AI / LLM</text>
  <text x="590" y="280" class="proof">LLM systems — research to production</text>
  <text x="590" y="340" class="proof">TUM · Python · TypeScript</text>
  <text x="590" y="400" class="meta">manueloelmaier.de</text>
</svg>`;

await sharp({
  create: { width: W, height: H, channels: 3, background: bg },
})
  .composite([
    { input: photo, left: photoLeft, top: photoTop },
    { input: Buffer.from(textSvg), left: 0, top: 0 },
  ])
  .jpeg({ quality: 88 })
  .toFile(out);

console.log(`Wrote ${out} (${W}×${H})`);
