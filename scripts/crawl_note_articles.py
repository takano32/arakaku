#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

from arakaku.utils import ROOT, write_csv

ARTICLES_CSV = ROOT / "data-src" / "articles.csv"

DEFAULT_CREATOR = "xyz1090"
DEFAULT_RSS_URL = f"https://note.com/{DEFAULT_CREATOR}/rss"
DEFAULT_HTML_URL = f"https://note.com/{DEFAULT_CREATOR}"

USER_AGENT = "arakaku-note-crawler/1.0 (+https://github.com/takano32/arakaku)"

NOTE_ARTICLE_RE = re.compile(r"https://note\.com/[^/\s\"')）]+/n/[A-Za-z0-9_-]+")
NOTE_ID_RE = re.compile(r"/n/([A-Za-z0-9_-]+)")


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


def normalize_url(url: str) -> str:
    url = html.unescape(url.strip())
    url = url.split("?")[0].split("#")[0]
    return url.rstrip("/")


def article_id_from_url(url: str) -> str:
    match = NOTE_ID_RE.search(url)
    if match:
        return f"note-{match.group(1).lower()}"

    safe = re.sub(r"[^A-Za-z0-9_-]+", "-", url).strip("-").lower()
    return f"note-{safe[-40:]}"


def date_from_rss(value: str) -> str:
    value = value.strip()

    if not value:
        return ""

    try:
        return parsedate_to_datetime(value).date().isoformat()
    except Exception:
        return ""


def normalize_date(value: str) -> str:
    value = str(value or "").strip()

    if not value:
        return ""

    # note API often returns ISO datetime.
    if re.match(r"^\d{4}-\d{2}-\d{2}", value):
        return value[:10]

    return date_from_rss(value)


def infer_promotion_id(title: str) -> str:
    if "ターゲット" in title:
        return "target"
    if "エンペラー" in title:
        return "emperor"
    if "マウンテン・ヒーローズ" in title or "マウンテンヒーローズ" in title:
        return "mh"
    if "MAXバウト" in title:
        return "max_bout"
    if "エリートスピリッツ" in title:
        return "elite_spirits"
    return ""


def infer_article_type(title: str) -> str:
    if "試合結果" in title or "結果" in title:
        return "event_result"
    if "対戦カード" in title or "見どころ" in title:
        return "event_card"
    if "歴代王者" in title or "王座" in title:
        return "title_history"
    if "ルール" in title or "団体" in title:
        return "promotion_profile"
    return "note_article"


def make_article_row(
    *,
    title: str,
    url: str,
    published_at: str = "",
    notes: str,
) -> dict[str, str]:
    title = html.unescape(str(title or "")).strip()
    url = normalize_url(url)

    return {
        "article_id": article_id_from_url(url),
        "title": title or f"note article {article_id_from_url(url).removeprefix('note-')}",
        "url": url,
        "source_type": "official_note",
        "article_type": infer_article_type(title),
        "promotion_id": infer_promotion_id(title),
        "published_at": normalize_date(published_at),
        "last_checked_at": "",
        "status": "unparsed",
        "notes": notes,
    }


def parse_rss(xml_text: str) -> list[dict[str, str]]:
    root = ET.fromstring(xml_text)
    items = root.findall(".//item")

    rows: list[dict[str, str]] = []

    for item in items:
        title = (item.findtext("title") or "").strip()
        link = normalize_url(item.findtext("link") or "")
        pub_date = date_from_rss(item.findtext("pubDate") or "")

        if not link or "/n/" not in link:
            continue

        rows.append(
            make_article_row(
                title=title,
                url=link,
                published_at=pub_date,
                notes="Crawled from note RSS.",
            )
        )

    return rows


def parse_html_links(html_text: str) -> list[dict[str, str]]:
    urls = sorted({normalize_url(url) for url in NOTE_ARTICLE_RE.findall(html_text)})

    rows: list[dict[str, str]] = []

    for url in urls:
        rows.append(
            make_article_row(
                title=f"note article {article_id_from_url(url).removeprefix('note-')}",
                url=url,
                notes="Crawled from note HTML link list; title needs review.",
            )
        )

    return rows


