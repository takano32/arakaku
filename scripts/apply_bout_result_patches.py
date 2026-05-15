#!/usr/bin/env python3
from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BOUTS_CSV = ROOT / "data-src" / "bouts.csv"
PATCH_CSV = ROOT / "review" / "bout_result_patch_candidates.csv"


def is_true(value: str) -> bool:
    return value.strip().lower() in {"true", "1", "yes", "y"}


def main() -> int:
    with BOUTS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        bouts = list(reader)
        fieldnames = reader.fieldnames or []

    with PATCH_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        patches = [
            row for row in csv.DictReader(f)
            if is_true(row.get("apply", ""))
        ]

    by_id = {row["bout_id"]: row for row in bouts}

    applied = 0

    for patch in patches:
        bout_id = patch["bout_id"]
        bout = by_id.get(bout_id)

        if not bout:
            print(f"[skip] unknown bout_id: {bout_id}")
            continue

        winner = patch.get("winner", "")
        loser = patch.get("loser", "")

        if not winner or not loser:
            print(f"[skip] missing winner/loser: {bout_id}")
            continue

        if winner == bout.get("fighter_a"):
            bout["winner_id"] = bout.get("fighter_a_id", "")
            bout["loser_id"] = bout.get("fighter_b_id", "")
        elif winner == bout.get("fighter_b"):
            bout["winner_id"] = bout.get("fighter_b_id", "")
            bout["loser_id"] = bout.get("fighter_a_id", "")
        else:
            print(f"[skip] winner does not match fighters: {bout_id} winner={winner}")
            continue

        bout["winner"] = winner
        bout["loser"] = loser
        bout["round"] = patch.get("round", "") or bout.get("round", "")
        bout["time"] = patch.get("time", "") or bout.get("time", "")
        bout["method_raw"] = patch.get("method_raw", "") or bout.get("method_raw", "")
        bout["method_normalized"] = patch.get("method_normalized", "") or bout.get("method_normalized", "")
        bout["technique"] = patch.get("technique", "") or bout.get("technique", "")
        bout["decision_score"] = patch.get("decision_score", "") or bout.get("decision_score", "")
        bout["source_article_id"] = patch.get("source_article_id", "") or bout.get("source_article_id", "")
        bout["result_status"] = "known"

        note = bout.get("notes", "")
        source_note = f"Result patched from {patch.get('source_article_id', '')} line {patch.get('source_line_number', '')}."
        bout["notes"] = f"{note} {source_note}".strip()

        applied += 1

    with BOUTS_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(bouts)

    print(f"[applied] {applied}")
    print(f"[write] {BOUTS_CSV}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
