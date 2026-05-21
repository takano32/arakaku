#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import re
import time
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTICLES_CSV = ROOT / "data-src" / "articles.csv"
OUT_DIR = ROOT / "tmp" / "note-html"

USER_AGENT = "Mozilla/5.0 arakaku-note-cache/1.0"


def cache_name(article_id: str, url: str) -> str:
    raw = article_id or url
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "_", raw).strip("_")
    return f"{safe}.html"


def fetch_note_html(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Cache note.com article HTML files under tmp/note-html.",
    )
    parser.add_argument("--articles", type=Path, default=ARTICLES_CSV)
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--sleep", type=float, default=0.5)
    parser.add_argument("--force", action="store_true", help="Refetch even if cache file already exists.")
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)

    with args.articles.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    fetched = 0
    skipped = 0
    failed = 0

    for row in rows:
        url = row.get("url", "")
        article_id = row.get("article_id", "")

        if "note.com" not in url:
            skipped += 1
            continue

        out_path = args.out_dir / cache_name(article_id, url)

        if out_path.exists() and not args.force:
            skipped += 1
            continue

        print(f"[fetch] {article_id} {url}")

        try:
            html = fetch_note_html(url)
            out_path.write_text(html, encoding="utf-8")
            fetched += 1

            if args.sleep > 0:
                time.sleep(args.sleep)

        except Exception as exc:
            print(f"[fail] {article_id} {url}: {exc}")
            failed += 1

    print(f"[fetched] {fetched}")
    print(f"[skipped] {skipped}")
    print(f"[failed] {failed}")
    print(f"[out] {args.out_dir}")

    # 404/deleted/private note articles should not stop the whole cache pipeline.
    # The source document builder will simply skip missing cache files.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
