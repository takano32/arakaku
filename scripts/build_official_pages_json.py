#!/usr/bin/env python3
# 役割: 公式ニュース/固定ページの CSV を読み、docs/data/official_news.json・official_pages.json を書く入口。
# アーキ上の位置: 入力 = data-src/official_news.csv / official_pages.csv (generate_official_pages_csv.py
#   が生成)、組み立ては arakaku/build/official.py (pages_json_builders)、書き出しは arakaku/io.py。
# 不変条件: ここにはロジックを置かない。本文 HTML はそのまま出す (詳細は arakaku/build/official.py)。
# 関連スキル: .agents/skills/arakaku-maintainer。
"""Build official_news.json and official_pages.json from CSV."""
from __future__ import annotations

from arakaku.build.official import pages_json_builders
from arakaku.io import build_json_files, read_csv
from arakaku.paths import DATA_SRC, DOCS_DATA


def main() -> None:
    builders = pages_json_builders(
        read_csv(DATA_SRC / "official_news.csv"),
        read_csv(DATA_SRC / "official_pages.csv"),
    )
    build_json_files(DOCS_DATA, builders, "[done] official pages JSON build completed")


if __name__ == "__main__":
    main()
