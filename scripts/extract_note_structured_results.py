#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

from arakaku_utils import DATA_SRC, REVIEW, read_csv, write_csv


ARTICLES_CSV = DATA_SRC / "articles.csv"
SOURCE_DOCUMENTS_CSV = DATA_SRC / "source_documents.csv"
OUT_CSV = REVIEW / "note_structured_results.csv"

EVENT_PATTERNS = [
    ("target", re.compile(r"ターゲット\s*No\.?\s*([0-9０-９]+)", re.I)),
    ("emperor", re.compile(r"エンペラー\s*No\.?\s*([0-9０-９]+)", re.I)),
    ("mh", re.compile(r"マウンテン[・\- ]?ヒーローズ\s*No\.?\s*([0-9０-９]+)", re.I)),
    ("mh", re.compile(r"マウンテンヒーローズ\s*No\.?\s*([0-9０-９]+)", re.I)),
]

METHOD_PATTERNS = [
    ("TKO", re.compile(r"\bTKO\b|ＴＫＯ|TKO勝ち|TKO勝利|コーナーストップ|タオル投入|タップアウト", re.I)),
    ("KO", re.compile(r"\bKO\b|ＫＯ|KO勝ち|KO勝利", re.I)),
    ("SUB", re.compile(r"一本|一本勝ち|チョーク|絞め|腕十字|アームバー|アームロック|ギロチン|三角|RNC|ネックロック|肩固め|肩はずし|関節|サブミッション", re.I)),
    ("DEC", re.compile(r"判定|判定勝ち|判定勝利|判定\d-\d", re.I)),
    ("DQ", re.compile(r"失格|DQ|反則", re.I)),
    ("NC", re.compile(r"ノーコンテスト|NC", re.I)),
]

ROUND_RE = re.compile(r"([1-5１-５])\s*(?:R|Ｒ|ラウンド)(?:終了)?")
TIME_RE = re.compile(r"([0-9０-９]+)\s*分\s*([0-9０-９]+)\s*秒|([0-9０-９]+):([0-9０-９]{2})")

WIN_MARKS = {"○", "◯"}
LOSS_MARKS = {"●"}
FIGHTER_MARKS = WIN_MARKS | LOSS_MARKS

FOOTER_MARKERS = {"ダウンロード", "copy", "いいなと思ったら", "noteプレミアム", "ヘルプ", "フィードバック", "特商法"}


def normalize_digits(value: str) -> str:
    return value.translate(str.maketrans("０１２３４５６７８９", "0123456789"))


def infer_event_id(text: str, article: dict[str, str]) -> str:
    joined = f"{article.get('title', '')} {text}"

    for promotion_id, pattern in EVENT_PATTERNS:
        match = pattern.search(joined)
        if match:
            number = normalize_digits(match.group(1))
            return f"{promotion_id}-{int(number)}"

    if "MAXバウト" in joined:
        match = re.search(r"第\s*([0-9０-９]+)\s*回\s*MAXバウト", joined)
        number = normalize_digits(match.group(1)) if match else "unknown"

        if "ライト級" in joined:
            if "GP" in joined:
                suffix = "lightweight-gp"
            elif "トーナメント" in joined:
                suffix = "lightweight-tournament"
            else:
                suffix = "lightweight-event"
        elif "ミドル級" in joined:
            suffix = "middleweight-tournament"
        else:
            suffix = "event"

        return f"max-bout-{number}-{suffix}"

    if "エリートスピリッツ" in joined:
        return "elite-spirits-middleweight-gp"

    return ""


def infer_division(text: str) -> str:
    if "ライト級" in text:
        return "ライト級"
    if "ミドル級" in text:
        return "ミドル級"
    if "ヘビー級" in text:
        return "ヘビー級"
    return ""


def infer_bout_type(text: str) -> str:
    if "タイトルマッチ" in text or "王座決定戦" in text:
        return "title_match"
    if "トーナメント" in text or "GP" in text:
        return "tournament_bout"
    if "ワンマッチ" in text:
        return "one_match"
    return ""


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
    raw = normalize_digits(match.group(1))
    suffix = "R終了" if "終了" in match.group(0) else "R"
    return f"{raw}{suffix}"


