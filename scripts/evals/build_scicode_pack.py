#!/usr/bin/env python3
"""Build a SciCode pack (prompts only — tests withheld, as in the model protocol).

Usage:
  uv run --with huggingface_hub python3 scripts/evals/build_scicode_pack.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from huggingface_hub import hf_hub_download

DATASET = "SciCode1/SciCode"
SPLITS = ("problems_dev.jsonl", "problems_test.jsonl")

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "evals" / "scicode"


def load_split(filename: str, token: str | None) -> list[dict]:
    path = hf_hub_download(
        repo_id=DATASET,
        repo_type="dataset",
        filename=filename,
        token=token,
    )
    items: list[dict] = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            items.append(
                {
                    "id": str(row["problem_id"]),
                    "name": str(row["problem_name"]).replace("_", " "),
                    "description": str(row.get("problem_description_main") or "").strip(),
                    "background": str(row.get("problem_background_main") or "").strip(),
                    "dependencies": str(row.get("required_dependencies") or "").strip(),
                    "subproblems": [
                        {
                            "id": str(step["step_number"]),
                            "prompt": str(step.get("step_description_prompt") or "").strip(),
                            "header": str(step.get("function_header") or "").strip(),
                            "background": str(step.get("step_background") or "").strip(),
                            "tests": [str(t).strip() for t in (step.get("test_cases") or []) if str(t).strip()],
                            "gold": str(step.get("ground_truth_code") or "").strip(),
                        }
                        for step in row.get("sub_steps") or []
                    ],
                }
            )
    return items


def main() -> int:
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    items: list[dict] = []
    for split in SPLITS:
        print(f"Downloading {DATASET}/{split} …", file=sys.stderr)
        items.extend(load_split(split, token))
    items.sort(key=lambda item: int(item["id"]) if str(item["id"]).isdigit() else 0)
    sub_count = sum(len(item["subproblems"]) for item in items)
    if not items:
        raise RuntimeError("no SciCode problems loaded")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pack = {
        "schemaVersion": 1,
        "benchmarkId": "scicode",
        "title": "SciCode (human walkthrough)",
        "license": "See SciCode1/SciCode dataset terms on Hugging Face",
        "citation": "Tian et al., SciCode, 2024. https://arxiv.org/abs/2407.13168",
        "source": {
            "dataset": DATASET,
            "split": "+".join(SPLITS),
            "poolSize": len(items),
            "fullSetSize": len(items),
            "subproblemCount": sub_count,
            "datasetRevision": "huggingface",
            "method": "full set · sequential subproblems · tests withheld from the prompt",
        },
        "sessionDefaults": {"drawSize": 1},
        "items": items,
    }
    (OUT_DIR / "pack.json").write_text(json.dumps(pack, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (OUT_DIR / "ATTRIBUTION.md").write_text(
        "\n".join(
            [
                "# SciCode pack attribution",
                "",
                f"Source: [{DATASET}](https://huggingface.co/datasets/{DATASET}) (`{'`, `'.join(SPLITS)}`).",
                "Citation: Tian et al., SciCode: A Research Coding Benchmark Curated by Scientists, 2024.",
                "https://arxiv.org/abs/2407.13168",
                "",
                "This site hosts the full problem set as a sequential walkthrough.",
                "Unit tests and gold solutions are in a collapsed “hidden from the model” section.",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print(f"Wrote {len(items)} problems / {sub_count} subproblems → {OUT_DIR}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
