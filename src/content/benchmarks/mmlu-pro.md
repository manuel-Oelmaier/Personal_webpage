---
title: "MMLU-Pro"
description: "Harder multi-task academic questions across disciplines — the usual ‘knowledge’ column on modern cards."
purpose: "Measures broad academic knowledge and reasoning with harder, less gameable multiple-choice items than classic MMLU."
scoring: "exact match on choice letter · answered-only (human mini-eval) · cards often report 0-shot or 5-shot"
citation:
  label: "Wang et al., MMLU-Pro, 2024"
  url: "https://arxiv.org/abs/2406.01574"
datasetSource: "https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro"
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
- This is a personal probe, not a full MMLU-Pro replication. Lab numbers may use different shot counts or answer extraction.

## Why it is on the leaderboard

Unlike HellaSwag, MMLU-Pro still appears on 2025–2026 open-weight and some frontier cards. Prefer it (and GPQA Diamond) when comparing recent models.
