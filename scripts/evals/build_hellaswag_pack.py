#!/usr/bin/env python3
"""Build a seeded HellaSwag validation pool for the static eval page.

Downloads the official validation JSONL from the HellaSwag GitHub repo
and writes a subsampled pack. Stdlib only.

Usage:
  python3 scripts/evals/build_hellaswag_pack.py
"""

from __future__ import annotations

import json
import random
import sys
import urllib.request
from pathlib import Path

DATASET = "Rowan/hellaswag"
SPLIT = "validation"
POOL_SIZE = 1000
BUILD_SEED = 20260804
DRAW_SIZE = 20
# Upstream JSONL (same validation labels as the HF dataset).
VAL_JSONL_URL = (
    "https://raw.githubusercontent.com/rowanz/hellaswag/master/data/hellaswag_val.jsonl"
)
# Pin the HF dataset card revision we attribute in the pack (for provenance).
HF_REVISION_API = "https://huggingface.co/api/datasets/Rowan/hellaswag/commits/main"
CHOICE_IDS = ("A", "B", "C", "D")

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "evals" / "hellaswag"
CACHE_PATH = ROOT / "scripts" / "evals" / ".cache" / "hellaswag_val.jsonl"


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Personal_webpage-eval-pack/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def dataset_revision() -> str:
    try:
        raw = fetch_bytes(HF_REVISION_API)
        commits = json.loads(raw.decode("utf-8"))
        if isinstance(commits, list) and commits:
            return str(commits[0]["id"])
    except Exception:
        pass
    return "main"


def load_validation_rows() -> list[dict]:
    if CACHE_PATH.is_file():
        print(f"Using cached {CACHE_PATH}", file=sys.stderr)
        text = CACHE_PATH.read_text(encoding="utf-8")
    else:
        print(f"Downloading {VAL_JSONL_URL}", file=sys.stderr)
        raw = fetch_bytes(VAL_JSONL_URL)
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_bytes(raw)
        text = raw.decode("utf-8")
        print(f"Cached to {CACHE_PATH}", file=sys.stderr)

    rows: list[dict] = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"bad JSONL at line {line_no}") from exc
    return rows


def to_item(row: dict, row_index: int) -> tuple[dict, str]:
    """row_index is the 0-based line offset in hellaswag_val.jsonl (ind is not unique)."""
    endings = list(row["endings"])
    if len(endings) != 4:
        raise ValueError(f"row={row_index}: expected 4 endings, got {len(endings)}")
    label_idx = int(row["label"])
    if label_idx not in range(4):
        raise ValueError(f"row={row_index}: bad label {row['label']!r}")
    item_id = f"hellaswag-val-{row_index}"
    item = {
        "id": item_id,
        "prompt": str(row["ctx"]),
        "choices": [{"id": cid, "text": text} for cid, text in zip(CHOICE_IDS, endings, strict=True)],
        "meta": {
            "activity_label": str(row["activity_label"]),
            "ind": int(row["ind"]),
        },
    }
    return item, CHOICE_IDS[label_idx]


def main() -> int:
    print("Resolving dataset revision…", file=sys.stderr)
    revision = dataset_revision()
    print(f"  revision={revision}", file=sys.stderr)

    rows = load_validation_rows()
    print(f"Loaded {len(rows)} validation rows", file=sys.stderr)
    indexed = list(enumerate(rows))

    rng = random.Random(BUILD_SEED)
    if POOL_SIZE > len(indexed):
        raise RuntimeError(f"pool size {POOL_SIZE} > validation size {len(indexed)}")
    selected = rng.sample(indexed, POOL_SIZE)
    selected.sort(key=lambda pair: pair[0])

    items: list[dict] = []
    answers: dict[str, str] = {}
    for row_index, row in selected:
        item, answer = to_item(row, row_index)
        items.append(item)
        answers[item["id"]] = answer

    if len(answers) != len(items):
        raise RuntimeError(f"id collision: {len(items)} items but {len(answers)} answers")

    pack = {
        "schemaVersion": 1,
        "benchmarkId": "hellaswag",
        "title": "HellaSwag (human mini-eval)",
        "license": "MIT",
        "citation": (
            "Zellers et al., HellaSwag: Can a Machine Really Finish Your Sentence?, "
            "ACL 2019. https://arxiv.org/abs/1905.07830"
        ),
        "source": {
            "dataset": DATASET,
            "split": SPLIT,
            "poolSize": len(items),
            "datasetRevision": revision,
            "method": "full_split_sample",
            "buildSeed": BUILD_SEED,
            "jsonl": VAL_JSONL_URL,
        },
        "sessionDefaults": {"drawSize": DRAW_SIZE},
        "items": items,
    }
    key = {
        "schemaVersion": 1,
        "benchmarkId": "hellaswag",
        "answers": answers,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pack_path = OUT_DIR / "pack.json"
    key_path = OUT_DIR / "key.json"
    attr_path = OUT_DIR / "ATTRIBUTION.md"

    pack_path.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    key_path.write_text(json.dumps(key, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    attr_path.write_text(
        "\n".join(
            [
                "# HellaSwag attribution",
                "",
                "This directory contains a subsampled pool derived from the HellaSwag validation split.",
                "",
                f"- Dataset: [{DATASET}](https://huggingface.co/datasets/{DATASET})",
                f"- Upstream JSONL: `{VAL_JSONL_URL}`",
                f"- Split: `{SPLIT}`",
                f"- Pool size: {len(items)} (build seed `{BUILD_SEED}`)",
                f"- Dataset revision (HF card): `{revision}`",
                "- License: [MIT](https://github.com/rowanz/hellaswag/blob/master/LICENSE)",
                "",
                "## Citation",
                "",
                "```",
                "@inproceedings{zellers2019hellaswag,",
                "  title={HellaSwag: Can a Machine Really Finish Your Sentence?},",
                "  author={Zellers, Rowan and Holtzman, Ari and Bisk, Yonatan and Farhadi, Ali and Choi, Yejin},",
                "  booktitle={Proceedings of the 57th Annual Meeting of the Association for Computational Linguistics},",
                "  year={2019}",
                "}",
                "```",
                "",
            ]
        ),
        encoding="utf-8",
    )

    pack_kb = pack_path.stat().st_size / 1024
    print(f"Wrote {pack_path} ({pack_kb:.0f} KB)", file=sys.stderr)
    print(f"Wrote {key_path}", file=sys.stderr)
    print(f"Wrote {attr_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
