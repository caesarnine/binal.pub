import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/post' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.string().default('Binal Patel'),
    description: z.string().optional(),
    permalink: z.string().regex(/^\/[a-z0-9/-]+\/$/).optional(),
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './content' }),
  schema: z.object({ title: z.string() }),
});
export const collections = { posts, pages };
