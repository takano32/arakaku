#!/usr/bin/env python3
from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BOUTS_CSV = ROOT / "data-src" / "bouts.csv"
PARTICIPANTS_CSV = ROOT / "data-src" / "bout_participants.csv"
PATCH_CSV = ROOT / "review" / "structured_result_patch_candidates.csv"


def is_true(value: str) -> bool:
    return value.strip().lower() in {"true", "1", "yes", "y"}


def main() -> int:
    with BOUTS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        bouts = list(reader)
        bout_fieldnames = reader.fieldnames or []

    with PARTICIPANTS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        participants = list(reader)
        participant_fieldnames = reader.fieldnames or []

    with PATCH_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        patches = [
            row for row in csv.DictReader(f)
            if is_true(row.get("apply", ""))
        ]

    by_bout_id = {row["bout_id"]: row for row in bouts}
    # participants indexed by bout_id → list
    participants_by_bout: dict[str, list[dict[str, str]]] = {}
    for p in participants:
        participants_by_bout.setdefault(p["bout_id"], []).append(p)

    applied = 0
    skipped = 0

    for patch in patches:
        bout_id = patch.get("bout_id", "")
        bout = by_bout_id.get(bout_id)

        if not bout:
            print(f"[warn] unknown bout_id: {bout_id}")
            skipped += 1
            continue

        winner = patch.get("winner", "")
        loser = patch.get("loser", "")

        # Update bout result fields
        if winner and loser:
            bout["result_status"] = "known"

        for source, target in [
            ("round", "round"),
            ("time", "time"),
            ("method_raw", "method_raw"),
            ("method_normalized", "method_normalized"),
            ("technique", "technique"),
            ("decision_score", "decision_score"),
        ]:
            value = patch.get(source, "")
            if value:
                bout[target] = value

        note = bout.get("notes", "")
        source_note = (
            f"Structured result from {patch.get('source_article_id', '')} "
            f"lines {patch.get('source_line_start', '')}-{patch.get('source_line_end', '')}."
        )
        bout["notes"] = f"{note} {source_note}".strip()

        # Update participant results using resolved participant names
        if winner and loser:
            bout_participants = participants_by_bout.get(bout_id, [])
            fighter_a = patch.get("fighter_a", "")
            fighter_b = patch.get("fighter_b", "")
            for p in bout_participants:
                name = p.get("fighter_name", "")
                side = p.get("side", "")
                # Match by exact name or by side when names are resolved from participants
                if name == winner or (side == "red" and fighter_a == winner) or (side == "blue" and fighter_b == winner):
                    p["result"] = "win"
                elif name == loser or (side == "red" and fighter_a == loser) or (side == "blue" and fighter_b == loser):
                    p["result"] = "loss"

        applied += 1

    with BOUTS_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=bout_fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(bouts)

    with PARTICIPANTS_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=participant_fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(participants)

    print(f"[applied] {applied}  skipped={skipped}")
    print(f"[info] {BOUTS_CSV}")
    print(f"[info] {PARTICIPANTS_CSV}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
