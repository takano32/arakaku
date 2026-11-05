#!/usr/bin/env python3
"""Generate article_links.csv from structured data and crawl content.

Generates:
- promotion links (promotion_profile articles → their promotion)
- title_reign links (title_reigns.source_article_id → reign)
- fighter_snapshot links (fighter_snapshots.csv → event card article)
- event links (event_card/event_result articles → event, derived from title)
- bout links (event articles → bouts, derived from 🆚 matchup parsing)
- fighter links (event articles + promotion profiles → fighters, from content)

Does NOT generate video links — YouTube video IDs are not embedded in
the cached note HTML so they cannot be derived from crawl data.
"""
from __future__ import annotations

from arakaku.derive.article_links import FIELDS, ArticleLinkSources, article_link_rows
from arakaku.io import read_csv, write_csv
from arakaku.paths import DATA_SRC

# 役割: 記事→各エンティティの関係表 article_links.csv を生成する入口。導出規則は
#       arakaku/derive/article_links.py、本文の解析は arakaku/notes/matchups.py。
# アーキ上の位置: generate-stage2 の終盤、aliases / video_links 等の後に実行（Makefile）。
#       入力は articles / events / fighters / aliases / bouts / bout_participants /
#       title_reigns / fighter_snapshots / source_documents（本文）。
# 不変条件: ここにはロジックを置かない。
# 関連スキル: .agents/skills/arakaku-source-pipeline
OUTPUT = DATA_SRC / "article_links.csv"


def main() -> None:
    def rows(name: str):
        return read_csv(DATA_SRC / name)

    sources = ArticleLinkSources(
        articles=rows("articles.csv"),
        events=rows("events.csv"),
        fighters=rows("fighters.csv"),
        aliases=rows("aliases.csv"),
        bouts=rows("bouts.csv"),
        bout_participants=rows("bout_participants.csv"),
        title_reigns=rows("title_reigns.csv"),
        fighter_snapshots=rows("fighter_snapshots.csv"),
        source_documents=rows("source_documents.csv"),
    )
    links = article_link_rows(sources)
    write_csv(OUTPUT, FIELDS, links)
    print(f"[done] {len(links)} article link rows written")


if __name__ == "__main__":
    main()
