#!/usr/bin/env python3
from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BOUTS_CSV = ROOT / "data-src" / "bouts.csv"
PATCH_CSV = ROOT / "review" / "structured_result_patch_candidates.csv"


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
        bout = by_id.get(patch.get("bout_id", ""))

        if not bout:
            print(f"[skip] unknown bout_id: {patch.get('bout_id', '')}")
            continue

        winner = patch.get("winner", "")
        loser = patch.get("loser", "")

        if winner and loser:
            if winner == bout.get("fighter_a"):
                bout["winner_id"] = bout.get("fighter_a_id", "")
                bout["loser_id"] = bout.get("fighter_b_id", "")
            elif winner == bout.get("fighter_b"):
                bout["winner_id"] = bout.get("fighter_b_id", "")
                bout["loser_id"] = bout.get("fighter_a_id", "")
            else:
                print(f"[skip] winner does not match fighters: {bout['bout_id']} winner={winner}")
                continue

            bout["winner"] = winner
            bout["loser"] = loser
            bout["result_status"] = "known"

        # Allow partial patch for method/time even when winner is not inferred.
        for source, target in [
            ("round", "round"),
            ("time", "time"),
            ("method_raw", "method_raw"),
            ("method_normalized", "method_normalized"),
            ("technique", "technique"),
            ("decision_score", "decision_score"),
            ("source_article_id", "source_article_id"),
        ]:
            value = patch.get(source, "")
            if value:
                bout[target] = value

        note = bout.get("notes", "")
        source_note = (
            f"Structured result candidate from {patch.get('source_article_id', '')} "
            f"lines {patch.get('source_line_start', '')}-{patch.get('source_line_end', '')}."
        )
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
