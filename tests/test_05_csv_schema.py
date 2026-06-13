from __future__ import annotations

import csv


EXPECTED_COLUMNS = {
    "article_links.csv": ["link_id", "article_id", "entity_type", "entity_id", "relation_type"],
    "articles.csv": ["article_id", "title", "url", "source_type", "article_type", "status"],
    "bout_participants.csv": ["participant_id", "bout_id", "side", "fighter_id", "fighter_name", "result"],
    "bouts.csv": ["bout_id", "event_id", "promotion_id", "result_status"],
    "fighter_snapshots.csv": ["snapshot_id", "fighter_id", "event_id", "main_promotion_id"],
    "numbers_fighters.csv": ["numbers_fighter_id", "display_name", "main_promotion_id"],
    "numbers_name_matches.csv": ["numbers_fighter_id", "numbers_name", "candidate_fighter_id", "match_method"],
    "numbers_fight_records.csv": ["record_id", "numbers_fighter_id", "fighter_name", "opponent_name", "result"],
    "promotions.csv": ["promotion_id", "name", "name_en", "category"],
    "source_documents.csv": ["source_id", "source_type", "source_ref_id", "title", "content_hash"],
    "source_mentions.csv": ["mention_id", "source_id", "source_type", "mention_type", "entity_type"],
    "archives/youtube.csv": ["display_id", "webpage_url", "fulltitle", "archived_at"],
    "archives/note.csv": ["filename", "webpage_url", "title", "archived_at"],
    "title_reigns.csv": ["reign_id", "title_id", "reign_order", "fighter_name"],
    "titles.csv": ["title_id", "promotion_id", "division"],
    "video_links.csv": ["video_id", "entity_type", "entity_id", "relation_type"],
    "official_players.csv": ["id", "name", "organization", "weight_class", "slug"],
    "official_tournaments.csv": ["id", "name", "date", "video_id", "champion", "runner_up"],
    "official_matches.csv": ["id", "event", "date", "fighter1", "fighter2", "result"],
    "official_history.csv": ["year", "era", "month", "title", "description"],
    "official_news.csv": ["slug", "title", "date", "category", "summary", "body_md"],
    "official_pages.csv": ["slug", "title", "description", "body_html"],
}

PRIMARY_KEYS = {
    "article_links.csv": "link_id",
    "articles.csv": "article_id",
    "bout_participants.csv": "participant_id",
    "bouts.csv": "bout_id",
    "events.csv": "event_id",
    "fighters.csv": "fighter_id",
    "fighter_snapshots.csv": "snapshot_id",
    "numbers_fighters.csv": "numbers_fighter_id",
    "numbers_name_matches.csv": "numbers_fighter_id",
    "numbers_fight_records.csv": "record_id",
    "promotions.csv": "promotion_id",
    "source_documents.csv": "source_id",
    "source_mentions.csv": "mention_id",
    "archives/youtube.csv": "display_id",
    "archives/note.csv": "filename",
    "titles.csv": "title_id",
    "title_reigns.csv": "reign_id",
    "videos.csv": "video_id",
    "official_players.csv": "id",
    "official_tournaments.csv": "id",
    "official_matches.csv": "id",
    "official_news.csv": "slug",
    "official_pages.csv": "slug",
}

VIDEO_LINKS_COMPOSITE_KEY = ("video_id", "entity_type", "entity_id", "relation_type")


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


def test_video_links_composite_key_is_unique(repo_root):
    _, rows = read_csv(repo_root, "video_links.csv")
    keys = [tuple(row.get(col, "") for col in VIDEO_LINKS_COMPOSITE_KEY) for row in rows]
    assert len(keys) == len(set(keys)), "video_links.csv has duplicate composite keys"


def test_each_bout_has_two_participants(repo_root):
    _, bouts = read_csv(repo_root, "bouts.csv")
    _, participants = read_csv(repo_root, "bout_participants.csv")
    counts = {row["bout_id"]: 0 for row in bouts}
    for row in participants:
        counts[row["bout_id"]] = counts.get(row["bout_id"], 0) + 1
    assert all(count == 2 for count in counts.values())
