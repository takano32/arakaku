#!/usr/bin/env python3
"""Generate articles.csv from archives/note.csv."""
from __future__ import annotations

# 役割: note 記事マスタ articles.csv を archives/note.csv（アーカイブ済みメタデータ）から生成する入口。
#   分類 (article_type / promotion_id) と行の組み立ては arakaku/notes/articles.py。
# アーキ上の位置: generate-stage1 で archive_metadata の後・build_source_documents の前に
#   実行する（article_id を後段が参照するため順序固定）。
# 不変条件: ここにはロジックを置かない。
# 関連スキル: .agents/skills/arakaku-source-pipeline
from arakaku.io import read_csv, write_csv
from arakaku.notes.articles import FIELDS, article_rows
from arakaku.paths import DATA_SRC

OUTPUT = DATA_SRC / "articles.csv"


def main() -> None:
    rows = article_rows(read_csv(DATA_SRC / "archives/note.csv"))
    write_csv(OUTPUT, FIELDS, rows)
    print(f"[done] {len(rows)} article rows written")


if __name__ == "__main__":
    main()
