#!/usr/bin/env python3
# 役割: 公式ニュース/固定ページの CSV を docs/data/official_news.json・official_pages.json に変換。
# アーキ上の位置: 入力 = data-src/official_news.csv / official_pages.csv、出力 = docs/data/official_*.json。
# 不変条件: 本文 HTML はそのまま出す。「/」始まりの画像・リンクは viewer (ui/sections/official.js
#   officialBodyHtml) が公式サイトの URL に書き換える。以前は tmp/arakaku-site/public/ があるときだけ画像を
#   base64 で埋め込んでいたが、手元 (1.9MB) と CI (15KB) で出力が変わるのでやめた (T.79、ユーザー判断)。
# 関連スキル: .agents/skills/arakaku-maintainer。
"""Build official_news.json and official_pages.json from CSV."""
from __future__ import annotations

from typing import Any

from arakaku.utils import (
    build_json_files,
    map_csv,
)

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
    return map_csv(
        "official_pages.csv",
        {
            "slug":        "slug",
            "title":       "title",
            "description": "description",
            "body_html":   "body_html",
        },
    )


JSON_BUILDERS = {
    "official_news.json":  build_official_news,
    "official_pages.json": build_official_pages,
}


def main() -> None:
    build_json_files(JSON_BUILDERS, "[done] official pages JSON build completed")


if __name__ == "__main__":
    main()
