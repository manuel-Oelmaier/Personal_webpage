# Eval pack builders

Offline scripts that turn public LLM benchmarks into static JSON pools for `/evals/`.

## MMMU-Pro

```bash
uv run --with datasets --with pyarrow --with Pillow \
  python3 scripts/evals/build_mmmu_pro_pack.py
```

Writes `public/evals/mmmu-pro/{pack,key,ATTRIBUTION}.*` plus compressed JPEGs under `images/`. Streams `MMMU/MMMU_Pro` standard (4 options) test split; **single-image only**, pool 100 / draw 20.

## GPQA Diamond

```bash
uv run --with huggingface_hub python3 scripts/evals/build_gpqa_diamond_pack.py
```

Gated dataset — needs `HF_TOKEN` with access to `Idavidrein/gpqa`. Writes `public/evals/gpqa-diamond/{pack,key,ATTRIBUTION}.*` (pool 100 / draw 20).

## MMLU-Pro (optional text probe)

```bash
python3 scripts/evals/build_mmlu_pro_pack.py
```

## Refreshing leaderboard scores

Manual import into `src/data/llm-leaderboard.json` from [Artificial Analysis](https://artificialanalysis.ai/) model pages (or BenchLM AA mirrors): **GPQA Diamond**, **MMMU-Pro**, **SciCode**. Prefer the public AA leaderboard tables over scraping model-page side panels. Leave missing cells as `null` when AA has not published a score. Bump `updated`. Board UI is a React island on `/blog/feeling-llm-benchmarks/`.

Human mini-eval scores (MMMU-Pro / GPQA Diamond) are stored in the browser via `localStorage` (`evals:you-scores:v1`), not in this JSON. Shareable `?you=` URLs still merge into that store on board load.

Do **not** fill missing cells by calling model APIs from this repo.
