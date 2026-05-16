#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import html
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTICLES_CSV = ROOT / "data-src" / "articles.csv"

DEFAULT_CREATOR = "xyz1090"
DEFAULT_RSS_URL = f"https://note.com/{DEFAULT_CREATOR}/rss"

USER_AGENT = "arakaku-note-crawler/1.0 (+https://github.com/takano32/arakaku)"

NOTE_ARTICLE_RE = re.compile(r"https://note\.com/[^/\s]+/n/[A-Za-z0-9_-]+")
NOTE_ID_RE = re.compile(r"/n/([A-Za-z0-9_-]+)")


def fetch_text(url: str, *, sleep: float = 0.5) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/xml, text/xml, text/html;q=0.8",
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
            {
                "article_id": article_id_from_url(link),
                "title": title,
                "url": link,
                "source_type": "official_note",
                "article_type": infer_article_type(title),
                "promotion_id": infer_promotion_id(title),
                "published_at": pub_date,
                "last_checked_at": "",
                "status": "unparsed",
                "notes": "Crawled from note RSS.",
            }
        )

    return rows


def parse_html_links(html_text: str) -> list[dict[str, str]]:
    urls = sorted({normalize_url(url) for url in NOTE_ARTICLE_RE.findall(html_text)})

    rows: list[dict[str, str]] = []

    for url in urls:
        article_id = article_id_from_url(url)
        rows.append(
            {
                "article_id": article_id,
                "title": f"note article {article_id.removeprefix('note-')}",
                "url": url,
                "source_type": "official_note",
                "article_type": "note_article",
                "promotion_id": "",
                "published_at": "",
                "last_checked_at": "",
                "status": "unparsed",
                "notes": "Crawled from note HTML link list; title needs review.",
            }
        )

    return rows


def read_articles(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader), list(reader.fieldnames or [])


def write_articles(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


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
    parser.add_argument("--rss-url", default=DEFAULT_RSS_URL)
    parser.add_argument("--html-url", default=f"https://note.com/{DEFAULT_CREATOR}")
    parser.add_argument("--articles", type=Path, default=ARTICLES_CSV)
    parser.add_argument("--use-html", action="store_true", help="Also crawl note creator HTML for extra links.")
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

    merged, added = merge_articles(existing, discovered)

    print(f"[existing] {len(existing) - len(added)}")
    print(f"[discovered] {len(discovered)}")
    print(f"[added] {len(added)}")

    for row in added:
        print(f"{row['article_id']}\t{row['title']}\t{row['url']}")

    if not args.dry_run:
        write_articles(args.articles, fieldnames, merged)
        print(f"[write] {args.articles}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
