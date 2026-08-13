#!/usr/bin/env python3
"""Build a seeded MMMU-Pro (standard 4-option) pool with local images.

Only keeps items that use a single image (image_1 present; image_2… empty;
question text does not reference <image 2>+).

Requires: datasets, pyarrow, Pillow (run via uv — see scripts/evals/README.md).

Usage:
  uv run --with datasets --with pyarrow --with Pillow \\
    python3 scripts/evals/build_mmmu_pro_pack.py
"""

from __future__ import annotations

import ast
import json
import random
import re
import string
import sys
from io import BytesIO
from pathlib import Path

from datasets import load_dataset
from PIL import Image

DATASET = "MMMU/MMMU_Pro"
CONFIG = "standard (4 options)"
SPLIT = "test"
POOL_SIZE = 100
BUILD_SEED = 20260806
DRAW_SIZE = 20
MAX_IMAGE_EDGE = 960
JPEG_QUALITY = 82
CHOICE_IDS = string.ascii_uppercase
MULTI_IMAGE_REF = re.compile(
    r"<image\s*[2-9]\s*>|image\s*[2-9]\b|figures?\s*[2-9]\b|images\s*[2-9]\b",
    re.IGNORECASE,
)

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "evals" / "mmmu-pro"
IMG_DIR = OUT_DIR / "images"


def parse_options(raw: object) -> list[str]:
    if isinstance(raw, list):
        return [str(x) for x in raw]
    if isinstance(raw, str):
        try:
            parsed = ast.literal_eval(raw)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except (SyntaxError, ValueError):
            pass
        return [raw]
    raise RuntimeError(f"unexpected options type: {type(raw)}")


def has_extra_image(row: dict) -> bool:
    for i in range(2, 8):
        if row.get(f"image_{i}") is not None:
            return True
    return False


def is_single_image_item(row: dict) -> bool:
    if row.get("image_1") is None:
        return False
    if has_extra_image(row):
        return False
    question = str(row.get("question") or "")
    if MULTI_IMAGE_REF.search(question):
        return False
    return True


def save_image(pil_img: Image.Image, dest: Path) -> None:
    img = pil_img.convert("RGB")
    w, h = img.size
    scale = min(1.0, MAX_IMAGE_EDGE / max(w, h))
    if scale < 1.0:
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, format="JPEG", quality=JPEG_QUALITY, optimize=True)


def collect_rows() -> list[dict]:
    print(f"Streaming {DATASET} / {CONFIG} / {SPLIT} (single-image only) …", file=sys.stderr)
    ds = load_dataset(DATASET, CONFIG, split=SPLIT, streaming=True)
    candidates: list[dict] = []
    seen = 0
    skipped_multi = 0
    for row in ds:
        seen += 1
        if not is_single_image_item(row):
            if row.get("image_1") is not None and (
                has_extra_image(row) or MULTI_IMAGE_REF.search(str(row.get("question") or ""))
            ):
                skipped_multi += 1
            continue
        options = parse_options(row["options"])
        if len(options) < 2:
            continue
        answer = str(row["answer"]).strip().upper()
        if answer not in CHOICE_IDS[: len(options)]:
            continue
        candidates.append(row)
        if len(candidates) >= POOL_SIZE * 5:
            break
    print(
        f"Scanned ~{seen} rows · single-image candidates {len(candidates)} · skipped multi-image {skipped_multi}",
        file=sys.stderr,
    )
    if len(candidates) < POOL_SIZE:
        raise RuntimeError(f"only found {len(candidates)} usable single-image rows, need {POOL_SIZE}")
    rng = random.Random(BUILD_SEED)
    rng.shuffle(candidates)
    return candidates[:POOL_SIZE]


def normalize_prompt(question: str) -> str:
    prompt = question
    for n in range(1, 8):
        prompt = prompt.replace(f"<image {n}>", "[see image]")
        prompt = prompt.replace(f"<image{n}>", "[see image]")
    return prompt


def main() -> None:
    rows = collect_rows()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if IMG_DIR.exists():
        for old in IMG_DIR.glob("*"):
            old.unlink()
    else:
        IMG_DIR.mkdir(parents=True)

    items: list[dict] = []
    answers: dict[str, str] = {}
    total_bytes = 0

    for i, row in enumerate(rows):
        item_id = f"mmmu-pro-{i:03d}"
        safe_name = f"{item_id}.jpg"
        dest = IMG_DIR / safe_name
        pil = row["image_1"]
        if not isinstance(pil, Image.Image):
            pil = Image.open(BytesIO(pil["bytes"])) if isinstance(pil, dict) and "bytes" in pil else Image.open(pil)
        save_image(pil, dest)
        total_bytes += dest.stat().st_size

        options = parse_options(row["options"])
        choices = [{"id": CHOICE_IDS[j], "text": options[j]} for j in range(len(options))]
        answer = str(row["answer"]).strip().upper()

        items.append(
            {
                "id": item_id,
                "prompt": normalize_prompt(str(row["question"])),
                "imageUrls": [f"/evals/mmmu-pro/images/{safe_name}"],
                "choices": choices,
                "meta": {
                    "subject": str(row.get("subject") or ""),
                    "source_id": str(row.get("id") or ""),
                    "difficulty": str(row.get("topic_difficulty") or ""),
                },
            }
        )
        answers[item_id] = answer

    pack = {
        "schemaVersion": 1,
        "benchmarkId": "mmmu-pro",
        "title": "MMMU-Pro (human mini-eval)",
        "license": "See upstream MMMU / MMMU-Pro dataset terms on Hugging Face",
        "citation": "Yue et al., MMMU-Pro, 2024. https://arxiv.org/abs/2409.02813",
        "source": {
            "dataset": DATASET,
            "config": CONFIG,
            "split": SPLIT,
            "poolSize": len(items),
            "datasetRevision": "main",
            "method": (
                f"streamed single-image subsample · build_seed={BUILD_SEED} "
                f"· JPEG max edge {MAX_IMAGE_EDGE}"
            ),
            "buildSeed": BUILD_SEED,
        },
        "sessionDefaults": {"drawSize": DRAW_SIZE},
        "items": items,
    }
    key = {"schemaVersion": 1, "benchmarkId": "mmmu-pro", "answers": answers}

    (OUT_DIR / "pack.json").write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT_DIR / "key.json").write_text(json.dumps(key, indent=2) + "\n", encoding="utf-8")
    (OUT_DIR / "ATTRIBUTION.md").write_text(
        "\n".join(
            [
                "# MMMU-Pro attribution",
                "",
                "Subsampled **single-image** pool + compressed JPEGs derived from "
                f"[MMMU/MMMU_Pro](https://huggingface.co/datasets/{DATASET}) "
                f"config `{CONFIG}`, split `{SPLIT}`.",
                "",
                "- Paper: [Yue et al., arXiv:2409.02813](https://arxiv.org/abs/2409.02813)",
                f"- Build seed: `{BUILD_SEED}` · pool `{len(items)}` · draw `{DRAW_SIZE}`",
                "- Filter: `image_1` only; no `image_2`… and no `<image 2>+` in the question text",
                f"- Image bytes on disk: ~{total_bytes // 1024} KiB",
                "",
                "Not a full MMMU-Pro replication. For research / educational demonstration only.",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print(
        f"Wrote {len(items)} items → {OUT_DIR} (~{total_bytes // 1024} KiB images)",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
