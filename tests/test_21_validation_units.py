from __future__ import annotations

# arakaku/validation の単体テスト (test_20 / test_30 で見ていない検証関数と、runner / locate)。

import json
from pathlib import Path

from arakaku.validation.archives import validate_archive_data
from arakaku.validation.entities import (
    validate_bout_participants,
    validate_bouts,
    validate_events,
    validate_fighter_snapshots,
    validate_fighters,
    validate_promotions,
    validate_titles,
)
from arakaku.validation.locate import locate_error
from arakaku.validation.numbers import validate_numbers_data
from arakaku.validation.official import validate_official_history
from arakaku.validation.report import Report
from arakaku.validation.runner import ALL_JSON_FILES, REQUIRED_JSON_FILES, run, validate_docs_data
from arakaku.validation.sources import (
    validate_source_document_bodies,
    validate_source_mentions,
    validate_source_references,
)


def test_report_collects_errors_and_warnings_separately():
    report = Report()
    assert report.ok
    report.warning("w")
    assert report.ok and report.warnings == ["w"]
    report.error("e")
    assert not report.ok and report.errors == ["e"]


def test_validate_docs_data_reports_every_missing_file_in_sorted_order(tmp_path: Path):
    (tmp_path / "metadata.json").write_text("{}", encoding="utf-8")
    report = validate_docs_data(tmp_path)
    missing = [e for e in report.errors if e.startswith("missing json file: ")]
    assert missing == [f"missing json file: {name}" for name in sorted(ALL_JSON_FILES - {"metadata.json"})]
    assert REQUIRED_JSON_FILES <= ALL_JSON_FILES
    assert len(report.errors) == len(missing)  # empty lists are otherwise valid


def test_validate_docs_data_passes_on_the_built_data(docs_data):
    assert validate_docs_data(docs_data).errors == []


def test_run_prints_located_errors_and_returns_the_exit_code(tmp_path: Path, capsys):
    docs = tmp_path / "docs"
    data_src = tmp_path / "data-src"
    docs.mkdir()
    data_src.mkdir()
    for name in ALL_JSON_FILES:
        (docs / name).write_text("{}" if name in ("aliases.json", "metadata.json") else "[]", encoding="utf-8")
    (docs / "events.json").write_text(json.dumps([{"event_id": "e1", "name": "", "promotion_id": "target"}]), encoding="utf-8")
    (docs / "promotions.json").write_text(json.dumps([{"promotion_id": "target", "name": "T"}]), encoding="utf-8")
    (data_src / "events.csv").write_text("event_id,name\ne1,\n", encoding="utf-8")

    assert run(docs, data_src) == 1
    err = capsys.readouterr().err.splitlines()
    assert err == [
        "ERROR: events.json[0]: missing required field: name  [data-src/events.csv:2, event_id=e1]",
        "json validation failed: 1 error(s), 0 warning(s)",
    ]

    (docs / "events.json").write_text("[]", encoding="utf-8")
    assert run(docs, data_src) == 0
    assert capsys.readouterr().out == "json validation passed: 0 warning(s)\n"


def test_locate_error_only_adds_the_line_when_the_ids_agree(tmp_path: Path):
    docs = tmp_path / "docs"
    data_src = tmp_path / "data-src"
    docs.mkdir()
    data_src.mkdir()
    (docs / "fighters.json").write_text(json.dumps([{"fighter_id": "a"}, {"fighter_id": "b"}]), encoding="utf-8")
    (data_src / "fighters.csv").write_text("fighter_id\nb\na\n", encoding="utf-8")
    assert locate_error("fighters.json[0]: x", docs, data_src) == "fighters.json[0]: x  [fighter_id=a]"
    assert locate_error("fighters.json[5]: x", docs, data_src) == "fighters.json[5]: x"
    assert locate_error("unknown.json[0]: x", docs, data_src) == "unknown.json[0]: x"


def test_validate_bouts_checks_result_consistency(report: Report):
    bouts = [
        {"bout_id": "known-no-loss", "event_id": "e", "promotion_id": "p", "winner": "A", "fighters": [{"name": "A", "result": "win"}, {"name": "B", "result": "win"}]},
        {"bout_id": "unknown-with-win", "event_id": "e", "promotion_id": "p", "result_status": "unknown", "fighters": [{"name": "A", "result": "win"}, {"name": "B", "result": "loss"}]},
        {"bout_id": "same-names", "event_id": "e", "promotion_id": "p", "fighters": [{"name": "A"}, {"name": "A"}]},
        {"bout_id": "known-no-winner", "event_id": "e", "promotion_id": "p", "result_status": "known", "winner": "A", "loser": "A", "fighters": [{"name": "A", "result": "win"}, {"name": "B", "result": "loss"}]},
        {"bout_id": "one-fighter", "event_id": "e", "promotion_id": "p", "result_status": "draw", "fighters": [{"name": "A"}]},
    ]
    validate_bouts(report, bouts, {"e"}, {"p"}, set(), set())
    errors = "\n".join(report.errors)
    assert "bouts.json[0]: known-result fighters must have exactly one win and one loss" in errors
    assert "bouts.json[1]: unknown-result fighters must not have win/loss results" in errors
    assert "bouts.json[2]: fighter names must be distinct" in errors
    assert "bouts.json[3]: winner and loser are the same: A" in errors
    assert "bouts.json[4]: fighters must be a list of two fighters" in errors
    assert "bouts.json[4]: unusual result_status: draw" in errors


