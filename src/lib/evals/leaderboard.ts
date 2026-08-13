/**
 * LLM context leaderboard — AA scores, averages, You-row helpers (pure).
 */

import type { TakeableScoreKey, YouRun, YouScoresStore } from './youScores';
import { mostRecentBench } from './youScores';

export type ScoreCell = {
	value: number | null;
	display: string;
	missingReason?: string;
};

export type ScoreKey = 'gpqa_diamond' | 'mmmu_pro' | 'scicode';

export type BenchmarkMeta = {
	id: string;
	column: ScoreKey;
	label: string;
	datasetSize?: number;
	takeHref: string | null;
	aboutHref: string | null;
	takeLabel: string;
};

export type LeaderboardRow = {
	id: string;
	name: string;
	tier: string;
	published?: string;
	paramsLabel: string;
	hfUrl?: string;
	cardUrl?: string;
	scores: Record<ScoreKey, ScoreCell>;
	isYou?: boolean;
	youRuns?: Partial<Record<TakeableScoreKey, YouRun>>;
};

type Attribution = {
	label: string;
	url: string;
	methodologyUrl: string;
	detail: string;
};

export type LeaderboardData = {
	schemaVersion: number;
	title: string;
	updated: string;
	caveat: string;
	attribution?: Attribution;
	columns: Record<ScoreKey, string>;
	averageKeys: ScoreKey[];
	benchmarks?: BenchmarkMeta[];
	rows: LeaderboardRow[];
};

export type AverageSummary = {
	value: number | null;
	coverage: number;
	total: number;
	display: string;
};

export type ClosestMatch = {
	row: LeaderboardRow;
	modelScore: number;
	delta: number;
	bench: ScoreKey;
};

export type SortKey = 'name' | ScoreKey | 'average';
export type SortDir = 'asc' | 'desc';

export const SCORE_KEYS: ScoreKey[] = ['gpqa_diamond', 'mmmu_pro', 'scicode'];

export const DEFAULT_AVERAGE_KEYS: ScoreKey[] = ['gpqa_diamond', 'mmmu_pro', 'scicode'];

export const YOU_BENCH_LABEL: Record<ScoreKey, string> = {
	gpqa_diamond: 'GPQA Diamond',
	mmmu_pro: 'MMMU-Pro',
	scicode: 'SciCode',
};

export const YOU_BENCH_HUB: Record<ScoreKey, string> = {
	gpqa_diamond: '/evals/gpqa-diamond/',
	mmmu_pro: '/evals/mmmu-pro/',
	scicode: '/evals/scicode/',
};

export const TIER_LABEL: Record<string, string> = {
	proprietary: 'Proprietary frontier',
	'open-large': 'Open large / MoE',
	'open-mid': 'Open mid (~27–31B)',
	'open-small': 'Open small (~9–12B)',
	you: 'You',
};

export const DEFAULT_BENCHMARKS: BenchmarkMeta[] = [
	{
		id: 'gpqa-diamond',
		column: 'gpqa_diamond',
		label: 'GPQA Diamond',
		datasetSize: 198,
		takeHref: '/evals/gpqa-diamond/take/',
		aboutHref: '/evals/gpqa-diamond/',
		takeLabel: 'Take a subset',
	},
	{
		id: 'mmmu-pro',
		column: 'mmmu_pro',
		label: 'MMMU-Pro',
		datasetSize: 1730,
		takeHref: '/evals/mmmu-pro/take/',
		aboutHref: '/evals/mmmu-pro/',
		takeLabel: 'Take a subset',
	},
	{
		id: 'scicode',
		column: 'scicode',
		label: 'SciCode',
		datasetSize: 338,
		takeHref: '/evals/scicode/browse/',
		aboutHref: '/evals/scicode/',
		takeLabel: 'Browse problems',
	},
];

export const DEFAULT_ATTRIBUTION: Attribution = {
	label: 'Artificial Analysis',
	url: 'https://artificialanalysis.ai/',
	methodologyUrl: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking',
	detail:
		'GPQA Diamond, MMMU-Pro, and SciCode scores are copied from Artificial Analysis model pages (Intelligence Index).',
};

export function emptyCell(reason: string): ScoreCell {
	return { value: null, display: '—', missingReason: reason };
}

export function isScoreKey(key: string): key is ScoreKey {
	return SCORE_KEYS.includes(key as ScoreKey);
}

export function computeAverage(row: LeaderboardRow, averageKeys: ScoreKey[]): AverageSummary {
	const total = averageKeys.length;
	const values: number[] = [];
	for (const key of averageKeys) {
		const v = row.scores[key].value;
		if (v !== null) {
			values.push(v);
		}
	}
	const coverage = values.length;
	if (coverage === 0) {
		return { value: null, coverage: 0, total, display: '—' };
	}
	const mean = values.reduce((a, b) => a + b, 0) / coverage;
	const rounded = Math.round(mean * 10) / 10;
	return {
		value: rounded,
		coverage,
		total,
		display: `${rounded}%`,
	};
}

