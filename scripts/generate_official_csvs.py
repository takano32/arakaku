#!/usr/bin/env python3
"""Generate official_*.csv from tmp/arakaku-site/*.json."""
from __future__ import annotations

import json

# 役割: 公式サイト（別リポジトリ takano32/arakaku-site）の JSON エクスポートを
#       official_players / official_tournaments / official_matches / official_history の
#       4 CSV に転記する入口。キーの写し方は arakaku/official/csvs.py にあり、ここは読み書きだけをする。
# アーキ上の位置: generate-stage1 で実行。入力 tmp/arakaku-site/data/*.json は git 管理外で、
#       事前に公式リポジトリから取得しておく必要がある（無ければ load() で例外）。出力 CSV は
#       build_official_json.py が読み、ビューアが「公式データ」レイヤとして参照する。
# 不変条件: official_* は公式由来の比較データであり、本リポジトリの canonical CSV とは別系統。
#       人手検証済みの値が優先される（AGENTS.md のパイプライン方針）。1 つ読んでは 1 つ書く
#       (途中の JSON が無ければ、それより前の CSV だけが書き換わる)。
# 関連スキル: .agents/skills/arakaku-data-curator
from arakaku.io import write_csv
from arakaku.official.csvs import (
    HISTORY_FIELDS,
    MATCH_FIELDS,
    PLAYER_FIELDS,
    TOURNAMENT_FIELDS,
    history_rows,
    match_rows,
    player_rows,
    tournament_rows,
)
from arakaku.paths import DATA_SRC, OFFICIAL_SITE_DIR

# 公式サイトの JSON エクスポート置き場（git 管理外、要事前取得）。
SRC = OFFICIAL_SITE_DIR / "data"


def load(filename: str) -> list:
    return json.loads((SRC / filename).read_text(encoding="utf-8"))


def generate_players() -> None:
    rows = player_rows(load("players.json"))
    write_csv(DATA_SRC / "official_players.csv", PLAYER_FIELDS, rows)
    print(f"[done] {len(rows)} player rows written")


def generate_tournaments() -> None:
    rows = tournament_rows(load("tournaments.json"))
    write_csv(DATA_SRC / "official_tournaments.csv", TOURNAMENT_FIELDS, rows)
    print(f"[done] {len(rows)} tournament rows written")


def generate_matches() -> None:
    rows = match_rows(load("matches.json"))
    write_csv(DATA_SRC / "official_matches.csv", MATCH_FIELDS, rows)
    print(f"[done] {len(rows)} match rows written")


def generate_history() -> None:
    rows = history_rows(load("history.json"))
    write_csv(DATA_SRC / "official_history.csv", HISTORY_FIELDS, rows)
    print(f"[done] {len(rows)} history rows written")


def main() -> None:
    generate_players()
    generate_tournaments()
    generate_matches()
    generate_history()


if __name__ == "__main__":
    main()
