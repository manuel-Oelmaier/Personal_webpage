/**
 * Shared MCQ human mini-eval — seeded draw, scoring, and UI for takeable benchmarks.
 */

import { writeYouScore } from './youScores';

export type McqEvalOptions = {
	benchmarkId: string;
	packUrl: string;
	keyUrl: string;
	hubHref: string;
	/** Leaderboard / You-row key (e.g. mmmu_pro, gpqa_diamond). */
	boardColumn: string;
	/** Where “closest model” links (defaults to the blog board). */
	boardHref?: string;
	/** Start a seeded run as soon as the pack loads (unless ?you= is already set). */
	autoStart?: boolean;
};

type Choice = { id: string; text: string };

type EvalItem = {
	id: string;
	prompt: string;
	choices: Choice[];
	imageUrls?: string[];
	meta?: {
		activity_label?: string;
		category?: string;
		subject?: string;
		subdomain?: string;
		ind?: number;
		source_id?: string;
		difficulty?: string;
	};
};

type EvalPack = {
	schemaVersion: 1;
	benchmarkId: string;
	title: string;
	license: string;
	citation: string;
	source: {
		dataset: string;
		split: string;
		poolSize: number;
		datasetRevision: string;
		method: string;
		buildSeed?: number;
	};
	sessionDefaults: { drawSize: number };
	items: EvalItem[];
};

type AnswerKey = {
	schemaVersion: 1;
	benchmarkId: string;
	answers: Record<string, string>;
};

type Phase = 'setup' | 'running' | 'results';

type AnswerRecord = {
	itemId: string;
	chosen: string | null;
	correct: string;
};

/** Mulberry32 — deterministic PRNG from a 32-bit seed. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hashSeedString(seed: string): number {
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function generateSeed(): string {
	const bytes = new Uint8Array(4);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Fisher–Yates shuffle of indices, then take the first `n`. */
function drawItemIds(items: EvalItem[], seed: string, n: number): string[] {
	const rng = mulberry32(hashSeedString(seed));
	const ids = items.map((item) => item.id);
	for (let i = ids.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const tmp = ids[i];
		const swap = ids[j];
		if (tmp === undefined || swap === undefined) {
			continue;
		}
		ids[i] = swap;
		ids[j] = tmp;
	}
	return ids.slice(0, Math.min(n, ids.length));
}

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function readSeedFromUrl(): string | null {
	const raw = new URLSearchParams(window.location.search).get('seed');
	if (!raw) {
		return null;
	}
	const cleaned = raw.trim().toLowerCase();
	return /^[0-9a-f]{4,16}$/.test(cleaned) ? cleaned : null;
}

function setSeedInUrl(seed: string): void {
	const url = new URL(window.location.href);
	url.searchParams.set('seed', seed);
	history.replaceState(null, '', url.toString());
}

function leaderboardHref(
	opts: McqEvalOptions,
	pct: number,
	answered: number,
	drawn: number,
	seed: string,
	early: boolean,
): string {
	const params = new URLSearchParams({
		you: String(pct),
		answered: String(answered),
		drawn: String(drawn),
		seed,
		early: early ? '1' : '0',
		bench: opts.boardColumn,
	});
	const base = (opts.boardHref ?? '/blog/feeling-llm-benchmarks/').replace(/\?.*$/, '');
	return `${base}?${params.toString()}#evals-board`;
}

