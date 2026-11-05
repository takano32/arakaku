# 役割: 取得キャッシュ (youtube-api/*.json, note-html/*.html) から、コミット対象の
#   data-src/archives/{youtube,note}.csv の行を作る規則。
# アーキ上の位置: scripts/archive_metadata.py がキャッシュと既存アーカイブを読んでここに渡す。
#   YouTube の平坦化は arakaku/youtube.py、note のメタデータ抽出は arakaku/notes/html.py。
# 不変条件:
#   - archived_at は既存行の値を引き継ぎ、新規行だけ現在時刻 (archived_at_for)。再実行しても差分が最小。
#   - キャッシュに無い既存行 (削除・非公開・未取得) は keep_uncached_rows で消さずに残す
#     -> アーカイブは再取得できなくなった後の記録として機能する。
#   - YOUTUBE_FIELDS / NOTE_FIELDS が出力スキーマ。行を作る関数のキーと一致させる。
#   - アーカイブは表示・検索・レビュー専用で、勝敗/出場者/選手同定/王座系譜は確認しない。
# 関連スキル: .agents/skills/arakaku-source-pipeline。
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from arakaku.schema import CsvRow

YOUTUBE_FIELDS = [
    "display_id",
    "webpage_url",
    "fulltitle",
    "uploader",
    "upload_date",
    "duration_string",
    "view_count",
    "like_count",
    "description",
    "thumbnail_sizes",
    "archived_at",
]
NOTE_FIELDS = ["filename", "webpage_url", "title", "description", "published_at", "archived_at"]


def current_archive_time() -> str:
    # 新しい行は fetched_at と同じく UTC の時差つき (T.112.4.13)。以前の行は時差の無いローカル時刻で、
    # どの時間帯で書いたか分からないので書き換えない (archived_at_for が既存の値を引き継ぐ)。
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def index_rows(rows: list[CsvRow], key_field: str) -> dict[str, CsvRow]:
    return {row[key_field]: row for row in rows if row.get(key_field)}


def archived_at_for(existing: dict[str, CsvRow], key: str, new_archived_at: str) -> str:
    return existing.get(key, {}).get("archived_at") or new_archived_at


def youtube_archive_row(video: dict[str, str], archived_at: str) -> dict[str, str]:
    """arakaku.youtube.flatten_video の形の 1 件から archives/youtube.csv の行を作る。"""
    return {
        "display_id": video["platform_video_id"],
        "webpage_url": video["url"],
        "fulltitle": video["title"],
        "uploader": video["channel"],
        "upload_date": video["upload_date"],
        "duration_string": video["duration_string"],
        "view_count": video["view_count"],
        "like_count": video["like_count"],
        "description": video["description"],
        "thumbnail_sizes": video["thumbnail_sizes"],
        "archived_at": archived_at,
    }


def note_archive_row(filename: str, metadata: dict[str, str], archived_at: str) -> dict[str, str]:
    """arakaku.notes.html.parse_note_metadata の結果から archives/note.csv の行を作る。"""
    return {
        "filename": filename,
        "webpage_url": metadata["webpage_url"],
        "title": metadata["title"],
        "description": metadata["description"],
        "published_at": metadata["published_at"],
        "archived_at": archived_at,
    }


def keep_uncached_rows(rows: list[dict[str, str]], existing: dict[str, CsvRow], key_field: str, path: Path) -> None:
    cached_keys = {row[key_field] for row in rows}
    kept = [row for key, row in existing.items() if key not in cached_keys]
    for row in kept:
        print(f"[kept] {path.name}: {row[key_field]} is not in the cache; keeping the archived row")
    rows.extend(kept)
