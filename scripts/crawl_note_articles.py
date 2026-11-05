#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
import time
import urllib.request
from pathlib import Path

from arakaku.io import read_raw_csv, write_csv
from arakaku.notes.crawl import (
    DEFAULT_CREATOR,
    FetchFailed,
    crawl_note_api_pages,
    merge_articles,
    parse_html_links,
    parse_rss,
)
from arakaku.paths import DATA_SRC

# 役割: 公式 note クリエイターの記事を RSS / HTML リンク / 非公式 API から発見し、
#   data-src/articles.csv に「未登録 URL の行だけ」追記するクローラの入口 (取得と CSV の読み書き)。
# アーキ上の位置: 取得パイプラインの入口。ここで articles.csv に増えた行を起点に
#   cache_note_html.py -> build_source_documents.py が本文を取りに行く。一覧の解析と追記規則は
#   arakaku/notes/crawl.py。
# 不変条件: 既存行は URL 正規化キーで重複判定し、絶対に上書き/削除しない (事実保護)。
#   API の取得が途中で失敗しても追記はする (既存行は変えない) が、取りこぼしがありうるので
#   終了コード 1 で終わる (T103)。
# 関連スキル: .agents/skills/arakaku-source-pipeline/SKILL.md。
ARTICLES_CSV = DATA_SRC / "articles.csv"

DEFAULT_RSS_URL = f"https://note.com/{DEFAULT_CREATOR}/rss"
DEFAULT_HTML_URL = f"https://note.com/{DEFAULT_CREATOR}"

USER_AGENT = "arakaku-note-crawler/1.0 (+https://github.com/takano32/arakaku)"


def log_stderr(message: str) -> None:
    print(message, file=sys.stderr)


def fetch_text(url: str, *, sleep: float = 0.5) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json, application/rss+xml, application/xml, text/xml, text/html;q=0.8",
        },
    )

    with urllib.request.urlopen(req, timeout=30) as res:
        charset = res.headers.get_content_charset() or "utf-8"
        body = res.read().decode(charset, errors="replace")

    if sleep > 0:
        time.sleep(sleep)

    return body


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Crawl official note articles and append missing rows to data-src/articles.csv.",
    )
    parser.add_argument("--creator", default=DEFAULT_CREATOR)
    parser.add_argument("--rss-url", default=DEFAULT_RSS_URL)
    parser.add_argument("--html-url", default=DEFAULT_HTML_URL)
    parser.add_argument("--articles", type=Path, default=ARTICLES_CSV)
    parser.add_argument("--use-html", action="store_true")
    parser.add_argument("--use-api", action="store_true")
    # 2026-10 時点で記事一覧は 28 ページ。上限で止まると古い記事を取りこぼすので大きめにする (空ページで終わる)。
    parser.add_argument("--page-limit", type=int, default=200)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sleep", type=float, default=0.5)

    args = parser.parse_args()

    existing, fieldnames = read_raw_csv(args.articles)

    discovered: list[dict[str, str]] = []

    print(f"[fetch rss] {args.rss_url}", file=sys.stderr)
    rss_rows = parse_rss(fetch_text(args.rss_url, sleep=args.sleep))
    discovered.extend(rss_rows)
    print(f"[rss rows] {len(rss_rows)}", file=sys.stderr)

    if args.use_html:
        print(f"[fetch html] {args.html_url}", file=sys.stderr)
        html_rows = parse_html_links(fetch_text(args.html_url, sleep=args.sleep))
        discovered.extend(html_rows)
        print(f"[html rows] {len(html_rows)}", file=sys.stderr)

    failed = False
    if args.use_api:
        try:
            api_rows = crawl_note_api_pages(args.creator, args.page_limit, args.sleep, fetch_text, log=log_stderr)
        except FetchFailed as exc:
            print(f"[error] {exc}", file=sys.stderr)
            failed, api_rows = True, []
        discovered.extend(api_rows)
        print(f"[api total rows] {len(api_rows)}", file=sys.stderr)

    merged, added = merge_articles(existing, discovered)

    print(f"[existing] {len(existing) - len(added)}")
    print(f"[discovered] {len(discovered)}")
    print(f"[added] {len(added)}")

    for row in added:
        print(f"{row['article_id']}\t{row['title']}\t{row['url']}")

    if not args.dry_run and added:
        write_csv(args.articles, fieldnames, merged)

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
