#!/usr/bin/env python3
"""Build official_news.json and official_pages.json from CSV.

Images referenced as src="/filename.ext" are looked up in
tmp/arakaku-site/public/ and embedded as base64 data URIs.
"""
from __future__ import annotations

import base64
import mimetypes
import re
from pathlib import Path
from typing import Any

from arakaku_utils import (
    DATA_SRC,
    DOCS_DATA,
    ROOT,
    map_csv,
    write_json,
)

PUBLIC_DIR = ROOT / "tmp" / "arakaku-site" / "public"


def _embed_images(html: str) -> str:
    """Replace src="/filename" with base64 data URIs when the file exists."""
    def replace(m: re.Match) -> str:
        path = m.group(1).lstrip("/")
        img_path = PUBLIC_DIR / path
        if not img_path.exists():
            return m.group(0)
        mime, _ = mimetypes.guess_type(str(img_path))
        mime = mime or "application/octet-stream"
        data = base64.b64encode(img_path.read_bytes()).decode()
        return f'src="data:{mime};base64,{data}"'

    return re.sub(r'src="/([^"]+\.(png|jpg|jpeg|gif|svg|webp))"', replace, html)


def build_official_news() -> list[dict[str, Any]]:
    return map_csv(
        "official_news.csv",
        {
            "slug":     "slug",
            "title":    "title",
            "date":     "date",
            "category": "category",
            "summary":  "summary",
            "body_md":  "body_md",
        },
    )


def build_official_pages() -> list[dict[str, Any]]:
    rows = map_csv(
        "official_pages.csv",
        {
            "slug":        "slug",
            "title":       "title",
            "description": "description",
            "body_html":   "body_html",
        },
    )
    for row in rows:
        row["body_html"] = _embed_images(row["body_html"])
    return rows


JSON_BUILDERS = {
    "official_news.json":  build_official_news,
    "official_pages.json": build_official_pages,
}


def main() -> None:
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    for filename, build in JSON_BUILDERS.items():
        write_json(DOCS_DATA / filename, build())
    print("[done] official pages JSON build completed")


if __name__ == "__main__":
    main()