def infer_time(text: str) -> str:
    match = TIME_RE.search(text)
    if not match:
        return ""
    if match.group(1) and match.group(2):
        return f"{normalize_digits(match.group(1))}分{normalize_digits(match.group(2))}秒"
    if match.group(3) and match.group(4):
        return f"{normalize_digits(match.group(3))}分{normalize_digits(match.group(4))}秒"
    return ""


def clean_fighter_name(raw: str) -> str:
    # Strip record 【X勝Y敗】 and trailing annotations like ＊①
    name = re.sub(r"【[^】]*】", "", raw)
    name = re.sub(r"＊[①②③④⑤⑥⑦⑧⑨⑩\d]+", "", name)
    name = name.strip()
    return name


def _make_row(
    article_id: str,
    event_id: str,
    bout_order: int,
    division: str,
    bout_type: str,
    fighter_a: str,
    fighter_b: str,
    winner: str,
    loser: str,
    result_text: str,
    line_start: int,
    line_end: int,
    source_text: str,
    confidence: str,
) -> dict[str, str]:
    method, method_raw = infer_method(result_text)
    round_value = infer_round(result_text)
    time_value = infer_time(result_text)

    if not confidence:
        if winner and method:
            confidence = "high"
        elif method and (round_value or time_value):
            confidence = "medium"
        elif winner or method:
            confidence = "medium"
        else:
            confidence = "low"

    return {
        "article_id": article_id,
        "event_id": event_id,
        "bout_order": str(bout_order),
        "division": division,
        "bout_type": bout_type,
        "fighter_a": fighter_a,
        "fighter_b": fighter_b,
        "winner": winner,
        "loser": loser,
        "round": round_value,
        "time": time_value,
        "method_raw": method_raw,
        "method_normalized": method,
        "technique": "",
        "source_line_start": str(line_start),
        "source_line_end": str(line_end),
        "source_text": source_text,
        "confidence": confidence,
    }


