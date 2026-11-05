# 役割: source_mentions.csv の "result" 種別の言及からテキストを解析し、試合結果の手掛かり
#   (method/round/time/event/matchup) を抽出した review/source_mention_result_candidates.csv の行を作る。
# アーキ上の位置: scripts/make_source_mention_result_candidates.py が source_mentions.csv を読んで
#   build_rows に渡し write_csv する。共有テキスト解析ヘルパは arakaku/textparse.py。
# 不変条件 / 注意: METHOD_PATTERNS / ROUND_RE / RESULT_WORD_RE はこの候補生成に固有の語彙なので
#   textparse.py へ移さないこと (skill の指示)。出力はあくまで候補であり winner/loser は推定しない
#   (winner_hint/loser_hint は常に空)。
# 関連 skill: .agents/skills/arakaku-source-pipeline (Review candidate pipeline)。
from __future__ import annotations

import re
from collections import defaultdict

from arakaku.io import CsvRow
from arakaku.textparse import find_method, infer_time, normalize_digits

FIELDS = [
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

METHOD_PATTERNS = [
    ("TKO", re.compile(r"TKO|ＴＫＯ|TKO勝ち|タオル投入|コーナーストップ", re.IGNORECASE)),
    ("KO", re.compile(r"KO|ＫＯ|KO勝ち", re.IGNORECASE)),
    ("SUB", re.compile(r"一本|一本勝ち|サブミッション|RNC|チョーク|腕十字|関節", re.IGNORECASE)),
    ("DEC", re.compile(r"判定|判定勝ち", re.IGNORECASE)),
    ("DQ", re.compile(r"失格|DQ", re.IGNORECASE)),
    ("NC", re.compile(r"ノーコンテスト|NC", re.IGNORECASE)),
]

ROUND_RE = re.compile(r"([1-5１-５])\s*(?:R|Ｒ|ラウンド)")
RESULT_WORD_RE = re.compile(r"勝ち|勝利|防衛|王座獲得|統一|KO|ＫＯ|TKO|ＴＫＯ|一本|判定")


def _line_number(row: CsvRow) -> int:
    try:
        return int(row.get("line_number") or 0)
    except ValueError:
        return 0


def infer_round(text: str) -> str:
    match = ROUND_RE.search(text)
    if not match:
        return ""
    return f"{normalize_digits(match.group(1))}R"


def nearest_hint(
    mentions: list[dict[str, str]],
    current: dict[str, str],
    mention_type: str,
    max_distance: int = 8,
) -> str:
    # 同一 source 内で current に最も近い (行番号距離が max_distance 以内の) 指定 mention_type の言及を探し、
    # その手掛かり文字列を返す。result 言及の近くにある event/matchup を関連付けるための近接ヒューリスティック。
    current_line = _line_number(current)
    candidates = [
        row
        for row in mentions
        if row.get("source_id") == current.get("source_id")
        and row.get("mention_type") == mention_type
        and row is not current
        and abs(_line_number(row) - current_line) <= max_distance
    ]
    if not candidates:
        return ""

    candidates.sort(key=lambda row: (abs(_line_number(row) - current_line), _line_number(row)))
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
    # result 種別の言及のみが候補行になる (1 言及 = 1 候補行)。
    result_mentions = [
        mention for mention in source_mentions
        if mention.get("mention_type") == "result"
    ]

    for index, mention in enumerate(result_mentions, start=1):
        source_rows = by_source.get(mention.get("source_id", ""), [])
        text = " ".join([mention.get("matched_text", ""), mention.get("context", "")])
        method_hint, method_raw = find_method(text, METHOD_PATTERNS)
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
