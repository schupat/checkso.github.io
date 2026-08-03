import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { allPosts, postUrl } from '../lib/posts';
import { SITE } from '../lib/site';

export async function GET(context: APIContext) {
  const posts = await allPosts();
  return rss({
    title: SITE.title,
    description: SITE.tagline,
    site: context.site ?? SITE.url,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description,
      link: postUrl(p),
      categories: [...p.data.categories, ...p.data.tags],
    })),
    customData: `<language>${SITE.lang}</language>`,
  });
}
