#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
from difflib import SequenceMatcher
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
    value = value.replace(".", "")
    value = value.replace("．", "")
    value = value.lower()

    replacements = {
        "ローリングjr": "ローリングjr",
        "ローリングjr.": "ローリングjr",
        "rollingjr": "ローリングjr",
        "rollingjr": "ローリングjr",
    }

    return replacements.get(value, value)


def name_score(left: str, right: str) -> float:
    left_n = normalize_name(left)
    right_n = normalize_name(right)

    if not left_n or not right_n:
        return 0.0

    if left_n == right_n:
        return 1.0

    if left_n in right_n or right_n in left_n:
        return 0.88

    return SequenceMatcher(None, left_n, right_n).ratio()


def pair_score(
    bout_a: str,
    bout_b: str,
    result_a: str,
    result_b: str,
) -> tuple[float, bool]:
    direct = (
        name_score(bout_a, result_a) + name_score(bout_b, result_b)
    ) / 2

    reverse = (
        name_score(bout_a, result_b) + name_score(bout_b, result_a)
    ) / 2

    if reverse > direct:
        return reverse, True

    return direct, False


def result_quality(row: dict[str, str]) -> tuple[bool, bool, bool]:
    has_winner = bool(row.get("winner") and row.get("loser"))
    has_method = bool(row.get("method_normalized"))
    has_time = bool(row.get("round") or row.get("time"))
    return has_winner, has_method, has_time


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

        event_bouts = [
            bout for bout in bouts
            if bout.get("event_id") == event_id
        ]

        if not event_bouts:
            continue

        scored: list[tuple[float, str, bool, dict[str, str]]] = []

        for bout in event_bouts:
            score, reversed_pair = pair_score(
                bout.get("fighter_a", ""),
                bout.get("fighter_b", ""),
                fighter_a,
                fighter_b,
            )

            match_reason = "name_pair"

            # Fallback: same event + same bout_order.
            if score < 0.75 and result.get("bout_order") and bout.get("bout_order"):
                if result["bout_order"] == bout["bout_order"]:
                    score = max(score, 0.70)
                    match_reason = "event_and_bout_order"

            if score >= 0.70:
                scored.append((score, match_reason, reversed_pair, bout))

        if not scored:
            continue

        scored.sort(key=lambda item: item[0], reverse=True)

        # Keep best few candidates, because this is review CSV.
        for score, match_reason, reversed_pair, bout in scored[:3]:
            has_winner, has_method, has_time = result_quality(result)

            confidence = "low"
            if score >= 0.95 and has_winner and has_method:
                confidence = "high"
            elif score >= 0.85 and (has_method or has_time or has_winner):
                confidence = "medium"
            elif match_reason == "event_and_bout_order" and (has_method or has_time):
                confidence = "medium"

            rows.append(
                {
                    "apply": "false",
                    "confidence": confidence,
                    "match_score": f"{score:.3f}",
                    "match_reason": match_reason,
                    "reversed_pair": "true" if reversed_pair else "false",
                    "bout_id": bout.get("bout_id", ""),
                    "event_id": bout.get("event_id", ""),
                    "bout_order": bout.get("bout_order", ""),
                    "fighter_a": bout.get("fighter_a", ""),
                    "fighter_b": bout.get("fighter_b", ""),
                    "structured_fighter_a": fighter_a,
                    "structured_fighter_b": fighter_b,
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
        "match_score",
        "match_reason",
        "reversed_pair",
        "bout_id",
        "event_id",
        "bout_order",
        "fighter_a",
        "fighter_b",
        "structured_fighter_a",
        "structured_fighter_b",
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

    print(f"[info] {OUT_CSV}")
    print(f"[rows] {len(rows)}")
    print("[next] Review the CSV and set apply=true for trusted rows.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
