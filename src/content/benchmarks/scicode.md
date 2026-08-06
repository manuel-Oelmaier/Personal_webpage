---
title: "SciCode"
description: "Scientific research coding: generate code for real lab-style subproblems across natural-science domains."
purpose: "Checks whether a model can turn scientific problem statements into working computational code — not exam-style multiple choice."
scoring: "unit-test pass rates on subproblems (lab harnesses) · not a browser MCQ"
citation:
  label: "Tian et al., SciCode, 2024"
  url: "https://arxiv.org/abs/2407.13168"
datasetSource: "https://github.com/scicode-bench/SciCode"
questionCount: 1
categories:
  - "physics"
  - "math"
  - "chemistry"
  - "biology"
  - "materials"
published: 2024-07-18
takeable: false
---

## Why there is no “Take a subset” here

SciCode grades **generated code against scientific test cases**. Running that in the browser (or asking visitors to execute model output) is not a reasonable human mini-eval for this site. The hub and leaderboard column exist so citeable SciCode numbers from papers and cards still have context.

## How to read the column

Compare published subproblem / main-problem pass rates from the same card or report. Protocols (background knowledge on/off, carrying prior subproblem code) differ — always open the citation.
