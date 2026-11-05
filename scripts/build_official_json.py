#!/usr/bin/env python3
# 役割: 公式サイト由来の official_*.csv (players/tournaments/matches/history) を読み、
#   docs/data/official_*.json を書く入口。
# アーキ上の位置: 入力 = data-src/official_*.csv (generate_official_csvs.py が生成)、組み立ては
#   arakaku/build/official.py (json_builders)、書き出しは arakaku/io.py。
#   本文 HTML/ニュースは別の入口 build_official_pages_json.py が担当。
# 不変条件: ここにはロジックを置かない。公式データを事実として保持し改変しない。
# 関連スキル: .agents/skills/arakaku-maintainer。
"""Build official_*.json from official_*.csv (data sourced from official site)."""
from __future__ import annotations

from arakaku.build.official import json_builders
from arakaku.io import build_json_files, read_csv
from arakaku.paths import DATA_SRC, DOCS_DATA


def main() -> None:
    builders = json_builders(
        read_csv(DATA_SRC / "official_players.csv"),
        read_csv(DATA_SRC / "official_tournaments.csv"),
        read_csv(DATA_SRC / "official_matches.csv"),
        read_csv(DATA_SRC / "official_history.csv"),
    )
    build_json_files(DOCS_DATA, builders, "[done] official JSON build completed")


if __name__ == "__main__":
    main()
