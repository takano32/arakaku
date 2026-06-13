from __future__ import annotations
# 役割: build_json.py 専用の「行 -> ネストした JSON 部分構造」変換関数集。
#   promotion_rules / fighter_profile / bout_result / bout_title が
#   promotions.json・fighters.json・bouts.json のネスト部分を組み立てる。
# アーキ上の位置: build_json.py から map_csv の schema 値として import される
#   (例: "rules": promotion_rules)。int_field_func / is_title_bout_func は呼び出し側
#   (build_json) が渡す依存注入で、循環 import を避けるためここでは受け取るだけにしている。
# 不変条件: 返す dict のキー名は docs/data/*.json のスキーマ = viewer (docs/assets/js) が読む
#   契約。キーを変える場合は viewer 側と validate_json も合わせること。
# 関連スキル: .agents/skills/arakaku-maintainer。
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
    # int_field_func は build_json が渡す utils.int_field。"R3" 形式から "R" を除いて数値化する。
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

# これだけは build_json ではなく review 候補生成スクリプト
# (make_source_reference_candidates.py / make_structured_result_patch_candidates.py) が利用する。
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
