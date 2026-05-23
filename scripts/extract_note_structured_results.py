#!/usr/bin/env python3
from __future__ import annotations

import html
import re
import urllib.request
from pathlib import Path

from arakaku_utils import DATA_SRC, REVIEW, ROOT, read_csv, safe_slug, write_csv


ARTICLES_CSV = DATA_SRC / "articles.csv"
OUT_CSV = REVIEW / "note_structured_results.csv"
CACHE_DIR = ROOT / "tmp" / "note-html"

EVENT_PATTERNS = [
    ("target", re.compile(r"ターゲット\s*No\.?\s*([0-9０-９]+)", re.I)),
    ("emperor", re.compile(r"エンペラー\s*No\.?\s*([0-9０-９]+)", re.I)),
    ("mh", re.compile(r"マウンテン[・\- ]?ヒーローズ\s*No\.?\s*([0-9０-９]+)", re.I)),
    ("mh", re.compile(r"マウンテンヒーローズ\s*No\.?\s*([0-9０-９]+)", re.I)),
]

METHOD_PATTERNS = [
    ("TKO", re.compile(r"\bTKO\b|ＴＫＯ|TKO勝ち|TKO勝利", re.I)),
    ("KO", re.compile(r"\bKO\b|ＫＯ|KO勝ち|KO勝利", re.I)),
    ("SUB", re.compile(r"一本|一本勝ち|一本勝利|サブミッション|チョーク|腕十字|関節", re.I)),
    ("DEC", re.compile(r"判定|判定勝ち|判定勝利", re.I)),
    ("DQ", re.compile(r"失格|DQ", re.I)),
    ("NC", re.compile(r"ノーコンテスト|NC", re.I)),
]

VS_RE = re.compile(r"(?i)\bvs\.?\b|ＶＳ|ｖｓ|対")
ROUND_RE = re.compile(r"([1-5１-５])\s*(?:R|Ｒ|ラウンド)")
TIME_RE = re.compile(r"([0-9０-９]+)\s*分\s*([0-9０-９]+)\s*秒|([0-9０-９]+):([0-9０-９]{2})")
RESULT_HINT_RE = re.compile(r"(KO|TKO|一本|判定|ドロー|ノーコンテスト|NC|失格|DQ|勝利|勝ち|敗北|防衛|王座|タイトル)", re.I)


def normalize_digits(value: str) -> str:
    return value.translate(str.maketrans("０１２３４５６７８９", "0123456789"))


def strip_tags(text: str) -> str:
    text = re.sub(r"<script\b.*?</script>", "\n", text, flags=re.S | re.I)
    text = re.sub(r"<style\b.*?</style>", "\n", text, flags=re.S | re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>|</div>|</li>|</h[1-6]>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\r\n?", "\n", text)
    return text


def cache_name_for_article(article_id: str, url: str) -> str:
    raw = article_id or url
    return f"{safe_slug(raw)}.html"


def fetch(url: str, cache_path: Path) -> str:
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8", errors="replace")

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 arakaku-note-structured-results/1.0"},
    )

    with urllib.request.urlopen(req, timeout=30) as res:
        body = res.read().decode("utf-8", errors="replace")

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(body, encoding="utf-8")
    return body


def clean_line(line: str) -> str:
    line = re.sub(r"\s+", " ", line).strip()
    line = line.replace("｜アラカク通信のーと", "")
    return line


def clean_name(value: str) -> str:
    value = clean_line(value)
    value = re.sub(r"^[☆★・\-—–●■◆\s]+", "", value)
    value = value.strip("[]【】（）()「」『』,，:：")
    value = re.sub(r"\s+", " ", value)
    return value


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
            suffix = "lightweight-gp" if "GP" in joined else "lightweight-tournament"
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


def extract_matchup(line: str) -> tuple[str, str] | None:
    text = clean_line(line)
    text = re.sub(r"^[☆★・\-—–●■◆\s]+", "", text)

    if not VS_RE.search(text):
        return None

    parts = re.split(r"\s*(?:vs\.?|VS|ＶＳ|ｖｓ|対)\s*", text, maxsplit=1, flags=re.I)
    if len(parts) != 2:
        return None

    left, right = parts

    # Remove metadata from the left side.
    for sep in ["】", "］", "]", "：", ":"]:
        if sep in left:
            left = left.split(sep)[-1]

    # Remove metadata from the right side.
    for marker in [
        "ターゲットNo",
        "エンペラーNo",
        "マウンテン・ヒーローズNo",
        "マウンテンヒーローズNo",
        "MAXバウト",
        "ライト級",
        "ミドル級",
        "ヘビー級",
        "ワンマッチ",
        "タイトルマッチ",
        "王座",
        "（",
        "(",
        "【",
    ]:
        idx = right.find(marker)
        if idx >= 0:
            right = right[:idx]

    left = clean_name(left)
    right = clean_name(right)

    if not left or not right or left == right:
        return None

    if len(left) > 60 or len(right) > 60:
        return None

    return left, right


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
        return f"{normalize_digits(match.group(1))}分{normalize_digits(match.group(2))}秒"

    if match.group(3) and match.group(4):
        return f"{normalize_digits(match.group(3))}分{normalize_digits(match.group(4))}秒"

    return ""


