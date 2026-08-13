/**
 * Browser persistence for human mini-eval scores (MMMU-Pro + GPQA Diamond).
 */

export type TakeableScoreKey = 'mmmu_pro' | 'gpqa_diamond';

export type YouRun = {
	pct: number;
	answered: number;
	drawn: number;
	seed: string;
	early: boolean;
	savedAt: string;
};

export type YouScoresStore = Partial<Record<TakeableScoreKey, YouRun>>;

const STORAGE_KEY = 'evals:you-scores:v1';

const TAKEABLE_KEYS: TakeableScoreKey[] = ['mmmu_pro', 'gpqa_diamond'];

export function isTakeableScoreKey(key: string): key is TakeableScoreKey {
	return TAKEABLE_KEYS.includes(key as TakeableScoreKey);
}

function isYouRun(value: unknown): value is YouRun {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const v = value as Record<string, unknown>;
	return (
		typeof v.pct === 'number'
		&& Number.isFinite(v.pct)
		&& typeof v.answered === 'number'
		&& Number.isFinite(v.answered)
		&& v.answered > 0
		&& typeof v.drawn === 'number'
		&& Number.isFinite(v.drawn)
		&& typeof v.seed === 'string'
		&& typeof v.early === 'boolean'
		&& typeof v.savedAt === 'string'
	);
}

export function readYouScores(): YouScoresStore {
	if (typeof localStorage === 'undefined') {
		return {};
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return {};
		}
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') {
			return {};
		}
		const out: YouScoresStore = {};
		for (const key of TAKEABLE_KEYS) {
			const run = (parsed as Record<string, unknown>)[key];
			if (isYouRun(run)) {
				out[key] = run;
			}
		}
		return out;
	} catch {
		return {};
	}
}

export function writeYouScore(bench: string, run: Omit<YouRun, 'savedAt'> & { savedAt?: string }): void {
	if (!isTakeableScoreKey(bench) || typeof localStorage === 'undefined') {
		return;
	}
	const next: YouRun = {
		pct: run.pct,
		answered: run.answered,
		drawn: run.drawn,
		seed: run.seed,
		early: run.early,
		savedAt: run.savedAt ?? new Date().toISOString(),
	};
	const store = readYouScores();
	store[bench] = next;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch {
		// Quota / private mode — board still works via URL for this session.
	}
}

/** Merge shareable `?you=` params into localStorage; returns updated store. */
export function mergeYouFromUrl(search: string = typeof window !== 'undefined' ? window.location.search : ''): YouScoresStore {
	const params = new URLSearchParams(search);
	const youRaw = params.get('you');
	const answeredRaw = params.get('answered');
	if (youRaw === null || answeredRaw === null) {
		return readYouScores();
	}
	const pct = Number(youRaw);
	const answered = Number(answeredRaw);
	const drawn = Number(params.get('drawn') ?? answered);
	const seed = (params.get('seed') ?? '').toLowerCase();
	const early = params.get('early') === '1';
	const benchRaw = params.get('bench') ?? 'mmmu_pro';
	if (!isTakeableScoreKey(benchRaw) || !Number.isFinite(pct) || !Number.isFinite(answered) || answered <= 0) {
		return readYouScores();
	}
	writeYouScore(benchRaw, {
		pct,
		answered,
		drawn: Number.isFinite(drawn) ? drawn : answered,
		seed,
		early,
	});
	return readYouScores();
}

export function mostRecentBench(store: YouScoresStore): TakeableScoreKey | null {
	let best: TakeableScoreKey | null = null;
	let bestAt = 0;
	for (const key of TAKEABLE_KEYS) {
		const run = store[key];
		if (!run) {
			continue;
		}
		const t = Date.parse(run.savedAt);
		if (!Number.isFinite(t)) {
			continue;
		}
		if (t >= bestAt) {
			bestAt = t;
			best = key;
		}
	}
	return best;
}
