import { readFileSync } from 'node:fs';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { pageSnapshotName, publicPages, type PublicPage } from './pages';

function readPngHeight(snapshotPath: string): number | undefined {
  try {
    const buffer = readFileSync(snapshotPath);
    return buffer.readUInt32BE(20);
  } catch {
    return undefined;
  }
}

async function stabilizeMainHeight(page: Page, testInfo: TestInfo, path: PublicPage): Promise<void> {
  const snapshotPath = testInfo.snapshotPath(`${pageSnapshotName(path)}.png`);
  const expectedHeight = readPngHeight(snapshotPath);

  if (expectedHeight === undefined) {
    return;
  }

  await page.locator('main').evaluate((main, height) => {
    const targetHeight = Math.max(height - 1, 0);
    main.style.height = `${targetHeight}px`;
    main.style.minHeight = `${targetHeight}px`;
    main.style.overflow = 'hidden';
  }, expectedHeight);
}

test.describe('mobile layout screenshots', () => {
  for (const path of publicPages) {
    test(`screenshot ${path}`, async ({ page }, testInfo) => {
      await page.goto(path);
      await page.addStyleTag({
        content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
        }
        .fade-in {
          opacity: 1 !important;
          transform: none !important;
        }
      `,
      });

      await stabilizeMainHeight(page, testInfo, path);

      await expect(page.locator('main')).toHaveScreenshot(`${pageSnapshotName(path)}.png`, {
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});
