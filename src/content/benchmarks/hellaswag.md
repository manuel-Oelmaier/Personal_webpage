---
title: "HellaSwag"
description: "Commonsense sentence completion — choose the most plausible ending."
purpose: "Tests whether a model can finish everyday situations with the ending that makes sense, not just the one that sounds fluent."
scoring: "exact match on A–D · answered-only (human mini-eval) · full-eval protocols vary by paper"
citation:
  label: "Zellers et al., ACL 2019"
  url: "https://arxiv.org/abs/1905.07830"
datasetSource: "https://huggingface.co/datasets/Rowan/hellaswag"
questionCount: 20
categories:
  - "commonsense"
  - "sentence completion"
published: 2019-05-19
takeable: true
---

## Protocol (this site)

- Pool: **1000** items sampled once from the HellaSwag `validation` split (labels are public; the test split is not used).
- Each run draws **20** items with a deterministic seed (shown in the UI and URL). Same seed → same questions. Sized for roughly five minutes of careful reading — no timer.
- **Scoring:** exact match on the choice letter (A–D), client-side, over **answered items only**. Unanswered items are excluded from the denominator. You may hand in early. Answer keys ship with the page for offline scoring — not an anti-cheat setup.
- A small drawn subset is **not** a full HellaSwag evaluation. Treat scores as a personal probe.

## Context for published model scores

HellaSwag (2019) is largely **saturated / unreported** on 2026 system cards. Use it here as a human probe into what “commonsense ending” items feel like — not as the primary way to rank recent frontier models. See the [LLM leaderboard](/evals/) for citeable columns that labs still publish (MMLU-Pro, GPQA Diamond, SciCode).

| System | HellaSwag | Source |
| --- | --- | --- |
| Human performance | ~95.6% | [arXiv:1905.07830](https://arxiv.org/abs/1905.07830) |
| BERT-large (2019) | ~47% | Same paper (baseline era) |

## Data & license

Dataset: [Rowan/hellaswag](https://huggingface.co/datasets/Rowan/hellaswag) · Paper: [arXiv:1905.07830](https://arxiv.org/abs/1905.07830) · License: MIT.

See also [ATTRIBUTION.md](/evals/hellaswag/ATTRIBUTION.md) in the shipped pack.
