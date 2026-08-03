import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from './site';

export type Post = CollectionEntry<'posts'>;

/** Alle veröffentlichten Posts, neueste zuerst. */
export async function allPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.PROD ? !data.draft : true);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const postUrl = (p: Post) => `/posts/${p.id}/`;

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });

const monthsBetween = (a: Date, b: Date) =>
  (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

/**
 * Frischezustand eines Artikels. Zählt ab `verified`, sonst ab `date`.
 * Genau das, was einem IT-Leser fehlt, wenn er auf einen drei Jahre alten Treffer klickt.
 */
export function freshness(p: Post, now = new Date()) {
  const base = p.data.verified ?? p.data.date;
  const months = monthsBetween(base, now);
  const years = Math.floor(months / 12);
  const isVerified = Boolean(p.data.verified) && months < SITE.staleAfterMonths;

  let label: string;
  if (isVerified) {
    label = `geprüft ${String(base.getMonth() + 1).padStart(2, '0')}/${String(base.getFullYear()).slice(2)}`;
  } else if (years >= 1) {
    label = years === 1 ? '1 J. alt' : `${years} J. alt`;
  } else if (months >= 1) {
    label = `${months} Mon. alt`;
  } else {
    label = 'neu';
  }

  return { months, years, isVerified, isStale: months >= SITE.staleAfterMonths, label };
}

/** Verwandte Artikel über gemeinsame Tags, sonst über die Kategorie. */
export function related(current: Post, pool: Post[], limit = 3): Post[] {
  const tags = new Set(current.data.tags.map((t) => t.toLowerCase()));
  const cats = new Set(current.data.categories.map((c) => c.toLowerCase()));
  return pool
    .filter((p) => p.id !== current.id)
    .map((p) => {
      const t = p.data.tags.filter((x) => tags.has(x.toLowerCase())).length;
      const c = p.data.categories.filter((x) => cats.has(x.toLowerCase())).length;
      return { p, score: t * 2 + c };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.data.date.valueOf() - a.p.data.date.valueOf())
    .slice(0, limit)
    .map((x) => x.p);
}

/** Tag-Häufigkeiten, absteigend. */
export function tagCounts(posts: Post[]) {
  const map = new Map<string, number>();
  for (const p of posts) for (const t of p.data.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function categoryCounts(posts: Post[]) {
  const map = new Map<string, number>();
  for (const p of posts) for (const c of p.data.categories) map.set(c, (map.get(c) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
