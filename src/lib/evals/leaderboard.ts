/**
 * LLM context leaderboard — insert You-row, bold column bests, take-subset column links.
 */

type ScoreCell = {
	value: number | null;
	display: string;
	missingReason?: string;
	metric: string;
	setting: string;
	source: { label: string; url: string };
};

type ScoreKey = 'mmlu_pro' | 'gpqa_diamond' | 'scicode' | 'hellaswag';

type BenchmarkMeta = {
	id: string;
	column: ScoreKey;
	label: string;
	takeHref: string | null;
	aboutHref: string | null;
	takeLabel: string;
};

type LeaderboardRow = {
	id: string;
	name: string;
	tier: string;
	published?: string;
	paramsLabel: string;
	openWeights: boolean;
	hfUrl?: string;
	cardUrl?: string;
	scores: Record<ScoreKey, ScoreCell>;
	isYou?: boolean;
	youMeta?: { answered: number; drawn: number; seed: string; early: boolean; bench: ScoreKey };
};

export type LeaderboardData = {
	schemaVersion: number;
	title: string;
	updated: string;
	caveat: string;
	columns: Record<ScoreKey, string>;
	rankColumn: ScoreKey;
	benchmarks?: BenchmarkMeta[];
	rows: LeaderboardRow[];
};

const SCORE_KEYS: ScoreKey[] = ['mmlu_pro', 'gpqa_diamond', 'scicode', 'hellaswag'];

const TIER_LABEL: Record<string, string> = {
	proprietary: 'Proprietary frontier',
	'open-large': 'Open large / MoE',
	'open-mid': 'Open mid (~27–31B)',
	'open-small': 'Open small (~9–12B)',
	historical: 'Historical',
	you: 'You',
};

const DEFAULT_BENCHMARKS: BenchmarkMeta[] = [
	{
		id: 'mmlu-pro',
		column: 'mmlu_pro',
		label: 'MMLU-Pro',
		takeHref: '/evals/mmlu-pro/take/',
		aboutHref: '/evals/mmlu-pro/',
		takeLabel: 'Take a subset',
	},
	{
		id: 'gpqa-diamond',
		column: 'gpqa_diamond',
		label: 'GPQA Diamond',
		takeHref: null,
		aboutHref: '/evals/gpqa-diamond/',
		takeLabel: 'Pack coming later',
	},
	{
		id: 'scicode',
		column: 'scicode',
		label: 'SciCode',
		takeHref: null,
		aboutHref: '/evals/scicode/',
		takeLabel: 'Not takeable',
	},
	{
		id: 'hellaswag',
		column: 'hellaswag',
		label: 'HellaSwag',
		takeHref: '/evals/hellaswag/take/',
		aboutHref: '/evals/hellaswag/',
		takeLabel: 'Take a subset',
	},
];

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function emptyCell(reason: string, hub: string): ScoreCell {
	return {
		value: null,
		display: '—',
		missingReason: reason,
		metric: '—',
		setting: '—',
		source: { label: '—', url: hub },
	};
}

function parseYouFromUrl(): {
	pct: number;
	answered: number;
	drawn: number;
	seed: string;
	early: boolean;
	bench: ScoreKey;
} | null {
	const params = new URLSearchParams(window.location.search);
	const youRaw = params.get('you');
	const answeredRaw = params.get('answered');
	if (youRaw === null || answeredRaw === null) {
		return null;
	}
	const pct = Number(youRaw);
	const answered = Number(answeredRaw);
	const drawn = Number(params.get('drawn') ?? answered);
	const seed = (params.get('seed') ?? '').toLowerCase();
	const early = params.get('early') === '1';
	const benchRaw = params.get('bench') ?? 'hellaswag';
	const bench = (SCORE_KEYS.includes(benchRaw as ScoreKey) ? benchRaw : 'hellaswag') as ScoreKey;
	if (!Number.isFinite(pct) || !Number.isFinite(answered) || answered <= 0) {
		return null;
	}
	return { pct, answered, drawn: Number.isFinite(drawn) ? drawn : answered, seed, early, bench };
}

