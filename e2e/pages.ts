/** Public routes covered by layout, accessibility, and smoke tests. */
export const publicPages = [
  '/',
  '/blog/',
  '/blog/homelab-ai-platform/',
  '/blog/homelab-dns-filtering/',
  '/blog/efficient-llm-inference-thesis/',
  '/evals/',
  '/evals/hellaswag/',
  '/evals/hellaswag/take/',
  '/evals/hellaswag/about/',
  '/evals/mmlu-pro/',
  '/evals/mmlu-pro/take/',
  '/evals/gpqa-diamond/',
  '/evals/scicode/',
  '/evals/leaderboard/',
] as const;

export type PublicPage = (typeof publicPages)[number];

export function pageSnapshotName(path: PublicPage): string {
  if (path === '/') {
    return 'home';
  }
  return path.replace(/^\/|\/$/g, '').replace(/\//g, '-');
}
