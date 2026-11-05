#!/usr/bin/env python3
"""List every upload of the official YouTube channel and append the ones missing from videos.csv."""
from __future__ import annotations

# 役割: YouTube Data API (channels.list → uploads プレイリスト → playlistItems.list) で公式チャンネルの
#       全動画を列挙し、data-src/videos.csv に無い動画の行を追記する (T.87)。cache_youtube_api.py は
#       videos.csv にある ID しか取らないので、これが無いと新しい動画が入らない。
#       行の組み立て・動画種別の推定・Shorts の判定・API の URL は arakaku/youtube.py にあり、
#       ここは urllib での取得と CSV の読み書きだけをする。
# アーキ上の位置: 取得パイプラインの入口 (`make discover-youtube-videos`、cache-youtube-api の前段)。
#       追記した行を起点に cache_youtube_api.py → archive_metadata.py → build_source_documents.py が進む。
# 不変条件: 既存行は変えない (platform_video_id で判定して未登録の行だけ追記する)。タイトルは API の
#       値そのまま (title・original_title とも)。動画種別はタイトルからの推定 (classify_video_type)。
#       試合・大会・選手への紐づけはしない。API キーは環境変数 YOUTUBE_API_KEY から読み、ヘッダで送る。
# 関連スキル: .agents/skills/arakaku-source-pipeline/SKILL.md

import argparse
import json
import os
import sys
import urllib.request

from arakaku.io import read_csv, write_csv
from arakaku.paths import DATA_SRC
from arakaku.schema import CSV_HEADERS
from arakaku.youtube import api_url, duration_seconds, is_short, new_video_row

VIDEOS_CSV = DATA_SRC / "videos.csv"
CHANNEL_HANDLE = "@アラカク通信"


def api_get(api_key: str, resource: str, params: dict[str, str]) -> dict:
    request = urllib.request.Request(api_url(resource, params), headers={"X-Goog-Api-Key": api_key})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def uploads(api_key: str, handle: str) -> list[dict[str, str]]:
    channels = api_get(api_key, "channels", {"part": "contentDetails", "forHandle": handle}).get("items", [])
    if not channels:
        raise SystemExit(f"[error] channel not found: {handle}")
    playlist_id = channels[0]["contentDetails"]["relatedPlaylists"]["uploads"]
    videos, page_token = [], ""
    while True:
        params = {"part": "snippet,contentDetails", "playlistId": playlist_id, "maxResults": "50"}
        if page_token:
            params["pageToken"] = page_token
        page = api_get(api_key, "playlistItems", params)
        for item in page.get("items", []):
            videos.append({
                "id": item["contentDetails"]["videoId"],
                "title": item["snippet"].get("title", ""),
                "published_at": item["contentDetails"].get("videoPublishedAt", ""),
            })
        page_token = page.get("nextPageToken", "")
        if not page_token:
            return videos


def durations(api_key: str, video_ids: list[str]) -> dict[str, int]:
    """Seconds per video from videos.list contentDetails.duration (ISO 8601, e.g. PT1M5S)."""
    seconds = {}
    for start in range(0, len(video_ids), 50):
        page = api_get(api_key, "videos", {"part": "contentDetails", "id": ",".join(video_ids[start:start + 50])})
        for item in page.get("items", []):
            value = duration_seconds(item["contentDetails"].get("duration", ""))
            if value is not None:
                seconds[item["id"]] = value
    return seconds


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--handle", default=CHANNEL_HANDLE)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--include-shorts", action="store_true", help="Also add Shorts (left out by default, like the existing rows).")
    args = parser.parse_args()

    api_key = os.environ.get("YOUTUBE_API_KEY", "")
    if not api_key:
        print("[error] YOUTUBE_API_KEY is not set", file=sys.stderr)
        return 1

    rows = read_csv(VIDEOS_CSV)
    known = {row["platform_video_id"] for row in rows}
    known_ids = {row["video_id"] for row in rows}
    listed = uploads(api_key, args.handle)
    missing = [v for v in listed if v["id"] not in known]
    seconds = durations(api_key, [v["id"] for v in missing])
    shorts = [v for v in missing if is_short(v["title"], seconds.get(v["id"]))]
    if not args.include_shorts:
        missing = [v for v in missing if v not in shorts]
    added = []
    # 古い順に足す (videos.csv の行順は reorder_data.py が決める)。
    for video in sorted(missing, key=lambda v: v["published_at"]):
        row = new_video_row(video["id"], video["title"])
        video_id = row["video_id"]
        if video_id in known_ids:
            raise SystemExit(f"[error] video_id collision after lowercasing: {video_id} ({video['id']})")
        known_ids.add(video_id)
        added.append(row)
    print(f"[listed] {len(listed)}  [known] {len(known & {v['id'] for v in listed})}  [shorts] {len(shorts)}"
          f"{'' if args.include_shorts else ' (skipped)'}  [added] {len(added)}")
    for row in added:
        print(f"{row['platform_video_id']}\t{row['video_type']}\t{row['title']}")
    if added and not args.dry_run:
        write_csv(VIDEOS_CSV, CSV_HEADERS["videos.csv"], rows + added)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
