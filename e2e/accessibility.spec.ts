import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = ['/', '/blog/', '/blog/homelab-ai-platform/'] as const;

for (const path of pages) {
  test(`no axe violations on ${path}`, async ({ page }) => {
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

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
}

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string {
  if (violations.length === 0) {
    return '';
  }

  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => node.target.join(', '))
        .join('; ');
      return `${violation.id}: ${violation.help} (${nodes})`;
    })
    .join('\n');
}