def parse_article(content_text: str, article: dict[str, str]) -> list[dict[str, str]]:
    article_id = article.get("article_id", "")
    lines = [l.strip() for l in content_text.split("\n")]

    # Trim footer boilerplate
    filtered: list[str] = []
    for line in lines:
        if any(m in line for m in FOOTER_MARKERS):
            break
        if line:
            filtered.append(line)

    event_id = infer_event_id(" ".join(filtered[:80]), article)

    rows: list[dict[str, str]] = []
    current_division = ""
    current_bout_type = ""
    bout_order = 0
    i = 0
    n = len(filtered)

    while i < n:
        line = filtered[i]

        # Section headers
        if "級" in line or "タイトルマッチ" in line or "王座決定戦" in line:
            current_division = infer_division(line) or current_division
            current_bout_type = infer_bout_type(line) or current_bout_type

        # Single-line: [○●]name🆚[○●]name
        if "🆚" in line and not line.startswith("（"):
            parts = line.split("🆚", 1)
            left, right = parts[0].strip(), parts[1].strip()
            if (
                left and left[0] in FIGHTER_MARKS
                and right and right[0] in FIGHTER_MARKS
            ):
                left_mark = left[0]
                left_name = clean_fighter_name(left[1:])
                right_name = clean_fighter_name(right[1:])
                winner = left_name if left_mark in WIN_MARKS else right_name
                loser = right_name if left_mark in WIN_MARKS else left_name
                result_line = filtered[i + 1] if i + 1 < n and filtered[i + 1].startswith("（") else ""
                end_idx = i + 1 if result_line else i
                bout_order += 1
                rows.append(_make_row(
                    article_id, event_id, bout_order, current_division, current_bout_type,
                    left_name, right_name, winner, loser, result_line, i + 1, end_idx + 1, line, "",
                ))
                i = end_idx + 1
                continue

        # Single-line VS: [○●]name vs [○●]name
        if re.search(r"(?i)\bvs\.?\b|ｖｓ|ＶＳ", line) and not line.startswith("（"):
            parts = re.split(r"(?i)\s*(?:vs\.?|ＶＳ|ｖｓ)\s*", line, maxsplit=1)
            if len(parts) == 2:
                left, right = parts[0].strip(), parts[1].strip()
                if left and left[0] in FIGHTER_MARKS and right and right[0] in FIGHTER_MARKS:
                    left_mark = left[0]
                    left_name = clean_fighter_name(left[1:])
                    right_name = clean_fighter_name(right[1:])
                    winner = left_name if left_mark in WIN_MARKS else right_name
                    loser = right_name if left_mark in WIN_MARKS else left_name
                    result_line = filtered[i + 1] if i + 1 < n and filtered[i + 1].startswith("（") else ""
                    end_idx = i + 1 if result_line else i
                    bout_order += 1
                    rows.append(_make_row(
                        article_id, event_id, bout_order, current_division, current_bout_type,
                        left_name, right_name, winner, loser, result_line, i + 1, end_idx + 1, line, "",
                    ))
                    i = end_idx + 1
                    continue

        # Multi-line: [○●]name / 🆚 / [○●]name
        if line and line[0] in FIGHTER_MARKS:
            name1_mark = line[0]
            name1 = clean_fighter_name(line[1:])

            # Find 🆚
            j = i + 1
            while j < n and not filtered[j]:
                j += 1

            if j < n and filtered[j] == "🆚":
                k = j + 1
                while k < n and not filtered[k]:
                    k += 1

                if k < n and filtered[k] and filtered[k][0] in FIGHTER_MARKS:
                    name2_mark = filtered[k][0]
                    name2 = clean_fighter_name(filtered[k][1:])

                    winner = name1 if name1_mark in WIN_MARKS else name2
                    loser = name2 if name1_mark in WIN_MARKS else name1

                    result_line = ""
                    end_idx = k
                    m = k + 1
                    while m < n and not filtered[m]:
                        m += 1
                    if m < n and filtered[m].startswith("（"):
                        result_line = filtered[m]
                        end_idx = m

                    source = f"{line} / 🆚 / {filtered[k]}"
                    if result_line:
                        source += f" / {result_line}"

                    bout_order += 1
                    rows.append(_make_row(
                        article_id, event_id, bout_order, current_division, current_bout_type,
                        name1, name2, winner, loser, result_line, i + 1, end_idx + 1, source, "",
                    ))
                    i = end_idx + 1
                    continue

        i += 1

    return rows


def main() -> int:
    articles = {a["article_id"]: a for a in read_csv(ARTICLES_CSV)}
    source_docs = {
        d["source_ref_id"]: d
        for d in read_csv(SOURCE_DOCUMENTS_CSV)
        if d.get("source_type") == "note_article"
    }

    rows: list[dict[str, str]] = []

    for article_id, article in sorted(articles.items()):
        article_type = article.get("article_type", "")
        if article_type not in {"event_result", "event_card", "note_article"}:
            title = article.get("title", "")
            if "試合" not in title:
                continue

        doc = source_docs.get(article_id)
        if not doc:
            print(f"[skip] no source document for {article_id}")
            continue

        content_text = doc.get("content_text", "")
        if not content_text.strip():
            print(f"[skip] empty content for {article_id}")
            continue

        print(f"[parse] {article_id} {article.get('title', '')}")
        parsed = parse_article(content_text, article)
        rows.extend(parsed)

    fieldnames = [
        "article_id",
        "event_id",
        "bout_order",
        "division",
        "bout_type",
        "fighter_a",
        "fighter_b",
        "winner",
        "loser",
        "round",
        "time",
        "method_raw",
        "method_normalized",
        "technique",
        "source_line_start",
        "source_line_end",
        "source_text",
        "confidence",
    ]
    write_csv(OUT_CSV, fieldnames, rows)

    total = len(rows)
    with_winner = sum(1 for r in rows if r.get("winner"))
    with_method = sum(1 for r in rows if r.get("method_normalized"))
    high = sum(1 for r in rows if r.get("confidence") == "high")
    print(f"[rows] {total}  winner={with_winner}  method={with_method}  high={high}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
