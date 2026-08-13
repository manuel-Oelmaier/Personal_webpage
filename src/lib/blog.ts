/** Content-collection ids include the file extension. */
export function blogSlug(id: string): string {
	return id.replace(/\.(mdx|md)$/, '');
}

/** RSS already uses raw body; strip MDX islands so readers do not see JSX. */
export function rssContent(body: string | undefined): string {
	if (!body) {
		return '';
	}
	return body
		.replace(/^import\s[\s\S]*?;\s*$/gm, '')
		.replace(
			/<EvalsBoard\s*\/>/g,
			'<p><a href="https://manueloelmaier.de/blog/feeling-llm-benchmarks/#evals-board">Interactive leaderboard</a></p>',
		)
		.trim();
}
