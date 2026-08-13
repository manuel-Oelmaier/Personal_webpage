---
title: "MMLU-Pro"
description: "Harder multi-task academic questions across disciplines — a human probe into what ‘knowledge’ items feel like."
purpose: "Measures broad academic knowledge and reasoning with harder, less gameable multiple-choice items than classic MMLU."
scoring: "exact match on choice letter · answered-only (human mini-eval) · cards often report 0-shot or 5-shot"
citation:
  label: "Wang et al., MMLU-Pro, 2024"
  url: "https://arxiv.org/abs/2406.01574"
datasetSource: "https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro"
datasetSize: 12032
questionCount: 20
categories:
  - "math"
  - "physics"
  - "chemistry"
  - "law"
  - "engineering"
  - "other academic"
published: 2024-06-03
takeable: true
---

## Protocol (this site)

- Pool: subsampled from the public MMLU-Pro **test** split (see pack attribution for build seed and size).
- Each run draws **20** items with a deterministic seed. Same seed → same questions.
- **Scoring:** exact match on the labeled answer letter, client-side, over **answered items only**.
- This is a personal probe, not a full MMLU-Pro replication.

## Not on the main board

The interactive board uses **MMMU-Pro** (AA scores + multimodal take) instead of MMLU-Pro. This hub remains as an optional text-only probe.
