import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    problem: z.string().optional(),
  }),
});

const benchmarks = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    purpose: z.string(),
    scoring: z.string(),
    citation: z.object({
      label: z.string(),
      url: z.string().url(),
    }),
    datasetSource: z.string().url(),
    questionCount: z.number().int().positive(),
    categories: z.array(z.string()).default([]),
    published: z.coerce.date(),
    takeable: z.boolean(),
  }),
});

export const collections = { blog, benchmarks };