def compact_name(value: str) -> str:
    return re.sub(r"\s+", "", value).replace("・", "").replace("　", "").lower()


def infer_winner(context: str, fighter_a: str, fighter_b: str) -> tuple[str, str]:
    compact = compact_name(context)
    a = compact_name(fighter_a)
    b = compact_name(fighter_b)

    win_tokens = [
        "勝ち",
        "勝利",
        "一本勝ち",
        "判定勝ち",
        "ko勝ち",
        "tko勝ち",
        "防衛成功",
        "王座獲得",
        "王者に",
        "新王者",
    ]

    for name, norm in [(fighter_a, a), (fighter_b, b)]:
        if not norm:
            continue

        pos = compact.find(norm)
        if pos < 0:
            continue

        tail = compact[pos:pos + 160]
        head = compact[max(0, pos - 80):pos]

        if any(token in tail for token in win_tokens):
            loser = fighter_b if name == fighter_a else fighter_a
            return name, loser

        if any(token in head for token in ["勝者", "勝ったのは"]):
            loser = fighter_b if name == fighter_a else fighter_a
            return name, loser

    # Pattern: Aが... / Aは... + result words
    for name, norm in [(fighter_a, a), (fighter_b, b)]:
        if not norm:
            continue

        for marker in [f"{norm}が", f"{norm}は"]:
            pos = compact.find(marker)
            if pos >= 0:
                tail = compact[pos:pos + 160]
                if any(token in tail for token in win_tokens):
                    loser = fighter_b if name == fighter_a else fighter_a
                    return name, loser

    return "", ""


def parse_article(article: dict[str, str]) -> list[dict[str, str]]:
    url = article.get("url", "")
    article_id = article.get("article_id", "")

    if "note.com" not in url:
        return []

    raw = fetch(url, CACHE_DIR / cache_name_for_article(article_id, url))
    text = strip_tags(raw)

    lines = [
        (index, clean_line(raw_line))
        for index, raw_line in enumerate(text.splitlines(), start=1)
        if len(clean_line(raw_line)) >= 3
    ]

    event_id = infer_event_id(" ".join(line for _, line in lines[:80]), article)

    rows: list[dict[str, str]] = []
    current_division = ""
    current_bout_type = ""
    bout_order = 0

    for idx, line in lines:
        if "級" in line or "タイトルマッチ" in line or "王座決定戦" in line:
            current_division = infer_division(line) or current_division
            current_bout_type = infer_bout_type(line) or current_bout_type

        matchup = extract_matchup(line)
        if not matchup:
            continue

        fighter_a, fighter_b = matchup
        bout_order += 1

        # Look near the matchup line for result lines.
        nearby = [
            (j, other)
            for j, other in lines
            if idx - 2 <= j <= idx + 12
        ]

        source_text = " / ".join(other for _, other in nearby)
        result_line = next((other for _, other in nearby if RESULT_HINT_RE.search(other)), "")

        method, method_raw = infer_method(source_text)
        round_value = infer_round(source_text)
        time_value = infer_time(source_text)
        winner, loser = infer_winner(source_text, fighter_a, fighter_b)

        confidence = "low"
        if winner and method:
            confidence = "high"
        elif method and (round_value or time_value):
            confidence = "medium"
        elif method or winner:
            confidence = "medium"

        if article.get("article_type") == "event_result" and confidence == "medium":
            confidence = "high" if winner and method else "medium"

        rows.append(
            {
                "article_id": article_id,
                "event_id": event_id,
                "bout_order": str(bout_order),
                "division": current_division,
                "bout_type": current_bout_type,
                "fighter_a": fighter_a,
                "fighter_b": fighter_b,
                "winner": winner,
                "loser": loser,
                "round": round_value,
                "time": time_value,
                "method_raw": method_raw,
                "method_normalized": method,
                "technique": "",
                "source_line_start": str(idx),
                "source_line_end": str(nearby[-1][0]) if nearby else str(idx),
                "source_text": source_text,
                "confidence": confidence,
            }
        )

    return rows


def main() -> int:
    articles = read_csv(ARTICLES_CSV)

    rows: list[dict[str, str]] = []

    for article in articles:
        article_type = article.get("article_type", "")
        title = article.get("title", "")

        if article_type not in {"event_result", "event_card", "note_article"} and "試合" not in title:
            continue

        print(f"[parse] {article.get('article_id')} {title}")

        try:
            rows.extend(parse_article(article))
        except Exception as exc:
            rows.append(
                {
                    "article_id": article.get("article_id", ""),
                    "event_id": "",
                    "bout_order": "",
                    "division": "",
                    "bout_type": "",
                    "fighter_a": "",
                    "fighter_b": "",
                    "winner": "",
                    "loser": "",
                    "round": "",
                    "time": "",
                    "method_raw": "",
                    "method_normalized": "",
                    "technique": "",
                    "source_line_start": "",
                    "source_line_end": "",
                    "source_text": f"parse_error: {exc}",
                    "confidence": "error",
                }
            )

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

    print(f"[rows] {len(rows)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
