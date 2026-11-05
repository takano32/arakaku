# 役割: 公式サイト（別リポジトリ takano32/arakaku-site）の JSON エクスポートを
#   official_players / official_tournaments / official_matches / official_history の CSV の行に写す。
#   camelCase の公式キーを snake_case 列へマッピングするだけの薄い層。
# アーキ上の位置: scripts/generate_official_csvs.py が tmp/arakaku-site/data/*.json を読んでここに渡し、
#   write_csv する。I/O はしない。出力 CSV は build_official_json.py (arakaku/build/official.py) が読む。
# 不変条件: official_* は公式由来の比較データであり、本リポジトリの canonical CSV とは別系統。
#   各 *_FIELDS と行の辞書のキーは write_csv の DictWriter で厳密一致させること。
# 関連スキル: .agents/skills/arakaku-data-curator。
from __future__ import annotations

from typing import Any

PLAYER_FIELDS = [
    "id", "name", "name_kana", "nickname", "organization",
    "weight_class", "age", "height", "wins", "losses", "draws",
    "debut", "nationality", "gym", "bio", "slug",
]
TOURNAMENT_FIELDS = ["id", "name", "date", "video_id", "champion", "runner_up"]
MATCH_FIELDS = [
    "id", "event", "date", "fighter1", "fighter2",
    "result", "method", "round", "weight_class", "youtube_id", "notes",
]
HISTORY_FIELDS = ["year", "era", "month", "title", "description"]


def player_rows(players: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [
        {
            "id": p["id"],
            "name": p.get("name", ""),
            "name_kana": p.get("nameKana", ""),
            "nickname": p.get("nickname", ""),
            "organization": p.get("organization", ""),
            "weight_class": p.get("weightClass", ""),
            "age": str(p.get("age", "")),
            "height": str(p.get("height", "")),
            "wins": str(p.get("wins", "")),
            "losses": str(p.get("losses", "")),
            "draws": str(p.get("draws", "")),
            "debut": p.get("debut", ""),
            "nationality": p.get("nationality", ""),
            "gym": p.get("gym", ""),
            "bio": p.get("bio", ""),
            "slug": p.get("slug", ""),
        }
        for p in players
    ]


def tournament_rows(tournaments: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [
        {
            "id": t["id"],
            "name": t.get("name", ""),
            "date": t.get("date", ""),
            "video_id": t.get("videoId", ""),
            "champion": t.get("champion", ""),
            "runner_up": t.get("runnerUp", ""),
        }
        for t in tournaments
    ]


def match_rows(matches: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [
        {
            "id": m["id"],
            "event": m.get("event", ""),
            "date": m.get("date", ""),
            "fighter1": m.get("fighter1", ""),
            "fighter2": m.get("fighter2", ""),
            "result": m.get("result", ""),
            "method": m.get("method", ""),
            "round": m.get("round", ""),
            "weight_class": m.get("weightClass", ""),
            "youtube_id": m.get("youtubeId", ""),
            "notes": m.get("notes", ""),
        }
        for m in matches
    ]


def history_rows(history: list[dict[str, Any]]) -> list[dict[str, str]]:
    """年ごとの項目 (year・era・events) を、出来事 1 件につき 1 行に開く。"""
    rows = []
    for entry in history:
        year = str(entry.get("year", ""))
        era = entry.get("era", "")
        for event in entry.get("events", []):
            rows.append({
                "year": year,
                "era": era,
                "month": event.get("month", ""),
                "title": event.get("title", ""),
                "description": event.get("description", ""),
            })
    return rows
