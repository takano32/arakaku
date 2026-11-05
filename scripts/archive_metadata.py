#!/usr/bin/env python3
# 役割: tmp/ の取得キャッシュ (youtube-api/*.json, note-html/*.html) から安定メタデータを
#   抽出し、コミット対象の data-src/archives/{youtube,note}.csv へ吸い上げるアーカイバの入口。
# アーキ上の位置: cache_youtube_api.py / cache_note_html.py が作るキャッシュが入力。行の規則は
#   arakaku/sources/archives.py、note のメタデータ抽出は arakaku/notes/html.py、YouTube の平坦化は
#   arakaku/youtube.py。出力アーカイブは表示・検索・レビュー専用。
# 不変条件: archived_at は既存行の値を引き継ぎ、新規行のみ現在時刻 -> 再実行しても差分が最小。
#   出力は display_id / filename でソート固定。キャッシュに無い既存行は消さずに残し、件数を表示する。
# 関連スキル: .agents/skills/arakaku-source-pipeline/SKILL.md。
from pathlib import Path

from arakaku.io import read_csv, write_csv
from arakaku.notes.html import parse_note_metadata
from arakaku.paths import DATA_SRC, NOTE_HTML_DIR, YOUTUBE_CACHE_DIR
from arakaku.sources.archives import (
    NOTE_FIELDS,
    YOUTUBE_FIELDS,
    archived_at_for,
    current_archive_time,
    index_rows,
    keep_uncached_rows,
    note_archive_row,
    youtube_archive_row,
)
from arakaku.youtube import iter_cached_videos

YT_ARCHIVE = DATA_SRC / "archives/youtube.csv"
NOTE_ARCHIVE = DATA_SRC / "archives/note.csv"


def existing_archive_rows(path: Path, key_field: str) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    return index_rows(read_csv(path), key_field)


def archive_youtube() -> None:
    if not YOUTUBE_CACHE_DIR.exists():
        return
    existing = existing_archive_rows(YT_ARCHIVE, "display_id")
    new_archived_at = current_archive_time()
    rows = [
        youtube_archive_row(video, archived_at_for(existing, video["platform_video_id"], new_archived_at))
        for _, video in iter_cached_videos(YOUTUBE_CACHE_DIR)
    ]
    keep_uncached_rows(rows, existing, "display_id", YT_ARCHIVE)
    rows.sort(key=lambda row: row["display_id"])
    write_csv(YT_ARCHIVE, YOUTUBE_FIELDS, rows)
    print(f"[done] Archived {len(rows)} videos to {YT_ARCHIVE}")


def archive_notes() -> None:
    if not NOTE_HTML_DIR.exists():
        return
    existing = existing_archive_rows(NOTE_ARCHIVE, "filename")
    new_archived_at = current_archive_time()
    rows = []
    for cache_file in sorted(NOTE_HTML_DIR.glob("*.html")):
        metadata = parse_note_metadata(cache_file.read_text(encoding="utf-8"))
        rows.append(note_archive_row(cache_file.name, metadata, archived_at_for(existing, cache_file.name, new_archived_at)))
    keep_uncached_rows(rows, existing, "filename", NOTE_ARCHIVE)
    rows.sort(key=lambda row: row["filename"])
    write_csv(NOTE_ARCHIVE, NOTE_FIELDS, rows)
    print(f"[done] Archived {len(rows)} notes to {NOTE_ARCHIVE}")


def main() -> None:
    archive_youtube()
    archive_notes()


if __name__ == "__main__":
    main()
