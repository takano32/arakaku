#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VIDEOS_CSV = ROOT / "data-src" / "videos.csv"
OUT_DIR = ROOT / "tmp" / "youtube-info"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Cache YouTube yt-dlp info JSON files under tmp/youtube-info.",
    )
    parser.add_argument("--videos", type=Path, default=VIDEOS_CSV)
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--force", action="store_true", help="Refetch even if info JSON already exists.")
    parser.add_argument("--limit", type=int, default=0, help="Optional max number of videos to fetch.")
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)

    with args.videos.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    fetched = 0
    skipped = 0
    failed = 0

    for row in rows:
        platform = row.get("platform", "")
        platform_video_id = row.get("platform_video_id", "")
        url = row.get("url", "")

        if platform != "youtube" or not platform_video_id or not url:
            skipped += 1
            continue

        out_path = args.out_dir / f"{platform_video_id}.info.json"

        if out_path.exists() and not args.force:
            skipped += 1
            continue

        if args.limit and fetched >= args.limit:
            break

        print(f"[fetch] {platform_video_id} {row.get('title', '')}")

        result = subprocess.run(
            [
                "yt-dlp",
                "--no-update",
                "--skip-download",
                "--write-info-json",
                "--no-write-playlist-metafiles",
                "--paths",
                str(args.out_dir),
                "--output",
                f"{platform_video_id}.%(ext)s",
                url,
            ],
            text=True,
        )

        if result.returncode == 0 and out_path.exists():
            fetched += 1
        else:
            print(f"[fail] {platform_video_id} {url}")
            failed += 1

    print(f"[fetched] {fetched}")
    print(f"[skipped] {skipped}")
    print(f"[failed] {failed}")
    print(f"[out] {args.out_dir}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
