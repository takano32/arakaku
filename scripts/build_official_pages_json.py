#!/usr/bin/env python3
# 役割: 公式ニュース/固定ページの CSV を docs/data/official_news.json・official_pages.json に変換。
#   ページ本文 HTML 内の相対画像 src を base64 data URI に埋め込み、追加の画像配信なしで
#   静的 GitHub Pages から自己完結表示できるようにする (AGENTS.md の静的ホスティング要件)。
# アーキ上の位置: 入力 = data-src/official_news.csv / official_pages.csv、
#   画像参照元 = tmp/arakaku-site/public/ (コミットしないローカル素材)、出力 = docs/data/official_*.json。
# 不変条件: 画像ファイルが見つからない src は書き換えず元のまま残す (リンク切れを捏造で隠さない)。
# 関連スキル: .agents/skills/arakaku-maintainer。
"""Build official_news.json and official_pages.json from CSV.

Images referenced as src="/filename.ext" are looked up in
tmp/arakaku-site/public/ and embedded as base64 data URIs.
"""
from __future__ import annotations

import base64
import mimetypes
import re
from typing import Any

from arakaku.utils import (
    ROOT,
    build_json_files,
    map_csv,
)

PUBLIC_DIR = ROOT / "tmp" / "arakaku-site" / "public"


def _embed_images(html: str) -> str:
    """Replace src="/filename" with base64 data URIs when the file exists."""
    def replace(m: re.Match) -> str:
        path = m.group(1).lstrip("/")
        img_path = PUBLIC_DIR / path
        # 実ファイルが無ければ置換せず元の src= 文字列を返す (リンク切れをそのまま見せる)。
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
    build_json_files(JSON_BUILDERS, "[done] official pages JSON build completed")


if __name__ == "__main__":
    main()
