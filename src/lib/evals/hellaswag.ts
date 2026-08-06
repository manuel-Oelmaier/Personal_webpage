/**
 * HellaSwag human mini-eval — types, seeded draw, scoring, and UI (single module).
 */

type Choice = { id: string; text: string };

type EvalItem = {
	id: string;
	prompt: string;
	choices: Choice[];
	meta?: { activity_label?: string; subject?: string; ind?: number };
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

const PACK_URL = '/evals/hellaswag/pack.json';
const KEY_URL = '/evals/hellaswag/key.json';

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
	if (!raw) {return null;}
	const cleaned = raw.trim().toLowerCase();
	return /^[0-9a-f]{4,16}$/.test(cleaned) ? cleaned : null;
}

function setSeedInUrl(seed: string): void {
	const url = new URL(window.location.href);
	url.searchParams.set('seed', seed);
	history.replaceState(null, '', url.toString());
}

export function mountHellaSwagEval(root: HTMLElement): void {
	let pack: EvalPack | null = null;
	let key: AnswerKey | null = null;
	let phase: Phase = 'setup';
	let seed = readSeedFromUrl() ?? generateSeed();
	let drawnIds: string[] = [];
	let index = 0;
	const answers = new Map<string, string | null>();
	let loadError: string | null = null;
	let loading = false;

	const byId = (): Map<string, EvalItem> => {
		if (!pack) {return new Map<string, EvalItem>();}
		return new Map(pack.items.map((item) => [item.id, item]));
	};

	async function ensureData(): Promise<void> {
		if (pack && key) {return;}
		loading = true;
		render();
		try {
			const [packRes, keyRes] = await Promise.all([fetch(PACK_URL), fetch(KEY_URL)]);
			if (!packRes.ok) {throw new Error(`Failed to load pack (${packRes.status})`);}
			if (!keyRes.ok) {throw new Error(`Failed to load answer key (${keyRes.status})`);}
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
		if (!pack || !key) {return;}
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
		for (const id of drawnIds) {answers.set(id, null);}
		index = 0;
		phase = 'running';
		setSeedInUrl(seed);
		render();
		root.querySelector<HTMLElement>('.eval-prompt')?.focus();
	}

	function selectChoice(choiceId: string): void {
		const itemId = drawnIds[index];
		if (!itemId) {return;}
		answers.set(itemId, choiceId);
		render();
	}

	function goNext(): void {
		if (index < drawnIds.length - 1) {
			index += 1;
			render();
			root.querySelector<HTMLElement>('.eval-prompt')?.focus();
			return;
		}
		phase = 'results';
		render();
		root.querySelector<HTMLElement>('#eval-results')?.focus();
	}

	function goPrev(): void {
		if (index <= 0) {return;}
		index -= 1;
		render();
		root.querySelector<HTMLElement>('.eval-prompt')?.focus();
	}

	function buildRecords(): AnswerRecord[] {
		const answerKey = key;
		if (!answerKey) {return [];}
		return drawnIds.map((itemId) => ({
			itemId,
			chosen: answers.get(itemId) ?? null,
			correct: answerKey.answers[itemId] ?? '?',
		}));
	}

	function scoreSummary(records: AnswerRecord[]): { correct: number; total: number; pct: number } {
		const total = records.length;
		const correct = records.filter((r) => r.chosen !== null && r.chosen === r.correct).length;
		const pct = total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
		return { correct, total, pct };
	}

	function onKeydown(event: KeyboardEvent): void {
		if (phase !== 'running') {return;}
		const target = event.target;
		if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {return;}

		const map: Record<string, string> = {
			'1': 'A',
			'2': 'B',
			'3': 'C',
			'4': 'D',
			a: 'A',
			b: 'B',
			c: 'C',
			d: 'D',
			A: 'A',
			B: 'B',
			C: 'C',
			D: 'D',
		};
		const choice = map[event.key];
		if (choice) {
			event.preventDefault();
			selectChoice(choice);
			return;
		}
		if (event.key === 'Enter') {
			const itemId = drawnIds[index];
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
			const itemId = drawnIds[index];
			if (itemId && answers.get(itemId)) {
				event.preventDefault();
				goNext();
			}
		}
	}

	function bind(): void {
		root.querySelector('#eval-start')?.addEventListener('click', () => {
			void ensureData().then(() => {
				if (pack && key && !loadError) {startRun();}
			});
		});
		root.querySelector('#eval-new-seed')?.addEventListener('click', () => {
			seed = generateSeed();
			const input = root.querySelector<HTMLInputElement>('#eval-seed-input');
			if (input) {input.value = seed;}
			setSeedInUrl(seed);
		});
		root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((btn) => {
			btn.addEventListener('click', () => {
				const id = btn.dataset.choice;
				if (id) {selectChoice(id);}
			});
		});
		root.querySelector('#eval-next')?.addEventListener('click', goNext);
		root.querySelector('#eval-prev')?.addEventListener('click', goPrev);
		root.querySelector('#eval-restart')?.addEventListener('click', () => {
			phase = 'setup';
			seed = generateSeed();
			drawnIds = [];
			answers.clear();
			index = 0;
			setSeedInUrl(seed);
			render();
		});
		root.querySelector('#eval-replay')?.addEventListener('click', () => {
			phase = 'setup';
			render();
		});
	}

	function renderSetup(): string {
		const poolNote = pack
			? `${pack.source.poolSize} items from <code>${escapeHtml(pack.source.split)}</code>`
			: 'pool loads when you start';
		return `
			<section class="eval-panel" aria-labelledby="eval-setup-heading">
				<h2 id="eval-setup-heading">Start a run</h2>
				<p class="eval-lede">
					Draw ${pack?.sessionDefaults.drawSize ?? 20} items from the pool (${poolNote}).
					The seed is shown so you can share or replay the same subset.
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
		if (!item) {return `<p class="eval-error">Missing item ${escapeHtml(itemId)}</p>`;}
		const chosen = answers.get(itemId) ?? null;
		const activity = item.meta?.activity_label
			? `<p class="eval-meta">${escapeHtml(item.meta.activity_label)}</p>`
			: '';
		const choices = item.choices
			.map((choice) => {
				const selected = chosen === choice.id;
				return `
					<button type="button" class="eval-choice${selected ? ' is-selected' : ''}"
						data-choice="${choice.id}" aria-pressed="${selected ? 'true' : 'false'}">
						<span class="eval-choice-id">${choice.id}</span>
						<span class="eval-choice-text">${escapeHtml(choice.text)}</span>
					</button>
				`;
			})
			.join('');
		const isLast = index === drawnIds.length - 1;
		return `
			<section class="eval-panel eval-run" aria-labelledby="eval-run-heading">
				<div class="eval-run-bar">
					<p id="eval-run-heading" class="eval-progress">Question ${index + 1} / ${drawnIds.length}</p>
					<p class="eval-seed-chip">Seed <code>${escapeHtml(seed)}</code></p>
				</div>
				${activity}
				<p class="eval-prompt" tabindex="-1">${escapeHtml(item.prompt)}</p>
				<div class="eval-choices" role="group" aria-label="Answer choices">${choices}</div>
				<div class="eval-nav-row">
					<button type="button" class="button-link button-outline" id="eval-prev" ${index === 0 ? 'disabled' : ''}>Previous</button>
					<button type="button" class="button-link" id="eval-next" ${chosen ? '' : 'disabled'}>
						${isLast ? 'Finish' : 'Next'}
					</button>
				</div>
				<p class="eval-help">Keys: A–D or 1–4 to answer, Enter / → for next.</p>
			</section>
		`;
	}

	function renderResults(): string {
		const map = byId();
		const records = buildRecords();
		const { correct, total, pct } = scoreSummary(records);
		const unanswered = records.filter((r) => r.chosen === null).length;
		const review = records
			.map((record, i) => {
				const item = map.get(record.itemId);
				const ok = record.chosen !== null && record.chosen === record.correct;
				const status = record.chosen === null ? 'skipped' : ok ? 'correct' : 'wrong';
				const prompt = item ? escapeHtml(item.prompt) : record.itemId;
				return `
					<li class="eval-review-item is-${status}">
						<p class="eval-review-head">
							<span>#${i + 1}</span>
							<span class="eval-review-status">${status}</span>
						</p>
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
				<p class="eval-score">${correct} / ${total} correct (${pct}%)</p>
				<p class="eval-seed-chip">Seed <code>${escapeHtml(seed)}</code> — share the URL to replay this draw.</p>
				${unanswered ? `<p class="eval-help">${unanswered} unanswered counted as incorrect.</p>` : ''}
				<p class="eval-caveat">
					This is a ${total}-item draw from a ${pack?.source.poolSize ?? '—'}-item pool,
					not a full HellaSwag validation run. Do not treat the percentage as comparable
					to published model leaderboards without that caveat.
				</p>
				<div class="eval-nav-row">
					<button type="button" class="button-link" id="eval-replay">Same seed again</button>
					<button type="button" class="button-link button-outline" id="eval-restart">New seed</button>
				</div>
				<h3 class="eval-review-title">Item review</h3>
				<ol class="eval-review-list">${review}</ol>
			</section>
		`;
	}

	function render(): void {
		if (phase === 'setup') {root.innerHTML = renderSetup();}
		else if (phase === 'running') {root.innerHTML = renderRunning();}
		else {root.innerHTML = renderResults();}
		bind();
	}

	document.addEventListener('keydown', onKeydown);
	void ensureData().then(() => {
		if (phase === 'setup') {render();}
	});
	render();
}
