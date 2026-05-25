from __future__ import annotations

import csv


EXPECTED_COLUMNS = {
    "article_links.csv": ["link_id", "article_id", "entity_type", "entity_id", "relation_type"],
    "bout_participants.csv": ["participant_id", "bout_id", "side", "fighter_id", "fighter_name", "result"],
    "bouts.csv": ["bout_id", "event_id", "promotion_id", "result_status"],
    "numbers_fighters.csv": ["numbers_fighter_id", "display_name", "main_promotion_id"],
    "numbers_name_matches.csv": ["numbers_fighter_id", "numbers_name", "candidate_fighter_id", "match_method"],
    "numbers_fight_records.csv": ["record_id", "numbers_fighter_id", "fighter_name", "opponent_name", "result"],
    "title_reigns.csv": ["reign_id", "title_id", "reign_order", "fighter_name"],
    "titles.csv": ["title_id", "promotion_id", "division"],
    "video_links.csv": ["video_id", "entity_type", "entity_id", "relation_type"],
}

PRIMARY_KEYS = {
    "article_links.csv": "link_id",
    "bout_participants.csv": "participant_id",
    "bouts.csv": "bout_id",
    "events.csv": "event_id",
    "fighters.csv": "fighter_id",
    "numbers_fighters.csv": "numbers_fighter_id",
    "numbers_name_matches.csv": "numbers_fighter_id",
    "numbers_fight_records.csv": "record_id",
    "titles.csv": "title_id",
    "title_reigns.csv": "reign_id",
    "videos.csv": "video_id",
}


def read_csv(repo_root, filename):
    with (repo_root / "data-src" / filename).open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader.fieldnames or []), list(reader)


def test_relational_csv_required_columns(repo_root):
    for filename, columns in EXPECTED_COLUMNS.items():
        fieldnames, _ = read_csv(repo_root, filename)
        for column in columns:
            assert column in fieldnames, f"{filename} missing {column}"


def test_relational_csv_primary_keys_are_present_and_unique(repo_root):
    for filename, key in PRIMARY_KEYS.items():
        _, rows = read_csv(repo_root, filename)
        values = [row.get(key, "") for row in rows]
        assert all(values), f"{filename} has blank {key}"
        assert len(values) == len(set(values)), f"{filename} has duplicate {key}"


def test_each_bout_has_two_participants(repo_root):
    _, bouts = read_csv(repo_root, "bouts.csv")
    _, participants = read_csv(repo_root, "bout_participants.csv")
    counts = {row["bout_id"]: 0 for row in bouts}
    for row in participants:
        counts[row["bout_id"]] = counts.get(row["bout_id"], 0) + 1
    assert all(count == 2 for count in counts.values())
