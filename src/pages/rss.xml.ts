import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { blogSlug, rssContent } from '../lib/blog';

export async function GET(context: APIContext): Promise<Response> {
  const blogEntries = (await getCollection('blog')).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );

  if (!context.site) {
    throw new Error('Site URL must be configured in astro.config.mjs for RSS generation.');
  }

  return rss({
    customData: '<language>en-us</language>',
    description: 'Problem-first write-ups on infrastructure, AI, and engineering.',
    items: blogEntries.map((entry) => ({
      content: rssContent(entry.body),
      description: entry.data.description,
      link: `/blog/${blogSlug(entry.id)}/`,
      pubDate: entry.data.pubDate,
      title: entry.data.title,
    })),
    site: context.site,
    title: 'Manuel Oelmaier | Blog',
  });
}
