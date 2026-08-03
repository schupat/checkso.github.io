import type { APIRoute } from 'astro';
import { allPosts, postUrl, fmtDate, freshness } from '../lib/posts';

/**
 * Dateisystem fuer /desktop/. Anders als /search.json enthaelt dieser Endpunkt
 * den vollstaendigen Artikeltext, damit `cat` im Terminal wirklich etwas ausgibt
 * und `grep` nicht nur die ersten Zeilen durchsucht.
 */

/** Markdown so weit entschaerfen, dass es in einem Terminal lesbar bleibt. */
function toPlain(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (b) =>
      b.replace(/```[a-zA-Z]*\n?/g, '').split('\n').map((l) => '    ' + l).join('\n'))
    .replace(/^#{1,6}\s+(.*)$/gm, (_, t) => `\n${String(t).toUpperCase()}\n${'-'.repeat(String(t).length)}`)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[image: $1]')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 <$2>')
    .replace(/^\s*>\s?/gm, '  | ')
    .replace(/^\s*[-*+]\s+/gm, '  - ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const GET: APIRoute = async () => {
  const posts = await allPosts();
  const files = posts.map((p) => {
    const f = freshness(p);
    const year = String(p.data.date.getFullYear());
    const body = toPlain(p.body ?? '');
    return {
      name: `${p.id}.md`,
      dir: `/home/patrick/posts/${year}`,
      title: p.data.title,
      url: postUrl(p),
      date: fmtDate(p.data.date),
      iso: p.data.date.toISOString().slice(0, 10),
      year,
      tags: p.data.tags,
      categories: p.data.categories,
      age: f.label,
      fresh: f.isVerified,
      // Wirklich veraltet -- nicht bloss "ohne Verifizierungsdatum".
      stale: f.isStale,
      size: body.length,
      lines: body.split('\n').length,
      body,
    };
  });

  return new Response(JSON.stringify({ files }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