def test_validate_bout_participants_checks_pairs_and_sides(report: Report):
    rows = [
        {"participant_id": "p1", "bout_id": "b1", "side": "red", "fighter_id": "x", "fighter_name": "X", "result": "win"},
        {"participant_id": "p2", "bout_id": "b1", "side": "red", "fighter_name": "Y", "result": "forfeit"},
        {"participant_id": "p3", "bout_id": "b2", "side": "blue", "fighter_name": ""},
        {"participant_id": "p4", "bout_id": "gone", "side": "blue", "fighter_name": "Z"},
    ]
    validate_bout_participants(report, rows, {"b1", "b2"}, set())
    errors = "\n".join(report.errors)
    for expected in (
        "bout_participants.json[0]: unknown fighter reference: x",
        "bout_participants.json[1]: unusual result: forfeit",
        "bout_participants.json[2]: missing required field: fighter_name",
        "bout_participants.json[3]: unknown bout reference: gone",
        "bout b1 has duplicate participant side",
        "bout b2 must have exactly two participants",
    ):
        assert expected in errors


def test_entity_reference_checks(report: Report):
    validate_promotions(report, [{"promotion_id": "p", "name": "P", "source_article_ids": ["gone"]}], set())
    validate_events(report, [{"event_id": "e", "name": "E", "promotion_id": "ghost", "source_article_id": "gone"}], {"p"}, set())
    validate_fighters(report, [{"fighter_id": "f", "display_name": "", "main_promotion_id": "ghost"}], {"p"}, set())
    validate_titles(report, [{"title_id": "t", "promotion_id": "ghost", "lineage": [{"fighter_id": "nobody", "source_article_id": "gone", "source_video_id": "v"}]}], {"p"}, set(), set(), set())
    errors = "\n".join(report.errors)
    for expected in (
        "promotions.json[0]: unknown article reference: gone",
        "events.json[0]: unknown promotion reference: ghost",
        "events.json[0]: unknown article reference: gone",
        "fighters.json[0]: missing required field: display_name",
        "fighters.json[0]: unknown promotion reference: ghost",
        "titles.json[0]: unknown promotion reference: ghost",
        "titles.json[0].lineage[0]: unknown fighter reference: nobody",
        "titles.json[0].lineage[0]: unknown article reference: gone",
        "titles.json[0].lineage[0]: unknown video reference: v",
    ):
        assert expected in errors


def test_source_and_numbers_and_archive_checks(report: Report):
    validate_source_document_bodies(report, [{"source_id": "a"}, {"source_id": "a"}, {"source_id": ""}])
    validate_source_mentions(report, [{"mention_id": "m", "source_id": "", "mention_type": ""}, {"mention_id": ""}])
    validate_source_references(report, [{"candidate_id": "c1", "event_id": "gone", "source_id": "s"}, {"candidate_id": "c2"}], "source_event_references.json", "event_id", {"e"})
    validate_numbers_data(
        report,
        [{"numbers_fighter_id": "n1"}],
        [{"numbers_fighter_id": "n9", "matched_fighter_id": "nobody", "candidate_fighter_id": "x", "match_method": "m"}, {"numbers_fighter_id": "n9", "candidate_fighter_id": "x", "match_method": "m"}],
        [{"record_id": "r1", "numbers_fighter_id": "n1", "opponent_numbers_fighter_id": "n9", "result": "draw", "opponent_matched_fighter_id": "nobody"}],
        {"f"},
    )
    validate_archive_data(report, [{"display_id": "y", "webpage_url": "ftp://x", "fulltitle": "", "archived_at": "t"}], [{"filename": "n.html", "webpage_url": "", "title": "T", "archived_at": "t"}])
    validate_official_history(report, ["not an object", {"title": ""}])
    errors = "\n".join(report.errors)
    for expected in (
        "source_document_bodies.json[1]: duplicate source_id: a",
        "source_document_bodies.json[2]: missing source_id",
        "source_mentions.json[0]: missing source_id",
        "source_mentions.json[0]: missing mention_type",
        "source_mentions.json[1]: missing mention_id",
        "source_event_references.json[0]: unknown event_id: gone",
        "source_event_references.json[0]: missing source_type",
        "source_event_references.json[1]: missing event_id",
        "numbers_name_matches.json[0]: unknown numbers_fighter_id: n9",
        "numbers_name_matches.json[0]: unknown matched_fighter_id: nobody",
        "numbers_name_matches.json[1]: duplicate numbers_fighter_id: n9",
        "numbers_fight_records.json[0]: unknown opponent_numbers_fighter_id: n9",
        "numbers_fight_records.json[0]: unknown opponent_matched_fighter_id: nobody",
        "numbers_fight_records.json[0]: unusual result: draw",
        "youtube_archives.json[0]: missing required field: fulltitle",
        "youtube_archives.json[0]: invalid webpage_url: ftp://x",
        "note_archives.json[0]: missing required field: webpage_url",
        "official_history.json[0]: expected object",
        "official_history.json[1]: missing required field: title",
    ):
        assert expected in errors


def test_duplicate_title_and_snapshot_ids_are_reported_once(report):
    # 以前は runner と各バリデータの両方が collect_ids を呼び、同じ ERROR が 2 行出た (T.112.4.7)。
    titles = [{"title_id": "t", "promotion_id": "p"}, {"title_id": "t", "promotion_id": "p"}]
    assert validate_titles(report, titles, {"p"}, set(), set(), set()) == {"t"}
    snapshots = [{"snapshot_id": "s"}, {"snapshot_id": "s"}]
    assert validate_fighter_snapshots(report, snapshots, set(), set(), set(), set()) == {"s"}
    assert [e for e in report.errors if "duplicate" in e] == [
        "titles.json[1]: duplicate title_id: t",
        "fighter_snapshots.json[1]: duplicate snapshot_id: s",
    ]
