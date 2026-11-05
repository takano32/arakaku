# 役割: 大会の日付の導出。架空の団体なので開催日はどこにも書かれていないため、結果 note
#   (article_type=event_result) のいちばん早い投稿日を「結果発表日」(T.77、ユーザー判断)、その大会の
#   note のいちばん早い投稿日を「note 投稿日」(結果 note の無い大会の並びと表示用、T.102) として使う。
# アーキ上の位置: build/relations.py (events.json の result_published_at / note_published_at) と
#   scripts/reorder_data.py (events.csv・bouts.csv の並び順) が使う。純粋関数のみ。
# 不変条件: 同じ大会に複数の note があれば最小の published_at。日付の無い記事は数えない。
# 関連スキル: .agents/skills/arakaku-sorting-strategy。
from __future__ import annotations

from arakaku.schema import CsvRow


def event_note_dates(articles: list[CsvRow], article_links: list[CsvRow]) -> tuple[dict[str, str], dict[str, str]]:
    """event_id -> 日付の 2 つの表 (結果 note の最初の投稿日, その大会の note の最初の投稿日) を返す。"""
    articles_by_id = {row["article_id"]: row for row in articles}
    result_dates: dict[str, str] = {}
    note_dates: dict[str, str] = {}
    for link in article_links:
        if link["entity_type"] != "event":
            continue
        article = articles_by_id.get(link["article_id"], {})
        date = article.get("published_at")
        if not date:
            continue
        event_id = link["entity_id"]
        if date < note_dates.get(event_id, "9999"):
            note_dates[event_id] = date
        if article.get("article_type") == "event_result" and date < result_dates.get(event_id, "9999"):
            result_dates[event_id] = date
    return result_dates, note_dates
