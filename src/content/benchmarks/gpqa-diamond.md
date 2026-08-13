---
title: "GPQA Diamond"
description: "Graduate-level science multiple choice (biology, physics, chemistry) designed to be hard even for domain experts."
purpose: "Stress-tests deep scientific reasoning on Google-proof questions written by specialists."
scoring: "exact match · answered-only (human mini-eval) · AA reports harness accuracy"
citation:
  label: "Rein et al., GPQA, 2023"
  url: "https://arxiv.org/abs/2311.12022"
datasetSource: "https://huggingface.co/datasets/Idavidrein/gpqa"
datasetSize: 198
questionCount: 20
categories:
  - "biology"
  - "physics"
  - "chemistry"
published: 2023-11-20
takeable: true
---

## Protocol (this site)

- Full set: **198** Diamond questions. Pool here: **100** seeded subsample; choices shuffled per item.
- Each run: **20**-item draw from a hex seed. Answered-only scoring, client-side.
- Compare against Artificial Analysis scores on the
  [blog board](/blog/feeling-llm-benchmarks/#evals-board).

## Take

[Start the GPQA Diamond mini-eval](/evals/gpqa-diamond/take/).
