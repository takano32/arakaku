# 役割: events.csv の行を docs/data/events.json の形にする (note の投稿日・出典・動画を付ける)。
# アーキ上の位置: build/canonical.py の json_builders が呼ぶ。大会の日付は build/relations.py が
#   arakaku/event_dates.py で作る。I/O はしない。
# 不変条件: 結果 note が無い大会の result_published_at は null。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any

from arakaku.build.relations import Relations
from arakaku.csvmap import field_or_empty, int_field, map_rows
from arakaku.schema import CsvRow


def build_events(events: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    return map_rows(
        events,
        {
            "event_id": "event_id",
            "name": "name",
            "promotion_id": "promotion_id",
            "event_number": int_field("event_number"),
            "numbers_event_number": "numbers_event_number",
            "event_type": "event_type",
            # 結果 note の投稿日。結果 note が無ければ null (arakaku/event_dates.py)。
            "result_published_at": lambda row: rel.result_published_at.get(row["event_id"]),
            "note_published_at": lambda row: rel.note_published_at.get(row["event_id"]),
            "published_at": "published_at",
            "source_article_id": lambda row: rel.first_article_id_for("event", row["event_id"]),
            "summary": field_or_empty("summary"),
            "source_video_ids": lambda row: rel.video_ids_for("event", row["event_id"]),
            "inferred_from": "inferred_from",
            "inferred_confidence": "inferred_confidence",
        },
    )
