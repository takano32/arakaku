#!/usr/bin/env python3
"""Generate video_links.csv from bouts.csv, video_bout_links.csv, video_event_links.csv, bout_participants.csv, videos.csv, fighters.csv."""
from __future__ import annotations

# 役割: 動画→各エンティティ（bout / event / fighter）の関係表 video_links.csv を生成する入口。
#       行の組み立ての規則は arakaku/derive/video_links.py にあり、ここは CSV の読み書きだけをする。
# アーキ上の位置: generate-stage2 で実行（記事リンクは別途 generate_article_links が担当）。
#       入力は bouts / video_bout_links / video_event_links / bout_participants / videos / fighters。
#       出力はビューアの動画-試合-選手相互ナビに使われる。
# 不変条件: 出力の列は arakaku.derive.video_links.FIELDS。
# 関連スキル: .agents/skills/arakaku-data-curator
from arakaku.derive.video_links import FIELDS, video_link_rows
from arakaku.io import read_csv, write_csv
from arakaku.paths import DATA_SRC

OUTPUT = DATA_SRC / "video_links.csv"


def main() -> None:
    rows = video_link_rows(
        videos=read_csv(DATA_SRC / "videos.csv"),
        fighters=read_csv(DATA_SRC / "fighters.csv"),
        bout_participants=read_csv(DATA_SRC / "bout_participants.csv"),
        bouts=read_csv(DATA_SRC / "bouts.csv"),
        video_bout_links=read_csv(DATA_SRC / "video_bout_links.csv"),
        video_event_links=read_csv(DATA_SRC / "video_event_links.csv"),
    )
    write_csv(OUTPUT, FIELDS, rows)
    print(f"[done] {len(rows)} video link rows written")


if __name__ == "__main__":
    main()
