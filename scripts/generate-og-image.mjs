#!/usr/bin/env node
/**
 * Generate Open Graph images (1200×630 JPEG):
 *   public/og/home.jpg       — homepage
 *   public/og/blog/{slug}.jpg — one per src/content/blog/*.md
 *
 * Re-run after replacing the hero photo or changing post titles/descriptions.
 */
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = join(root, 'src/content/blog');
const outDir = join(root, 'public/og');
const blogOutDir = join(outDir, 'blog');

const W = 1200;
const H = 630;
const bg = '#25222b';

mkdirSync(blogOutDir, { recursive: true });

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLines(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function textBlockSvg({ lines, x, y, lineHeight, className }) {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" class="${className}">${escapeXml(line)}</text>`,
    )
    .join('\n  ');
}

async function writeOgImage(outPath, textSvg, composites = []) {
  await sharp({
    create: { width: W, height: H, channels: 3, background: bg },
  })
    .composite([
      ...composites,
      { input: Buffer.from(textSvg), left: 0, top: 0 },
    ])
    .jpeg({ quality: 88 })
    .toFile(outPath);
}

async function generateHome() {
  const src = join(root, 'src/assets/manu.jpg');
  const out = join(outDir, 'home.jpg');

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

  await writeOgImage(out, textSvg, [{ input: photo, left: photoLeft, top: photoTop }]);
  console.log(`Wrote ${out} (${W}×${H})`);
}

function parseFrontmatter(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`No frontmatter in ${filePath}`);

  const title = match[1].match(/^title:\s*"(.*)"\s*$/m)?.[1]
    ?? match[1].match(/^title:\s*(.+)\s*$/m)?.[1];
  const description = match[1].match(/^description:\s*"(.*)"\s*$/m)?.[1]
    ?? match[1].match(/^description:\s*(.+)\s*$/m)?.[1];

  if (!title || !description) {
    throw new Error(`Missing title or description in ${filePath}`);
  }

  return { title, description };
}

async function generateBlogPost(slug, { title, description }) {
  const out = join(blogOutDir, `${slug}.jpg`);
  const titleLines = wrapLines(title, 42);
  const descLines = wrapLines(description, 58);
  const titleStartY = 200;

  const textSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .label { fill: #7ec8c5; font: 600 22px sans-serif; letter-spacing: 0.12em; }
    .title { fill: #e8eaed; font: 600 44px sans-serif; }
    .desc { fill: #b8c0cc; font: 400 26px sans-serif; }
    .meta { fill: #8a939e; font: 400 22px sans-serif; }
  </style>
  <text x="80" y="120" class="label">BLOG</text>
  ${textBlockSvg({ lines: titleLines, x: 80, y: titleStartY, lineHeight: 54, className: 'title' })}
  ${textBlockSvg({
    lines: descLines,
    x: 80,
    y: titleStartY + titleLines.length * 54 + 36,
    lineHeight: 36,
    className: 'desc',
  })}
  <text x="80" y="560" class="meta">manueloelmaier.de</text>
</svg>`;

  await writeOgImage(out, textSvg);
  console.log(`Wrote ${out} (${W}×${H})`);
}

async function generateBlogPosts() {
  const files = readdirSync(blogDir).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const meta = parseFrontmatter(join(blogDir, file));
    await generateBlogPost(slug, meta);
  }
}

await generateHome();
await generateBlogPosts();
