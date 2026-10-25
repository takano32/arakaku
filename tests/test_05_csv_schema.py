from __future__ import annotations

import csv
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from arakaku.schema import CSV_HEADERS  # noqa: E402


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


def test_every_csv_header_matches_schema(repo_root):
    data_src = repo_root / "data-src"
    on_disk = {p.relative_to(data_src).as_posix() for p in data_src.rglob("*.csv")}
    assert on_disk == set(CSV_HEADERS), f"CSV files not declared in arakaku/schema.py: {sorted(on_disk - set(CSV_HEADERS))}; declared but missing: {sorted(set(CSV_HEADERS) - on_disk)}"
    for filename, columns in CSV_HEADERS.items():
        fieldnames, _ = read_csv(repo_root, filename)
        assert fieldnames == columns, f"{filename} header differs from arakaku/schema.py"


def test_read_csv_rejects_renamed_columns_and_missing_files(utils_module, tmp_path, monkeypatch):
    monkeypatch.setattr(utils_module, "DATA_SRC", tmp_path)
    (tmp_path / "events.csv").write_text("date\n2026-01-01\n", encoding="utf-8")
    with pytest.raises(ValueError, match="missing"):
        utils_module.read_csv(tmp_path / "events.csv")
    with pytest.raises(FileNotFoundError):
        utils_module.read_csv(tmp_path / "bouts.csv")
    assert utils_module.read_csv(tmp_path / "bouts.csv", missing_ok=True) == []


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


def test_video_bout_links_reference_existing_rows(repo_root):
    _, links = read_csv(repo_root, "video_bout_links.csv")
    _, videos = read_csv(repo_root, "videos.csv")
    _, bouts = read_csv(repo_root, "bouts.csv")
    video_ids = {row["video_id"] for row in videos}
    bouts_by_id = {row["bout_id"]: row for row in bouts}
    keys = [(row["video_id"], row["bout_id"]) for row in links]
    assert len(keys) == len(set(keys)), "video_bout_links.csv has duplicate (video_id, bout_id)"
    for video_id, bout_id in keys:
        assert video_id in video_ids, f"video_bout_links.csv: unknown video_id {video_id}"
        assert bout_id in bouts_by_id, f"video_bout_links.csv: unknown bout_id {bout_id}"
        assert bouts_by_id[bout_id]["inferred_from_video_id"] != video_id, f"video_bout_links.csv: {video_id} is already the inferred video of {bout_id}"


def test_each_bout_has_two_participants(repo_root):
    _, bouts = read_csv(repo_root, "bouts.csv")
    _, participants = read_csv(repo_root, "bout_participants.csv")
    counts = {row["bout_id"]: 0 for row in bouts}
    for row in participants:
        counts[row["bout_id"]] = counts.get(row["bout_id"], 0) + 1
    assert all(count == 2 for count in counts.values())


def test_alias_keys_are_unique(repo_root):
    # aliases.json は {alias_type: {alias: canonical_id}} なので、重複行は黙って 1 つに潰れてしまう。
    _, rows = read_csv(repo_root, "aliases.csv")
    keys = [(row["alias_type"], row["alias"]) for row in rows]
    assert len(keys) == len(set(keys)), "aliases.csv has duplicate (alias_type, alias)"


def test_video_event_links_reference_existing_rows(repo_root):
    _, links = read_csv(repo_root, "video_event_links.csv")
    _, videos = read_csv(repo_root, "videos.csv")
    _, events = read_csv(repo_root, "events.csv")
    video_ids = {row["video_id"] for row in videos}
    event_ids = {row["event_id"] for row in events}
    keys = [(row["video_id"], row["event_id"]) for row in links]
    assert len(keys) == len(set(keys)), "video_event_links.csv has duplicate (video_id, event_id)"
    for video_id, event_id in keys:
        assert video_id in video_ids, f"video_event_links.csv: unknown video_id {video_id}"
        assert event_id in event_ids, f"video_event_links.csv: unknown event_id {event_id}"
