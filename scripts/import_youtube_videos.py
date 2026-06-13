#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path

from arakaku.utils import DATA_SRC, ROOT, read_csv, write_csv


DEFAULT_INPUT = ROOT / "tmp" / "arakaku-youtube-videos.tsv"
DEFAULT_OUTPUT = DATA_SRC / "videos.csv"

FIELDS = [
    "video_id",
    "platform",
    "platform_video_id",
    "url",
    "title",
    "original_title",
    "channel_name",
    "published_at",
    "official_status",
    "video_type",
    "link_status",
    "duplicate_group_id",
    "duplicate_note",
    "notes",
]


def slugify(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_").lower()


def normalize_date(value: str) -> str:
    value = value.strip()

    if re.fullmatch(r"\d{8}", value):
        return f"{value[:4]}-{value[4:6]}-{value[6:]}"

    return ""


def classify_video_type(title: str) -> str:
    lowered = title.lower()

    if "full fight" in lowered or "full fight！" in title:
        return "full_fight"

    if "ダイジェスト" in title or "digest" in lowered:
        return "highlight"

    if "試合配信" in title or "試合観戦配信" in title or "live" in lowered:
        return "stream_archive"

    if "煽り" in title or "preview" in lowered:
        return "preview"

    if "short" in lowered or "#shorts" in lowered:
        return "short"

    if "インタビュー" in title or "interview" in lowered:
        return "interview"

    return "reference"


def read_existing_rows(path: Path) -> dict[tuple[str, str], dict[str, str]]:
    rows = {}
    for row in read_csv(path):
        platform = row.get("platform", "youtube")
        platform_video_id = row.get("platform_video_id", "")
        url = row.get("url", "")
        key = (platform, platform_video_id or url)
        rows[key] = row
    return rows


def parse_tsv(path: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        parts = line.split("\t")

        if len(parts) < 6:
            print(f"[warn] line {line_number}: expected 6 TSV fields")
            continue

        platform_video_id, url, title, channel_name, upload_date, duration = parts[:6]

        platform_video_id = platform_video_id.strip()
        url = url.strip()
        title = title.strip()

        if not platform_video_id or not url:
            print(f"[warn] line {line_number}: missing video id or url")
            continue

        rows.append(
            {
                "video_id": f"youtube_{slugify(platform_video_id)}",
                "platform": "youtube",
                "platform_video_id": platform_video_id,
                "url": url,
                "title": title,
                "original_title": title,
                "channel_name": channel_name.strip() or "アラカク通信",
                "published_at": normalize_date(upload_date),
                "official_status": "official",
                "video_type": classify_video_type(title),
                "link_status": "unlinked",
                "duplicate_group_id": "",
                "duplicate_note": "",
                "notes": f"yt-dlp channel export. duration={duration.strip()}",
            }
        )

    return rows


def merge_rows(
    existing: dict[tuple[str, str], dict[str, str]],
    imported_rows: list[dict[str, str]],
    *,
    preserve_existing: bool,
) -> list[dict[str, str]]:
    merged = dict(existing)

    for row in imported_rows:
        key = (row["platform"], row["platform_video_id"] or row["url"])

        if key in merged and preserve_existing:
            # Existing CSV is authoritative. yt-dlp may only fill blank cells,
            # never overwrite curated/factual values that are already present.
            old = merged[key]
            combined = dict(old)
            for field in FIELDS:
                if not (combined.get(field) or "").strip():
                    combined[field] = row.get(field, "")
            merged[key] = combined
        else:
            merged[key] = row

    return sorted(
        merged.values(),
        key=lambda row: (
            row.get("published_at", ""),
            row.get("video_type", ""),
            row.get("title", ""),
        ),
        reverse=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import official Arakaku YouTube video metadata from yt-dlp TSV output.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"Input TSV path. default: {DEFAULT_INPUT}",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output videos.csv path. default: {DEFAULT_OUTPUT}",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Replace existing rows instead of preserving curated fields.",
    )

    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"input file not found: {args.input}")

    imported_rows = parse_tsv(args.input)
    existing_rows = read_existing_rows(args.output)

    rows = merge_rows(
        existing_rows,
        imported_rows,
        preserve_existing=not args.replace,
    )

    write_csv(args.output, FIELDS, rows)

    print(f"[imported] {len(imported_rows)} row(s)")
    print(f"[total] {len(rows)} row(s)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
