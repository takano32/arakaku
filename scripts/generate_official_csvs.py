#!/usr/bin/env python3
"""Generate official_*.csv from tmp/arakaku-site/*.json."""
from __future__ import annotations

import json

# 役割: 公式サイト（別リポジトリ takano32/arakaku-site）の JSON エクスポートを
#       official_players / official_tournaments / official_matches / official_history の
#       4 CSV に転記する入口。キーの写し方は arakaku/official/csvs.py にあり、ここは読み書きだけをする。
# アーキ上の位置: generate-stage1 で実行。入力 tmp/arakaku-site/data/*.json は git 管理外で、
#       事前に公式リポジトリから取得しておく必要がある（無ければ書く前にエラーで止まる）。出力 CSV は
#       build_official_json.py が読み、ビューアが「公式データ」レイヤとして参照する。
# 不変条件: official_* は公式由来の比較データであり、本リポジトリの canonical CSV とは別系統。
#       人手検証済みの値が優先される（AGENTS.md のパイプライン方針）。4 つの入力をすべて
#       読んでから書く (どれかが無ければ、どの CSV も書かずに止まる。T112.6.24)。
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

# 入力の JSON -> (行に写す関数, 列, 出力 CSV, 表示名)。
OUTPUTS = [
    ("players.json", player_rows, PLAYER_FIELDS, "official_players.csv", "player"),
    ("tournaments.json", tournament_rows, TOURNAMENT_FIELDS, "official_tournaments.csv", "tournament"),
    ("matches.json", match_rows, MATCH_FIELDS, "official_matches.csv", "match"),
    ("history.json", history_rows, HISTORY_FIELDS, "official_history.csv", "history"),
]


def load(filename: str) -> list:
    return json.loads((SRC / filename).read_text(encoding="utf-8"))


def main() -> None:
    # 4 つの入力をすべて確かめて読んでから書く。以前は 1 つ読んでは 1 つ書いたので、途中の JSON が
    # 無いとそれより前の CSV だけが書き換わった (T112.6.24)。
    missing = [filename for filename, *_ in OUTPUTS if not (SRC / filename).exists()]
    if missing:
        raise SystemExit(
            f"[error] {', '.join(missing)} not found under {SRC}; "
            "fetch it with `make download-official-data` (no CSV was written)"
        )
    rows_by_output = [(to_rows(load(filename)), fields, out, label) for filename, to_rows, fields, out, label in OUTPUTS]
    for rows, fields, out, label in rows_by_output:
        write_csv(DATA_SRC / out, fields, rows)
        print(f"[done] {len(rows)} {label} rows written")


if __name__ == "__main__":
    main()
