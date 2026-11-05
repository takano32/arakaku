# 役割: YouTube Data API v3 (videos.list) のキャッシュ tmp/youtube-api/<id>.json を読み、
#   下流スクリプトが使う平坦なメタデータ dict に正規化する共有モジュール。あわせて、取得する側の
#   純粋な規則 (API の URL、キャッシュする行の判定、動画種別の推定、Shorts の判定、videos.csv の新しい行) も持つ。
# アーキ上の位置: writer = cache_youtube_api.py・discover_youtube_videos.py (urllib での取得はスクリプトに残す)。
#   reader = archive_metadata.py / build_source_documents.py (キャッシュの場所を iter_cached_videos に渡す)。
#   API 項目名の解釈はここに一元化する。arakaku.paths・arakaku.io は import しない (sources/documents.py が import するため)。
# 不変条件: キャッシュ 1 ファイル = API の items[] 1 要素そのまま (加工しない)。
#   upload_date は publishedAt の UTC 日付を YYYYMMDD、duration_string は H:MM:SS / M:SS / S。
#   thumbnail_sizes は snippet.thumbnails のキーを THUMBNAIL_SIZE_ORDER 順に空白区切り。
#   videos.csv の video_id は "youtube_" + slugify(platform_video_id)。
# 関連スキル: .agents/skills/arakaku-source-pipeline/SKILL.md。
import json
import re
import urllib.parse
from pathlib import Path

# YouTube の画像サイズ名を小さい順に並べたもの。standard = sddefault、maxres = maxresdefault。
THUMBNAIL_SIZE_ORDER = ["default", "medium", "high", "standard", "maxres"]

ISO_DURATION_RE = re.compile(r"^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")

API = "https://www.googleapis.com/youtube/v3"
BATCH_SIZE = 50  # videos.list の id 指定上限


def api_url(resource: str, params: dict) -> str:
    return f"{API}/{resource}?{urllib.parse.urlencode(params)}"


def video_details_url(video_ids: list[str]) -> str:
    """cache_youtube_api.py がキャッシュする videos.list (snippet・contentDetails・statistics) の URL。"""
    return api_url("videos", {
        "part": "snippet,contentDetails,statistics",
        "id": ",".join(video_ids),
        "maxResults": BATCH_SIZE,
    })


def is_cacheable_video(row: dict[str, str]) -> bool:
    """videos.csv の行のうち、API で取得できるもの (YouTube で platform_video_id がある)。"""
    return row.get("platform") == "youtube" and bool(row.get("platform_video_id", ""))


def duration_seconds(iso_duration: str) -> int | None:
    """ISO 8601 の長さ (例: PT1M5S) を秒にする。文字列全体が形に合わなければ None。"""
    m = ISO_DURATION_RE.fullmatch(iso_duration)
    if not m:
        return None
    d, h, mi, se = (int(x or 0) for x in m.groups())
    return ((d * 24 + h) * 60 + mi) * 60 + se


# video_id の作り方と動画種別の推定は、以前の yt-dlp 取り込み (import_youtube_videos.py、T84 で削除) と同じ。
def slugify(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_").lower()


def classify_video_type(title: str) -> str:
    lowered = title.lower()

    if "full fight" in lowered or "full fight！" in title or "フルファイト" in title:
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


def is_short(title: str, seconds: int | None) -> bool:
    # videos.csv は最初の取り込みから Shorts を含まない (チャンネルの「動画」タブが対象だった)。
    # タイトルに #shorts が無い 1 分以内の縦動画もあるので、長さでも判定する。
    return classify_video_type(title) == "short" or (seconds is not None and seconds <= 60)


def video_csv_id(platform_video_id: str) -> str:
    return f"youtube_{slugify(platform_video_id)}"


def new_video_row(platform_video_id: str, title: str) -> dict[str, str]:
    """一覧で見つけた動画の videos.csv の行。タイトルは API の値そのまま (title は空白を 1 つにまとめる)。"""
    return {
        "video_id": video_csv_id(platform_video_id),
        "platform": "youtube",
        "platform_video_id": platform_video_id,
        "url": f"https://www.youtube.com/watch?v={platform_video_id}",
        "title": " ".join(title.split()),
        "original_title": title,
        "official_status": "official",
        "video_type": classify_video_type(title),
        "duplicate_group_id": "",
        "duplicate_note": "",
        "notes": "",
    }


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


def thumbnail_sizes(thumbnails: dict) -> str:
    known = [size for size in THUMBNAIL_SIZE_ORDER if size in thumbnails]
    unknown = sorted(size for size in thumbnails if size not in THUMBNAIL_SIZE_ORDER)
    return " ".join(known + unknown)


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
        "thumbnail_sizes": thumbnail_sizes(snippet.get("thumbnails", {})),
    }


def iter_cached_videos(cache_dir: Path):
    # キャッシュの場所 (paths.YOUTUBE_CACHE_DIR) は呼ぶ側が渡す。ここは arakaku.paths を import しない (T112.6.2)。
    for path in sorted(cache_dir.glob("*.json")):
        try:
            item = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            # 壊れたキャッシュを飛ばすと、その動画の本文とアーカイブ行が黙って消える。止めて報告する (T112.4.12)。
            raise ValueError(f"{path}: invalid YouTube cache JSON: {exc} (delete it and rerun make cache-youtube-api)") from exc
        yield path, flatten_video(item)
