#!/usr/bin/env python3
"""Build a seeded GPQA Diamond pool for the static eval page.

Requires Hugging Face access to the gated Idavidrein/gpqa dataset (HF_TOKEN).

Usage:
  uv run --with huggingface_hub python3 scripts/evals/build_gpqa_diamond_pack.py
"""

from __future__ import annotations

import csv
import hashlib
import json
import os
import random
import string
import sys
from pathlib import Path

from huggingface_hub import hf_hub_download

DATASET = "Idavidrein/gpqa"
FILENAME = "gpqa_diamond.csv"
BUILD_SEED = 20260806
DRAW_SIZE = 20
CHOICE_IDS = string.ascii_uppercase

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "evals" / "gpqa-diamond"


def choice_order_seed(item_id: str) -> int:
    digest = hashlib.sha256(f"{BUILD_SEED}:{item_id}".encode()).hexdigest()
    return int(digest[:8], 16)


def to_item(row: dict, index: int) -> tuple[dict, str]:
    question = str(row["Question"]).strip()
    correct = str(row["Correct Answer"]).strip()
    distractors = [
        str(row["Incorrect Answer 1"]).strip(),
        str(row["Incorrect Answer 2"]).strip(),
        str(row["Incorrect Answer 3"]).strip(),
    ]
    if not question or not correct or any(not d for d in distractors):
        raise ValueError(f"row {index}: missing question or answers")

    options = [correct, *distractors]
    item_id = f"gpqa-diamond-{index:03d}"
    rng = random.Random(choice_order_seed(item_id))
    order = list(range(len(options)))
    rng.shuffle(order)
    shuffled = [options[i] for i in order]
    answer_letter = CHOICE_IDS[order.index(0)]

    item = {
        "id": item_id,
        "prompt": question,
        "choices": [{"id": CHOICE_IDS[i], "text": text} for i, text in enumerate(shuffled)],
        "meta": {
            "subdomain": str(row.get("Subdomain") or ""),
            "source_index": index,
        },
    }
    return item, answer_letter


def main() -> int:
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    print(f"Downloading {DATASET}/{FILENAME} …", file=sys.stderr)
    path = hf_hub_download(
        repo_id=DATASET,
        repo_type="dataset",
        filename=FILENAME,
        token=token,
    )
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise RuntimeError("gpqa_diamond.csv had no rows")

    items: list[dict] = []
    answers: dict[str, str] = {}
    for src_i, row in enumerate(rows):
        item, letter = to_item(row, src_i)
        items.append(item)
        answers[item["id"]] = letter

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pack = {
        "schemaVersion": 1,
        "benchmarkId": "gpqa-diamond",
        "title": "GPQA Diamond (human mini-eval)",
        "license": "See Idavidrein/gpqa dataset terms on Hugging Face (gated)",
        "citation": "Rein et al., GPQA, 2023. https://arxiv.org/abs/2311.12022",
        "source": {
            "dataset": DATASET,
            "config": "gpqa_diamond",
            "split": "csv",
            "poolSize": len(items),
            "fullSetSize": len(items),
            "datasetRevision": Path(path).parent.name,
            "method": f"full Diamond set · shuffled choices · build_seed={BUILD_SEED}",
            "buildSeed": BUILD_SEED,
        },
        "sessionDefaults": {"drawSize": DRAW_SIZE},
        "items": items,
    }
    key = {
        "schemaVersion": 1,
        "benchmarkId": "gpqa-diamond",
        "answers": answers,
    }
    (OUT_DIR / "pack.json").write_text(json.dumps(pack, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (OUT_DIR / "key.json").write_text(json.dumps(key, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (OUT_DIR / "ATTRIBUTION.md").write_text(
        "\n".join(
            [
                "# GPQA Diamond pack attribution",
                "",
                f"Source: [{DATASET}](https://huggingface.co/datasets/{DATASET}) (`{FILENAME}`).",
                "Citation: Rein et al., GPQA: A Graduate-Level Google-Proof Q&A Benchmark, 2023.",
                "https://arxiv.org/abs/2311.12022",
                "",
                "This site hosts the full Diamond split for a browser human mini-eval (20-item seeded draws).",
                "Respect the upstream dataset license / gated access terms.",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print(f"Wrote {len(items)} items → {OUT_DIR}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
