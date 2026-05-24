#!/usr/bin/env python3
from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from arakaku_utils import DATA_SRC, none_if_empty, split_list, write_csv


def read_rows(name: str) -> tuple[list[str], list[dict[str, str]]]:
    path = DATA_SRC / name
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader.fieldnames or []), list(reader)


def row_has_fields(fields: list[str], required: set[str]) -> bool:
    return required.issubset(set(fields))


def compact_id(*parts: str) -> str:
    return "-".join(part for part in parts if part)


def participant_result(row: dict[str, str], fighter_id: str, fighter_name: str) -> str:
    result_status = none_if_empty(row.get("result_status"))
    if result_status != "known":
        return "unknown"
    winner_id = none_if_empty(row.get("winner_id"))
    loser_id = none_if_empty(row.get("loser_id"))
    winner = none_if_empty(row.get("winner"))
    loser = none_if_empty(row.get("loser"))
    if fighter_id and winner_id == fighter_id:
        return "win"
    if fighter_id and loser_id == fighter_id:
        return "loss"
    if fighter_name and winner == fighter_name:
        return "win"
    if fighter_name and loser == fighter_name:
        return "loss"
    return "unknown"


def add_article_link(
    links: list[dict[str, str]],
    seen: set[tuple[str, str, str, str]],
    article_id: str | None,
    entity_type: str,
    entity_id: str,
    relation_type: str,
    notes: str = "",
) -> None:
    article_id = none_if_empty(article_id)
    if not article_id:
        return
    key = (article_id, entity_type, entity_id, relation_type)
    if key in seen:
        return
    seen.add(key)
    links.append(
        {
            "link_id": compact_id("article", article_id, entity_type, entity_id, relation_type),
            "article_id": article_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "relation_type": relation_type,
            "notes": notes,
        }
    )


