import { expect, test } from '@playwright/test';
import { pageSnapshotName, publicPages } from './pages';

/** Pin fonts so Arch dev machines and Ubuntu CI render the same metrics. */
const STABILIZE_STYLES = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    font-family: 'Noto Sans', 'Liberation Sans', sans-serif !important;
  }
  code, pre, .tag, .post-date, .post-meta, abbr {
    font-family: 'Liberation Mono', 'Courier New', monospace !important;
  }
  .fade-in {
    opacity: 1 !important;
    transform: none !important;
  }
`;

test.describe('mobile layout screenshots', () => {
  for (const path of publicPages) {
    test(`screenshot ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.addStyleTag({ content: STABILIZE_STYLES });

      await expect(page.locator('main')).toHaveScreenshot(`${pageSnapshotName(path)}.png`, {
        maxDiffPixelRatio: 0.1,
      });
    });
  }
});
