# Eval pack builders

Offline scripts that turn public LLM benchmarks into static JSON pools for `/evals/`.

## HellaSwag

```bash
python3 scripts/evals/build_hellaswag_pack.py
```

Writes:

- `public/evals/hellaswag/pack.json` — ~1000 validation items
- `public/evals/hellaswag/key.json` — answer map (client-side scoring)
- `public/evals/hellaswag/ATTRIBUTION.md` — license + citation

Downloads `hellaswag_val.jsonl` from the upstream GitHub repo (stdlib only; cached under `scripts/evals/.cache/`). Same `BUILD_SEED` regenerates the same pool.
