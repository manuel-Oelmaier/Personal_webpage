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

type BenchmarkMeta = {
	id: string;
	column: string;
	label: string;
	takeHref: string | null;
	aboutHref: string | null;
	takeLabel: string;
};

type LeaderboardRow = {
	id: string;
	name: string;
	tier: string;
	paramsLabel: string;
	openWeights: boolean;
	hfUrl?: string;
	cardUrl?: string;
	scores: {
		hellaswag: ScoreCell;
		knowledge: ScoreCell;
	};
	isYou?: boolean;
	youMeta?: { answered: number; drawn: number; seed: string; early: boolean };
};

type LeaderboardData = {
	schemaVersion: number;
	title: string;
	updated: string;
	caveat: string;
	columns: { hellaswag: string; knowledge: string };
	benchmarks?: BenchmarkMeta[];
	rows: LeaderboardRow[];
};

const TIER_LABEL: Record<string, string> = {
	human: 'Human',
	proprietary: 'Proprietary frontier',
	'open-large': 'Open large / MoE',
	'open-mid': 'Open mid (~27–32B)',
	'open-small': 'Open small (~12–14B)',
	historical: 'Historical',
	you: 'You',
};

const DEFAULT_BENCHMARKS: BenchmarkMeta[] = [
	{
		id: 'hellaswag',
		column: 'hellaswag',
		label: 'HellaSwag',
		takeHref: '/evals/hellaswag/',
		aboutHref: '/evals/hellaswag/about/',
		takeLabel: 'Take a subset',
	},
	{
		id: 'knowledge',
		column: 'knowledge',
		label: 'Knowledge / reasoning',
		takeHref: null,
		aboutHref: null,
		takeLabel: 'Human subset coming later',
	},
];

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function parseYouFromUrl(): {
	pct: number;
	answered: number;
	drawn: number;
	seed: string;
	early: boolean;
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
	if (!Number.isFinite(pct) || !Number.isFinite(answered) || answered <= 0) {
		return null;
	}
	return { pct, answered, drawn: Number.isFinite(drawn) ? drawn : answered, seed, early };
}

function bestValue(rows: LeaderboardRow[], key: 'hellaswag' | 'knowledge'): number | null {
	let best: number | null = null;
	for (const row of rows) {
		const v = row.scores[key].value;
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

function sortRows(rows: LeaderboardRow[]): LeaderboardRow[] {
	return [...rows].sort((a, b) => {
		const av = a.scores.hellaswag.value;
		const bv = b.scores.hellaswag.value;
		if (av === null && bv === null) {
			return a.name.localeCompare(b.name);
		}
		if (av === null) {
			return 1;
		}
		if (bv === null) {
			return -1;
		}
		return bv - av;
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
	const rows: LeaderboardRow[] = data.rows.map((r) => ({ ...r }));
	const benchmarks = data.benchmarks ?? DEFAULT_BENCHMARKS;
	const hsBench = benchmarks.find((b) => b.column === 'hellaswag') ?? {
		id: 'hellaswag',
		column: 'hellaswag',
		label: data.columns.hellaswag,
		takeHref: '/evals/hellaswag/',
		aboutHref: '/evals/hellaswag/about/',
		takeLabel: 'Take a subset',
	};
	const knowBench = benchmarks.find((b) => b.column === 'knowledge') ?? {
		id: 'knowledge',
		column: 'knowledge',
		label: data.columns.knowledge,
		takeHref: null,
		aboutHref: null,
		takeLabel: 'Human subset coming later',
	};

	if (you) {
		rows.push({
			id: 'you-mini-eval',
			name: 'You (HellaSwag mini-eval)',
			tier: 'you',
			paramsLabel: 'human run',
			openWeights: false,
			isYou: true,
			youMeta: {
				answered: you.answered,
				drawn: you.drawn,
				seed: you.seed,
				early: you.early,
			},
			scores: {
				hellaswag: {
					value: you.pct,
					display: `${you.pct}%`,
					metric: 'HellaSwag mini-eval',
					setting: `answered-only · n=${you.answered}/${you.drawn}`,
					source: {
						label: 'This site’s seeded draw',
						url: '/evals/hellaswag/about/',
					},
				},
				knowledge: {
					value: null,
					display: '—',
					missingReason: 'not applicable',
					metric: '—',
					setting: '—',
					source: {
						label: 'Only HellaSwag mini-eval scored',
						url: '/evals/hellaswag/about/',
					},
				},
			},
		});
	}

	const sorted = sortRows(rows);
	const bestHs = bestValue(sorted, 'hellaswag');
	const bestKnow = bestValue(sorted, 'knowledge');

	let hsRank = 0;
	const body = sorted
		.map((row) => {
			const hasHs = row.scores.hellaswag.value !== null;
			if (hasHs) {
				hsRank += 1;
			}
			const rankLabel = hasHs ? String(hsRank) : '—';
			const youClass = row.isYou ? ' is-you' : '';
			const badge = row.youMeta
				? `<p class="eval-you-badge">answered ${row.youMeta.answered}/${row.youMeta.drawn}`
					+ (row.youMeta.seed ? ` · seed <code>${escapeHtml(row.youMeta.seed)}</code>` : '')
					+ (row.youMeta.early ? ' · handed in early' : '')
					+ `</p>`
				: '';
			return `<tr class="eval-lb-row${youClass}">
				<td class="eval-rank">${rankLabel}</td>
				<td class="eval-model">
					${modelLink(row)}
					${badge}
					<span class="eval-tier">${escapeHtml(TIER_LABEL[row.tier] ?? row.tier)}</span>
				</td>
				<td class="eval-params">${escapeHtml(row.paramsLabel)}</td>
				${renderScoreCell(row.scores.hellaswag, row.scores.hellaswag.value !== null && row.scores.hellaswag.value === bestHs)}
				${renderScoreCell(row.scores.knowledge, row.scores.knowledge.value !== null && row.scores.knowledge.value === bestKnow)}
			</tr>`;
		})
		.join('');

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
						${columnHeader(hsBench)}
						${columnHeader(knowBench)}
					</tr>
				</thead>
				<tbody>${body}</tbody>
			</table>
		</div>
		<p class="eval-help">
			<strong class="eval-best-num">Bold</strong> marks the best numeric value in each score column.
			Missing cells show “not reported”. Rank uses HellaSwag only when a full-eval number exists.
			This table is meant to be updated as new citeable cards appear — last refresh ${escapeHtml(data.updated)}.
		</p>
	`;
}