def iter_json_objects(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_json_objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_json_objects(child)


def row_from_note_object(obj: dict[str, Any]) -> dict[str, str] | None:
    key = obj.get("key") or obj.get("noteKey")
    urlname = obj.get("user", {}).get("urlname") if isinstance(obj.get("user"), dict) else None

    url = obj.get("url") or obj.get("noteUrl") or obj.get("shareUrl") or ""

    if not url and key:
        creator = urlname or DEFAULT_CREATOR
        url = f"https://note.com/{creator}/n/{key}"

    if not url or "/n/" not in str(url):
        return None

    title = obj.get("name") or obj.get("title") or ""
    published_at = obj.get("publishAt") or obj.get("publishedAt") or obj.get("createdAt") or ""

    return make_article_row(
        title=str(title),
        url=str(url),
        published_at=str(published_at),
        notes="Crawled from note JSON/API.",
    )


def parse_json_notes(json_text: str) -> list[dict[str, str]]:
    try:
        data = json.loads(json_text)
    except json.JSONDecodeError:
        return []

    rows: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    for obj in iter_json_objects(data):
        row = row_from_note_object(obj)
        if not row:
            continue

        url = normalize_url(row["url"])
        if url in seen_urls:
            continue

        rows.append(row)
        seen_urls.add(url)

    return rows


def crawl_note_api_pages(creator: str, page_limit: int, sleep: float) -> list[dict[str, str]]:
    # These endpoints are intentionally best-effort. note may change them.
    url_templates = [
        "https://note.com/api/v2/creators/{creator}/contents?kind=note&page={page}",
        "https://note.com/api/v2/creators/{creator}/contents?kind=magazine&page={page}",
    ]

    rows: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    for template in url_templates:
        for page in range(1, page_limit + 1):
            url = template.format(creator=urllib.parse.quote(creator), page=page)
            print(f"[fetch api] {url}", file=sys.stderr)

            try:
                text = fetch_text(url, sleep=sleep)
            except Exception as exc:
                print(f"[warn] api fetch failed: {url}: {exc}", file=sys.stderr)
                break

            page_rows = parse_json_notes(text)

            if not page_rows:
                print(f"[api rows] page={page} rows=0; stop", file=sys.stderr)
                break

            added_this_page = 0

            for row in page_rows:
                normalized = normalize_url(row["url"])
                if normalized in seen_urls:
                    continue

                rows.append(row)
                seen_urls.add(normalized)
                added_this_page += 1

            print(f"[api rows] page={page} rows={len(page_rows)} added={added_this_page}", file=sys.stderr)

            if added_this_page == 0:
                break

    return rows


def read_articles(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader), list(reader.fieldnames or [])


def merge_articles(
    existing: list[dict[str, str]],
    discovered: list[dict[str, str]],
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    known_urls = {normalize_url(row.get("url", "")) for row in existing if row.get("url")}
    known_ids = {row.get("article_id", "") for row in existing if row.get("article_id")}

    added: list[dict[str, str]] = []

    for row in discovered:
        url = normalize_url(row["url"])
        if url in known_urls:
            continue

        article_id = row["article_id"]
        base_id = article_id
        counter = 2

        while article_id in known_ids:
            article_id = f"{base_id}-{counter}"
            counter += 1

        row = dict(row)
        row["article_id"] = article_id
        row["url"] = url

        existing.append(row)
        added.append(row)
        known_urls.add(url)
        known_ids.add(article_id)

    return existing, added


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
    parser.add_argument("--page-limit", type=int, default=20)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sleep", type=float, default=0.5)

    args = parser.parse_args()

    existing, fieldnames = read_articles(args.articles)

    discovered: list[dict[str, str]] = []

    print(f"[fetch rss] {args.rss_url}", file=sys.stderr)
    rss_text = fetch_text(args.rss_url, sleep=args.sleep)
    rss_rows = parse_rss(rss_text)
    discovered.extend(rss_rows)
    print(f"[rss rows] {len(rss_rows)}", file=sys.stderr)

    if args.use_html:
        print(f"[fetch html] {args.html_url}", file=sys.stderr)
        html_text = fetch_text(args.html_url, sleep=args.sleep)
        html_rows = parse_html_links(html_text)
        discovered.extend(html_rows)
        print(f"[html rows] {len(html_rows)}", file=sys.stderr)

    if args.use_api:
        api_rows = crawl_note_api_pages(args.creator, args.page_limit, args.sleep)
        discovered.extend(api_rows)
        print(f"[api total rows] {len(api_rows)}", file=sys.stderr)

    merged, added = merge_articles(existing, discovered)

    print(f"[existing] {len(existing) - len(added)}")
    print(f"[discovered] {len(discovered)}")
    print(f"[added] {len(added)}")

    for row in added:
        print(f"{row['article_id']}\t{row['title']}\t{row['url']}")

    if not args.dry_run:
        write_csv(args.articles, fieldnames, merged)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
