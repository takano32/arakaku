# 役割: titles.csv と title_reigns.csv の行を docs/data/titles.json (王座ごとの系譜 lineage) の形にする。
# アーキ上の位置: build/canonical.py の json_builders が呼ぶ。I/O はしない。
# 不変条件: lineage は reign_order の数値の順。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any

from arakaku.schema import CsvRow
from arakaku.text import none_if_empty, parse_int



def _reign_sort_key(reign) -> tuple[int, int, str]:
    # 数字の reign_order を数値の順に並べ、数字でない値はその後ろに文字列の順で置く。以前は parse_int の
    # 結果 (int か str) をそのまま比べたので、数字でない値があると TypeError で build ごと止まった。
    # 数字でない値は validation/entities.py が error として報告する (T.112.4.6)。
    order = parse_int(reign.get("reign_order"))
    if isinstance(order, str):
        return (1, 0, order)
    return (0, order or 0, "")

def _group_by(items: list[CsvRow], key: str) -> dict[str, list[CsvRow]]:
    groups: dict[str, list[CsvRow]] = {}
    for item in items:
        value = item.get(key)
        if not value:
            continue
        groups.setdefault(value, []).append(item)
    return groups


def build_titles(titles: list[CsvRow], title_reigns: list[CsvRow]) -> list[dict[str, Any]]:
    reigns_by_title = _group_by(title_reigns, "title_id")
    out = []
    for title in titles:
        lineage = []
        for reign in sorted(reigns_by_title.get(title["title_id"], []), key=_reign_sort_key):
            lineage.append(
                {
                    "reign_id": reign["reign_id"],
                    "order": parse_int(reign.get("reign_order")),
                    "fighter_id": none_if_empty(reign.get("fighter_id")),
                    "fighter_name": reign.get("fighter_name", ""),
                    "reign_label": none_if_empty(reign.get("reign_label")),
                    "won_at_event_id": none_if_empty(reign.get("won_at_event_id")),
                    "lost_at_event_id": none_if_empty(reign.get("lost_at_event_id")),
                    "end_reason": none_if_empty(reign.get("end_reason")),
                    "source_article_id": none_if_empty(reign.get("source_article_id")),
                    "source_video_id": none_if_empty(reign.get("source_video_id")),
                }
            )
        out.append(
            {
                "title_id": title["title_id"],
                "promotion_id": title["promotion_id"],
                "division": title["division"],
                "lineage": lineage,
            }
        )
    return out
