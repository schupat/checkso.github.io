import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  // Nur .md wird geladen -- eine Datei ohne Endung faellt hier auf,
  // statt wie bei Jekyll stillschweigend zu verschwinden.
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/posts',
    // URL-Kompatibilitaet zu Jekyll: Gross-/Kleinschreibung bleibt erhalten
    // (Astro wuerde kleinschreiben, GitHub Pages unterscheidet aber),
    // und Laeufe von Sonderzeichen werden zu einem Bindestrich zusammengezogen
    // -- genau das macht Jekylls :title. Aus "530003---Entras" wird "530003-Entras".
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
    /** Wann der Inhalt zuletzt gegen die echte Oberflaeche geprueft wurde. */
    verified: z.coerce.date().optional(),
    /** Wogegen geprueft wurde, z.B. "Entra Admin Center + Graph PowerShell 2.3" */
    testedAgainst: z.string().optional(),
    /** Grober Zeitaufwand, z.B. "~20 Min" */
    effort: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
