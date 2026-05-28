#!/usr/bin/env python3
"""Generate aliases.csv from numbers_name_matches.csv, fighters.csv, and static config."""
from __future__ import annotations

from arakaku_utils import DATA_SRC, read_csv, write_csv

OUTPUT = DATA_SRC / "aliases.csv"
FIELDS = ["alias_type", "alias", "canonical_id"]

# Static promotion aliases (Japanese name → promotion_id)
PROMOTION_ALIASES = [
    ("ターゲット", "target"),
    ("エンペラー", "emperor"),
    ("マウンテン・ヒーローズ", "mh"),
    ("M・H", "mh"),
    ("MAXバウト", "max_bout"),
]

# Static method aliases (Japanese term → method code)
METHOD_ALIASES = [
    ("KO", "KO"),
    ("TKO", "TKO"),
    ("判定", "DEC"),
    ("アナコンダチョーク", "SUB_ANACONDA_CHOKE"),
]


def main() -> None:
    rows: list[dict[str, str]] = []

    # Fighter aliases from Numbers name matches (high confidence only)
    matched_ids: set[str] = set()
    for match in read_csv(DATA_SRC / "numbers_name_matches.csv"):
        if match["match_confidence"] != "high":
            continue
        fighter_id = match.get("matched_fighter_id", "")
        if not fighter_id:
            continue
        alias = match.get("numbers_name", "").strip()
        if alias:
            rows.append({"alias_type": "fighters", "alias": alias, "canonical_id": fighter_id})
            matched_ids.add(fighter_id)

    # Fighter aliases for fighters not covered by Numbers (display_name as alias)
    # Skip fighter_xxxxxxx IDs and medium-confidence entries — those are video-title parse artifacts
    for fighter in read_csv(DATA_SRC / "fighters.csv"):
        fid = fighter["fighter_id"]
        if fid in matched_ids:
            continue
        if fid.startswith("fighter_"):
            continue
        if fighter.get("inferred_confidence") == "medium":
            continue
        display = fighter.get("display_name", "").strip()
        if display and display != fid:
            rows.append({"alias_type": "fighters", "alias": display, "canonical_id": fid})

    # Promotion aliases
    for alias, cid in PROMOTION_ALIASES:
        rows.append({"alias_type": "promotions", "alias": alias, "canonical_id": cid})

    # Method aliases
    for alias, cid in METHOD_ALIASES:
        rows.append({"alias_type": "methods", "alias": alias, "canonical_id": cid})

    write_csv(OUTPUT, FIELDS, rows)
    print(f"[done] {len(rows)} alias rows written")


if __name__ == "__main__":
    main()
