#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_MENTIONS_CSV = ROOT / "data-src" / "source_mentions.csv"
OUT_CSV = ROOT / "review" / "source_mention_result_candidates.csv"


METHOD_PATTERNS = [
    ("TKO", re.compile(r"TKO|ＴＫＯ|TKO勝ち|タオル投入|コーナーストップ", re.IGNORECASE)),
    ("KO", re.compile(r"KO|ＫＯ|KO勝ち", re.IGNORECASE)),
    ("SUB", re.compile(r"一本|一本勝ち|サブミッション|RNC|チョーク|腕十字|関節", re.IGNORECASE)),
    ("DEC", re.compile(r"判定|判定勝ち", re.IGNORECASE)),
    ("DQ", re.compile(r"失格|DQ", re.IGNORECASE)),
    ("NC", re.compile(r"ノーコンテスト|NC", re.IGNORECASE)),
]

ROUND_RE = re.compile(r"([1-5１-５])\s*(?:R|Ｒ|ラウンド)")
TIME_RE = re.compile(
    r"([0-9０-９]+)\s*分\s*([0-9０-９]+)\s*秒|([0-9０-９]+):([0-9０-９]{2})"
)
RESULT_WORD_RE = re.compile(r"勝ち|勝利|防衛|王座獲得|統一|KO|ＫＯ|TKO|ＴＫＯ|一本|判定")


def normalize_digits(value: str) -> str:
    return value.translate(str.maketrans("０１２３４５６７８９", "0123456789"))


def line_number(row: dict[str, str]) -> int:
    try:
        return int(row.get("line_number") or 0)
    except ValueError:
        return 0


def infer_method(text: str) -> tuple[str, str]:
    for method, pattern in METHOD_PATTERNS:
        match = pattern.search(text)
        if match:
            return method, match.group(0)
    return "", ""


def infer_round(text: str) -> str:
    match = ROUND_RE.search(text)
    if not match:
        return ""
    return f"{normalize_digits(match.group(1))}R"


def infer_time(text: str) -> str:
    match = TIME_RE.search(text)
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


def nearest_hint(
    mentions: list[dict[str, str]],
    current: dict[str, str],
    mention_type: str,
    max_distance: int = 8,
) -> str:
    current_line = line_number(current)
    candidates = [
        row
        for row in mentions
        if row.get("source_id") == current.get("source_id")
        and row.get("mention_type") == mention_type
        and row is not current
        and abs(line_number(row) - current_line) <= max_distance
    ]
    if not candidates:
        return ""

    candidates.sort(key=lambda row: (abs(line_number(row) - current_line), line_number(row)))
    best = candidates[0]
    return best.get("entity_hint") or best.get("matched_text") or best.get("context") or ""


def result_confidence(row: dict[str, str], method_hint: str, round_hint: str, time_hint: str, matchup_hint: str) -> str:
    text = " ".join([row.get("matched_text", ""), row.get("context", "")])
    has_result_word = bool(RESULT_WORD_RE.search(text))

    if method_hint and (round_hint or time_hint) and matchup_hint:
        return "medium"
    if method_hint or time_hint or (round_hint and has_result_word):
        return "medium"
    return "low"


def build_rows(source_mentions: list[dict[str, str]]) -> list[dict[str, str]]:
    by_source: dict[str, list[dict[str, str]]] = defaultdict(list)
    for mention in source_mentions:
        by_source[mention.get("source_id", "")].append(mention)

    rows: list[dict[str, str]] = []
    result_mentions = [
        mention for mention in source_mentions
        if mention.get("mention_type") == "result"
    ]

    for index, mention in enumerate(result_mentions, start=1):
        source_rows = by_source.get(mention.get("source_id", ""), [])
        text = " ".join([mention.get("matched_text", ""), mention.get("context", "")])
        method_hint, method_raw = infer_method(text)
        round_hint = infer_round(text)
        time_hint = infer_time(text)
        event_hint = nearest_hint(source_rows, mention, "event")
        matchup_hint = nearest_hint(source_rows, mention, "matchup")
        confidence = result_confidence(mention, method_hint, round_hint, time_hint, matchup_hint)

        rows.append(
            {
                "candidate_id": f"source-result-{index:04d}",
                "mention_id": mention.get("mention_id", ""),
                "source_id": mention.get("source_id", ""),
                "source_type": mention.get("source_type", ""),
                "source_ref_id": mention.get("source_ref_id", ""),
                "line_number": mention.get("line_number", ""),
                "matched_text": mention.get("matched_text", ""),
                "context": mention.get("context", ""),
                "event_hint": event_hint,
                "matchup_hint": matchup_hint,
                "winner_hint": "",
                "loser_hint": "",
                "method_hint": method_hint,
                "method_raw_hint": method_raw,
                "round_hint": round_hint,
                "time_hint": time_hint,
                "confidence": confidence,
                "notes": "Review-only candidate from source_mentions; do not treat as confirmed result.",
            }
        )

    return rows


def main() -> int:
    with SOURCE_MENTIONS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        source_mentions = list(csv.DictReader(f))

    rows = build_rows(source_mentions)

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "candidate_id",
        "mention_id",
        "source_id",
        "source_type",
        "source_ref_id",
        "line_number",
        "matched_text",
        "context",
        "event_hint",
        "matchup_hint",
        "winner_hint",
        "loser_hint",
        "method_hint",
        "method_raw_hint",
        "round_hint",
        "time_hint",
        "confidence",
        "notes",
    ]

    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    counts: dict[str, int] = defaultdict(int)
    for row in rows:
        counts[row["confidence"]] += 1

    print(f"[write] {OUT_CSV}")
    print(f"[rows] {len(rows)}")
    print("[confidence] " + ", ".join(f"{key}={counts[key]}" for key in sorted(counts)))
    print("[next] Review the CSV before applying anything to data-src/bouts.csv.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
