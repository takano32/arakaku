#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BOUTS_CSV = ROOT / "data-src" / "bouts.csv"
STRUCTURED_CSV = ROOT / "review" / "note_structured_results.csv"
OUT_CSV = ROOT / "review" / "structured_result_patch_candidates.csv"


def normalize_name(value: str) -> str:
    value = value.strip()
    value = re.sub(r"\s+", "", value)
    value = value.replace("・", "")
    value = value.replace("　", "")
    return value.lower()


def same_pair(a1: str, b1: str, a2: str, b2: str) -> bool:
    a1n, b1n = normalize_name(a1), normalize_name(b1)
    a2n, b2n = normalize_name(a2), normalize_name(b2)

    return (a1n == a2n and b1n == b2n) or (a1n == b2n and b1n == a2n)


def main() -> int:
    with BOUTS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        bouts = list(csv.DictReader(f))

    with STRUCTURED_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        structured = list(csv.DictReader(f))

    rows: list[dict[str, str]] = []

    for result in structured:
        if result.get("confidence") == "error":
            continue

        event_id = result.get("event_id", "")
        fighter_a = result.get("fighter_a", "")
        fighter_b = result.get("fighter_b", "")

        if not event_id or not fighter_a or not fighter_b:
            continue

        candidates = [
            bout for bout in bouts
            if bout.get("event_id") == event_id
            and same_pair(
                bout.get("fighter_a", ""),
                bout.get("fighter_b", ""),
                fighter_a,
                fighter_b,
            )
        ]

        if not candidates:
            continue

        for bout in candidates:
            result_has_winner = bool(result.get("winner") and result.get("loser"))
            result_has_method = bool(result.get("method_normalized"))
            result_has_time = bool(result.get("round") or result.get("time"))

            confidence = result.get("confidence", "low")
            if result_has_winner and result_has_method:
                confidence = "high"
            elif result_has_method or result_has_time:
                confidence = "medium"

            rows.append(
                {
                    "apply": "false",
                    "confidence": confidence,
                    "bout_id": bout.get("bout_id", ""),
                    "event_id": bout.get("event_id", ""),
                    "fighter_a": bout.get("fighter_a", ""),
                    "fighter_b": bout.get("fighter_b", ""),
                    "winner": result.get("winner", ""),
                    "loser": result.get("loser", ""),
                    "round": result.get("round", ""),
                    "time": result.get("time", ""),
                    "method_raw": result.get("method_raw", ""),
                    "method_normalized": result.get("method_normalized", ""),
                    "technique": result.get("technique", ""),
                    "decision_score": "",
                    "source_article_id": result.get("article_id", ""),
                    "source_line_start": result.get("source_line_start", ""),
                    "source_line_end": result.get("source_line_end", ""),
                    "source_text": result.get("source_text", ""),
                }
            )

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "apply",
        "confidence",
        "bout_id",
        "event_id",
        "fighter_a",
        "fighter_b",
        "winner",
        "loser",
        "round",
        "time",
        "method_raw",
        "method_normalized",
        "technique",
        "decision_score",
        "source_article_id",
        "source_line_start",
        "source_line_end",
        "source_text",
    ]

    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[write] {OUT_CSV}")
    print(f"[rows] {len(rows)}")
    print("[next] Review the CSV and set apply=true for trusted rows.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
