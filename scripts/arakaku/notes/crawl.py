# 役割: 公式 note クリエイターの記事一覧 (RSS / HTML のリンク / 非公式 API の JSON) を解析して
#   articles.csv の行にし、既存行へ「未登録 URL の行だけ」追記する規則 (merge_articles)。
# アーキ上の位置: scripts/crawl_note_articles.py が取得 (fetch_text) と CSV の読み書きを担い、
#   ここは文字列と行だけを扱う。crawl_note_api_pages は fetch 関数と進捗の出し先 log を引数で受け取る
#   (テストで差し替え可能。log の既定は何も出さない)。
# 不変条件:
#   - 既存行は URL 正規化キー (normalize_url) で重複判定し、絶対に上書き/削除しない (事実保護)。
#     normalize_url の規則が緩むと重複行や取りこぼしの原因になる。
#   - 発見した行は status="unparsed" で追記し、本文確定は下流に任せる。article_type / promotion_id は
#     タイトルからの推測なので後段レビュー対象。
#   - API の JSON は入れ子を全部たどるので、記事以外の key (32 桁の英数字。開くと 404) も拾ってしまう。
#     記事の ID は n + 12 桁の 16 進数なので、それ以外は捨てる (T.86)。
#   - API ページが JSON でなければ「一覧の終わり」ではなく FetchFailed (レート制限のエラーページ対策、T.103)。
# 関連スキル: .agents/skills/arakaku-source-pipeline/SKILL.md。
from __future__ import annotations

import html
import json
import re
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from typing import Any, Callable

DEFAULT_CREATOR = "xyz1090"

NOTE_ARTICLE_RE = re.compile(r"https://note\.com/[^/\s\"')）]+/n/[A-Za-z0-9_-]+")
NOTE_ID_RE = re.compile(r"/n/([A-Za-z0-9_-]+)")
NOTE_KEY_URL_RE = re.compile(r"/n/n[0-9a-f]{12}(?:[/?#]|$)")

# These endpoints are intentionally best-effort. note may change them.
API_URL_TEMPLATES = [
    "https://note.com/api/v2/creators/{creator}/contents?kind=note&page={page}",
    "https://note.com/api/v2/creators/{creator}/contents?kind=magazine&page={page}",
]


class FetchFailed(Exception):
    """An API page could not be read; the listing is incomplete (T.103)."""


def normalize_url(url: str) -> str:
    # クエリ/フラグメント/末尾スラッシュを落とした正規形。merge_articles の重複判定キーでもある。
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
    # 歴代王者・団体紹介は notes/articles.py と同じく promotion_profile (以前は誰も扱わない title_history
    # を出していた。T.112.4.10)。
    if "歴代王者" in title or "王座" in title or "ルール" in title or "団体" in title:
        return "promotion_profile"
    return "note_article"


def make_article_row(*, title: str, url: str, published_at: str = "", notes: str) -> dict[str, str]:
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
    rows: list[dict[str, str]] = []

    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        link = normalize_url(item.findtext("link") or "")
        pub_date = date_from_rss(item.findtext("pubDate") or "")

        if not link or "/n/" not in link:
            continue

        rows.append(make_article_row(title=title, url=link, published_at=pub_date, notes="Crawled from note RSS."))

    return rows


def parse_html_links(html_text: str) -> list[dict[str, str]]:
    urls = sorted({normalize_url(url) for url in NOTE_ARTICLE_RE.findall(html_text)})
    return [
        make_article_row(
            title=f"note article {article_id_from_url(url).removeprefix('note-')}",
            url=url,
            notes="Crawled from note HTML link list; title needs review.",
        )
        for url in urls
    ]


# API レスポンス JSON の入れ子構造を全 dict まで再帰的に平坦化して列挙する。
# note の API スキーマに依存せず「note っぽいオブジェクト」を拾う best-effort 戦略。
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
    if not NOTE_KEY_URL_RE.search(str(url)):
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
    except json.JSONDecodeError as exc:
        raise FetchFailed(f"invalid JSON: {exc}") from exc

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


def _no_log(message: str) -> None:
    pass


def crawl_note_api_pages(
    creator: str, page_limit: int, sleep: float, fetch: Callable[..., str], log: Callable[[str], None] = _no_log
) -> list[dict[str, str]]:
    """API の一覧を空ページか新規 0 件のページまでたどる。fetch(url, sleep=...) と進捗の出し先 log は呼び出し側が渡す。"""
    rows: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    for template in API_URL_TEMPLATES:
        for page in range(1, page_limit + 1):
            url = template.format(creator=urllib.parse.quote(creator), page=page)
            log(f"[fetch api] {url}")

            try:
                text = fetch(url, sleep=sleep)
                page_rows = parse_json_notes(text)
            except Exception as exc:
                raise FetchFailed(f"api fetch failed: {url}: {exc}") from exc

            if not page_rows:
                log(f"[api rows] page={page} rows=0; stop")
                break

            added_this_page = 0

            for row in page_rows:
                normalized = normalize_url(row["url"])
                if normalized in seen_urls:
                    continue

                rows.append(row)
                seen_urls.add(normalized)
                added_this_page += 1

            log(f"[api rows] page={page} rows={len(page_rows)} added={added_this_page}")

            if added_this_page == 0:
                break

    return rows


def merge_articles(
    existing: list[dict[str, str]],
    discovered: list[dict[str, str]],
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """existing をその場で破壊的に append し、追記分だけを added にも積んで返す。
    URL 既知ならスキップ、article_id 衝突時は -2, -3... を付けて一意化する。"""
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