export function mountMcqEval(root: HTMLElement, opts: McqEvalOptions): void {
	let pack: EvalPack | null = null;
	let key: AnswerKey | null = null;
	let phase: Phase = 'setup';
	let seed = readSeedFromUrl() ?? generateSeed();
	let drawnIds: string[] = [];
	let index = 0;
	const answers = new Map<string, string | null>();
	let loadError: string | null = null;
	let loading = false;
	let handedInEarly = false;

	const byId = (): Map<string, EvalItem> => {
		if (!pack) {
			return new Map<string, EvalItem>();
		}
		return new Map(pack.items.map((item) => [item.id, item]));
	};

	async function ensureData(): Promise<void> {
		if (pack && key) {
			return;
		}
		loading = true;
		render();
		try {
			const [packRes, keyRes] = await Promise.all([fetch(opts.packUrl), fetch(opts.keyUrl)]);
			if (!packRes.ok) {
				throw new Error(`Failed to load pack (${packRes.status})`);
			}
			if (!keyRes.ok) {
				throw new Error(`Failed to load answer key (${keyRes.status})`);
			}
			pack = (await packRes.json()) as EvalPack;
			key = (await keyRes.json()) as AnswerKey;
			loadError = null;
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Failed to load eval data';
		} finally {
			loading = false;
			render();
		}
	}

	function startRun(): void {
		if (!pack || !key) {
			return;
		}
		const input = root.querySelector<HTMLInputElement>('#eval-seed-input');
		const typed = input?.value.trim().toLowerCase() ?? '';
		if (typed) {
			if (!/^[0-9a-f]{4,16}$/.test(typed)) {
				loadError = 'Seed must be 4–16 hex characters (0-9, a-f).';
				render();
				return;
			}
			seed = typed;
		} else if (!seed) {
			seed = generateSeed();
		}
		loadError = null;
		drawnIds = drawItemIds(pack.items, seed, pack.sessionDefaults.drawSize);
		answers.clear();
		for (const id of drawnIds) {
			answers.set(id, null);
		}
		index = 0;
		handedInEarly = false;
		phase = 'running';
		setSeedInUrl(seed);
		render();
		root.querySelector<HTMLElement>('.eval-prompt')?.focus();
	}

	function selectChoice(choiceId: string): void {
		const itemId = drawnIds[index];
		if (!itemId) {
			return;
		}
		if (answers.get(itemId) !== null && answers.get(itemId) !== undefined) {
			return;
		}
		answers.set(itemId, choiceId);
		render();
	}

	function finishRun(early: boolean): void {
		const answered = [...answers.values()].filter((v) => v !== null).length;
		if (answered === 0) {
			loadError = 'Answer at least one question before finishing.';
			render();
			return;
		}
		loadError = null;
		handedInEarly = early;
		phase = 'results';
		const { pct, drawn } = scoreSummary(buildRecords());
		writeYouScore(opts.boardColumn, {
			pct,
			answered,
			drawn,
			seed,
			early,
		});
		render();
		root.querySelector<HTMLElement>('#eval-results')?.focus();
	}

	function goNext(): void {
		if (index < drawnIds.length - 1) {
			index += 1;
			render();
			root.querySelector<HTMLElement>('.eval-prompt')?.focus();
			return;
		}
		finishRun(false);
	}

	function goPrev(): void {
		if (index <= 0) {
			return;
		}
		index -= 1;
		render();
		root.querySelector<HTMLElement>('.eval-prompt')?.focus();
	}

	function buildRecords(): AnswerRecord[] {
		const answerKey = key;
		if (!answerKey) {
			return [];
		}
		return drawnIds.map((itemId) => ({
			itemId,
			chosen: answers.get(itemId) ?? null,
			correct: answerKey.answers[itemId] ?? '?',
		}));
	}

	/** Accuracy over answered items only; unanswered excluded from the denominator. */
	function scoreSummary(records: AnswerRecord[]): {
		correct: number;
		answered: number;
		drawn: number;
		unanswered: number;
		pct: number;
	} {
		const drawn = records.length;
		const answeredRecords = records.filter((r) => r.chosen !== null);
		const answered = answeredRecords.length;
		const correct = answeredRecords.filter((r) => r.chosen === r.correct).length;
		const unanswered = drawn - answered;
		const pct = answered === 0 ? 0 : Math.round((correct / answered) * 1000) / 10;
		return { correct, answered, drawn, unanswered, pct };
	}

	function progressSummary(): {
		correct: number;
		answered: number;
		drawn: number;
		pct: number;
	} {
		return scoreSummary(buildRecords());
	}

	function compareHref(early: boolean): string | null {
		const { answered, drawn, pct } = progressSummary();
		if (answered === 0) {
			return null;
		}
		return leaderboardHref(opts, pct, answered, drawn, seed, early);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (phase !== 'running') {
			return;
		}
		const target = event.target;
		if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
			return;
		}

		const itemId = drawnIds[index];
		const item = itemId ? byId().get(itemId) : undefined;
		const ids = item?.choices.map((c) => c.id) ?? [];
		const digit = Number(event.key);
		if (Number.isInteger(digit) && digit >= 1 && digit <= ids.length) {
			const byDigit = ids[digit - 1];
			if (byDigit) {
				event.preventDefault();
				selectChoice(byDigit);
				return;
			}
		}
		const upper = event.key.length === 1 ? event.key.toUpperCase() : '';
		if (upper && ids.includes(upper)) {
			event.preventDefault();
			selectChoice(upper);
			return;
		}
		if (event.key === 'Enter') {
			if (itemId && answers.get(itemId)) {
				event.preventDefault();
				goNext();
			}
		}
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			goPrev();
		}
		if (event.key === 'ArrowRight') {
			if (itemId && answers.get(itemId)) {
				event.preventDefault();
				goNext();
			}
		}
	}

	function bind(): void {
		root.querySelector('#eval-start')?.addEventListener('click', () => {
			void ensureData().then(() => {
				if (pack && key && !loadError) {
					startRun();
				}
			});
		});
		root.querySelector('#eval-new-seed')?.addEventListener('click', () => {
			seed = generateSeed();
			const input = root.querySelector<HTMLInputElement>('#eval-seed-input');
			if (input) {
				input.value = seed;
			}
			setSeedInUrl(seed);
		});
		root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((btn) => {
			btn.addEventListener('click', () => {
				const id = btn.dataset.choice;
				if (id) {
					selectChoice(id);
				}
			});
		});
		root.querySelector('#eval-next')?.addEventListener('click', goNext);
		root.querySelector('#eval-prev')?.addEventListener('click', goPrev);
		root.querySelector('#eval-restart')?.addEventListener('click', () => {
			seed = generateSeed();
			drawnIds = [];
			answers.clear();
			index = 0;
			handedInEarly = false;
			loadError = null;
			setSeedInUrl(seed);
			if (opts.autoStart && pack && key) {
				startRun();
				return;
			}
			phase = 'setup';
			render();
		});
		root.querySelector('#eval-replay')?.addEventListener('click', () => {
			handedInEarly = false;
			loadError = null;
			if (opts.autoStart && pack && key) {
				startRun();
				return;
			}
			phase = 'setup';
			render();
		});
	}

	function renderSetup(): string {
		const poolNote = pack
			? `${pack.source.poolSize}-item pool`
			: 'pool loads when you start';
		if (loading && opts.autoStart) {
			return `
				<section class="eval-panel" aria-labelledby="eval-setup-heading">
					<h2 id="eval-setup-heading">Loading mini-eval…</h2>
					<p class="eval-lede">Drawing ${pack?.sessionDefaults.drawSize ?? 20} items from the pool.</p>
				</section>
			`;
		}
		return `
			<section class="eval-panel" aria-labelledby="eval-setup-heading">
				<h2 id="eval-setup-heading">Start a run</h2>
				<p class="eval-lede">
					Draw ${pack?.sessionDefaults.drawSize ?? 20} items from the pool (${poolNote}).
					Each answer reveals correct/wrong immediately. Score uses answered items only.
				</p>
				<label class="eval-seed-label" for="eval-seed-input">Run seed</label>
				<div class="eval-seed-row">
					<input id="eval-seed-input" class="eval-seed-input" type="text" spellcheck="false"
						autocomplete="off" maxlength="16" value="${escapeHtml(seed)}"
						aria-describedby="eval-seed-help" />
					<button type="button" class="button-link button-outline" id="eval-new-seed">New seed</button>
				</div>
				<p id="eval-seed-help" class="eval-help">Hex string (4–16 chars). Leave as-is or paste a seed from a previous run.</p>
				${loadError ? `<p class="eval-error" role="alert">${escapeHtml(loadError)}</p>` : ''}
				<button type="button" class="button-link" id="eval-start" ${loading ? 'disabled' : ''}>
					${loading ? 'Loading pool…' : 'Start eval'}
				</button>
			</section>
		`;
	}

	function renderRunning(): string {
		const map = byId();
		const itemId = drawnIds[index];
		if (!itemId) {
			return `<p class="eval-error">No item at index ${index}</p>`;
		}
		const item = map.get(itemId);
		if (!item) {
			return `<p class="eval-error">Missing item ${escapeHtml(itemId)}</p>`;
		}
		const chosen = answers.get(itemId) ?? null;
		const correct = key?.answers[itemId] ?? null;
		const revealed = chosen !== null && correct !== null;
		const isCorrect = revealed && chosen === correct;
		const metaLabel = item.meta?.activity_label
			?? item.meta?.category
			?? item.meta?.subject
			?? item.meta?.subdomain;
		const meta = metaLabel ? `<p class="eval-meta">${escapeHtml(metaLabel)}</p>` : '';
		const images = (item.imageUrls ?? [])
			.map(
				(src) =>
					`<figure class="eval-figure"><img class="eval-item-image" src="${escapeHtml(src)}" alt="Benchmark figure for this question" loading="eager" decoding="async" /></figure>`,
			)
			.join('');
		const choices = item.choices
			.map((choice) => {
				let stateClass = '';
				if (revealed) {
					if (choice.id === correct) {
						stateClass = ' is-correct';
					} else if (choice.id === chosen) {
						stateClass = ' is-wrong';
					} else {
						stateClass = ' is-dimmed';
					}
				} else if (chosen === choice.id) {
					stateClass = ' is-selected';
				}
				return `
					<button type="button" class="eval-choice${stateClass}"
						data-choice="${escapeHtml(choice.id)}"
						aria-pressed="${chosen === choice.id ? 'true' : 'false'}"
						${revealed ? 'disabled' : ''}>
						<span class="eval-choice-id">${escapeHtml(choice.id)}</span>
						<span class="eval-choice-text">${escapeHtml(choice.text)}</span>
					</button>
				`;
			})
			.join('');
		const feedback = revealed
			? `<p class="eval-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}" role="status">
					${isCorrect ? 'Correct.' : `Wrong — answer is <strong>${escapeHtml(correct)}</strong>.`}
				</p>`
			: '';
		const isLast = index === drawnIds.length - 1;
		const lastLetter = item.choices[item.choices.length - 1]?.id ?? 'D';
		const soFar = progressSummary();
		const compare = compareHref(true);
		const compareBtn = compare
			? `<a class="button-link button-outline" href="${escapeHtml(compare)}">See how you compare so far (${soFar.pct}% · ${soFar.answered} answered)</a>`
			: '';
		return `
			<section class="eval-panel eval-run" aria-labelledby="eval-run-heading">
				<div class="eval-run-bar">
					<p id="eval-run-heading" class="eval-progress">Question ${index + 1} / ${drawnIds.length}</p>
					<p class="eval-seed-chip">Seed <code>${escapeHtml(seed)}</code>
						${soFar.answered > 0 ? ` · so far ${soFar.correct}/${soFar.answered} (${soFar.pct}%)` : ''}
					</p>
				</div>
				${meta}
				<p class="eval-prompt" tabindex="-1">${escapeHtml(item.prompt)}</p>
				${images}
				<div class="eval-choices" role="group" aria-label="Answer choices">${choices}</div>
				${feedback}
				${loadError ? `<p class="eval-error" role="alert">${escapeHtml(loadError)}</p>` : ''}
				<div class="eval-nav-row">
					<button type="button" class="button-link button-outline" id="eval-prev" ${index === 0 ? 'disabled' : ''}>Previous</button>
					<button type="button" class="button-link" id="eval-next" ${chosen ? '' : 'disabled'}>
						${isLast ? 'Finish' : 'Next'}
					</button>
					${compareBtn}
				</div>
				<p class="eval-help">Keys: A–${escapeHtml(lastLetter)} or 1–${item.choices.length} to answer, Enter / → for next.</p>
			</section>
		`;
	}

	function renderResults(): string {
		const map = byId();
		const records = buildRecords();
		const { correct, answered, drawn, unanswered, pct } = scoreSummary(records);
		const boardHref = leaderboardHref(opts, pct, answered, drawn, seed, handedInEarly);
		const benchTitle = pack?.title ?? opts.benchmarkId;
		const review = records
			.map((record, i) => {
				const item = map.get(record.itemId);
				const ok = record.chosen !== null && record.chosen === record.correct;
				const status = record.chosen === null ? 'skipped' : ok ? 'correct' : 'wrong';
				const prompt = item ? escapeHtml(item.prompt) : record.itemId;
				const thumb = item?.imageUrls?.[0]
					? `<img class="eval-review-thumb" src="${escapeHtml(item.imageUrls[0])}" alt="" loading="lazy" />`
					: '';
				return `
					<li class="eval-review-item is-${status}">
						<p class="eval-review-head">
							<span>#${i + 1}</span>
							<span class="eval-review-status">${status}</span>
						</p>
						${thumb}
						<p class="eval-review-prompt">${prompt}</p>
						<p class="eval-review-answers">
							Your answer: <strong>${record.chosen ?? '—'}</strong>
							· Correct: <strong>${escapeHtml(record.correct)}</strong>
						</p>
					</li>
				`;
			})
			.join('');
		return `
			<section class="eval-panel" id="eval-results" tabindex="-1" aria-labelledby="eval-results-heading">
				<h2 id="eval-results-heading">Results</h2>
				<p class="eval-score">${correct} / ${answered} correct (${pct}%)</p>
				<p class="eval-seed-chip">Seed <code>${escapeHtml(seed)}</code> — share the URL to replay this draw.</p>
				${handedInEarly ? '<p class="eval-help">Handed in early.</p>' : ''}
				${unanswered ? `<p class="eval-help">${unanswered} unanswered excluded from the score (denominator = ${answered} answered of ${drawn} drawn).</p>` : ''}
				<p class="eval-caveat">
					This is a ${drawn}-item draw from a ${pack?.source.poolSize ?? '—'}-item pool
					(${escapeHtml(benchTitle)}), scored on answered items only — not a full-benchmark run.
					Use the review below to notice what was hard; then compare against Artificial Analysis
					scores on the board for closest model.
				</p>
				<div class="eval-nav-row">
					<a class="button-link" href="${escapeHtml(boardHref)}">See how you compare</a>
					<button type="button" class="button-link button-outline" id="eval-replay">Same seed again</button>
					<button type="button" class="button-link button-outline" id="eval-restart">New seed</button>
				</div>
				<h3 class="eval-review-title">Item review</h3>
				<ol class="eval-review-list">${review}</ol>
			</section>
		`;
	}

	function render(): void {
		if (phase === 'setup') {
			root.innerHTML = renderSetup();
		} else if (phase === 'running') {
			root.innerHTML = renderRunning();
		} else {
			root.innerHTML = renderResults();
		}
		bind();
	}

	document.addEventListener('keydown', onKeydown);
	const skipAutoStart = new URLSearchParams(window.location.search).has('you');
	void ensureData().then(() => {
		if (loadError) {
			render();
			return;
		}
		if (opts.autoStart && !skipAutoStart && phase === 'setup' && pack && key) {
			startRun();
			return;
		}
		if (phase === 'setup') {
			render();
		}
	});
	render();
}
