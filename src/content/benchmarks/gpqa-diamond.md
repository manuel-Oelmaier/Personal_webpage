---
title: "GPQA Diamond"
description: "Graduate-level science multiple choice (biology, physics, chemistry) designed to be hard even for domain experts."
purpose: "Stress-tests deep scientific reasoning on Google-proof questions written by specialists."
scoring: "exact match · answered-only (human mini-eval when pack ships) · cards often report pass@1 / multi-trial averages"
citation:
  label: "Rein et al., GPQA, 2023"
  url: "https://arxiv.org/abs/2311.12022"
datasetSource: "https://huggingface.co/datasets/Idavidrein/gpqa"
questionCount: 20
categories:
  - "biology"
  - "physics"
  - "chemistry"
published: 2023-11-20
takeable: true
---

## Protocol (this site)

- Human mini-eval pack: **coming next** (same MCQ draw pattern as HellaSwag / MMLU-Pro). Hub and leaderboard column are live now so citeable card scores have a home.
- When the pack ships: 20-item seeded draw, answered-only scoring, client-side keys.
- Published model scores on the leaderboard come from system cards — protocols differ (thinking budgets, trial averages).

## Why it is on the leaderboard

GPQA Diamond is a common frontier headline number in 2026. It is also a useful humbling human probe once the take UI is available.
