#!/usr/bin/env python3
"""Generate aliases.csv from numbers_name_matches.csv, fighters.csv, and static config."""
from __future__ import annotations

# 役割: 別名→正規ID の対応表 aliases.csv を生成する入口。行の組み立てと固定の別名は
#       arakaku/derive/aliases.py にあり、ここは CSV の読み書きだけをする。
# アーキ上の位置: generate-stage2 で実行。fighters 別名は extract_numbers が作る
#       numbers_name_matches.csv（高信頼マッチ）と fighters.csv から導出する。
# 不変条件: 出力の列は arakaku.derive.aliases.FIELDS。
# 関連スキル: .agents/skills/arakaku-data-curator
from arakaku.derive.aliases import FIELDS, alias_rows
from arakaku.io import read_csv, write_csv
from arakaku.paths import DATA_SRC

OUTPUT = DATA_SRC / "aliases.csv"


def main() -> None:
    rows = alias_rows(read_csv(DATA_SRC / "numbers_name_matches.csv"), read_csv(DATA_SRC / "fighters.csv"))
    write_csv(OUTPUT, FIELDS, rows)
    print(f"[done] {len(rows)} alias rows written")


if __name__ == "__main__":
    main()
