import sharp from 'sharp';
import { expect, test, type Page } from '@playwright/test';

const pages = [
  { path: '/', ogType: 'website' as const, ogImagePath: '/og/home.jpg' },
  { path: '/blog/', ogType: 'website' as const, ogImagePath: '/og/home.jpg' },
  {
    path: '/blog/homelab-ai-platform/',
    ogType: 'article' as const,
    ogImagePath: '/og/blog/homelab-ai-platform.jpg',
  },
  {
    path: '/blog/homelab-dns-filtering/',
    ogType: 'article' as const,
    ogImagePath: '/og/blog/homelab-dns-filtering.jpg',
  },
  {
    path: '/blog/efficient-llm-inference-thesis/',
    ogType: 'article' as const,
    ogImagePath: '/og/blog/efficient-llm-inference-thesis.jpg',
  },
] as const;

const SITE = 'https://manueloelmaier.de';

async function metaContent(page: Page, selector: string): Promise<string | null> {
  return page.locator(selector).getAttribute('content');
}

function parseJsonLd(raw: string | null): unknown {
  return JSON.parse(raw ?? '{}') as unknown;
}

for (const { path, ogType, ogImagePath } of pages) {
  test(`open graph meta on ${path}`, async ({ page, request }) => {
    await page.goto(path);

    const ogTitle = await metaContent(page, 'meta[property="og:title"]');
    const ogDescription = await metaContent(page, 'meta[property="og:description"]');
    const ogImage = await metaContent(page, 'meta[property="og:image"]');
    const ogUrl = await metaContent(page, 'meta[property="og:url"]');
    const ogTypeActual = await metaContent(page, 'meta[property="og:type"]');
    const twitterCard = await metaContent(page, 'meta[name="twitter:card"]');
    const twitterImage = await metaContent(page, 'meta[name="twitter:image"]');

    expect(ogTitle, 'og:title').toBeTruthy();
    expect(ogDescription, 'og:description').toBeTruthy();
    expect(ogImage, 'og:image').toBe(`${SITE}${ogImagePath}`);
    expect(ogUrl, 'og:url').toMatch(/^https:\/\//);
    expect(ogTypeActual).toBe(ogType);
    expect(twitterCard).toBe('summary_large_image');
    expect(twitterImage).toBe(ogImage);

    if (!ogImage) {
      throw new Error('og:image missing after assertion');
    }

    const imagePath = new URL(ogImage).pathname;
    const imageResponse = await request.get(imagePath);
    expect(imageResponse.ok(), `og:image fetch ${imagePath}`).toBeTruthy();
    expect(imageResponse.headers()['content-type']).toMatch(/image\//);

    const buffer = await imageResponse.body();
    const { width, height } = await sharp(buffer).metadata();
    expect(width, 'og:image width').toBeGreaterThanOrEqual(1200);
    expect(height, 'og:image height').toBeGreaterThanOrEqual(630);
  });
}

test('JSON-LD Person schema on homepage', async ({ page }) => {
  await page.goto('/');

  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);

  expect(parseJsonLd(await jsonLd.textContent())).toMatchObject({
    '@type': 'Person',
    name: 'Manuel Oelmaier',
    jobTitle: expect.stringContaining('AI'),
    email: 'manuel@oelmaier.eu',
    sameAs: expect.arrayContaining([
      'https://www.linkedin.com/in/manuel-oelmaier/',
      'https://github.com/manuel-Oelmaier',
    ]),
  });
});

test('JSON-LD Article schema on blog posts', async ({ page }) => {
  await page.goto('/blog/homelab-ai-platform/');

  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);

  expect(parseJsonLd(await jsonLd.textContent())).toMatchObject({
    '@type': 'Article',
    headline: 'A production AI homelab — tiered context and exposure',
    description: expect.any(String),
    datePublished: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    author: {
      '@type': 'Person',
      name: 'Manuel Oelmaier',
    },
    image: `${SITE}/og/blog/homelab-ai-platform.jpg`,
    mainEntityOfPage: {
      '@id': `${SITE}/blog/homelab-ai-platform/`,
    },
  });
});

test('article:published_time on blog posts', async ({ page }) => {
  await page.goto('/blog/efficient-llm-inference-thesis/');

  const published = await metaContent(page, 'meta[property="article:published_time"]');
  expect(published).toMatch(/^2026-07-05T/);
});
