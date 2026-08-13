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
    await expect(page.getByRole('link', { name: 'Read More' })).toHaveCount(4);
  });

  test('evals board lives on the blog post', async ({ page }) => {
    await page.goto('/blog/feeling-llm-benchmarks/?you=70&answered=5&drawn=20&seed=abcd&bench=mmmu_pro');

    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /MMMU-Pro/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'MMMU-Pro' })).toHaveAttribute('href', '/evals/mmmu-pro/');
    await expect(page.getByRole('columnheader', { name: /Average/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'GPT-5.6 Sol' })).toHaveAttribute(
      'href',
      'https://artificialanalysis.ai/models/gpt-5-6-sol',
    );
    await expect(page.getByRole('link', { name: 'MiniMax-M3' })).toBeVisible();
    await expect(page.getByText(/You \(MMMU-Pro mini-eval\)/)).toBeVisible();
  });

  test('evals board restores You scores from localStorage', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'evals:you-scores:v1',
        JSON.stringify({
          mmmu_pro: {
            pct: 65,
            answered: 10,
            drawn: 20,
            seed: 'beef',
            early: false,
            savedAt: '2026-08-01T12:00:00.000Z',
          },
          gpqa_diamond: {
            pct: 40,
            answered: 8,
            drawn: 20,
            seed: 'cafe',
            early: true,
            savedAt: '2026-08-02T12:00:00.000Z',
          },
        }),
      );
    });
    await page.goto('/blog/feeling-llm-benchmarks/');

    await expect(page.getByText(/You \(mini-evals\)/)).toBeVisible();
    await expect(page.getByText(/MMMU-Pro: answered 10\/20/)).toBeVisible();
    await expect(page.getByText(/GPQA Diamond: answered 8\/20/)).toBeVisible();
  });

  test('evals hub lists mini-evals', async ({ page }) => {
    await page.goto('/evals/');
    await expect(page.getByRole('heading', { name: 'Human mini-evals', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'MMMU-Pro' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'GPQA Diamond' })).toBeVisible();
  });

  test('mmmu-pro take auto-starts', async ({ page }) => {
    await page.goto('/evals/mmmu-pro/take/');
    await expect(page.getByText(/Question 1\s*\/\s*20/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('gpqa-diamond take auto-starts', async ({ page }) => {
    await page.goto('/evals/gpqa-diamond/take/');
    await expect(page.getByText(/Question 1\s*\/\s*20/i)).toBeVisible({ timeout: 15000 });
  });

  test('scicode browse page shows illustrative prompts', async ({ page }) => {
    await page.goto('/evals/scicode/browse/');
    await expect(page.getByRole('heading', { name: /SciCode problem shape/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/Are unit tests hidden/i)).toBeVisible();
    await expect(page.getByText(/Yes — from the model/i)).toBeVisible();
    await expect(page.getByText(/Unit tests \(2\) — hidden from the model during eval/i).first()).toBeVisible();
    await expect(page.getByText(/Gold solution — also withheld/i).first()).toBeVisible();
  });

  test('blog board links to take pages', async ({ page }) => {
    await page.goto('/blog/feeling-llm-benchmarks/');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('link', { name: 'MMMU-Pro quiz' })).toHaveCount(0);
  });

  test('legacy hellaswag URLs redirect away', async ({ page }) => {
    await page.goto('/evals/hellaswag/about/');
    await expect(page).toHaveURL(/\/blog\/feeling-llm-benchmarks\/?/);
    await page.goto('/evals/hellaswag/take/');
    await expect(page).toHaveURL(/\/evals\/mmmu-pro\/take\/?$/);
  });

  test('legacy leaderboard URL redirects to blog', async ({ page }) => {
    await page.goto('/evals/leaderboard/?you=80&answered=10&drawn=20&seed=abcd');

    await expect(page).toHaveURL(/\/blog\/feeling-llm-benchmarks\/\?.*you=80/);
    await expect(page.getByRole('heading', { name: /leaderboard percentage/i, level: 1 })).toBeVisible();
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
