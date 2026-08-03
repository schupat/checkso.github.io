import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  // Only .md is loaded -- a file without an extension fails loudly here
  // instead of silently vanishing the way it could under Jekyll.
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/posts',
    // URL compatibility with Jekyll: casing is preserved (Astro would lowercase,
    // but GitHub Pages is case-sensitive), and runs of non-alphanumerics collapse
    // into a single hyphen -- exactly what Jekyll's :title does.
    // "530003---Entras" becomes "530003-Entras".
    generateId: ({ entry }) =>
      entry
        .replace(/\.md$/, '')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
    /** When the content was last checked against the real product UI. */
    verified: z.coerce.date().optional(),
    /** What it was checked against, e.g. "Entra admin center + Graph PowerShell 2.3" */
    testedAgainst: z.string().optional(),
    /** Rough time required, e.g. "~20 min" */
    effort: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
