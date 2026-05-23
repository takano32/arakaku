#!/usr/bin/env python3
from __future__ import annotations

import re

from arakaku_utils import DATA_SRC, REVIEW, read_csv, write_csv


BOUTS_CSV = DATA_SRC / "bouts.csv"
CANDIDATES_CSV = REVIEW / "note_result_candidates.csv"
OUT_CSV = REVIEW / "bout_result_patch_candidates.csv"


METHOD_PATTERNS = [
    ("TKO", re.compile(r"\bTKO\b|ＴＫＯ|TKO勝ち", re.IGNORECASE)),
    ("KO", re.compile(r"\bKO\b|ＫＯ|KO勝ち", re.IGNORECASE)),
    ("SUB", re.compile(r"一本|一本勝ち|サブミッション|チョーク|腕十字|関節", re.IGNORECASE)),
    ("DEC", re.compile(r"判定|判定勝ち", re.IGNORECASE)),
    ("DQ", re.compile(r"失格|DQ", re.IGNORECASE)),
    ("NC", re.compile(r"ノーコンテスト|NC", re.IGNORECASE)),
]

ROUND_RE = re.compile(r"([1-5１-５])\s*(?:R|Ｒ|ラウンド)")
TIME_RE = re.compile(
    r"([0-9０-９]+)\s*分\s*([0-9０-９]+)\s*秒|([0-9０-９]+):([0-9０-９]{2})"
)


def normalize_digits(value: str) -> str:
    return value.translate(str.maketrans("０１２３４５６７８９", "0123456789"))


def normalize_name(value: str) -> str:
    value = value.strip()
    value = re.sub(r"\s+", "", value)
    value = value.replace("・", "")
    value = value.replace("　", "")
    value = value.lower()
    return value


def infer_method(line: str) -> tuple[str, str]:
    for method, pattern in METHOD_PATTERNS:
        match = pattern.search(line)
        if match:
            return method, match.group(0)
    return "", ""


def infer_round(line: str) -> str:
    match = ROUND_RE.search(line)
    if not match:
        return ""
    return f"{normalize_digits(match.group(1))}R"


def infer_time(line: str) -> str:
    match = TIME_RE.search(line)
    if not match:
        return ""

    if match.group(1) and match.group(2):
        minute = normalize_digits(match.group(1))
        second = normalize_digits(match.group(2))
        return f"{minute}分{second}秒"

    if match.group(3) and match.group(4):
        minute = normalize_digits(match.group(3))
        second = normalize_digits(match.group(4))
        return f"{minute}分{second}秒"

    return ""


def infer_winner_from_line(line: str, fighter_a: str, fighter_b: str) -> tuple[str, str, str]:
    a_norm = normalize_name(fighter_a)
    b_norm = normalize_name(fighter_b)
    compact = normalize_name(line)

    for name, norm in [(fighter_a, a_norm), (fighter_b, b_norm)]:
        if norm and norm in compact:
            name_pos = compact.find(norm)
            tail = compact[name_pos:name_pos + 80]

            if any(token in tail for token in ["勝ち", "勝利", "防衛成功", "王座獲得"]):
                loser = fighter_b if name == fighter_a else fighter_a
                return name, loser, "winner_name_near_win_word"

    for token in ["勝者", "勝ち", "勝利"]:
        pos = compact.find(token)
        if pos >= 0:
            before = compact[max(0, pos - 40):pos]
            if a_norm in before and b_norm not in before:
                return fighter_a, fighter_b, "winner_before_result_word"
            if b_norm in before and a_norm not in before:
                return fighter_b, fighter_a, "winner_before_result_word"

    return "", "", ""


def candidate_window(candidates: list[dict[str, str]], index: int) -> list[dict[str, str]]:
    # Same article, nearby lines. Useful when matchup and result are split across adjacent lines.
    current = candidates[index]
    article_id = current.get("article_id", "")
    try:
        line_number = int(current.get("line_number") or 0)
    except ValueError:
        line_number = 0

    out = []
    for row in candidates:
        if row.get("article_id") != article_id:
            continue

        try:
            other_line_number = int(row.get("line_number") or 0)
        except ValueError:
            continue

        if abs(other_line_number - line_number) <= 8:
            out.append(row)

    return out


def main() -> int:
    bouts = read_csv(BOUTS_CSV)
    candidates = read_csv(CANDIDATES_CSV)

    result_lines = [
        row for row in candidates
        if row.get("line_type") in {"match_result", "result_with_time", "result"}
    ]

    patch_rows: list[dict[str, str]] = []

    for bout in bouts:
        if bout.get("result_status") == "known":
            continue

        fighter_a = bout.get("fighter_a", "")
        fighter_b = bout.get("fighter_b", "")

        if not fighter_a or not fighter_b:
            continue

        a_norm = normalize_name(fighter_a)
        b_norm = normalize_name(fighter_b)

        for candidate in result_lines:
            line = candidate.get("line_text", "")
            compact = normalize_name(line)

            direct_match = a_norm in compact and b_norm in compact

            # Allow nearby-line context, but only as low/medium confidence.
            nearby_text = ""
            if not direct_match:
                try:
                    candidate_index = candidates.index(candidate)
                except ValueError:
                    candidate_index = -1

                if candidate_index >= 0:
                    nearby_text = " ".join(
                        row.get("line_text", "")
                        for row in candidate_window(candidates, candidate_index)
                    )
                    nearby_compact = normalize_name(nearby_text)
                    direct_match = a_norm in nearby_compact and b_norm in nearby_compact

            if not direct_match:
                continue

            combined_line = line if a_norm in compact and b_norm in compact else nearby_text

            method, method_raw = infer_method(line)
            round_value = infer_round(line)
            time_value = infer_time(line)
            winner, loser, winner_reason = infer_winner_from_line(combined_line, fighter_a, fighter_b)

            confidence = "low"
            if winner and method:
                confidence = "high"
            elif winner or method:
                confidence = "medium"

            patch_rows.append(
                {
                    "apply": "false",
                    "confidence": confidence,
                    "bout_id": bout.get("bout_id", ""),
                    "event_id": bout.get("event_id", ""),
                    "fighter_a": fighter_a,
                    "fighter_b": fighter_b,
                    "winner": winner,
                    "loser": loser,
                    "round": round_value,
                    "time": time_value,
                    "method_raw": method_raw,
                    "method_normalized": method,
                    "technique": "",
                    "decision_score": "",
                    "source_article_id": candidate.get("article_id", ""),
                    "source_line_number": candidate.get("line_number", ""),
                    "winner_reason": winner_reason,
                    "source_line_text": line,
                }
            )

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
        "source_line_number",
        "winner_reason",
        "source_line_text",
    ]
    write_csv(OUT_CSV, fieldnames, patch_rows)

    print(f"[rows] {len(patch_rows)}")
    print("[next] Review the CSV and change apply=false to apply=true for trusted rows.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
