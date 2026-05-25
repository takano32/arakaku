#!/usr/bin/env python3
import json
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path

from arakaku_utils import DATA_SRC, read_csv, write_csv

YT_CACHE = Path("tmp/youtube-info")
NOTE_CACHE = Path("tmp/note-html")
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
    "archived_at",
]
NOTE_FIELDS = ["filename", "webpage_url", "title", "description", "archived_at"]


def existing_archive_times(path: Path, key_field: str) -> dict[str, str]:
    return {
        row[key_field]: row.get("archived_at", "")
        for row in read_csv(path)
        if row.get(key_field)
    }


def current_archive_time() -> str:
    return datetime.now().isoformat(timespec="seconds")


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
            self.description = attr.get("content", "")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)

    @property
    def title(self) -> str:
        return "".join(self.title_parts).strip()


def parse_note_metadata(html: str) -> dict[str, str]:
    parser = NoteMetadataParser()
    parser.feed(html)
    return {
        "title": parser.title,
        "webpage_url": parser.canonical_url,
        "description": parser.description,
    }


def archive_youtube():
    if not YT_CACHE.exists():
        return

    archived_at_by_display_id = existing_archive_times(YT_ARCHIVE, "display_id")
    new_archived_at = current_archive_time()
    raw_data = []
    for cache_file in sorted(YT_CACHE.glob("*.json")):
        with open(cache_file, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                print(f"[warn] Invalid YouTube cache JSON skipped: {cache_file}")
                continue

        display_id = data.get("display_id") or cache_file.name.removesuffix(".info.json").removesuffix(".json")
        flat_data = {
            "display_id": display_id,
            "webpage_url": data.get("webpage_url") or "",
            "fulltitle": data.get("fulltitle") or data.get("title") or "",
            "uploader": data.get("uploader") or data.get("channel") or "",
            "upload_date": data.get("upload_date") or "",
            "duration_string": data.get("duration_string") or "",
            "view_count": data.get("view_count") or "",
            "like_count": data.get("like_count") or "",
            "description": data.get("description") or "",
            "archived_at": archived_at_by_display_id.get(display_id) or new_archived_at,
        }
        raw_data.append(flat_data)

    raw_data.sort(key=lambda row: row["display_id"])
    write_csv(YT_ARCHIVE, YOUTUBE_FIELDS, raw_data)
    print(f"[done] Archived {len(raw_data)} videos to {YT_ARCHIVE}")

def archive_notes():
    if not NOTE_CACHE.exists():
        return

    archived_at_by_filename = existing_archive_times(NOTE_ARCHIVE, "filename")
    new_archived_at = current_archive_time()
    raw_data = []
    for cache_file in sorted(NOTE_CACHE.glob("*.html")):
        metadata = parse_note_metadata(cache_file.read_text(encoding="utf-8"))

        raw_data.append({
            "filename": cache_file.name,
            "webpage_url": metadata["webpage_url"],
            "title": metadata["title"],
            "description": metadata["description"],
            "archived_at": archived_at_by_filename.get(cache_file.name) or new_archived_at,
        })

    raw_data.sort(key=lambda row: row["filename"])
    write_csv(NOTE_ARCHIVE, NOTE_FIELDS, raw_data)
    print(f"[done] Archived {len(raw_data)} notes to {NOTE_ARCHIVE}")

def main():
    archive_youtube()
    archive_notes()

if __name__ == "__main__":
    main()
