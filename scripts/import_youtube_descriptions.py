#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from arakaku_utils import ROOT, write_csv


DEFAULT_INPUT_DIR = ROOT / "tmp" / "youtube-info"
DEFAULT_OUTPUT = ROOT / "review" / "youtube_description_candidates.csv"

FIELDS = [
    "video_id",
    "url",
    "title",
    "line_number",
    "line_type",
    "line_text",
]


NOTE_URL_RE = re.compile(r"https?://note\.com/[^\s)）]+")
YOUTUBE_URL_RE = re.compile(r"https?://(?:www\.)?(?:youtube\.com|youtu\.be)/[^\s)）]+")
VS_RE = re.compile(r"(?i)\bvs\.?\b|ｖｓ|ＶＳ|対")
EVENT_RE = re.compile(
    r"(ターゲット|エンペラー|マウンテン[・\- ]?ヒーローズ|マウンテンヒーローズ|MAXバウト|エリートスピリッツ|アラカクライブ)"
)
RESULT_RE = re.compile(r"(KO|TKO|一本|判定|ドロー|ノーコンテスト|失格|勝利|敗北|防衛|王座|タイトル)", re.IGNORECASE)


def classify_line(line: str) -> str:
    if NOTE_URL_RE.search(line):
        return "note_url"

    if YOUTUBE_URL_RE.search(line):
        return "youtube_url"

    if VS_RE.search(line):
        return "matchup"

    if EVENT_RE.search(line):
        return "event"

    if RESULT_RE.search(line):
        return "result_or_title"

    return "other"


def iter_info_json(input_dir: Path):
    for path in sorted(input_dir.glob("*.info.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"[warn] invalid json: {path}: {exc}")
            continue

        yield path, data


def extract_candidates(data: dict) -> list[dict[str, str]]:
    video_id = str(data.get("id") or "")
    url = str(data.get("webpage_url") or data.get("original_url") or "")
    title = str(data.get("title") or "")
    description = str(data.get("description") or "")

    rows: list[dict[str, str]] = []

    for index, raw_line in enumerate(description.splitlines(), start=1):
        line = raw_line.strip()

        if not line:
            continue

        line_type = classify_line(line)

        if line_type == "other":
            continue

        rows.append(
            {
                "video_id": video_id,
                "url": url,
                "title": title,
                "line_number": str(index),
                "line_type": line_type,
                "line_text": line,
            }
        )

    return rows


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extract candidate event/match/source lines from yt-dlp info.json descriptions.",
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=DEFAULT_INPUT_DIR,
        help=f"Input directory containing *.info.json. default: {DEFAULT_INPUT_DIR}",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output CSV path. default: {DEFAULT_OUTPUT}",
    )

    args = parser.parse_args()

    if not args.input_dir.exists():
        raise SystemExit(f"input directory not found: {args.input_dir}")

    rows: list[dict[str, str]] = []
    file_count = 0

    for _path, data in iter_info_json(args.input_dir):
        file_count += 1
        rows.extend(extract_candidates(data))

    write_csv(args.output, FIELDS, rows)

    print(f"[read] {file_count} info json file(s)")
    print(f"[rows] {len(rows)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