def migrate() -> dict[str, Any]:
    report: dict[str, Any] = {"skipped": [], "written": {}}

    bout_fields, bout_rows = read_rows("bouts.csv")
    if row_has_fields(bout_fields, {"fighter_a_id", "fighter_b_id", "matchup", "winner_id", "loser_id"}):
        new_bouts = []
        participants = []
        for row in bout_rows:
            bout_id = row["bout_id"]
            new_bouts.append(
                {
                    "bout_id": bout_id,
                    "event_id": row.get("event_id", ""),
                    "promotion_id": row.get("promotion_id", ""),
                    "bout_order": row.get("bout_order", ""),
                    "division": row.get("division", ""),
                    "weight_class_id": row.get("weight_class_id", ""),
                    "bout_type": row.get("bout_type", ""),
                    "result_status": row.get("result_status", ""),
                    "round": row.get("round", ""),
                    "time": row.get("time", ""),
                    "method_raw": row.get("method_raw", ""),
                    "method_normalized": row.get("method_normalized", ""),
                    "technique": row.get("technique", ""),
                    "decision_score": row.get("decision_score", ""),
                    "is_title_bout": row.get("is_title_bout", ""),
                    "title_id": row.get("title_id", ""),
                    "title_result": row.get("title_result", ""),
                    "title_note": row.get("title_note", ""),
                    "notes": row.get("notes", ""),
                    "inferred_from_video_id": row.get("inferred_from_video_id", ""),
                    "inferred_from_video_title": row.get("inferred_from_video_title", ""),
                    "inferred_confidence": row.get("inferred_confidence", ""),
                }
            )
            for side, prefix in (("red", "fighter_a"), ("blue", "fighter_b")):
                fighter_id = row.get(f"{prefix}_id", "")
                fighter_name = row.get(prefix, "")
                participants.append(
                    {
                        "participant_id": compact_id(bout_id, side),
                        "bout_id": bout_id,
                        "side": side,
                        "fighter_id": fighter_id,
                        "fighter_name": fighter_name,
                        "corner": row.get(f"{prefix}_corner", ""),
                        "result": participant_result(row, fighter_id, fighter_name),
                    }
                )
        write_csv(
            DATA_SRC / "bouts.csv",
            [
                "bout_id",
                "event_id",
                "promotion_id",
                "bout_order",
                "division",
                "weight_class_id",
                "bout_type",
                "result_status",
                "round",
                "time",
                "method_raw",
                "method_normalized",
                "technique",
                "decision_score",
                "is_title_bout",
                "title_id",
                "title_result",
                "title_note",
                "notes",
                "inferred_from_video_id",
                "inferred_from_video_title",
                "inferred_confidence",
            ],
            new_bouts,
        )
        write_csv(
            DATA_SRC / "bout_participants.csv",
            ["participant_id", "bout_id", "side", "fighter_id", "fighter_name", "corner", "result"],
            participants,
        )
        report["written"]["bouts.csv"] = len(new_bouts)
        report["written"]["bout_participants.csv"] = len(participants)
    else:
        report["skipped"].append("bouts.csv already migrated")

    title_fields, title_rows = read_rows("titles.csv")
    if row_has_fields(title_fields, {"order", "fighter_id", "fighter_name"}):
        titles: dict[str, dict[str, str]] = {}
        reigns = []
        for row in title_rows:
            title_id = row["title_id"]
            titles.setdefault(
                title_id,
                {
                    "title_id": title_id,
                    "promotion_id": row.get("promotion_id", ""),
                    "division": row.get("division", ""),
                },
            )
            reign_order = row.get("order", "")
            reigns.append(
                {
                    "reign_id": compact_id(title_id, reign_order),
                    "title_id": title_id,
                    "reign_order": reign_order,
                    "fighter_id": row.get("fighter_id", ""),
                    "fighter_name": row.get("fighter_name", ""),
                    "reign_label": row.get("reign_label", ""),
                    "won_at_event_id": row.get("won_at_event_id", ""),
                    "lost_at_event_id": row.get("lost_at_event_id", ""),
                    "source_article_id": row.get("source_article_id", ""),
                    "source_video_id": row.get("source_video_id", ""),
                }
            )
        write_csv(DATA_SRC / "titles.csv", ["title_id", "promotion_id", "division"], list(titles.values()))
        write_csv(
            DATA_SRC / "title_reigns.csv",
            [
                "reign_id",
                "title_id",
                "reign_order",
                "fighter_id",
                "fighter_name",
                "reign_label",
                "won_at_event_id",
                "lost_at_event_id",
                "source_article_id",
                "source_video_id",
            ],
            reigns,
        )
        report["written"]["titles.csv"] = len(titles)
        report["written"]["title_reigns.csv"] = len(reigns)
    else:
        report["skipped"].append("titles.csv already migrated")

    if (DATA_SRC / "article_links.csv").exists():
        _, article_links = read_rows("article_links.csv")
    else:
        article_links = []
    article_seen: set[tuple[str, str, str, str]] = {
        (
            row.get("article_id", ""),
            row.get("entity_type", ""),
            row.get("entity_id", ""),
            row.get("relation_type", "") or "source",
        )
        for row in article_links
    }

    promotion_fields, promotion_rows = read_rows("promotions.csv")
    if "source_article_ids" in promotion_fields:
        for row in promotion_rows:
            for article_id in split_list(row.get("source_article_ids")):
                add_article_link(article_links, article_seen, article_id, "promotion", row["promotion_id"], "source")
            row.pop("source_article_ids", None)
        write_csv(DATA_SRC / "promotions.csv", [f for f in promotion_fields if f != "source_article_ids"], promotion_rows)
        report["written"]["promotions.csv"] = len(promotion_rows)

    event_fields, event_rows = read_rows("events.csv")
    event_source_videos: list[tuple[str, str]] = []
    if "source_article_id" in event_fields or "source_video_ids" in event_fields:
        for row in event_rows:
            add_article_link(article_links, article_seen, row.get("source_article_id"), "event", row["event_id"], "source")
            for video_id in split_list(row.get("source_video_ids")):
                event_source_videos.append((video_id, row["event_id"]))
            row.pop("source_article_id", None)
            row.pop("source_video_ids", None)
        write_csv(
            DATA_SRC / "events.csv",
            [f for f in event_fields if f not in {"source_article_id", "source_video_ids"}],
            event_rows,
        )
        report["written"]["events.csv"] = len(event_rows)

    fighter_fields, fighter_rows = read_rows("fighters.csv")
    fighter_source_videos: list[tuple[str, str, str]] = []
    if {"aliases", "source_article_ids", "inferred_from_video_ids"} & set(fighter_fields):
        alias_fields, alias_rows = read_rows("aliases.csv")
        alias_seen = {(row.get("alias_type", ""), row.get("alias", ""), row.get("canonical_id", "")) for row in alias_rows}
        for row in fighter_rows:
            for alias in split_list(row.get("aliases")):
                key = ("fighters", alias, row["fighter_id"])
                if key not in alias_seen:
                    alias_rows.append({"alias_type": "fighters", "alias": alias, "canonical_id": row["fighter_id"]})
                    alias_seen.add(key)
            for article_id in split_list(row.get("source_article_ids")):
                add_article_link(article_links, article_seen, article_id, "fighter", row["fighter_id"], "source")
            for video_id in split_list(row.get("inferred_from_video_ids")):
                fighter_source_videos.append((video_id, row["fighter_id"], row.get("inferred_confidence", "")))
            row.pop("aliases", None)
            row.pop("source_article_ids", None)
            row.pop("inferred_from_video_ids", None)
        write_csv(DATA_SRC / "fighters.csv", [f for f in fighter_fields if f not in {"aliases", "source_article_ids", "inferred_from_video_ids"}], fighter_rows)
        write_csv(DATA_SRC / "aliases.csv", alias_fields, alias_rows)
        report["written"]["fighters.csv"] = len(fighter_rows)

    snapshot_fields, snapshot_rows = read_rows("fighter_snapshots.csv")
    if "source_article_id" in snapshot_fields:
        for row in snapshot_rows:
            add_article_link(article_links, article_seen, row.get("source_article_id"), "fighter_snapshot", row["snapshot_id"], "source")
            row.pop("source_article_id", None)
        write_csv(DATA_SRC / "fighter_snapshots.csv", [f for f in snapshot_fields if f != "source_article_id"], snapshot_rows)
        report["written"]["fighter_snapshots.csv"] = len(snapshot_rows)

    video_fields, video_rows = read_rows("videos.csv")
    if "source_article_ids" in video_fields:
        for row in video_rows:
            for article_id in split_list(row.get("source_article_ids")):
                add_article_link(article_links, article_seen, article_id, "video", row["video_id"], "source")
            row.pop("source_article_ids", None)
        write_csv(DATA_SRC / "videos.csv", [f for f in video_fields if f != "source_article_ids"], video_rows)
        report["written"]["videos.csv"] = len(video_rows)

    original_bout_rows = bout_rows if row_has_fields(bout_fields, {"source_article_id"}) else []
    if original_bout_rows:
        for row in original_bout_rows:
            add_article_link(article_links, article_seen, row.get("source_article_id"), "bout", row["bout_id"], "source")

    _, reign_rows = read_rows("title_reigns.csv")
    for row in reign_rows:
        add_article_link(article_links, article_seen, row.get("source_article_id"), "title_reign", row["reign_id"], "source")

    if article_links:
        write_csv(
            DATA_SRC / "article_links.csv",
            ["link_id", "article_id", "entity_type", "entity_id", "relation_type", "notes"],
            article_links,
        )
        report["written"]["article_links.csv"] = len(article_links)

    link_fields, link_rows = read_rows("video_links.csv")
    link_seen = {
        (row.get("video_id", ""), row.get("entity_type", ""), row.get("entity_id", ""), row.get("relation_type", "") or "reference")
        for row in link_rows
    }
    for video_id, event_id in event_source_videos:
        key = (video_id, "event", event_id, "reference")
        if key not in link_seen:
            link_rows.append(
                {
                    "video_id": video_id,
                    "entity_type": "event",
                    "entity_id": event_id,
                    "relation_type": "reference",
                    "start_time": "",
                    "end_time": "",
                    "notes": "Migrated from events.source_video_ids.",
                }
            )
            link_seen.add(key)
    for video_id, fighter_id, confidence in fighter_source_videos:
        key = (video_id, "fighter", fighter_id, "reference")
        if key not in link_seen:
            note = "Migrated from fighters.inferred_from_video_ids."
            if confidence:
                note += f" inferred_confidence={confidence}."
            link_rows.append(
                {
                    "video_id": video_id,
                    "entity_type": "fighter",
                    "entity_id": fighter_id,
                    "relation_type": "reference",
                    "start_time": "",
                    "end_time": "",
                    "notes": note,
                }
            )
            link_seen.add(key)
    if event_source_videos or fighter_source_videos:
        write_csv(DATA_SRC / "video_links.csv", link_fields, link_rows)
        report["written"]["video_links.csv"] = len(link_rows)

    report["read"] = {
        "bouts.csv": len(bout_rows),
        "titles.csv": len(title_rows),
        "events.csv": len(event_rows),
        "fighters.csv": len(fighter_rows),
        "promotions.csv": len(promotion_rows),
        "fighter_snapshots.csv": len(snapshot_rows),
        "videos.csv": len(video_rows),
    }
    return report


def main() -> None:
    report = migrate()
    print("[migration-report]")
    for key, value in report.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
