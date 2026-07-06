/** Public routes covered by layout, accessibility, and smoke tests. */
export const publicPages = [
  '/',
  '/blog/',
  '/blog/homelab-ai-platform/',
  '/blog/homelab-dns-filtering/',
  '/blog/efficient-llm-inference-thesis/',
] as const;

export type PublicPage = (typeof publicPages)[number];

export function pageSnapshotName(path: PublicPage): string {
  if (path === '/') {
    return 'home';
  }
  return path.replace(/^\/|\/$/g, '').replace(/\//g, '-');
}
