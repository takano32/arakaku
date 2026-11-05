from __future__ import annotations
# 役割: bout_participants の行から bout_id -> (red 名, blue 名) の対応を作る。
# アーキ上の位置: review 候補生成スクリプト (make_source_reference_candidates.py) が利用する。
#   build_json 用の「行 -> ネストした JSON 部分構造」変換は arakaku/build/canonical.py へ移した。
# 関連スキル: .agents/skills/arakaku-source-pipeline。


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
