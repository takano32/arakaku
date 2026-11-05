#!/usr/bin/env python3
# 役割: Apple Numbers 由来の numbers_*.csv を読み、docs/data/numbers_*.json を書く入口。
# アーキ上の位置: 入力 = data-src/numbers_*.csv (extract_numbers.py が生成)、組み立ては
#   arakaku/build/numbers.py、書き出しは arakaku/io.py。build_json.py とは別系統の比較レイヤ。
# 不変条件: ここにはロジックを置かない。Numbers の事実を捏造・改変しない。
# 関連スキル: .agents/skills/arakaku-numbers-pipeline。
"""Build numbers_*.json from numbers_*.csv (sourced from アラカク選手名鑑.numbers)."""
from __future__ import annotations

from arakaku.build.numbers import json_builders
from arakaku.io import build_json_files, read_csv
from arakaku.paths import DATA_SRC, DOCS_DATA


def main() -> None:
    builders = json_builders(
        read_csv(DATA_SRC / "numbers_fighters.csv"),
        read_csv(DATA_SRC / "numbers_name_matches.csv"),
        read_csv(DATA_SRC / "numbers_fight_records.csv"),
    )
    build_json_files(DOCS_DATA, builders, "[done] numbers JSON build completed")


if __name__ == "__main__":
    main()
