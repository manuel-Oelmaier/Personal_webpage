import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://manueloelmaier.de',
  integrations: [sitemap(), mdx(), react()],
  outDir: './dist',
  build: {
    inlineStylesheets: 'always',
    format: 'directory',
  },
  redirects: {
    '/evals/scicode/browse': '/evals/scicode',
    '/evals/hellaswag': '/blog/feeling-llm-benchmarks',
    '/evals/hellaswag/about': '/blog/feeling-llm-benchmarks',
    '/evals/hellaswag/take': '/evals/mmmu-pro',
    '/evals/mmlu-pro': '/evals/mmmu-pro',
  },
});
