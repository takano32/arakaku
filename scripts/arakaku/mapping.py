from __future__ import annotations
from typing import Any
from arakaku_utils import bool_from_text, none_if_empty

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
