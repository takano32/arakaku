# 役割: レビュー CSV (note 照合の結果) のうち apply 列が真の行を、bouts / bout_participants の行に当てる規則。
# アーキ上の位置: scripts/apply_structured_result_patches.py が CSV を読んでここに渡し、返った行を書き戻す。
#   I/O はしない。入力のレビュー CSV は review/note_results.py (match_unknown_bouts_to_note_results.py) が作る。
# 不変条件:
#   - apply が真 (true / 1 / yes / y) の行だけを当てる。winner/loser/fighter_a/fighter_b 列は上流が
#     解決済みの値であることを前提とする。
#   - 入力の行は書き換えず、写した行を返す。列は増やさない (書き戻しは既存の列構成のまま)。
#   - 同じ出典の注記は二重に書かない (再実行しても bouts.csv が変わらない)。
# 関連スキル: .agents/skills/arakaku-review-workflow。
from __future__ import annotations

from dataclasses import dataclass, field

from arakaku.schema import CsvRow

RESULT_FIELDS = ["round", "time", "method_raw", "method_normalized", "technique", "decision_score"]


def is_true(value: str) -> bool:
    return value.strip().lower() in {"true", "1", "yes", "y"}


@dataclass
class PatchResult:
    bouts: list[CsvRow]
    participants: list[CsvRow]
    applied: int = 0
    unknown_bout_ids: list[str] = field(default_factory=list)


def apply_patches(bouts: list[CsvRow], participants: list[CsvRow], patch_rows: list[CsvRow]) -> PatchResult:
    result = PatchResult(bouts=[dict(row) for row in bouts], participants=[dict(row) for row in participants])
    patches = [row for row in patch_rows if is_true(row.get("apply", ""))]

    by_bout_id = {row["bout_id"]: row for row in result.bouts}
    participants_by_bout: dict[str, list[CsvRow]] = {}
    for p in result.participants:
        participants_by_bout.setdefault(p["bout_id"], []).append(p)

    for patch in patches:
        bout_id = patch.get("bout_id", "")
        bout = by_bout_id.get(bout_id)

        if not bout:
            result.unknown_bout_ids.append(bout_id)
            continue

        winner = patch.get("winner", "")
        loser = patch.get("loser", "")

        # winner と loser の両方が揃って初めて結果確定 (known) とみなす。
        if winner and loser:
            bout["result_status"] = "known"

        for column in RESULT_FIELDS:
            value = patch.get(column, "")
            if value:
                bout[column] = value

        note = bout.get("notes", "")
        source_note = (
            f"Structured result from {patch.get('source_article_id', '')} "
            f"lines {patch.get('source_line_start', '')}-{patch.get('source_line_end', '')}."
        )
        # 再実行しても同じ出典を二重に書かない
        if source_note not in note:
            bout["notes"] = f"{note} {source_note}".strip()

        # Update participant results using resolved participant names
        if winner and loser:
            fighter_a = patch.get("fighter_a", "")
            fighter_b = patch.get("fighter_b", "")
            for p in participants_by_bout.get(bout_id, []):
                name = p.get("fighter_name", "")
                side = p.get("side", "")
                # 名前完全一致を優先しつつ、上流が red=fighter_a / blue=fighter_b と
                # して解決している前提で side 経由のフォールバックも許容する。
                if name == winner or (side == "red" and fighter_a == winner) or (side == "blue" and fighter_b == winner):
                    p["result"] = "win"
                elif name == loser or (side == "red" and fighter_a == loser) or (side == "blue" and fighter_b == loser):
                    p["result"] = "loss"

        result.applied += 1
    return result