function bestValue(rows: LeaderboardRow[], key: ScoreKey): number | null {
	let best: number | null = null;
	for (const row of rows) {
		const v = row.scores[key]?.value ?? null;
		if (v === null) {
			continue;
		}
		if (best === null || v > best) {
			best = v;
		}
	}
	return best;
}

function modelLink(row: LeaderboardRow): string {
	const href = row.hfUrl ?? row.cardUrl;
	if (!href) {
		return escapeHtml(row.name);
	}
	const kind = row.hfUrl ? 'Hugging Face' : 'model card';
	return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(row.name)}</a>
		<span class="eval-model-kind">${kind}</span>`;
}

function renderScoreCell(cell: ScoreCell, isBest: boolean): string {
	const bestClass = isBest ? ' eval-best' : '';
	if (cell.value === null) {
		return `<td class="eval-score-cell is-missing">
			<span class="eval-missing">—</span>
			<span class="eval-missing-reason">${escapeHtml(cell.missingReason ?? 'not reported')}</span>
			<a class="eval-cite-link" href="${escapeHtml(cell.source.url)}" rel="noopener noreferrer">${escapeHtml(cell.source.label)}</a>
		</td>`;
	}
	const inner = isBest
		? `<strong class="eval-best-num">${escapeHtml(cell.display)}</strong>`
		: `<span class="eval-score-num">${escapeHtml(cell.display)}</span>`;
	return `<td class="eval-score-cell${bestClass}">
		${inner}
		<span class="eval-metric-label">${escapeHtml(cell.metric)}</span>
		<a class="eval-cite-link" href="${escapeHtml(cell.source.url)}" rel="noopener noreferrer">${escapeHtml(cell.source.label)}</a>
	</td>`;
}

function sortRows(rows: LeaderboardRow[], rankColumn: ScoreKey): LeaderboardRow[] {
	const secondary: ScoreKey = rankColumn === 'mmlu_pro' ? 'gpqa_diamond' : 'mmlu_pro';
	return [...rows].sort((a, b) => {
		const av = a.scores[rankColumn]?.value ?? null;
		const bv = b.scores[rankColumn]?.value ?? null;
		if (av !== null && bv !== null && av !== bv) {
			return bv - av;
		}
		if (av !== null && bv === null) {
			return -1;
		}
		if (av === null && bv !== null) {
			return 1;
		}
		const as = a.scores[secondary]?.value ?? null;
		const bs = b.scores[secondary]?.value ?? null;
		if (as !== null && bs !== null && as !== bs) {
			return bs - as;
		}
		if (as !== null && bs === null) {
			return -1;
		}
		if (as === null && bs !== null) {
			return 1;
		}
		return a.name.localeCompare(b.name);
	});
}

function columnHeader(bench: BenchmarkMeta): string {
	const take = bench.takeHref
		? `<a class="eval-take-link" href="${escapeHtml(bench.takeHref)}">${escapeHtml(bench.takeLabel)}</a>`
		: `<span class="eval-take-soon">${escapeHtml(bench.takeLabel)}</span>`;
	const about = bench.aboutHref
		? ` · <a class="eval-th-about" href="${escapeHtml(bench.aboutHref)}">method</a>`
		: '';
	return `<th scope="col" class="eval-th-bench">
		<span class="eval-th-label">${escapeHtml(bench.label)}</span>
		<span class="eval-th-actions">${take}${about}</span>
	</th>`;
}

export function mountLeaderboard(root: HTMLElement, data: LeaderboardData): void {
	const you = parseYouFromUrl();
	const rows: LeaderboardRow[] = data.rows.map((r) => ({ ...r, scores: { ...r.scores } }));
	const benchmarks = data.benchmarks ?? DEFAULT_BENCHMARKS;
	const rankColumn = data.rankColumn ?? 'mmlu_pro';
	const ordered = SCORE_KEYS.map((key) => benchmarks.find((b) => b.column === key)).filter(
		(b): b is BenchmarkMeta => Boolean(b),
	);

	if (you) {
		const hubByBench: Record<ScoreKey, string> = {
			mmlu_pro: '/evals/mmlu-pro/',
			gpqa_diamond: '/evals/gpqa-diamond/',
			scicode: '/evals/scicode/',
			hellaswag: '/evals/hellaswag/',
		};
		const hub = hubByBench[you.bench];
		const label = data.columns[you.bench] ?? you.bench;
		const scores = Object.fromEntries(
			SCORE_KEYS.map((key) => [key, emptyCell('not applicable', hub)]),
		) as Record<ScoreKey, ScoreCell>;
		scores[you.bench] = {
			value: you.pct,
			display: `${you.pct}%`,
			metric: `${label} mini-eval`,
			setting: `answered-only · n=${you.answered}/${you.drawn}`,
			source: {
				label: 'This site’s seeded draw',
				url: hub,
			},
		};
		rows.push({
			id: 'you-mini-eval',
			name: `You (${label} mini-eval)`,
			tier: 'you',
			paramsLabel: 'human run',
			openWeights: false,
			isYou: true,
			youMeta: {
				answered: you.answered,
				drawn: you.drawn,
				seed: you.seed,
				early: you.early,
				bench: you.bench,
			},
			scores,
		});
	}

	const sorted = sortRows(rows, rankColumn);
	const bests = Object.fromEntries(SCORE_KEYS.map((key) => [key, bestValue(sorted, key)])) as Record<
		ScoreKey,
		number | null
	>;

	let rank = 0;
	const body = sorted
		.map((row) => {
			const hasRank = row.scores[rankColumn]?.value !== null;
			if (hasRank) {
				rank += 1;
			}
			const rankLabel = hasRank ? String(rank) : '—';
			const youClass = row.isYou ? ' is-you' : '';
			const badge = row.youMeta
				? `<p class="eval-you-badge">answered ${row.youMeta.answered}/${row.youMeta.drawn}`
					+ (row.youMeta.seed ? ` · seed <code>${escapeHtml(row.youMeta.seed)}</code>` : '')
					+ (row.youMeta.early ? ' · handed in early' : '')
					+ `</p>`
				: '';
			const published = row.published
				? `<time class="eval-published" datetime="${escapeHtml(row.published)}">Published ${escapeHtml(row.published)}</time>`
				: '';
			const scoreCells = SCORE_KEYS.map((key) => {
				const cell = row.scores[key] ?? emptyCell('not reported', '/evals/');
				const best = bests[key];
				return renderScoreCell(cell, cell.value !== null && best !== null && cell.value === best);
			}).join('');
			return `<tr class="eval-lb-row${youClass}">
				<td class="eval-rank">${rankLabel}</td>
				<td class="eval-model">
					${modelLink(row)}
					${badge}
					${published}
					<span class="eval-tier">${escapeHtml(TIER_LABEL[row.tier] ?? row.tier)}</span>
				</td>
				<td class="eval-params">${escapeHtml(row.paramsLabel)}</td>
				${scoreCells}
			</tr>`;
		})
		.join('');

	const headers = ordered.map(columnHeader).join('');
	const rankLabel = data.columns[rankColumn] ?? rankColumn;

	root.innerHTML = `
		<p class="eval-caveat">${escapeHtml(data.caveat)}</p>
		${you ? '' : `<p class="eval-help">Use <strong>Take a subset</strong> in a column header, then return here to insert a <strong>You</strong> row.</p>`}
		<div class="eval-table-wrap">
			<table class="eval-table eval-lb-table">
				<thead>
					<tr>
						<th scope="col">Rank</th>
						<th scope="col">Model</th>
						<th scope="col">Params</th>
						${headers}
					</tr>
				</thead>
				<tbody>${body}</tbody>
			</table>
		</div>
		<p class="eval-help">
			<strong class="eval-best-num">Bold</strong> marks the best numeric value in each score column.
			Missing cells show “not reported”. Rank uses ${escapeHtml(rankLabel)} when a citeable number exists
			(then GPQA Diamond as tie-break). HellaSwag is kept as a saturated / often-unreported probe column.
			This table is meant to be updated as new citeable cards appear — last refresh ${escapeHtml(data.updated)}.
		</p>
	`;
}
