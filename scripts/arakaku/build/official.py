# 役割: 公式サイト由来の official_*.csv の行を docs/data/official_*.json の形に組み立てる。
#   players / tournaments / matches / history (json_builders) と news / pages (pages_json_builders)。
#   viewer はこれを正規/Numbers データと突き合わせて表示する。
# アーキ上の位置: 入力 = data-src/official_*.csv の行 (scripts/generate_official_csvs.py・generate_official_pages_csv.py が
#   tmp/arakaku-site の公式サイトのソースから生成)、
#   出力 = docs/data/official_*.json。I/O は scripts/build_official_json.py と
#   scripts/build_official_pages_json.py が行う。
# 不変条件:
#   - 公式データを事実として保持し改変しない。出力キーは viewer の契約。
#   - 本文 HTML はそのまま出す。「/」始まりの画像・リンクは viewer (ui/sections/official.js officialBodyHtml)
#     が公式サイトの URL に書き換える。以前は tmp/arakaku-site/public/ があるときだけ画像を base64 で
#     埋め込んでいたが、手元 (1.9MB) と CI (15KB) で出力が変わるのでやめた (T.79、ユーザー判断)。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any, Callable

from arakaku.csvmap import int_field, map_rows
from arakaku.schema import CsvRow


def build_official_players(players: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        players,
        {
            "id": "id",
            "name": "name",
            "name_kana": "name_kana",
            "nickname": "nickname",
            "organization": "organization",
            "weight_class": "weight_class",
            "age": int_field("age"),
            "height": int_field("height"),
            "wins": int_field("wins"),
            "losses": int_field("losses"),
            "draws": int_field("draws"),
            "debut": "debut",
            "nationality": "nationality",
            "gym": "gym",
            "bio": "bio",
            "slug": "slug",
        },
    )


def build_official_tournaments(tournaments: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        tournaments,
        {
            "id": "id",
            "name": "name",
            "date": "date",
            "video_id": "video_id",
            "champion": "champion",
            "runner_up": "runner_up",
        },
    )


def build_official_matches(matches: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        matches,
        {
            "id": "id",
            "event": "event",
            "date": "date",
            "fighter1": "fighter1",
            "fighter2": "fighter2",
            "result": "result",
            "method": "method",
            "round": "round",
            "weight_class": "weight_class",
            "youtube_id": "youtube_id",
            "notes": "notes",
        },
    )


def build_official_history(history: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        history,
        {
            "year": int_field("year"),
            "era": "era",
            "month": "month",
            "title": "title",
            "description": "description",
        },
    )


def build_official_news(news: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        news,
        {
            "slug": "slug",
            "title": "title",
            "date": "date",
            "category": "category",
            "summary": "summary",
            "body_md": "body_md",
        },
    )


def build_official_pages(pages: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        pages,
        {
            "slug": "slug",
            "title": "title",
            "description": "description",
            "body_html": "body_html",
        },
    )


def json_builders(
    players: list[CsvRow], tournaments: list[CsvRow], matches: list[CsvRow], history: list[CsvRow]
) -> dict[str, Callable[[], Any]]:
    return {
        "official_players.json": lambda: build_official_players(players),
        "official_tournaments.json": lambda: build_official_tournaments(tournaments),
        "official_matches.json": lambda: build_official_matches(matches),
        "official_history.json": lambda: build_official_history(history),
    }


def pages_json_builders(news: list[CsvRow], pages: list[CsvRow]) -> dict[str, Callable[[], Any]]:
    return {
        "official_news.json": lambda: build_official_news(news),
        "official_pages.json": lambda: build_official_pages(pages),
    }
