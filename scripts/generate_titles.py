#!/usr/bin/env python3
"""Generate titles.csv from static config (championship titles per promotion)."""
from __future__ import annotations

# 役割: 王座マスタ titles.csv を静的定義から生成する。各団体×階級（＋トーナメント枠）の
#       タイトル定義は固定知識なので、下記 TITLES タプルが唯一の真実。
# アーキ上の位置: generate-stage2 で generate_promotions の後に実行。title_id は
#       title_reigns.csv が FK 参照し、article_links / build_json でも使われる。
# 不変条件: 各 TITLES の promotion_id は promotions.csv に存在する団体に限る（FK）。
#       title_id は title_reigns から参照されるので命名変更は両者同期必須。
# 関連スキル: .agents/skills/arakaku-data-curator
from arakaku.utils import DATA_SRC, write_csv

OUTPUT = DATA_SRC / "titles.csv"
FIELDS = ["title_id", "promotion_id", "division"]

TITLES = [
    ("target-lightweight", "target", "ライト級"),
    ("target-lightweight-tournament", "target", "ライト級"),
    ("target-middleweight", "target", "ミドル級"),
    ("target-middleweight-tournament", "target", "ミドル級"),
    ("target-heavyweight", "target", "ヘビー級"),
    ("target-heavyweight-tournament", "target", "ヘビー級"),
    ("emperor-lightweight", "emperor", "ライト級"),
    ("emperor-middleweight", "emperor", "ミドル級"),
    ("emperor-heavyweight", "emperor", "ヘビー級"),
    ("mh-lightweight", "mh", "ライト級"),
    ("mh-middleweight", "mh", "ミドル級"),
    ("mh-lightweight-tournament", "mh", "ライト級"),
    ("mh-middleweight-tournament", "mh", "ミドル級"),
    ("max-bout-lightweight", "max_bout", "ライト級"),
    ("max-bout-middleweight", "max_bout", "ミドル級"),
    ("max-bout-heavyweight", "max_bout", "ヘビー級"),
]


def main() -> None:
    rows = [{"title_id": t, "promotion_id": p, "division": d} for t, p, d in TITLES]
    write_csv(OUTPUT, FIELDS, rows)
    print(f"[done] {len(rows)} title rows written")


if __name__ == "__main__":
    main()
