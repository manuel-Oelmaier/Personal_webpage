import { useEffect, useMemo, useState, type ReactElement } from 'react';
import {
	SCORE_KEYS,
	YOU_BENCH_LABEL,
	bestAverage,
	bestValue,
	buildYouRow,
	computeAverage,
	displayName,
	findClosest,
	orderedBenchmarks,
	primaryYouBench,
	resolveAverageKeys,
	sortRows,
	type AverageSummary,
	type BenchmarkMeta,
	type LeaderboardData,
	type LeaderboardRow,
	type ScoreKey,
	type SortDir,
	type SortKey,
} from '../../lib/evals/leaderboard';
import {
	isTakeableScoreKey,
	mergeYouFromUrl,
	type TakeableScoreKey,
	type YouRun,
	type YouScoresStore,
} from '../../lib/evals/youScores';

type Props = {
	data: LeaderboardData;
};

function readUrlBench(): TakeableScoreKey | null {
	if (typeof window === 'undefined') {
		return null;
	}
	const bench = new URLSearchParams(window.location.search).get('bench') ?? 'mmmu_pro';
	return isTakeableScoreKey(bench) ? bench : null;
}

function ariaSort(active: boolean, dir: SortDir): 'ascending' | 'descending' | 'none' {
	if (!active) {
		return 'none';
	}
	return dir === 'asc' ? 'ascending' : 'descending';
}

function sortIndicator(active: boolean, dir: SortDir): string {
	if (!active) {
		return '';
	}
	return dir === 'asc' ? ' ↑' : ' ↓';
}

function ModelCell({ row, closestId }: { row: LeaderboardRow; closestId: string | null }): ReactElement {
	const label = displayName(row);
	const href = row.hfUrl ?? row.cardUrl;
	const runs: [TakeableScoreKey, YouRun][] = [];
	if (row.youRuns) {
		for (const key of ['mmmu_pro', 'gpqa_diamond'] as const) {
			const run = row.youRuns[key];
			if (run) {
				runs.push([key, run]);
			}
		}
	}

	return (
		<td className="eval-model">
			{href ? (
				<a href={href} rel="noopener noreferrer">{label}</a>
			) : (
				label
			)}
			{closestId === row.id && <p className="eval-closest-tag">Closest to your mini-eval</p>}
			{runs.map(([bench, run]) => (
				<p key={bench} className="eval-you-badge">
					{YOU_BENCH_LABEL[bench]}: answered {run.answered}/{run.drawn}
					{run.seed ? (
						<>
							{' '}
							· seed <code>{run.seed}</code>
						</>
					) : null}
					{run.early ? ' · handed in early' : ''}
				</p>
			))}
			{row.published && (
				<time className="eval-published" dateTime={row.published}>
					Published {row.published}
				</time>
			)}
		</td>
	);
}

function ScoreCellView({
	display,
	value,
	isBest,
}: {
	display: string;
	value: number | null;
	isBest: boolean;
}): ReactElement {
	if (value === null) {
		return (
			<td className="eval-score-cell is-missing">
				<span className="eval-missing">—</span>
			</td>
		);
	}
	return (
		<td className={`eval-score-cell${isBest ? ' eval-best' : ''}`}>
			{isBest ? (
				<strong className="eval-best-num">{display}</strong>
			) : (
				<span className="eval-score-num">{display}</span>
			)}
		</td>
	);
}

function BenchHeader({
	bench,
	sortKey,
	sortDir,
	onSort,
}: {
	bench: BenchmarkMeta;
	sortKey: SortKey;
	sortDir: SortDir;
	onSort: (key: SortKey) => void;
}): ReactElement {
	const active = sortKey === bench.column;
	const label = (
		<span className="eval-th-label">
			{bench.label}
		</span>
	);
	return (
		<th scope="col" className="eval-th-bench" aria-sort={ariaSort(active, sortDir)}>
			<span className="eval-th-head">
				{bench.aboutHref ? (
					<a className="eval-th-label" href={bench.aboutHref}>{bench.label}</a>
				) : (
					label
				)}
				<button
					type="button"
					className="eval-sort-btn eval-sort-icon"
					onClick={() => {
						onSort(bench.column);
					}}
					aria-label={`Sort by ${bench.label}`}
				>
					{sortIndicator(active, sortDir) || ' ↕'}
				</button>
			</span>
		</th>
	);
}

