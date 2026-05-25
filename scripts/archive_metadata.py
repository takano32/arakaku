#!/usr/bin/env python3
"""
Archive ALL metadata from YouTube JSON cache and Note HTML cache into CSVs.
"""
import json
import csv
import re
from pathlib import Path
from datetime import datetime
from arakaku_utils import DATA_SRC, write_csv

YT_CACHE = Path("tmp/youtube-info")
NOTE_CACHE = Path("tmp/note-html")
YT_ARCHIVE = DATA_SRC / "archives/youtube_archives.csv"
NOTE_ARCHIVE = DATA_SRC / "archives/note_archives.csv"

def archive_youtube():
    if not YT_CACHE.exists():
        return

    raw_data = []
    all_keys = set()
    for cache_file in YT_CACHE.glob("*.json"):
        with open(cache_file, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                continue
        
        flat_data = {
            "display_id": data.get("display_id"),
            "fulltitle": data.get("fulltitle"),
            "uploader": data.get("uploader"),
            "upload_date": data.get("upload_date"),
            "duration_string": data.get("duration_string"),
            "view_count": data.get("view_count"),
            "like_count": data.get("like_count"),
            "description": data.get("description"),
            "webpage_url": data.get("webpage_url"),
            "archived_at": datetime.now().isoformat(),
        }
        raw_data.append(flat_data)
        all_keys.update(flat_data.keys())

    write_csv(YT_ARCHIVE, sorted(list(all_keys)), raw_data)
    print(f"[done] Archived {len(raw_data)} videos to {YT_ARCHIVE}")

def archive_notes():
    if not NOTE_CACHE.exists():
        return

    raw_data = []
    for cache_file in NOTE_CACHE.glob("*.html"):
        with open(cache_file, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Regex extraction
        title_match = re.search(r'<title>(.*?)</title>', content)
        url_match = re.search(r'property="og:url" content="(.*?)"', content)
        desc_match = re.search(r'name="description" content="(.*?)"', content)
        
        raw_data.append({
            "filename": cache_file.name,
            "title": title_match.group(1) if title_match else "",
            "webpage_url": url_match.group(1) if url_match else "",
            "description": desc_match.group(1) if desc_match else "",
            "archived_at": datetime.now().isoformat(),
        })

    write_csv(NOTE_ARCHIVE, ["filename", "title", "webpage_url", "description", "archived_at"], raw_data)
    print(f"[done] Archived {len(raw_data)} notes to {NOTE_ARCHIVE}")

def main():
    archive_youtube()
    archive_notes()

if __name__ == "__main__":
    main()
