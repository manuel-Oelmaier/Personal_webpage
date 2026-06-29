import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext): Promise<Response> {
  const blogEntries = (await getCollection('blog')).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );

  if (!context.site) {
    throw new Error('Site URL must be configured in astro.config.mjs for RSS generation.');
  }

  return rss({
    customData: '<language>en-us</language>',
    description: 'Thoughts on AI, Software Engineering, and Life Architecture.',
    items: blogEntries.map((entry) => ({
      content: entry.body,
      description: entry.data.description,
      link: `/blog/${entry.id.replace('.md', '')}/`,
      pubDate: entry.data.pubDate,
      title: entry.data.title,
    })),
    site: context.site,
    title: 'Manuel Oelmaier | Blog',
  });
}