export default function LeaderboardTable({ data }: Props): ReactElement {
	const [youStore, setYouStore] = useState<YouScoresStore>({});
	const [urlBench, setUrlBench] = useState<TakeableScoreKey | null>(null);
	const [hydrated, setHydrated] = useState(false);
	const [sortKey, setSortKey] = useState<SortKey>('average');
	const [sortDir, setSortDir] = useState<SortDir>('desc');

	useEffect(() => {
		setYouStore(mergeYouFromUrl());
		setUrlBench(readUrlBench());
		setHydrated(true);
	}, []);

	const averageKeys = useMemo(() => resolveAverageKeys(data), [data]);
	const benchmarks = useMemo(() => orderedBenchmarks(data), [data]);

	const modelRows = useMemo(
		() => data.rows.map((r) => ({ ...r, scores: { ...r.scores } })),
		[data.rows],
	);

	const youRow = useMemo(
		() => (hydrated ? buildYouRow(youStore, data.columns) : null),
		[hydrated, youStore, data.columns],
	);

	const rows = useMemo(() => {
		const list = [...modelRows];
		if (youRow) {
			list.push(youRow);
		}
		return list;
	}, [modelRows, youRow]);

	const averages = useMemo(() => {
		const map = new Map<string, AverageSummary>();
		for (const row of rows) {
			map.set(row.id, computeAverage(row, averageKeys));
		}
		return map;
	}, [rows, averageKeys]);

	const sorted = useMemo(
		() => sortRows(rows, averages, sortKey, sortDir),
		[rows, averages, sortKey, sortDir],
	);

	const bests = useMemo(
		() => Object.fromEntries(SCORE_KEYS.map((key) => [key, bestValue(sorted, key)])) as Record<
			ScoreKey,
			number | null
		>,
		[sorted],
	);

	const bestAvg = useMemo(
		() => bestAverage(sorted, averages, averageKeys),
		[sorted, averages, averageKeys],
	);

	const primaryBench = hydrated ? primaryYouBench(youStore, urlBench) : null;
	const primaryRun = primaryBench ? youStore[primaryBench] : undefined;
	const closest = useMemo(() => {
		if (!primaryBench || !primaryRun) {
			return null;
		}
		return findClosest(modelRows, primaryRun.pct, primaryBench);
	}, [primaryBench, primaryRun, modelRows]);

	function onSort(key: SortKey): void {
		if (sortKey === key) {
			setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
			return;
		}
		setSortKey(key);
		setSortDir(key === 'name' ? 'asc' : 'desc');
	}

	return (
		<div className="eval-table-wrap">
			<table className="eval-table eval-lb-table">
				<thead>
					<tr>
						<th scope="col" aria-sort={ariaSort(sortKey === 'name', sortDir)}>
							<span className="eval-th-head">
								<span className="eval-th-label">Model</span>
								<button
									type="button"
									className="eval-sort-btn eval-sort-icon"
									onClick={() => {
										onSort('name');
									}}
									aria-label="Sort by model name"
								>
									{sortIndicator(sortKey === 'name', sortDir) || ' ↕'}
								</button>
							</span>
						</th>
						{benchmarks.map((bench) => (
							<BenchHeader
								key={bench.id}
								bench={bench}
								sortKey={sortKey}
								sortDir={sortDir}
								onSort={onSort}
							/>
						))}
						<th
							scope="col"
							className="eval-th-bench"
							aria-sort={ariaSort(sortKey === 'average', sortDir)}
						>
							<span className="eval-th-head">
								<span className="eval-th-label">Average</span>
								<button
									type="button"
									className="eval-sort-btn eval-sort-icon"
									onClick={() => {
										onSort('average');
									}}
									aria-label="Sort by average"
								>
									{sortIndicator(sortKey === 'average', sortDir) || ' ↕'}
								</button>
							</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{sorted.map((row) => {
						const avg = averages.get(row.id) ?? {
							value: null,
							coverage: 0,
							total: averageKeys.length,
							display: '—',
						};
						const youClass = row.isYou ? ' is-you' : '';
						const closestClass = closest && row.id === closest.row.id ? ' is-closest' : '';
						const avgBest = !row.isYou
							&& avg.value !== null
							&& bestAvg !== null
							&& avg.coverage === averageKeys.length
							&& avg.value === bestAvg;
						return (
							<tr key={row.id} className={`eval-lb-row${youClass}${closestClass}`}>
								<ModelCell row={row} closestId={closest?.row.id ?? null} />
								{SCORE_KEYS.map((key) => {
									const cell = row.scores[key];
									const best = bests[key];
									const isBest = !row.isYou
										&& cell.value !== null
										&& best !== null
										&& cell.value === best;
									return (
										<ScoreCellView
											key={key}
											display={cell.display}
											value={cell.value}
											isBest={isBest}
										/>
									);
								})}
								<td
									className={`eval-score-cell eval-avg-cell${avgBest ? ' eval-best' : ''}${
										avg.value === null ? ' is-missing' : ''
									}`}
								>
									{avg.value === null ? (
										<span className="eval-missing">—</span>
									) : avgBest ? (
										<strong className="eval-best-num">{avg.display}</strong>
									) : (
										<span className="eval-score-num">{avg.display}</span>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
