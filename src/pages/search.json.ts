import type { APIRoute } from 'astro';
import { allPosts, postUrl, fmtDate, freshness } from '../lib/posts';

/** Kompakter Suchindex, zur Buildzeit erzeugt. Kein Server, keine Fremd-API. */
export const GET: APIRoute = async () => {
  const posts = await allPosts();
  const data = posts.map((p) => {
    const f = freshness(p);
    return {
      title: p.data.title,
      url: postUrl(p),
      tags: p.data.tags,
      categories: p.data.categories,
      date: fmtDate(p.data.date),
      age: f.label,
      fresh: f.isVerified,
      // Rohtext gekuerzt — reicht fuer Volltextsuche ueber Fehlermeldungen,
      // haelt den Index aber unter ein paar Kilobyte.
      text: p.body?.replace(/[#*`>|_\-]+/g, ' ').replace(/\s+/g, ' ').slice(0, 1200) ?? '',
    };
  });
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