export function bestValue(rows: LeaderboardRow[], key: ScoreKey): number | null {
	let best: number | null = null;
	for (const row of rows) {
		if (row.isYou) {
			continue;
		}
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

export function findClosest(models: LeaderboardRow[], pct: number, bench: ScoreKey): ClosestMatch | null {
	let best: ClosestMatch | null = null;
	for (const row of models) {
		if (row.isYou) {
			continue;
		}
		const modelScore = row.scores[bench].value;
		if (modelScore === null) {
			continue;
		}
		const delta = Math.abs(modelScore - pct);
		if (best === null || delta < best.delta) {
			best = { row, modelScore, delta, bench };
		}
	}
	return best;
}

export function displayName(row: LeaderboardRow): string {
	if (row.isYou || !row.paramsLabel) {
		return row.name;
	}
	if (/closed|frontier/i.test(row.paramsLabel) && !/\d/.test(row.paramsLabel)) {
		return row.name;
	}
	const name = row.name;
	const params = row.paramsLabel;
	const nameLower = name.toLowerCase();
	const sizeMatch = params.match(/(\d+(?:\.\d+)?)\s*B\b/i);
	if (sizeMatch?.[1] && nameLower.includes(`${sizeMatch[1].toLowerCase()}b`)) {
		return name;
	}
	if (nameLower.includes(params.toLowerCase())) {
		return name;
	}
	return `${name} (${params})`;
}

export function buildYouRow(store: YouScoresStore, columns: Record<ScoreKey, string>): LeaderboardRow | null {
	const keys = (Object.keys(store) as TakeableScoreKey[]).filter((k) => store[k]);
	if (keys.length === 0) {
		return null;
	}
	const scores = Object.fromEntries(
		SCORE_KEYS.map((key) => [key, emptyCell('not applicable')]),
	) as Record<ScoreKey, ScoreCell>;
	const youRuns: Partial<Record<TakeableScoreKey, YouRun>> = {};
	for (const key of keys) {
		const run = store[key];
		if (!run) {
			continue;
		}
		youRuns[key] = run;
		scores[key] = { value: run.pct, display: `${run.pct}%` };
	}
	const labels = keys.map((k) => columns[k]);
	const name = keys.length === 1
		? `You (${labels[0]} mini-eval)`
		: 'You (mini-evals)';
	return {
		id: 'you-mini-eval',
		name,
		tier: 'you',
		paramsLabel: 'human run',
		isYou: true,
		youRuns,
		scores,
	};
}

export function resolveAverageKeys(data: LeaderboardData): ScoreKey[] {
	const keys = data.averageKeys.length > 0 ? data.averageKeys : DEFAULT_AVERAGE_KEYS;
	return keys.filter((k): k is ScoreKey => isScoreKey(k));
}

export function orderedBenchmarks(data: LeaderboardData): BenchmarkMeta[] {
	const benchmarks = data.benchmarks ?? DEFAULT_BENCHMARKS;
	return SCORE_KEYS.map((key) => benchmarks.find((b) => b.column === key)).filter(
		(b): b is BenchmarkMeta => Boolean(b),
	);
}

export function bestAverage(
	rows: LeaderboardRow[],
	averages: Map<string, AverageSummary>,
	averageKeys: ScoreKey[],
): number | null {
	let bestAvg: number | null = null;
	for (const row of rows) {
		if (row.isYou) {
			continue;
		}
		const avg = averages.get(row.id);
		if (avg?.value === null || avg === undefined) {
			continue;
		}
		if (avg.coverage < averageKeys.length) {
			continue;
		}
		if (bestAvg === null || avg.value > bestAvg) {
			bestAvg = avg.value;
		}
	}
	return bestAvg;
}

function compareNullable(
	a: number | null,
	b: number | null,
	dir: SortDir,
): number {
	if (a !== null && b !== null && a !== b) {
		return dir === 'desc' ? b - a : a - b;
	}
	if (a !== null && b === null) {
		return -1;
	}
	if (a === null && b !== null) {
		return 1;
	}
	return 0;
}

/** Sort rows; You row always pinned to top. */
export function sortRows(
	rows: LeaderboardRow[],
	averages: Map<string, AverageSummary>,
	sortKey: SortKey,
	sortDir: SortDir,
): LeaderboardRow[] {
	return [...rows].sort((a, b) => {
		if (a.isYou && !b.isYou) {
			return -1;
		}
		if (!a.isYou && b.isYou) {
			return 1;
		}

		if (sortKey === 'name') {
			const cmp = a.name.localeCompare(b.name);
			return sortDir === 'asc' ? cmp : -cmp;
		}

		if (sortKey === 'average') {
			const aa = averages.get(a.id) ?? { value: null, coverage: 0, total: 0, display: '—' };
			const bb = averages.get(b.id) ?? { value: null, coverage: 0, total: 0, display: '—' };
			if (sortDir === 'desc' && aa.coverage !== bb.coverage) {
				return bb.coverage - aa.coverage;
			}
			if (sortDir === 'asc' && aa.coverage !== bb.coverage) {
				return aa.coverage - bb.coverage;
			}
			const byValue = compareNullable(aa.value, bb.value, sortDir);
			if (byValue !== 0) {
				return byValue;
			}
			return a.name.localeCompare(b.name);
		}

		const av = a.scores[sortKey].value;
		const bv = b.scores[sortKey].value;
		const byValue = compareNullable(av, bv, sortDir);
		if (byValue !== 0) {
			return byValue;
		}
		return a.name.localeCompare(b.name);
	});
}

export function primaryYouBench(
	store: YouScoresStore,
	urlBench: TakeableScoreKey | null,
): TakeableScoreKey | null {
	if (urlBench && store[urlBench]) {
		return urlBench;
	}
	return mostRecentBench(store);
}
