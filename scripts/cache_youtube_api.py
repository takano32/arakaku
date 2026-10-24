#!/usr/bin/env python3
from __future__ import annotations

# 役割: videos.csv の YouTube 動画を YouTube Data API v3 (videos.list) で取得し、
#   items[] の各要素をそのまま tmp/youtube-api/<platform_video_id>.json にキャッシュする取得専用スクリプト。
# アーキ上の位置: パイプライン最上流の取得段。読み取りと正規化は arakaku/youtube.py が担う。
# 不変条件: tmp/ はキャッシュでありコミットしない。API キーは環境変数 YOUTUBE_API_KEY から読み、
#   URL ではなくヘッダで送る。--force 無しなら既存ファイルはスキップ。API が返さなかった
#   (削除・非公開など) 動画が 1 件でもあれば終了コード 1 を返す。
# 関連スキル: .agents/skills/arakaku-source-pipeline/SKILL.md。
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from arakaku.utils import DATA_SRC, read_csv
from arakaku.youtube import YOUTUBE_CACHE_DIR

VIDEOS_CSV = DATA_SRC / "videos.csv"
API_URL = "https://www.googleapis.com/youtube/v3/videos"
BATCH_SIZE = 50  # videos.list の id 指定上限


def fetch_items(api_key: str, video_ids: list[str]) -> list[dict]:
    query = urllib.parse.urlencode({
        "part": "snippet,contentDetails,statistics",
        "id": ",".join(video_ids),
        "maxResults": BATCH_SIZE,
    })
    request = urllib.request.Request(f"{API_URL}?{query}", headers={"X-Goog-Api-Key": api_key})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response).get("items", [])


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Cache YouTube Data API video resources under tmp/youtube-api.",
    )
    parser.add_argument("--videos", type=Path, default=VIDEOS_CSV)
    parser.add_argument("--out-dir", type=Path, default=YOUTUBE_CACHE_DIR)
    parser.add_argument("--force", action="store_true", help="Refetch even if the cache file already exists.")
    args = parser.parse_args()

    api_key = os.environ.get("YOUTUBE_API_KEY", "")
    if not api_key:
        print("[error] YOUTUBE_API_KEY is not set", file=sys.stderr)
        return 1

    args.out_dir.mkdir(parents=True, exist_ok=True)

    video_ids = []
    skipped = 0
    for row in read_csv(args.videos):
        platform_video_id = row.get("platform_video_id", "")
        if row.get("platform") != "youtube" or not platform_video_id:
            skipped += 1
            continue
        if (args.out_dir / f"{platform_video_id}.json").exists() and not args.force:
            skipped += 1
            continue
        video_ids.append(platform_video_id)

    fetched = 0
    missing = []
    for start in range(0, len(video_ids), BATCH_SIZE):
        batch = video_ids[start:start + BATCH_SIZE]
        try:
            items = fetch_items(api_key, batch)
        except urllib.error.HTTPError as exc:
            print(f"[error] HTTP {exc.code}: {exc.read().decode('utf-8', 'replace')}", file=sys.stderr)
            return 1

        returned = set()
        for item in items:
            out_path = args.out_dir / f"{item['id']}.json"
            out_path.write_text(json.dumps(item, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            returned.add(item["id"])
            fetched += 1
        missing.extend(video_id for video_id in batch if video_id not in returned)

    for video_id in missing:
        print(f"[missing] {video_id} https://www.youtube.com/watch?v={video_id}")

    print(f"[fetched] {fetched}")
    print(f"[skipped] {skipped}")
    print(f"[missing] {len(missing)}")
    print(f"[out] {args.out_dir}")

    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
