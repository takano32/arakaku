# 役割: YouTube Data API v3 (videos.list) のキャッシュ tmp/youtube-api/<id>.json を読み、
#   下流スクリプトが使う平坦なメタデータ dict に正規化する共有モジュール。
# アーキ上の位置: writer = cache_youtube_api.py。reader = archive_metadata.py /
#   build_source_documents.py / import_youtube_descriptions.py。API 項目名の解釈はここに一元化する。
# 不変条件: キャッシュ 1 ファイル = API の items[] 1 要素そのまま (加工しない)。
#   upload_date は publishedAt の UTC 日付を YYYYMMDD、duration_string は H:MM:SS / M:SS / S。
# 関連スキル: .agents/skills/arakaku-source-pipeline/SKILL.md。
import json
import re
from pathlib import Path

from arakaku.utils import ROOT

YOUTUBE_CACHE_DIR = ROOT / "tmp" / "youtube-api"

ISO_DURATION_RE = re.compile(r"^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")


def duration_string(iso_duration: str) -> str:
    match = ISO_DURATION_RE.match(iso_duration or "")
    if not iso_duration or not match:
        return ""
    days, hours, minutes, seconds = (int(part or 0) for part in match.groups())
    hours += days * 24
    if hours:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    if minutes:
        return f"{minutes}:{seconds:02d}"
    return str(seconds)


def flatten_video(item: dict) -> dict[str, str]:
    snippet = item.get("snippet", {})
    statistics = item.get("statistics", {})
    platform_video_id = item.get("id", "")
    return {
        "platform_video_id": platform_video_id,
        "url": f"https://www.youtube.com/watch?v={platform_video_id}",
        "title": snippet.get("title", ""),
        "channel": snippet.get("channelTitle", ""),
        "upload_date": snippet.get("publishedAt", "")[:10].replace("-", ""),
        "duration_string": duration_string(item.get("contentDetails", {}).get("duration", "")),
        "view_count": statistics.get("viewCount", ""),
        "like_count": statistics.get("likeCount", ""),
        "description": snippet.get("description", ""),
    }


def iter_cached_videos(cache_dir: Path = YOUTUBE_CACHE_DIR):
    for path in sorted(cache_dir.glob("*.json")):
        try:
            item = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"[warn] invalid YouTube cache JSON skipped: {path}: {exc}")
            continue
        yield path, flatten_video(item)
