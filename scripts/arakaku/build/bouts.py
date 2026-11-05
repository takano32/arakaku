# 役割: bouts.csv の行と出場者 (bout_participants) を docs/data/bouts.json の形にする。
# アーキ上の位置: build/canonical.py の json_builders が呼ぶ。I/O はしない。
# 不変条件: 勝者は bouts.csv に直接持たず、bout_participants の result=="win" から逆引きする
#   (単一の事実源 = participants 行を保つため)。該当者が無ければ None を返し捏造しない。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any

from arakaku.build.relations import Relations
from arakaku.csvmap import field_or_default, field_or_empty, int_field, map_rows
from arakaku.schema import CsvRow
from arakaku.text import bool_from_text, none_if_empty


def _bout_matchup(participants: list[CsvRow]) -> str:
    names = [p.get("fighter_name", "") for p in participants]
    return " vs ".join(name for name in names if name)


def _bout_fighters(participants: list[CsvRow]) -> list[dict[str, Any]]:
    return [
        {
            "fighter_id": none_if_empty(participant.get("fighter_id")),
            "name": participant.get("fighter_name", ""),
            "side": participant.get("side", ""),
            "corner": none_if_empty(participant.get("corner")),
            "result": none_if_empty(participant.get("result")) or "unknown",
        }
        for participant in participants
    ]


def _participant_field(participants: list[CsvRow], result: str, field: str) -> str | None:
    """result ("win"/"loss") を持つ最初の出場者の field。該当者が無ければ None。"""
    matched = [p for p in participants if p.get("result") == result]
    if not matched:
        return None
    return none_if_empty(matched[0].get(field))


def _is_title_bout(row: CsvRow) -> bool:
    return bool_from_text(row.get("is_title_bout")) or False


def _bout_result(row: CsvRow) -> dict[str, Any]:
    return {
        # "R3" 形式から "R" を除いて数値化する。
        "round": int_field("round", strip_prefix="R")(row),
        "time": row.get("time"),
        "method_raw": row.get("method_raw"),
        "method_normalized": row.get("method_normalized"),
        "technique": row.get("technique"),
        "decision_score": row.get("decision_score"),
    }


def _bout_title(row: CsvRow) -> dict[str, Any]:
    return {
        "is_title_bout": _is_title_bout(row),
        "title_id": row.get("title_id"),
        "title_result": row.get("title_result"),
        "note": none_if_empty(row.get("title_note")) or "",
    }


def build_bouts(bouts: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    def participants(row: CsvRow) -> list[CsvRow]:
        return rel.participants_for(row["bout_id"])

    return map_rows(
        bouts,
        {
            "bout_id": "bout_id",
            "event_id": "event_id",
            "promotion_id": "promotion_id",
            "bout_order": int_field("bout_order"),
            "matchup": lambda row: _bout_matchup(participants(row)),
            "division": "division",
            "weight_class_id": "weight_class_id",
            "bout_type": "bout_type",
            "fighters": lambda row: _bout_fighters(participants(row)),
            "winner_id": lambda row: _participant_field(participants(row), "win", "fighter_id"),
            "winner": lambda row: _participant_field(participants(row), "win", "fighter_name"),
            "loser_id": lambda row: _participant_field(participants(row), "loss", "fighter_id"),
            "loser": lambda row: _participant_field(participants(row), "loss", "fighter_name"),
            "result_status": field_or_default("result_status", "unknown"),
            "result": _bout_result,
            "title": _bout_title,
            "source_article_id": lambda row: rel.first_article_id_for("bout", row["bout_id"]),
            "notes": field_or_empty("notes"),
            "inferred_from_video_id": "inferred_from_video_id",
            "inferred_from_video_title": "inferred_from_video_title",
            "inferred_confidence": "inferred_confidence",
        },
    )
