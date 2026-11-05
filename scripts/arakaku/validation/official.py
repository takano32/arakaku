# 役割: 公式サイト由来の official_*.json (players / tournaments / matches / history / news / pages) の検証。
#   pages の body_html は第三者リポジトリから写してサニタイズせずに viewer が挿入するので、script を
#   動かせる・想定外の frame を読み込むものは出荷前に落とす (unsafe_official_html)。
# アーキ上の位置: runner.py が呼ぶ。viewer 側の消費箇所は各関数のコメントのとおり。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

import re
import urllib.parse
from typing import Any

from .common import collect_ids, require_field
from .report import Report


def validate_official_players(report: Report, players: list[Any]) -> None:
    # Built unconditionally by build_official_json.py; consumed by the 公式 tab,
    # fighter-profile enrichment (docs/assets/js/data/enricher.js matches on `name`)
    # and the data/repository.js discovery of official-only fighters.
    collect_ids(report, players, 'official_players.json', 'id')
    for i, x in enumerate(players):
        if not isinstance(x, dict):
            continue
        require_field(report, x, 'official_players.json', i, 'name')


def validate_official_tournaments(report: Report, tournaments: list[Any]) -> None:
    # data/enricher.js normalizes `id` to match events; ui/sections render `name`.
    collect_ids(report, tournaments, 'official_tournaments.json', 'id')
    for i, x in enumerate(tournaments):
        if not isinstance(x, dict):
            continue
        require_field(report, x, 'official_tournaments.json', i, 'name')


def validate_official_matches(report: Report, matches: list[Any]) -> None:
    # ui/sections/admin.js shows `id` in the detail disclosure; other fields are guarded.
    collect_ids(report, matches, 'official_matches.json', 'id')


def validate_official_history(report: Report, history: list[Any]) -> None:
    # No id column (build_official_json.py); ui/sections/admin.js renders `title`.
    for i, x in enumerate(history):
        if not isinstance(x, dict):
            report.error(f"official_history.json[{i}]: expected object")
            continue
        require_field(report, x, 'official_history.json', i, 'title')


def validate_official_news(report: Report, news: list[Any]) -> None:
    # ui/sections/official.js renders `title` and the slug is the primary key.
    collect_ids(report, news, 'official_news.json', 'slug')
    for i, x in enumerate(news):
        if not isinstance(x, dict):
            continue
        require_field(report, x, 'official_news.json', i, 'title')


def validate_official_pages(report: Report, pages: list[Any]) -> None:
    # ui/sections/official.js renders `title` and injects `body_html` as raw HTML.
    collect_ids(report, pages, 'official_pages.json', 'slug')
    for i, x in enumerate(pages):
        if not isinstance(x, dict):
            continue
        require_field(report, x, 'official_pages.json', i, 'title')
        body = require_field(report, x, 'official_pages.json', i, 'body_html')
        if isinstance(body, str):
            for problem in unsafe_official_html(body):
                report.error(f"official_pages.json[{i}] ({x.get('slug')}): body_html {problem}")


# body_html is copied from a third-party repo and injected without sanitizing, so anything
# that can run script or load an unexpected frame must fail the build instead of shipping.
OFFICIAL_IFRAME_HOSTS = {'www.youtube.com', 'www.youtube-nocookie.com'}
UNSAFE_TAG = re.compile(r'<\s*(script|object|embed|form|base|meta|link|style)\b', re.IGNORECASE)
HTML_TAG = re.compile(r'<[a-zA-Z][^>]*>')
EVENT_ATTR = re.compile(r'\son[a-z]+\s*=', re.IGNORECASE)
URL_ATTR = re.compile(r'\b(?:src|href|action|formaction)\s*=\s*["\']?\s*([^"\'\s>]+)', re.IGNORECASE)


def unsafe_official_html(body: str) -> list[str]:
    problems = []
    for m in UNSAFE_TAG.finditer(body):
        problems.append(f"contains <{m.group(1).lower()}>")
    for tag in HTML_TAG.findall(body):
        if EVENT_ATTR.search(tag):
            problems.append(f"has an event handler attribute: {tag[:80]}")
        if re.search(r'\bsrcdoc\s*=', tag, re.IGNORECASE):
            problems.append(f"has srcdoc: {tag[:80]}")
        for url in URL_ATTR.findall(tag):
            if re.match(r'(?:javascript|vbscript):', url, re.IGNORECASE):
                problems.append(f"has a script URL: {tag[:80]}")
        if re.match(r'<iframe\b', tag, re.IGNORECASE):
            src = re.search(r'\bsrc="([^"]*)"', tag)
            host = urllib.parse.urlsplit(src.group(1)).hostname if src else None
            if host not in OFFICIAL_IFRAME_HOSTS:
                problems.append(f"has an iframe from an unexpected host ({host}): {tag[:80]}")
    return problems
