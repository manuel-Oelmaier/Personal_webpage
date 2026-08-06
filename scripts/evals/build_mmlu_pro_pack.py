#!/usr/bin/env python3
"""Build a seeded MMLU-Pro test pool for the static eval page.

Downloads a JSON re-upload of TIGER-Lab/MMLU-Pro (stdlib only).

Usage:
  python3 scripts/evals/build_mmlu_pro_pack.py
"""

from __future__ import annotations

import json
import random
import string
import sys
import urllib.request
from pathlib import Path

DATASET = "TIGER-Lab/MMLU-Pro"
JSON_MIRROR = "pcuenq/MMLU-Pro-json"
SPLIT = "test"
POOL_SIZE = 1000
BUILD_SEED = 20260806
DRAW_SIZE = 20
TEST_JSON_URL = (
    f"https://huggingface.co/datasets/{JSON_MIRROR}/resolve/main/test.json"
)
HF_REVISION_API = f"https://huggingface.co/api/datasets/{DATASET}/commits/main"
CHOICE_IDS = string.ascii_uppercase

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "evals" / "mmlu-pro"
CACHE_PATH = ROOT / "scripts" / "evals" / ".cache" / "mmlu_pro_test.json"


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Personal_webpage-eval-pack/1.0"})
    with urllib.request.urlopen(req, timeout=180) as resp:
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


def parse_json_or_jsonl(text: str) -> list[dict]:
    text = text.lstrip()
    if text.startswith("["):
        data = json.loads(text)
        if not isinstance(data, list):
            raise RuntimeError("expected a JSON array of MMLU-Pro rows")
        return data
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


def load_test_rows() -> list[dict]:
    if CACHE_PATH.is_file():
        print(f"Using cached {CACHE_PATH}", file=sys.stderr)
        text = CACHE_PATH.read_text(encoding="utf-8")
    else:
        print(f"Downloading {TEST_JSON_URL}", file=sys.stderr)
        raw = fetch_bytes(TEST_JSON_URL)
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_bytes(raw)
        print(f"Cached to {CACHE_PATH}", file=sys.stderr)
        text = raw.decode("utf-8")
    return parse_json_or_jsonl(text)


def to_item(row: dict) -> tuple[dict, str]:
    options = list(row["options"])
    if not options or len(options) > 26:
        raise ValueError(f"question_id={row.get('question_id')}: bad options count {len(options)}")
    answer = str(row["answer"]).strip().upper()
    answer_index = int(row["answer_index"])
    if answer_index not in range(len(options)):
        raise ValueError(f"question_id={row.get('question_id')}: bad answer_index {answer_index}")
    expected = CHOICE_IDS[answer_index]
    if answer and answer != expected:
        # Prefer letter from dataset when present and consistent with index.
        if answer in CHOICE_IDS[: len(options)] and CHOICE_IDS.index(answer) == answer_index:
            expected = answer
        else:
            raise ValueError(
                f"question_id={row.get('question_id')}: answer {answer!r} != index letter {expected!r}"
            )
    qid = int(row["question_id"])
    item_id = f"mmlu-pro-test-{qid}"
    item = {
        "id": item_id,
        "prompt": str(row["question"]),
        "choices": [
            {"id": CHOICE_IDS[i], "text": text} for i, text in enumerate(options)
        ],
        "meta": {
            "category": str(row.get("category", "")),
            "question_id": qid,
        },
    }
    return item, expected


def main() -> int:
    print("Resolving dataset revision…", file=sys.stderr)
    revision = dataset_revision()
    print(f"  revision={revision}", file=sys.stderr)

    rows = load_test_rows()
    print(f"Loaded {len(rows)} test rows", file=sys.stderr)

    rng = random.Random(BUILD_SEED)
    if POOL_SIZE > len(rows):
        raise RuntimeError(f"pool size {POOL_SIZE} > test size {len(rows)}")
    selected = rng.sample(rows, POOL_SIZE)
    selected.sort(key=lambda row: int(row["question_id"]))

    items: list[dict] = []
    answers: dict[str, str] = {}
    for row in selected:
        item, answer = to_item(row)
        items.append(item)
        answers[item["id"]] = answer

    if len(answers) != len(items):
        raise RuntimeError(f"id collision: {len(items)} items but {len(answers)} answers")

    pack = {
        "schemaVersion": 1,
        "benchmarkId": "mmlu-pro",
        "title": "MMLU-Pro (human mini-eval)",
        "license": "MIT",
        "citation": (
            "Wang et al., MMLU-Pro: A More Robust and Challenging Multi-Task "
            "Language Understanding Benchmark, 2024. https://arxiv.org/abs/2406.01574"
        ),
        "source": {
            "dataset": DATASET,
            "split": SPLIT,
            "poolSize": len(items),
            "datasetRevision": revision,
            "method": "full_split_sample",
            "buildSeed": BUILD_SEED,
            "jsonMirror": TEST_JSON_URL,
        },
        "sessionDefaults": {"drawSize": DRAW_SIZE},
        "items": items,
    }
    key = {
        "schemaVersion": 1,
        "benchmarkId": "mmlu-pro",
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
                "# MMLU-Pro attribution",
                "",
                "This directory contains a subsampled pool derived from the MMLU-Pro test split.",
                "",
                f"- Dataset: [{DATASET}](https://huggingface.co/datasets/{DATASET})",
                f"- JSON mirror used for download: [{JSON_MIRROR}](https://huggingface.co/datasets/{JSON_MIRROR})",
                f"- Split: `{SPLIT}`",
                f"- Pool size: {len(items)} (build seed `{BUILD_SEED}`)",
                f"- Dataset revision (HF card): `{revision}`",
                "- License: MIT (upstream dataset card)",
                "",
                "## Citation",
                "",
                "```",
                "@article{wang2024mmlupro,",
                "  title={MMLU-Pro: A More Robust and Challenging Multi-Task Language Understanding Benchmark},",
                "  author={Wang, Yubo and others},",
                "  year={2024}",
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
