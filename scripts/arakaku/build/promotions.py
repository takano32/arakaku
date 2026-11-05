# 役割: promotions.csv の行を docs/data/promotions.json の形にする (ルールの列は rules にまとめる)。
# アーキ上の位置: build/canonical.py の json_builders が呼ぶ。I/O はしない。
# 不変条件: 空のルールは None、真偽の列は bool_from_text (不明は None)。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any

from arakaku.build.relations import Relations
from arakaku.csvmap import field_or_empty, map_rows
from arakaku.schema import CsvRow
from arakaku.text import bool_from_text, none_if_empty


def _promotion_rules(row: CsvRow) -> dict[str, Any]:
    return {
        "venue": none_if_empty(row.get("rule_venue")),
        "rounds": none_if_empty(row.get("rule_rounds")),
        "judging": none_if_empty(row.get("rule_judging")),
        "glove": none_if_empty(row.get("rule_glove")),
        "elbows": bool_from_text(row.get("rule_elbows")),
        "soccer_kicks": bool_from_text(row.get("rule_soccer_kicks")),
        "stomps": bool_from_text(row.get("rule_stomps")),
        "four_point_head_kicks": bool_from_text(row.get("rule_four_point_head_kicks")),
        "four_point_head_knees": bool_from_text(row.get("rule_four_point_head_knees")),
    }


def build_promotions(promotions: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    return map_rows(
        promotions,
        {
            "promotion_id": "promotion_id",
            "name": "name",
            "name_en": "name_en",
            "category": "category",
            "country_scope": "country_scope",
            "summary": field_or_empty("summary"),
            "rules": _promotion_rules,
            "source_article_ids": lambda row: rel.article_ids_for("promotion", row["promotion_id"]),
        },
    )
