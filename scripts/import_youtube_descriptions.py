#!/usr/bin/env python3
from __future__ import annotations

# 役割: tmp/youtube-info/*.info.json の概要欄を行単位で分類し、イベント/対戦/URL/結果
#   らしい行だけを review/youtube_description_candidates.csv に抽出するレビュー補助。
# アーキ上の位置: cache_youtube_info.py が作る info JSON が入力。出力は review/ 配下の
#   候補で、人手レビュー用途。正規 data-src を直接書かない。
# 不変条件: 出力は確定事実ではなく分類候補。URL/対戦の判定パターンは複数スクリプトと
#   挙動を揃えるため arakaku.textparse を共有 (ここで再定義しない)。一方 EVENT_RE /
#   RESULT_RE はこのスクリプト固有語彙なので textparse へ移さない。
# 関連スキル: .agents/skills/arakaku-source-pipeline/SKILL.md。
import argparse
import json
import re
from pathlib import Path

from arakaku.textparse import NOTE_URL_RE, VS_RE, YOUTUBE_URL_RE
from arakaku.utils import ROOT, write_csv


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


EVENT_RE = re.compile(
    r"(ターゲット|エンペラー|マウンテン[・\- ]?ヒーローズ|マウンテンヒーローズ|MAXバウト|エリートスピリッツ|アラカクライブ)"
)
RESULT_RE = re.compile(r"(KO|TKO|一本|判定|ドロー|ノーコンテスト|失格|勝利|敗北|防衛|王座|タイトル)", re.IGNORECASE)


# 判定順が優先順位。URL 種別 -> 対戦カード -> イベント -> 結果/タイトル の順で先勝ち。
# "other" は extract_candidates で捨てられるため、ここで拾わない行は出力されない。
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
