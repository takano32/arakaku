#!/usr/bin/env python3
# 役割: 公式サイト由来の official_*.csv (players/tournaments/matches/history) を
#   docs/data/official_*.json に変換する。viewer はこれを正規/Numbers データと突き合わせて表示する。
# アーキ上の位置: 入力 = data-src/official_*.csv (generate_official_csvs.py が生成)、
#   出力 = docs/data/official_*.json。本文 HTML/ニュースは別ビルダ build_official_pages_json.py が担当。
# 不変条件: 公式データを事実として保持し改変しない。出力キーは viewer の契約。
# 関連スキル: .agents/skills/arakaku-maintainer。
"""Build official_*.json from official_*.csv (data sourced from official site)."""
from __future__ import annotations

from typing import Any

from arakaku.utils import (
    build_json_files,
    int_field,
    map_csv,
)


def build_official_players() -> list[dict[str, Any]]:
    return map_csv(
        "official_players.csv",
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


def build_official_tournaments() -> list[dict[str, Any]]:
    return map_csv(
        "official_tournaments.csv",
        {
            "id": "id",
            "name": "name",
            "date": "date",
            "video_id": "video_id",
            "champion": "champion",
            "runner_up": "runner_up",
        },
    )


def build_official_matches() -> list[dict[str, Any]]:
    return map_csv(
        "official_matches.csv",
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


def build_official_history() -> list[dict[str, Any]]:
    return map_csv(
        "official_history.csv",
        {
            "year": int_field("year"),
            "era": "era",
            "month": "month",
            "title": "title",
            "description": "description",
        },
    )


JSON_BUILDERS = {
    "official_players.json": build_official_players,
    "official_tournaments.json": build_official_tournaments,
    "official_matches.json": build_official_matches,
    "official_history.json": build_official_history,
}


def main() -> None:
    build_json_files(JSON_BUILDERS, "[done] official JSON build completed")


if __name__ == "__main__":
    main()
