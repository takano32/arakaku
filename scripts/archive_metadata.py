#!/usr/bin/env python3
# 役割: tmp/ の取得キャッシュ (youtube-api/*.json, note-html/*.html) から安定メタデータを
#   抽出し、コミット対象の data-src/archives/{youtube,note}.csv へ吸い上げるアーカイバ。
# アーキ上の位置: cache_youtube_api.py / cache_note_html.py が作るキャッシュが入力。
#   出力アーカイブは表示・検索・レビュー専用で、勝敗/出場者/選手同定/王座系譜は確認しない。
# 不変条件: archived_at は既存行の値を existing_archive_times() で引き継ぎ、新規行のみ
#   現在時刻を入れる -> 再実行しても差分が最小 (決定論的)。出力は display_id / filename で
#   ソート固定。YOUTUBE_FIELDS / NOTE_FIELDS は出力スキーマで、flat_data の作りと一致必須。
#   キャッシュに無い既存行 (削除・非公開・未取得) は消さずにそのまま残し、件数を表示する
#   -> アーカイブは再取得できなくなった後の記録として機能する。
# 関連スキル: .agents/skills/arakaku-source-pipeline/SKILL.md。
from datetime import datetime
import html
from html.parser import HTMLParser
from pathlib import Path

from arakaku.utils import DATA_SRC, ROOT, read_csv, write_csv
from arakaku.youtube import YOUTUBE_CACHE_DIR, iter_cached_videos

NOTE_CACHE = ROOT / "tmp" / "note-html"
YT_ARCHIVE = DATA_SRC / "archives/youtube.csv"
NOTE_ARCHIVE = DATA_SRC / "archives/note.csv"
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
NOTE_FIELDS = ["filename", "webpage_url", "title", "description", "archived_at"]


def existing_archive_rows(path: Path, key_field: str) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    return {row[key_field]: row for row in read_csv(path) if row.get(key_field)}


def keep_uncached_rows(rows: list[dict[str, str]], existing: dict[str, dict[str, str]], key_field: str, path: Path) -> None:
    cached_keys = {row[key_field] for row in rows}
    kept = [row for key, row in existing.items() if key not in cached_keys]
    for row in kept:
        print(f"[kept] {path.name}: {row[key_field]} is not in the cache; keeping the archived row")
    rows.extend(kept)


def current_archive_time() -> str:
    return datetime.now().isoformat(timespec="seconds")


# note 記事 HTML から <title> / canonical URL / meta[name=description] だけを拾う最小パーサ。
# 本文は取らない (アーカイブは表示・検索用メタデータに限る、という不変条件のため)。
class NoteMetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_title = False
        self.title_parts: list[str] = []
        self.canonical_url = ""
        self.description = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {name.lower(): value or "" for name, value in attrs}
        if tag.lower() == "title":
            self.in_title = True
        elif tag.lower() == "link" and attr.get("rel") == "canonical":
            self.canonical_url = attr.get("href", "")
        elif tag.lower() == "meta" and attr.get("name") == "description":
            self.description = html.unescape(attr.get("content", ""))

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)

    @property
    def title(self) -> str:
        return html.unescape("".join(self.title_parts)).strip()


def parse_note_metadata(html: str) -> dict[str, str]:
    parser = NoteMetadataParser()
    parser.feed(html)
    return {
        "title": parser.title,
        "webpage_url": parser.canonical_url,
        "description": parser.description,
    }


def archive_youtube():
    if not YOUTUBE_CACHE_DIR.exists():
        return

    existing = existing_archive_rows(YT_ARCHIVE, "display_id")
    new_archived_at = current_archive_time()
    raw_data = []
    for _, video in iter_cached_videos():
        display_id = video["platform_video_id"]
        raw_data.append({
            "display_id": display_id,
            "webpage_url": video["url"],
            "fulltitle": video["title"],
            "uploader": video["channel"],
            "upload_date": video["upload_date"],
            "duration_string": video["duration_string"],
            "view_count": video["view_count"],
            "like_count": video["like_count"],
            "description": video["description"],
            "thumbnail_sizes": video["thumbnail_sizes"],
            "archived_at": existing.get(display_id, {}).get("archived_at") or new_archived_at,
        })

    keep_uncached_rows(raw_data, existing, "display_id", YT_ARCHIVE)
    raw_data.sort(key=lambda row: row["display_id"])
    write_csv(YT_ARCHIVE, YOUTUBE_FIELDS, raw_data)
    print(f"[done] Archived {len(raw_data)} videos to {YT_ARCHIVE}")

def archive_notes():
    if not NOTE_CACHE.exists():
        return

    existing = existing_archive_rows(NOTE_ARCHIVE, "filename")
    new_archived_at = current_archive_time()
    raw_data = []
    for cache_file in sorted(NOTE_CACHE.glob("*.html")):
        metadata = parse_note_metadata(cache_file.read_text(encoding="utf-8"))

        raw_data.append({
            "filename": cache_file.name,
            "webpage_url": metadata["webpage_url"],
            "title": metadata["title"],
            "description": metadata["description"],
            "archived_at": existing.get(cache_file.name, {}).get("archived_at") or new_archived_at,
        })

    keep_uncached_rows(raw_data, existing, "filename", NOTE_ARCHIVE)
    raw_data.sort(key=lambda row: row["filename"])
    write_csv(NOTE_ARCHIVE, NOTE_FIELDS, raw_data)
    print(f"[done] Archived {len(raw_data)} notes to {NOTE_ARCHIVE}")

def main():
    archive_youtube()
    archive_notes()

if __name__ == "__main__":
    main()
