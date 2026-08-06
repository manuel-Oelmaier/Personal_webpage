import { expect, test } from '@playwright/test';
import { publicPages } from './pages';

test.describe('core pages', () => {
  test('homepage shows profile and navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Manuel Oelmaier/);
    await expect(page.getByRole('heading', { name: 'Software Engineer · AI / LLM', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Blog' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download CV' })).toBeVisible();
  });

  test('blog archive lists posts', async ({ page }) => {
    await page.goto('/blog/');

    await expect(page.getByRole('heading', { name: 'Blog', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read More' })).toHaveCount(3);
  });

  test('evals page is the leaderboard with take-subset link', async ({ page }) => {
    await page.goto('/evals/');

    await expect(page.getByRole('heading', { name: 'LLM leaderboard', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Why take a subset yourself', level: 2 })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('Claude Mythos 5')).toBeVisible();
    await expect(page.getByRole('table').getByRole('link', { name: 'Take a subset' })).toBeVisible();
    await expect(page.getByText('not reported').first()).toBeVisible();
  });

  test('hellaswag eval page mounts runner', async ({ page }) => {
    await page.goto('/evals/hellaswag/');

    await expect(page.getByRole('heading', { name: 'HellaSwag', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start eval' })).toBeVisible();
    await expect(page.getByLabel('Run seed')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Methodology', exact: true })).toBeVisible();
  });

  test('legacy leaderboard URL redirects to evals', async ({ page }) => {
    await page.goto('/evals/leaderboard/?you=80&answered=10&drawn=20&seed=abcd');

    await expect(page).toHaveURL(/\/evals\/\?.*you=80/);
    await expect(page.getByRole('heading', { name: 'LLM leaderboard', level: 1 })).toBeVisible();
  });

  test('blog post opens from archive', async ({ page }) => {
    await page.goto('/blog/');
    await page.getByRole('link', { name: 'Read More' }).first().click();

    await expect(page.getByRole('link', { name: 'Back to Blog Archive' })).toBeVisible();
  });

  for (const path of publicPages) {
    test(`${path} loads successfully`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.ok()).toBeTruthy();
    });
  }

  test('rss feed is reachable', async ({ request }) => {
    const response = await request.get('/rss.xml');

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('xml');
  });

  test('sitemap is reachable', async ({ request }) => {
    const response = await request.get('/sitemap-index.xml');

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('xml');
    expect(await response.text()).toContain('https://manueloelmaier.de/');
  });

  test('robots.txt references sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');

    expect(response.ok()).toBeTruthy();
    expect(await response.text()).toContain('Sitemap: https://manueloelmaier.de/sitemap-index.xml');
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
