import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

// Helper to extract title from HTML string or use filename
function getTitle(html, id) {
    const match = html.match(/<title>(.*?)<\/title>/);
    if (match) return match[1].split('|')[0].trim();
    
    const filename = id.replace('.html', '');
    return filename.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Helper to extract date from the <div class="post-meta">Published on February 4, 2026 • Philosophy</div>
function getPubDate(html) {
    const match = html.match(/Published on (.*?) •/);
    if (match) {
        return new Date(match[1]);
    }
    return new Date();
}

export async function GET(context) {
    const blogEntries = await getCollection('blog');
    
    return rss({
        title: 'Manuel Oelmaier | Blog',
        description: 'Thoughts on AI, Software Engineering, and Life Architecture.',
        site: context.site,
        items: blogEntries.map((entry) => ({
            title: getTitle(entry.body || '', entry.id),
            pubDate: getPubDate(entry.body || ''),
            link: `/blog/${entry.id.replace('.md', '')}/`,
            content: entry.body,
        })),
        customData: `<language>en-us</language>`,
    });
}
