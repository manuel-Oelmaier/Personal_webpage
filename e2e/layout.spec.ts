import { expect, test } from '@playwright/test';

const pages = ['/', '/blog/', '/blog/hello-world/'] as const;

function snapshotName(path: (typeof pages)[number]): string {
  if (path === '/') {
    return 'home';
  }
  return path.replace(/^\/|\/$/g, '').replace(/\//g, '-');
}

test.describe.configure({ project: ['mobile-chrome'] });

for (const path of pages) {
  test(`screenshot ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          opacity: 1 !important;
        }
      `,
    });

    await expect(page).toHaveScreenshot(`${snapshotName(path)}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
}
