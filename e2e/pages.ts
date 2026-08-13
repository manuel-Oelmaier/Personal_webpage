/** Public routes covered by layout, accessibility, and smoke tests. */
export const publicPages = [
  '/',
  '/blog/',
  '/blog/homelab-ai-platform/',
  '/blog/homelab-dns-filtering/',
  '/blog/efficient-llm-inference-thesis/',
  '/blog/feeling-llm-benchmarks/',
  '/evals/',
  '/evals/hellaswag/',
  '/evals/hellaswag/take/',
  '/evals/hellaswag/about/',
  '/evals/scicode/',
  '/evals/scicode/browse/',
  '/evals/mmmu-pro/',
  '/evals/mmmu-pro/take/',
  '/evals/mmlu-pro/',
  '/evals/mmlu-pro/take/',
  '/evals/gpqa-diamond/',
  '/evals/gpqa-diamond/take/',
  '/evals/leaderboard/',
] as const;

export type PublicPage = (typeof publicPages)[number];

export function pageSnapshotName(path: PublicPage): string {
  if (path === '/') {
    return 'home';
  }
  return path.replace(/^\/|\/$/g, '').replace(/\//g, '-');
}
