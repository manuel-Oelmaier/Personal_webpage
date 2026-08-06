# Eval pack builders

Offline scripts that turn public LLM benchmarks into static JSON pools for `/evals/`.

## HellaSwag

```bash
python3 scripts/evals/build_hellaswag_pack.py
```

Writes `public/evals/hellaswag/{pack,key,ATTRIBUTION}.*`. Downloads `hellaswag_val.jsonl` (stdlib only; cached under `scripts/evals/.cache/`).

## MMLU-Pro

```bash
python3 scripts/evals/build_mmlu_pro_pack.py
```

Writes `public/evals/mmlu-pro/{pack,key,ATTRIBUTION}.*`. Downloads a JSON mirror of `TIGER-Lab/MMLU-Pro` test split (stdlib only; cached under `scripts/evals/.cache/`). Same `BUILD_SEED` regenerates the same pool.

SciCode has no pack (not takeable). GPQA Diamond pack is next.
