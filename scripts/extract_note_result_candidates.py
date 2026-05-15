#!/usr/bin/env python3
from __future__ import annotations

import csv
import html
import re
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTICLES_CSV = ROOT / "data-src" / "articles.csv"
OUT_CSV = ROOT / "review" / "note_result_candidates.csv"
CACHE_DIR = ROOT / "tmp" / "note-html"

RESULT_RE = re.compile(
    r"(KO|TKO|一本|判定|ドロー|ノーコンテスト|NC|失格|DQ|勝利|敗北|防衛|王座|タイトル|一本勝ち|判定勝ち|KO勝ち|TKO勝ち)",
    re.IGNORECASE,
)
VS_RE = re.compile(r"(?i)\bvs\.?\b|ＶＳ|ｖｓ|対")
TIME_RE = re.compile(r"(\d+R|[0-9０-９]+ラウンド|[0-9０-９]+分[0-9０-９]+秒|[0-9０-９]+:[0-9０-９]{2})")


def strip_tags(text: str) -> str:
    text = re.sub(r"<script\b.*?</script>", "\n", text, flags=re.S | re.I)
    text = re.sub(r"<style\b.*?</style>", "\n", text, flags=re.S | re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>|</div>|</li>|</h[1-6]>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\r\n?", "\n", text)
    return text


def fetch(url: str, cache_path: Path) -> str:
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8", errors="replace")

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 arakaku-data-review/1.0",
        },
    )

    with urllib.request.urlopen(req, timeout=30) as res:
        body = res.read().decode("utf-8", errors="replace")

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(body, encoding="utf-8")
    return body


def classify_line(line: str) -> str:
    has_result = bool(RESULT_RE.search(line))
    has_vs = bool(VS_RE.search(line))
    has_time = bool(TIME_RE.search(line))

    if has_vs and has_result:
        return "match_result"
    if has_result and has_time:
        return "result_with_time"
    if has_result:
        return "result"
    if has_vs:
        return "matchup"

    return ""


def main() -> int:
    with ARTICLES_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        articles = list(csv.DictReader(f))

    rows: list[dict[str, str]] = []

    for article in articles:
        url = article.get("url", "")
        article_id = article.get("article_id", "")

        if "note.com" not in url:
            continue

        cache_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", article_id or url) + ".html"
        cache_path = CACHE_DIR / cache_name

        print(f"[fetch] {article_id} {url}")

        try:
            raw_html = fetch(url, cache_path)
        except Exception as exc:
            rows.append(
                {
                    "article_id": article_id,
                    "article_title": article.get("title", ""),
                    "url": url,
                    "line_number": "",
                    "line_type": "fetch_error",
                    "line_text": str(exc),
                }
            )
            continue

        text = strip_tags(raw_html)

        for index, raw_line in enumerate(text.splitlines(), start=1):
            line = re.sub(r"\s+", " ", raw_line).strip()

            if len(line) < 4:
                continue

            line_type = classify_line(line)
            if not line_type:
                continue

            rows.append(
                {
                    "article_id": article_id,
                    "article_title": article.get("title", ""),
                    "url": url,
                    "line_number": str(index),
                    "line_type": line_type,
                    "line_text": line,
                }
            )

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "article_id",
        "article_title",
        "url",
        "line_number",
        "line_type",
        "line_text",
    ]

    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[write] {OUT_CSV}")
    print(f"[rows] {len(rows)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
