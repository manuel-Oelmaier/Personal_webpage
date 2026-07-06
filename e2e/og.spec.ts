import sharp from 'sharp';
import { expect, test } from '@playwright/test';

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
];

const SITE = 'https://manueloelmaier.de';

async function metaContent(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<string | null> {
  return page.locator(selector).getAttribute('content');
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

    const imagePath = new URL(ogImage!).pathname;
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

  const data = JSON.parse(await jsonLd.textContent() ?? '{}');
  expect(data['@type']).toBe('Person');
  expect(data.name).toBe('Manuel Oelmaier');
  expect(data.jobTitle).toContain('AI');
  expect(data.email).toBe('manuel@oelmaier.eu');
  expect(data.sameAs).toContain('https://www.linkedin.com/in/manuel-oelmaier/');
  expect(data.sameAs).toContain('https://github.com/manuel-Oelmaier');
});

test('JSON-LD Article schema on blog posts', async ({ page }) => {
  await page.goto('/blog/homelab-ai-platform/');

  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);

  const data = JSON.parse(await jsonLd.textContent() ?? '{}');
  expect(data['@type']).toBe('Article');
  expect(data.headline).toBe('A production AI homelab — tiered context and exposure');
  expect(data.description).toBeTruthy();
  expect(data.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(data.author?.['@type']).toBe('Person');
  expect(data.author?.name).toBe('Manuel Oelmaier');
  expect(data.image).toBe(`${SITE}/og/blog/homelab-ai-platform.jpg`);
  expect(data.mainEntityOfPage?.['@id']).toBe(`${SITE}/blog/homelab-ai-platform/`);
});

test('article:published_time on blog posts', async ({ page }) => {
  await page.goto('/blog/efficient-llm-inference-thesis/');

  const published = await metaContent(page, 'meta[property="article:published_time"]');
  expect(published).toMatch(/^2026-07-05T/);
});
