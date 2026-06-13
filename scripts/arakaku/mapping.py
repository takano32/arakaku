from __future__ import annotations
from typing import Any
from .utils import bool_from_text, none_if_empty

def promotion_rules(row: dict[str, str]) -> dict[str, Any]:
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

def fighter_profile(row: dict[str, str]) -> dict[str, Any]:
    return {
        "height": none_if_empty(row.get("height")),
        "age": none_if_empty(row.get("age")),
        "gym": none_if_empty(row.get("gym")),
    }

def bout_result(row: dict[str, str], int_field_func) -> dict[str, Any]:
    return {
        "round": int_field_func("round", strip_prefix="R")(row),
        "time": row.get("time"),
        "method_raw": row.get("method_raw"),
        "method_normalized": row.get("method_normalized"),
        "technique": row.get("technique"),
        "decision_score": row.get("decision_score"),
    }

def bout_title(row: dict[str, str], is_title_bout_func) -> dict[str, Any]:
    return {
        "is_title_bout": is_title_bout_func(row),
        "title_id": row.get("title_id"),
        "title_result": row.get("title_result"),
        "note": none_if_empty(row.get("title_note")) or "",
    }

def build_bout_fighter_names(participants: list[dict[str, str]]) -> dict[str, tuple[str, str]]:
    """Return mapping of bout_id -> (red_name, blue_name) from bout_participants."""
    by_bout: dict[str, dict[str, str]] = {}
    for participant in participants:
        bout_id = participant.get("bout_id", "")
        side = participant.get("side", "")
        name = participant.get("fighter_name", "")
        if bout_id and side in ("red", "blue") and name:
            by_bout.setdefault(bout_id, {})
            by_bout[bout_id][side] = name
    return {
        bout_id: (sides.get("red", ""), sides.get("blue", ""))
        for bout_id, sides in by_bout.items()
    }
