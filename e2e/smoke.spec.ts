import { expect, test } from '@playwright/test';

test.describe('core pages', () => {
  test('homepage shows profile and navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Manuel Oelmaier/);
    await expect(page.getByRole('heading', { name: 'Manuel Oelmaier', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore my Blog' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Grab A Copy' })).toBeVisible();
  });

  test('blog archive lists posts', async ({ page }) => {
    await page.goto('/blog/');

    await expect(page.getByRole('heading', { name: 'Blog', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read More' }).first()).toBeVisible();
  });

  test('blog post opens from archive', async ({ page }) => {
    await page.goto('/blog/');
    await page.getByRole('link', { name: 'Read More' }).first().click();

    await expect(page.getByRole('link', { name: 'Back to Blog Archive' })).toBeVisible();
  });

  test('rss feed is reachable', async ({ request }) => {
    const response = await request.get('/rss.xml');

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('xml');
  });
});

test.describe('mobile layout', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('homepage has no horizontal overflow', async ({ page }) => {
    await page.goto('/');

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasOverflow).toBe(false);
  });
});
