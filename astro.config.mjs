// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://schuele.xyz',
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: { format: 'directory' },

  // Tag- und Kategorie-Namen wurden auf die offizielle Schreibweise gebracht.
  // Wo sich dadurch der Slug aendert, bleibt die alte Adresse per Weiterleitung
  // erreichbar -- alles andere waere ein 404 fuer bestehende Links.
  redirects: {
    '/tags/analysis-service/': '/tags/analysis-services/',
    '/categories/azure-analysis-service/': '/categories/azure-analysis-services/',
    '/categories/powerbi/': '/categories/power-bi/',
  },

  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, wrap: false },
  },
});
