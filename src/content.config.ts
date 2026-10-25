import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    problem: z.string().optional(),
  }),
});

const benchmarks = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/benchmarks' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    purpose: z.string(),
    scoring: z.string(),
    citation: z.object({
      label: z.string(),
      url: z.url(),
    }),
    datasetSource: z.url(),
    /** Full upstream benchmark size (all questions / subproblems). */
    datasetSize: z.number().int().positive(),
    /** Human mini-eval draw size when takeable. */
    questionCount: z.number().int().positive(),
    /** Pool this site draws from; defaults to datasetSize (full set). */
    poolSize: z.number().int().positive().optional(),
    categories: z.array(z.string()).default([]),
    published: z.coerce.date(),
    takeable: z.boolean(),
  }),
});

export const collections = { blog, benchmarks };
