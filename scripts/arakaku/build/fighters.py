# 役割: fighters.csv と fighter_snapshots.csv の行を docs/data の fighters.json・fighter_snapshots.json の形にする。
# アーキ上の位置: build/canonical.py の json_builders が呼ぶ。I/O はしない。
# 不変条件: 空のプロフィール値は None。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any

from arakaku.build.relations import Relations
from arakaku.csvmap import field_or_empty, map_rows
from arakaku.schema import CsvRow
from arakaku.text import none_if_empty


def _fighter_profile(row: CsvRow) -> dict[str, Any]:
    return {
        "height": none_if_empty(row.get("height")),
        "age": none_if_empty(row.get("age")),
        "gym": none_if_empty(row.get("gym")),
    }


def build_fighters(fighters: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    return map_rows(
        fighters,
        {
            "fighter_id": "fighter_id",
            "display_name": "display_name",
            "aliases": lambda row: rel.fighter_aliases.get(row["fighter_id"], []),
            "main_division": "main_division",
            "main_promotion_id": "main_promotion_id",
            "profile": _fighter_profile,
            "summary": field_or_empty("summary"),
            "source_article_ids": lambda row: rel.article_ids_for("fighter", row["fighter_id"]),
            "inferred_from_video_ids": lambda row: rel.video_ids_for("fighter", row["fighter_id"]),
            "inferred_confidence": "inferred_confidence",
        },
    )


def build_fighter_snapshots(snapshots: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    return map_rows(
        snapshots,
        {
            "snapshot_id": "snapshot_id",
            "fighter_id": "fighter_id",
            "event_id": "event_id",
            "source_id": "source_id",
            "source_article_id": lambda row: rel.first_article_id_for("fighter_snapshot", row["snapshot_id"]),
            "age": "age",
            "height": "height",
            "gym": "gym",
            "record_text": "record_text",
            "main_promotion_id": "main_promotion_id",
            "titles_text": "titles_text",
            "catchphrase": "catchphrase",
        },
    )
