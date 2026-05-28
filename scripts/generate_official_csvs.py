#!/usr/bin/env python3
"""Generate official_*.csv from tmp/arakaku-site/*.json."""
from __future__ import annotations

import json
from pathlib import Path

from arakaku_utils import DATA_SRC, ROOT, write_csv

SRC = ROOT / "tmp" / "arakaku-site"


def load(filename: str) -> list:
    return json.loads((SRC / filename).read_text(encoding="utf-8"))


def generate_players() -> None:
    fields = [
        "id", "name", "name_kana", "nickname", "organization",
        "weight_class", "age", "height", "wins", "losses", "draws",
        "debut", "nationality", "gym", "bio", "slug",
    ]
    rows = [
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
        for p in load("players.json")
    ]
    write_csv(DATA_SRC / "official_players.csv", fields, rows)
    print(f"[done] {len(rows)} player rows written")


def generate_tournaments() -> None:
    fields = ["id", "name", "date", "video_id", "champion", "runner_up"]
    rows = [
        {
            "id": t["id"],
            "name": t.get("name", ""),
            "date": t.get("date", ""),
            "video_id": t.get("videoId", ""),
            "champion": t.get("champion", ""),
            "runner_up": t.get("runnerUp", ""),
        }
        for t in load("tournaments.json")
    ]
    write_csv(DATA_SRC / "official_tournaments.csv", fields, rows)
    print(f"[done] {len(rows)} tournament rows written")


def generate_matches() -> None:
    fields = [
        "id", "event", "date", "fighter1", "fighter2",
        "result", "method", "round", "weight_class", "youtube_id", "notes",
    ]
    rows = [
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
        for m in load("matches.json")
    ]
    write_csv(DATA_SRC / "official_matches.csv", fields, rows)
    print(f"[done] {len(rows)} match rows written")


def generate_history() -> None:
    fields = ["year", "era", "month", "title", "description"]
    rows = []
    for entry in load("history.json"):
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
    write_csv(DATA_SRC / "official_history.csv", fields, rows)
    print(f"[done] {len(rows)} history rows written")


def main() -> None:
    generate_players()
    generate_tournaments()
    generate_matches()
    generate_history()


if __name__ == "__main__":
    main()
