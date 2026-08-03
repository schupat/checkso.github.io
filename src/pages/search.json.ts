import type { APIRoute } from 'astro';
import { allPosts, postUrl, fmtDate, freshness } from '../lib/posts';

/** Compact search index, generated at build time. No server, no third-party API. */
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
      // Truncated body text — enough for full-text search over error messages,
      // while keeping the index down to a few kilobytes.
      text: p.body?.replace(/[#*`>|_\-]+/g, ' ').replace(/\s+/g, ' ').slice(0, 1200) ?? '',
    };
  });
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
