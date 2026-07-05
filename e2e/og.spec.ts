import sharp from 'sharp';
import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', ogType: 'website' as const },
  { path: '/blog/', ogType: 'website' as const },
  { path: '/blog/homelab-ai-platform/', ogType: 'article' as const },
];

const SITE = 'https://manueloelmaier.de';

async function metaContent(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<string | null> {
  return page.locator(selector).getAttribute('content');
}

for (const { path, ogType } of pages) {
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
    expect(ogImage, 'og:image').toMatch(/^https:\/\//);
    expect(ogUrl, 'og:url').toMatch(/^https:\/\//);
    expect(ogTypeActual).toBe(ogType);
    expect(twitterCard).toBe('summary_large_image');
    expect(twitterImage).toBe(ogImage);

    expect(ogImage!.startsWith(SITE)).toBe(true);

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
