import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from './site';

export type Post = CollectionEntry<'posts'>;

/** Every published post, newest first. */
export async function allPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const postUrl = (p: Post) => `/posts/${p.id}/`;

export const fmtDate = (d: Date) =>
  d.toLocaleDateString(SITE.locale, { month: 'short', day: 'numeric', year: 'numeric' });

const monthsBetween = (a: Date, b: Date) =>
  (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

/**
 * How current a post is. Counts from `verified` when set, otherwise from `date`.
 * This is the thing readers miss when they land on a three-year-old how-to.
 */
export function freshness(p: Post, now = new Date()) {
  const base = p.data.verified ?? p.data.date;
  const months = monthsBetween(base, now);
  const years = Math.floor(months / 12);
  const isVerified = Boolean(p.data.verified) && months < SITE.staleAfterMonths;

  let label: string;
  if (isVerified) {
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    label = `verified ${mm}/${String(base.getFullYear()).slice(2)}`;
  } else if (years >= 1) {
    label = years === 1 ? '1 yr old' : `${years} yrs old`;
  } else if (months >= 1) {
    label = `${months} mo old`;
  } else {
    label = 'new';
  }

  return { months, years, isVerified, isStale: months >= SITE.staleAfterMonths, label };
}

/** Related posts via shared tags, falling back to the category. */
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

/** Tag frequencies, most used first. */
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
