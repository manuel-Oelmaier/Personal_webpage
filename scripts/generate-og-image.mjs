#!/usr/bin/env node
/**
 * Generate Open Graph images (1200×630 JPEG):
 *   public/og/home.jpg       — homepage hero (photo + headline + hook)
 *   public/og/blog/{slug}.jpg — title, problem, first sentences of post
 *
 * Re-run after changing hero copy, photos, or blog content.
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
const padX = 72;

/** Keep in sync with homepage hero (index.astro). */
const HOME_HERO = {
  headline: 'Software Engineer · AI / LLM',
  hook: 'I build LLM systems end to end — research, finetuning, and production deployment.',
  meta: 'Munich · TUM · Python · TypeScript',
};

mkdirSync(blogOutDir, { recursive: true });

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#+\s.*$/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractIntroSentences(body, count = 3) {
  const plain = stripMarkdown(body);
  const paragraphs = plain.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const sentences = [];

  for (const paragraph of paragraphs) {
    for (const sentence of splitSentences(paragraph)) {
      sentences.push(sentence);
      if (sentences.length >= count) return sentences;
    }
  }

  return sentences;
}

function wrapLines(text, maxChars, maxLines = 99) {
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
      if (lines.length >= maxLines) return lines;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
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

async function circularPhoto(src, size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  return sharp(src)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function generateHome() {
  const src = join(root, 'src/assets/manu.jpg');
  const out = join(outDir, 'home.jpg');

  const photoSize = 400;
  const photoLeft = 80;
  const photoTop = Math.round((H - photoSize) / 2);

  const photo = await circularPhoto(src, photoSize);
  const hookLines = wrapLines(HOME_HERO.hook, 38);

  const textSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .headline { fill: #e8eaed; font: 600 44px sans-serif; }
    .hook { fill: #7ec8c5; font: 600 28px sans-serif; }
    .meta { fill: #b8c0cc; font: 400 24px sans-serif; }
    .site { fill: #8a939e; font: 400 22px sans-serif; }
  </style>
  <circle cx="${photoLeft + photoSize / 2}" cy="${photoTop + photoSize / 2}" r="${photoSize / 2 + 6}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
  <text x="540" y="200" class="headline">${escapeXml(HOME_HERO.headline)}</text>
  ${textBlockSvg({ lines: hookLines, x: 540, y: 260, lineHeight: 38, className: 'hook' })}
  <text x="540" y="${260 + hookLines.length * 38 + 48}" class="meta">${escapeXml(HOME_HERO.meta)}</text>
  <text x="540" y="560" class="site">manueloelmaier.de</text>
</svg>`;

  await writeOgImage(out, textSvg, [{ input: photo, left: photoLeft, top: photoTop }]);
  console.log(`Wrote ${out} (${W}×${H})`);
}

function parseYamlField(block, field) {
  const quoted = block.match(new RegExp(`^${field}:\\s*"(.*)"\\s*$`, 'm'))?.[1];
  if (quoted) return quoted;
  return block.match(new RegExp(`^${field}:\\s*(.+)\\s*$`, 'm'))?.[1];
}

function parsePost(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`No frontmatter in ${filePath}`);

  const title = parseYamlField(match[1], 'title');
  const problem = parseYamlField(match[1], 'problem');
  const introSentences = extractIntroSentences(match[2], 3);

  if (!title) throw new Error(`Missing title in ${filePath}`);

  return {
    title,
    problem: problem ?? '',
    intro: introSentences.join(' '),
  };
}

async function generateBlogPost(slug, { title, problem, intro }) {
  const out = join(blogOutDir, `${slug}.jpg`);

  const contentW = W - padX * 2;
  const titleLines = wrapLines(title, 50, 2);
  const problemLines = wrapLines(problem, 88, 3);
  const introLines = wrapLines(intro, 92, 3);

  const titleY = 112;
  const titleBlockH = titleLines.length * 44;
  const boxX = padX;
  const boxPadX = 28;
  const boxPadY = 22;
  const boxY = titleY + titleBlockH + 32;
  const labelY = boxY + boxPadY + 14;
  const problemY = labelY + 22;
  const problemBlockH = problemLines.length * 26;
  const boxH = boxPadY + 14 + 22 + problemBlockH + boxPadY;
  const boxRight = boxX + contentW;
  const radius = 14;
  const introY = boxY + boxH + 44;

  const boxPath = `
    M ${boxX + 3} ${boxY}
    H ${boxRight - radius}
    Q ${boxRight} ${boxY} ${boxRight} ${boxY + radius}
    V ${boxY + boxH - radius}
    Q ${boxRight} ${boxY + boxH} ${boxRight - radius} ${boxY + boxH}
    H ${boxX + 3}
    Z`;

  const textSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .label { fill: #7ec8c5; font: 600 18px sans-serif; letter-spacing: 0.16em; }
    .title { fill: #e8eaed; font: 600 36px sans-serif; }
    .problem-label { fill: #6eb8b5; font: 600 13px monospace; letter-spacing: 0.1em; }
    .problem { fill: #6eb8b5; font: italic 21px sans-serif; }
    .intro { fill: #7ec8c5; font: 400 21px sans-serif; }
    .site { fill: #8a939e; font: 400 20px sans-serif; }
  </style>
  <text x="${padX}" y="72" class="label">BLOG</text>
  ${textBlockSvg({ lines: titleLines, x: padX, y: titleY, lineHeight: 44, className: 'title' })}
  <path d="${boxPath}" fill="#2c2932"/>
  <rect x="${boxX}" y="${boxY}" width="3" height="${boxH}" fill="#7ec8c5"/>
  <text x="${boxX + boxPadX}" y="${labelY}" class="problem-label">THE PROBLEM</text>
  ${textBlockSvg({
    lines: problemLines,
    x: boxX + boxPadX,
    y: problemY,
    lineHeight: 26,
    className: 'problem',
  })}
  ${textBlockSvg({
    lines: introLines,
    x: padX,
    y: introY,
    lineHeight: 30,
    className: 'intro',
  })}
  <text x="${padX}" y="592" class="site">manueloelmaier.de</text>
</svg>`;

  await writeOgImage(out, textSvg);
  console.log(`Wrote ${out} (${W}×${H})`);
}

async function generateBlogPosts() {
  const files = readdirSync(blogDir).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const meta = parsePost(join(blogDir, file));
    await generateBlogPost(slug, meta);
  }
}

await generateHome();
await generateBlogPosts();
