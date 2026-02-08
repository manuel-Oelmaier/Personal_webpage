import rss from '@astrojs/rss';

// Helper to extract title from HTML string or use filename
function getTitle(html, path) {
    const match = html.match(/<title>(.*?)<\/title>/);
    if (match) return match[1].split('|')[0].trim();
    
    const filename = path.split('/').pop().replace('.html', '');
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
    const postImportResult = import.meta.glob('../content/*.html', { query: '?raw', eager: true });
    const posts = Object.entries(postImportResult).map(([path, file]) => ({
        slug: path.split('/').pop().replace('.html', ''),
        title: getTitle(file.default, path),
        pubDate: getPubDate(file.default),
        content: file.default,
    }));

    return rss({
        title: 'Manuel Oelmaier | Blog',
        description: 'Thoughts on AI, Software Engineering, and Life Architecture.',
        site: context.site,
        items: posts.map((post) => ({
            title: post.title,
            pubDate: post.pubDate,
            link: `/blog/${post.slug}/`,
            content: post.content,
        })),
        customData: `<language>en-us</language>`,
    });
}
