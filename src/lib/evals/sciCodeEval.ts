/**
 * SciCode human walkthrough — one seeded main problem, subproblems in model order.
 * Unit tests and gold stay in a collapsed “hidden from the model” section.
 */

import katex from 'katex';

type Subproblem = {
	id: string;
	prompt: string;
	header: string;
	background?: string;
	tests?: string[];
	gold?: string;
};

type SciCodeItem = {
	id: string;
	name: string;
	description: string;
	background?: string;
	dependencies?: string;
	subproblems: Subproblem[];
};

type SciCodePack = {
	schemaVersion: 1;
	benchmarkId: string;
	title: string;
	source: {
		poolSize: number;
		fullSetSize?: number;
		subproblemCount?: number;
	};
	sessionDefaults: { drawSize: number };
	items: SciCodeItem[];
};

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

function pickItem(items: SciCodeItem[], seed: string): SciCodeItem {
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
	const id = ids[0];
	const item = items.find((entry) => entry.id === id);
	if (!item) {
		throw new Error('empty SciCode pack');
	}
	return item;
}

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function renderKatex(tex: string, displayMode: boolean): string {
	return katex.renderToString(tex, { throwOnError: false, displayMode });
}

/** HTML-escape prose; render `$…$`, `$$…$$`, and equation/align environments with KaTeX. */
function renderMathHtml(text: string): string {
	const re =
		/\$\$([\s\S]+?)\$\$|\\begin\{(equation\*?|align\*?)\}([\s\S]+?)\\end\{\2\}|\$([^$\n]+)\$/g;
	const out: string[] = [];
	let last = 0;
	let match: RegExpExecArray | null;
	while ((match = re.exec(text)) !== null) {
		out.push(escapeHtml(text.slice(last, match.index)));
		const display = match[1] ?? match[3];
		const inline = match[4];
		if (display !== undefined) {
			out.push(renderKatex(display, true));
		} else {
			out.push(renderKatex(inline ?? '', false));
		}
		last = match.index + match[0].length;
	}
	out.push(escapeHtml(text.slice(last)));
	return out.join('');
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

export function mountSciCodeEval(root: HTMLElement, packUrl: string): void {
	let pack: SciCodePack | null = null;
	let item: SciCodeItem | null = null;
	let step = 0;
	let seed = readSeedFromUrl() ?? generateSeed();
	let loadError: string | null = null;
	let loading = false;
	let started = false;

	async function ensureData(): Promise<void> {
		if (pack) {
			return;
		}
		loading = true;
		render();
		try {
			const res = await fetch(packUrl);
			if (!res.ok) {
				throw new Error(`Failed to load pack (${res.status})`);
			}
			pack = (await res.json()) as SciCodePack;
			loadError = null;
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Failed to load SciCode pack';
		} finally {
			loading = false;
			if (!loadError && pack) {
				startRun();
				return;
			}
			render();
		}
	}

	function startRun(): void {
		if (!pack) {
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
		item = pickItem(pack.items, seed);
		step = 0;
		started = true;
		setSeedInUrl(seed);
		render();
	}

	function bind(): void {
		root.querySelector('#eval-new-seed')?.addEventListener('click', () => {
			seed = generateSeed();
			const input = root.querySelector<HTMLInputElement>('#eval-seed-input');
			if (input) {
				input.value = seed;
			}
			setSeedInUrl(seed);
		});
		root.querySelector('#eval-start')?.addEventListener('click', startRun);
		const seedInput = root.querySelector<HTMLInputElement>('#eval-seed-input');
		seedInput?.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				startRun();
			}
		});
		seedInput?.addEventListener('change', () => {
			startRun();
		});
		root.querySelector('#eval-prev')?.addEventListener('click', () => {
			if (step > 0) {
				step -= 1;
				render();
			}
		});
		root.querySelector('#eval-next')?.addEventListener('click', () => {
			if (!item) {
				return;
			}
			if (step < item.subproblems.length - 1) {
				step += 1;
				render();
				root.querySelector<HTMLElement>('.eval-prompt')?.focus();
			} else {
				started = false;
				item = null;
				seed = generateSeed();
				setSeedInUrl(seed);
				render();
			}
		});
	}

	function renderSetup(): string {
		const problems = pack?.source.poolSize ?? 80;
		return `
			<section class="eval-panel" aria-labelledby="eval-setup-heading">
				<h2 id="eval-setup-heading">Start a run</h2>
				<p class="eval-lede">
					You work through 1 of ${problems} problems, subproblem by subproblem —
					the same prompt the model gets. Tests are withheld.
				</p>
				<label class="eval-seed-label" for="eval-seed-input">Run seed</label>
				<div class="eval-seed-row">
					<input id="eval-seed-input" class="eval-seed-input" type="text" spellcheck="false"
						autocomplete="off" maxlength="16" value="${escapeHtml(seed)}"
						aria-describedby="eval-seed-help" />
					<button type="button" class="button-link button-outline" id="eval-new-seed">New seed</button>
				</div>
				<p id="eval-seed-help" class="eval-help">Hex string (4–16 chars). Same seed → same problem.</p>
				${loadError ? `<p class="eval-error" role="alert">${escapeHtml(loadError)}</p>` : ''}
				<button type="button" class="button-link" id="eval-start" ${loading ? 'disabled' : ''}>
					${loading ? 'Loading pool…' : 'Start eval'}
				</button>
			</section>
		`;
	}

	function renderStep(): string {
		if (!item) {
			return renderSetup();
		}
		const sub = item.subproblems[step];
		if (!sub) {
			return `<p class="eval-error">Missing subproblem ${step}</p>`;
		}
		const isLast = step === item.subproblems.length - 1;
		const prior = item.subproblems
			.slice(0, step)
			.map((prev) => `<li><code>${escapeHtml(prev.id)}</code> ${renderMathHtml(prev.header.split('\n')[0] ?? prev.id)}</li>`)
			.join('');
		const background = item.background
			? `<details class="scicode-reveal"><summary>Scientist background (optional in the paper’s “with background” setup)</summary>
				<pre class="eval-code-sample"><code>${renderMathHtml(item.background)}</code></pre></details>`
			: '';
		const stepBg = sub.background
			? `<details class="scicode-reveal"><summary>Subproblem background</summary>
				<pre class="eval-code-sample"><code>${renderMathHtml(sub.background)}</code></pre></details>`
			: '';
		const deps = item.dependencies
			? `<p class="eval-meta">Allowed imports</p><pre class="eval-code-sample"><code>${escapeHtml(item.dependencies)}</code></pre>`
			: '';
		const tests = (sub.tests ?? [])
			.map((t, i) => `<li><p class="eval-meta">Test ${i + 1}</p><pre class="eval-code-sample"><code>${renderMathHtml(t)}</code></pre></li>`)
			.join('');
		const hidden = (tests || sub.gold)
			? `<details class="scicode-reveal">
					<summary>Hidden from the model — unit tests and gold solution</summary>
					${tests ? `<p class="eval-meta">Unit tests</p><ol class="scicode-test-list">${tests}</ol>` : ''}
					${sub.gold ? `<p class="eval-meta">Gold solution</p><pre class="eval-code-sample"><code>${renderMathHtml(sub.gold)}</code></pre>` : ''}
				</details>`
			: '';
		return `
			<section class="eval-panel eval-run" aria-labelledby="eval-run-heading">
				<div class="eval-run-bar">
					<p id="eval-run-heading" class="eval-progress">Subproblem ${step + 1} / ${item.subproblems.length}</p>
					<label class="eval-seed-chip" for="eval-seed-input">Seed
						<input id="eval-seed-input" class="eval-seed-input eval-seed-inline" type="text"
							spellcheck="false" autocomplete="off" maxlength="16" value="${escapeHtml(seed)}" />
					</label>
				</div>
				<p class="eval-meta">${escapeHtml(item.name)} · main problem (what the model is solving)</p>
				<p class="eval-prompt" tabindex="-1">${renderMathHtml(item.description)}</p>
				${background}
				${deps}
				${prior ? `<p class="eval-meta">Already in context (previous subproblems)</p><ol class="scicode-prior">${prior}</ol>` : ''}
				<h3 class="eval-review-title">${escapeHtml(sub.id)}</h3>
				<p class="eval-prompt">${renderMathHtml(sub.prompt)}</p>
				${stepBg}
				<p class="eval-meta">Implement</p>
				<pre class="eval-code-sample"><code>${renderMathHtml(sub.header)}</code></pre>
				${hidden}
				<div class="eval-nav-row">
					<button type="button" class="button-link button-outline" id="eval-prev" ${step === 0 ? 'disabled' : ''}>Previous</button>
					<button type="button" class="button-link" id="eval-next">${isLast ? 'Finish' : 'Next subproblem'}</button>
				</div>
			</section>
		`;
	}

	function render(): void {
		root.innerHTML = started ? renderStep() : renderSetup();
		bind();
	}

	void ensureData();
	render();
}
