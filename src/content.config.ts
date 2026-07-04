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

export const collections = { blog };
