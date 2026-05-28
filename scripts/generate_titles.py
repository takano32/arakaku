#!/usr/bin/env python3
"""Generate titles.csv from static config (championship titles per promotion)."""
from __future__ import annotations

from arakaku_utils import DATA_SRC, write_csv

OUTPUT = DATA_SRC / "titles.csv"
FIELDS = ["title_id", "promotion_id", "division"]

TITLES = [
    ("target-lightweight", "target", "ライト級"),
    ("target-lightweight-tournament", "target", "ライト級"),
    ("target-middleweight", "target", "ミドル級"),
    ("target-middleweight-tournament", "target", "ミドル級"),
    ("target-heavyweight", "target", "ヘビー級"),
    ("target-heavyweight-tournament", "target", "ヘビー級"),
    ("emperor-lightweight", "emperor", "ライト級"),
    ("emperor-middleweight", "emperor", "ミドル級"),
    ("emperor-heavyweight", "emperor", "ヘビー級"),
    ("mh-lightweight", "mh", "ライト級"),
    ("mh-middleweight", "mh", "ミドル級"),
    ("mh-lightweight-tournament", "mh", "ライト級"),
    ("mh-middleweight-tournament", "mh", "ミドル級"),
    ("max-bout-lightweight", "max_bout", "ライト級"),
    ("max-bout-middleweight", "max_bout", "ミドル級"),
    ("max-bout-heavyweight", "max_bout", "ヘビー級"),
]


def main() -> None:
    rows = [{"title_id": t, "promotion_id": p, "division": d} for t, p, d in TITLES]
    write_csv(OUTPUT, FIELDS, rows)
    print(f"[done] {len(rows)} title rows written")


if __name__ == "__main__":
    main()
