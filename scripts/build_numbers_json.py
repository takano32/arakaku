#!/usr/bin/env python3
"""Build numbers_*.json from numbers_*.csv (sourced from アラカク選手名鑑.numbers)."""
from __future__ import annotations

from typing import Any

from arakaku_utils import (
    DOCS_DATA,
    field_or_empty,
    int_field,
    map_csv,
    read_csv,
    write_json,
    DATA_SRC,
)


def rows(name: str):
    return read_csv(DATA_SRC / name)


def build_numbers_fighters() -> list[dict[str, Any]]:
    return map_csv(
        "numbers_fighters.csv",
        {
            "numbers_fighter_id": "numbers_fighter_id",
            "source_sheet": "source_sheet",
            "source_row": int_field("source_row"),
            "display_name": "display_name",
            "main_division": "main_division",
            "main_promotion_raw": "main_promotion_raw",
            "main_promotion_id": "main_promotion_id",
            "profile": {
                "age": "age",
                "height": "height",
                "gym": "gym",
            },
            "stats": {
                "fight_count": int_field("fight_count"),
                "wins": int_field("wins"),
                "losses": int_field("losses"),
                "win_rate": "win_rate",
            },
            "achievements": {
                "white_glove_count": int_field("white_glove_count"),
                "tournament_win_marker": "tournament_win_marker",
                "tournament_entry_raw": "tournament_entry_raw",
                "belt_marker": "belt_marker",
            },
            "catchphrase": "catchphrase",
            "notes": field_or_empty("notes"),
            "source_confidence": "source_confidence",
        },
    )


JSON_BUILDERS = {
    "numbers_fighters.json":     build_numbers_fighters,
    "numbers_name_matches.json": lambda: rows("numbers_name_matches.csv"),
    "numbers_fight_records.json": lambda: rows("numbers_fight_records.csv"),
}


def main() -> None:
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    for filename, build in JSON_BUILDERS.items():
        write_json(DOCS_DATA / filename, build())
    print("[done] numbers JSON build completed")


if __name__ == "__main__":
    main()
