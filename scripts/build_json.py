#!/usr/bin/env python3
from __future__ import annotations

from typing import Any

from arakaku_utils import (
    DATA_SRC,
    REVIEW,
    DOCS_DATA,
    CsvRow,
    bool_from_text,
    field_or_default,
    field_or_empty,
    get_jst_now_iso,
    int_field,
    list_field,
    map_csv,
    none_if_empty,
    parse_int,
    read_csv,
    split_list,
    write_json,
)


def rows(name: str) -> list[CsvRow]:
    return read_csv(DATA_SRC / name)


def index_by(items: list[CsvRow], key: str) -> dict[str, CsvRow]:
    return {item[key]: item for item in items if item.get(key)}


def group_by(items: list[CsvRow], key: str) -> dict[str, list[CsvRow]]:
    groups: dict[str, list[CsvRow]] = {}
    for item in items:
        value = item.get(key)
        if not value:
            continue
        groups.setdefault(value, []).append(item)
    return groups


ARTICLE_LINKS = rows("article_links.csv")
BOUT_PARTICIPANTS = rows("bout_participants.csv")
TITLE_REIGNS = rows("title_reigns.csv")
VIDEO_LINKS = rows("video_links.csv")
NUMBERS_NAME_MATCHES = rows("numbers_name_matches.csv")


def article_ids_for(entity_type: str, entity_id: str) -> list[str]:
    return [
        row["article_id"]
        for row in ARTICLE_LINKS
        if row.get("entity_type") == entity_type and row.get("entity_id") == entity_id
    ]


def first_article_id_for(entity_type: str, entity_id: str) -> str | None:
    ids = article_ids_for(entity_type, entity_id)
    return ids[0] if ids else None


def video_ids_for(entity_type: str, entity_id: str) -> list[str]:
    return [
        row["video_id"]
        for row in VIDEO_LINKS
        if row.get("entity_type") == entity_type and row.get("entity_id") == entity_id
    ]


def known_or_unknown_result(row: CsvRow) -> str:
    return none_if_empty(row.get("result_status")) or "unknown"


def sorted_participants_for_bout(bout_id: str) -> list[CsvRow]:
    side_order = {"red": 0, "blue": 1}
    return sorted(
        [row for row in BOUT_PARTICIPANTS if row.get("bout_id") == bout_id],
        key=lambda row: side_order.get(row.get("side", ""), 99),
    )


def bout_matchup(row: CsvRow) -> str:
    names = [p.get("fighter_name", "") for p in sorted_participants_for_bout(row["bout_id"])]
    return " vs ".join(name for name in names if name)


def bout_fighters(row: CsvRow) -> list[dict[str, Any]]:
    return [
        {
            "fighter_id": none_if_empty(participant.get("fighter_id")),
            "name": participant.get("fighter_name", ""),
            "side": participant.get("side", ""),
            "corner": none_if_empty(participant.get("corner")),
            "result": none_if_empty(participant.get("result")) or "unknown",
        }
        for participant in sorted_participants_for_bout(row["bout_id"])
    ]


def winner_from_participants(row: CsvRow, field: str) -> str | None:
    winners = [p for p in sorted_participants_for_bout(row["bout_id"]) if p.get("result") == "win"]
    if not winners:
        return None
    winner = winners[0]
    return none_if_empty(winner.get(field))


def loser_from_participants(row: CsvRow, field: str) -> str | None:
    losers = [p for p in sorted_participants_for_bout(row["bout_id"]) if p.get("result") == "loss"]
    if not losers:
        return None
    loser = losers[0]
    return none_if_empty(loser.get(field))


def is_title_bout(row: CsvRow) -> bool:
    return bool_from_text(row.get("is_title_bout")) or False


def promotion_rules(row: CsvRow) -> dict[str, Any]:
    return {
        "venue": none_if_empty(row.get("rule_venue")),
        "rounds": none_if_empty(row.get("rule_rounds")),
        "judging": none_if_empty(row.get("rule_judging")),
        "glove": none_if_empty(row.get("rule_glove")),
        "elbows": bool_from_text(row.get("rule_elbows")),
        "soccer_kicks": bool_from_text(row.get("rule_soccer_kicks")),
        "stomps": bool_from_text(row.get("rule_stomps")),
        "four_point_head_kicks": bool_from_text(row.get("rule_four_point_head_kicks")),
        "four_point_head_knees": bool_from_text(row.get("rule_four_point_head_knees")),
    }


def fighter_profile(row: CsvRow) -> dict[str, Any]:
    return {
        "height": none_if_empty(row.get("height")),
        "age": none_if_empty(row.get("age")),
        "gym": none_if_empty(row.get("gym")),
    }


def build_metadata() -> dict[str, Any]:
    return {
        "project_name": "arakaku-database",
        "display_name": "アラカク非公式データベース",
        "description": "アラカク通信のーと等をもとに、団体・大会・試合結果・選手情報を整理するデータベース。",
        "generated_at": get_jst_now_iso(),
        "data_version": "0.2.0",
        "source_schema": "relational-csv-v1",
        "source_note": "CSV は事実データを正規化し、viewer 用 JSON は関係テーブルから派生生成しています。",
    }


def build_articles() -> list[dict[str, Any]]:
    return map_csv(
        "articles.csv",
        {
            "article_id": "article_id",
            "title": "title",
            "url": "url",
            "source_type": field_or_default("source_type", "official_note"),
            "article_type": "article_type",
            "promotion_id": "promotion_id",
            "published_at": "published_at",
            "last_checked_at": "last_checked_at",
            "status": field_or_default("status", "parsed"),
            "notes": field_or_empty("notes"),
        },
    )


def build_promotions() -> list[dict[str, Any]]:
    return map_csv(
        "promotions.csv",
        {
            "promotion_id": "promotion_id",
            "name": "name",
            "name_en": "name_en",
            "category": "category",
            "country_scope": "country_scope",
            "summary": field_or_empty("summary"),
            "rules": promotion_rules,
            "source_article_ids": lambda row: article_ids_for("promotion", row["promotion_id"]),
        },
    )


def build_events() -> list[dict[str, Any]]:
    return map_csv(
        "events.csv",
        {
            "event_id": "event_id",
            "name": "name",
            "promotion_id": "promotion_id",
            "event_number": int_field("event_number"),
            "event_type": "event_type",
            "event_date": "event_date",
            "published_at": "published_at",
            "source_article_id": lambda row: first_article_id_for("event", row["event_id"]),
            "summary": field_or_empty("summary"),
            "source_video_ids": lambda row: video_ids_for("event", row["event_id"]),
            "inferred_from": "inferred_from",
            "inferred_confidence": "inferred_confidence",
        },
    )


def build_bouts() -> list[dict[str, Any]]:
    return map_csv(
        "bouts.csv",
        {
            "bout_id": "bout_id",
            "event_id": "event_id",
            "promotion_id": "promotion_id",
            "bout_order": int_field("bout_order"),
            "matchup": bout_matchup,
            "division": "division",
            "weight_class_id": "weight_class_id",
            "bout_type": "bout_type",
            "fighters": bout_fighters,
            "winner_id": lambda row: winner_from_participants(row, "fighter_id"),
            "winner": lambda row: winner_from_participants(row, "fighter_name"),
            "loser_id": lambda row: loser_from_participants(row, "fighter_id"),
            "loser": lambda row: loser_from_participants(row, "fighter_name"),
            "result_status": known_or_unknown_result,
            "result": {
                "round": int_field("round", strip_prefix="R"),
                "time": "time",
                "method_raw": "method_raw",
                "method_normalized": "method_normalized",
                "technique": "technique",
                "decision_score": "decision_score",
            },
            "title": {
                "is_title_bout": is_title_bout,
                "title_id": "title_id",
                "title_result": "title_result",
                "note": field_or_empty("title_note"),
            },
            "source_article_id": lambda row: first_article_id_for("bout", row["bout_id"]),
            "notes": field_or_empty("notes"),
            "inferred_from_video_id": "inferred_from_video_id",
            "inferred_from_video_title": "inferred_from_video_title",
            "inferred_confidence": "inferred_confidence",
        },
    )


def build_fighters() -> list[dict[str, Any]]:
    primary_rows = rows("fighters.csv")
    numbers_rows = rows("numbers_fighters.csv")
    matches_by_numbers_id = index_by(NUMBERS_NAME_MATCHES, "numbers_fighter_id")

    fighter_ids = set()
    for r in primary_rows:
        fighter_ids.add(r["fighter_id"])

    numbers_by_fighter_id = {}
    for row in numbers_rows:
        match = matches_by_numbers_id.get(row["numbers_fighter_id"], {})
        fighter_id = none_if_empty(match.get("matched_fighter_id")) or none_if_empty(match.get("candidate_fighter_id"))
        if fighter_id:
            numbers_by_fighter_id[fighter_id] = row

    merged_rows = list(primary_rows)
    for fighter_id, row in numbers_by_fighter_id.items():
        if fighter_id not in fighter_ids:
            merged_rows.append({"fighter_id": fighter_id, "display_name": row["display_name"]})
            fighter_ids.add(fighter_id)

    def numbers_summary(row: CsvRow) -> str:
        parts = [none_if_empty(row.get("catchphrase")), none_if_empty(row.get("notes"))]
        return "\n\n".join(part for part in parts if part)

    def merged_field(row: CsvRow, field: str) -> str | None:
        val = none_if_empty(row.get(field))
        if val is not None:
            return val
        numbers_row = numbers_by_fighter_id.get(row["fighter_id"])
        if not numbers_row:
            return None
        if field == "summary":
            return none_if_empty(numbers_summary(numbers_row))
        if field == "inferred_confidence":
            return none_if_empty(numbers_row.get("source_confidence"))
        if field in {"height", "age", "gym", "main_division", "main_promotion_id", "display_name"}:
            return none_if_empty(numbers_row.get(field))
        return None

    def merged_fighter_profile(row: CsvRow) -> dict[str, Any]:
        return {
            "height": merged_field(row, "height"),
            "age": merged_field(row, "age"),
            "gym": merged_field(row, "gym"),
        }

    out = []
    for row in merged_rows:
        f_id = row["fighter_id"]
        out.append({
            "fighter_id": f_id,
            "display_name": merged_field(row, "display_name"),
            "aliases": [
                alias["alias"]
                for alias in rows("aliases.csv")
                if alias.get("alias_type") == "fighters" and alias.get("canonical_id") == f_id
            ],
            "main_division": merged_field(row, "main_division"),
            "main_promotion_id": merged_field(row, "main_promotion_id"),
            "profile": merged_fighter_profile(row),
            "summary": merged_field(row, "summary") or "",
            "source_article_ids": article_ids_for("fighter", f_id),
            "inferred_from_video_ids": video_ids_for("fighter", f_id),
            "inferred_confidence": merged_field(row, "inferred_confidence"),
        })
    return out


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


def build_titles() -> list[dict[str, Any]]:
    reigns_by_title = group_by(TITLE_REIGNS, "title_id")
    out = []
    for title in rows("titles.csv"):
        lineage = []
        for reign in sorted(reigns_by_title.get(title["title_id"], []), key=lambda r: parse_int(r.get("reign_order")) or 0):
            lineage.append(
                {
                    "reign_id": reign["reign_id"],
                    "order": parse_int(reign.get("reign_order")),
                    "fighter_id": none_if_empty(reign.get("fighter_id")),
                    "fighter_name": reign.get("fighter_name", ""),
                    "reign_label": none_if_empty(reign.get("reign_label")),
                    "won_at_event_id": none_if_empty(reign.get("won_at_event_id")),
                    "lost_at_event_id": none_if_empty(reign.get("lost_at_event_id")),
                    "source_article_id": none_if_empty(reign.get("source_article_id")),
                    "source_video_id": none_if_empty(reign.get("source_video_id")),
                }
            )
        out.append(
            {
                "title_id": title["title_id"],
                "promotion_id": title["promotion_id"],
                "division": title["division"],
                "lineage": lineage,
            }
        )
    return out


def build_fighter_snapshots() -> list[dict[str, Any]]:
    return map_csv(
        "fighter_snapshots.csv",
        {
            "snapshot_id": "snapshot_id",
            "fighter_id": "fighter_id",
            "event_id": "event_id",
            "source_article_id": lambda row: first_article_id_for("fighter_snapshot", row["snapshot_id"]),
            "age": "age",
            "height": "height",
            "gym": "gym",
            "record_text": "record_text",
            "main_promotion_id": "main_promotion_id",
            "titles_text": "titles_text",
            "catchphrase": "catchphrase",
        },
    )


def build_videos() -> list[dict[str, Any]]:
    return map_csv(
        "videos.csv",
        {
            "video_id": "video_id",
            "platform": field_or_default("platform", "youtube"),
            "platform_video_id": "platform_video_id",
            "url": "url",
            "title": "title",
            "original_title": "original_title",
            "channel_name": "channel_name",
            "published_at": "published_at",
            "official_status": field_or_default("official_status", "unknown"),
            "video_type": field_or_default("video_type", "reference"),
            "link_status": field_or_default("link_status", "unlinked"),
            "duplicate_group_id": "duplicate_group_id",
            "duplicate_note": "duplicate_note",
            "notes": field_or_empty("notes"),
            "source_article_ids": lambda row: article_ids_for("video", row["video_id"]),
        },
    )


def build_video_links() -> list[dict[str, Any]]:
    return map_csv(
        "video_links.csv",
        {
            "video_id": "video_id",
            "entity_type": "entity_type",
            "entity_id": "entity_id",
            "relation_type": field_or_default("relation_type", "reference"),
            "start_time": "start_time",
            "end_time": "end_time",
            "notes": field_or_empty("notes"),
        },
    )


def build_aliases() -> dict[str, dict[str, str]]:
    aliases = rows("aliases.csv")
    return {
        alias_type: {
            row["alias"]: row["canonical_id"]
            for row in aliases
            if row["alias_type"] == alias_type
        }
        for alias_type in ["fighters", "promotions", "methods"]
    }


def build_database() -> dict[str, Any]:
    return {
        "schema": "relational-csv-v1",
        "tables": {
            "articles": build_articles(),
            "article_links": rows("article_links.csv"),
            "promotions": build_promotions(),
            "events": build_events(),
            "bouts": rows("bouts.csv"),
            "bout_participants": rows("bout_participants.csv"),
            "fighters": build_fighters(),
            "fighter_snapshots": build_fighter_snapshots(),
            "titles": rows("titles.csv"),
            "title_reigns": rows("title_reigns.csv"),
            "videos": build_videos(),
            "video_links": build_video_links(),
            "aliases": rows("aliases.csv"),
            "source_documents": rows("source_documents.csv"),
            "source_mentions": rows("source_mentions.csv"),
            "numbers_fighters": build_numbers_fighters(),
            "numbers_name_matches": rows("numbers_name_matches.csv"),
            "numbers_fight_records": rows("numbers_fight_records.csv"),
        },
    }


JSON_BUILDERS = {
    "metadata.json": build_metadata,
    "database.json": build_database,
    "articles.json": build_articles,
    "article_links.json": lambda: rows("article_links.csv"),
    "promotions.json": build_promotions,
    "events.json": build_events,
    "bouts.json": build_bouts,
    "bout_participants.json": lambda: rows("bout_participants.csv"),
    "fighters.json": build_fighters,
    "titles.json": build_titles,
    "title_reigns.json": lambda: rows("title_reigns.csv"),
    "fighter_snapshots.json": build_fighter_snapshots,
    "videos.json": build_videos,
    "video_links.json": build_video_links,
    "aliases.json": build_aliases,
    "source_documents.json": lambda: rows("source_documents.csv"),
    "source_mentions.json": lambda: rows("source_mentions.csv"),
    "numbers_fighters.json": build_numbers_fighters,
    "numbers_name_matches.json": lambda: rows("numbers_name_matches.csv"),
    "numbers_fight_records.json": lambda: rows("numbers_fight_records.csv"),
    "source_event_references.json": lambda: read_csv(REVIEW / "source_event_reference_candidates.csv"),
    "source_bout_references.json": lambda: read_csv(REVIEW / "source_bout_reference_candidates.csv"),
    "source_video_references.json": lambda: read_csv(REVIEW / "source_video_reference_candidates.csv"),
}


def main() -> None:
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    for filename, build in JSON_BUILDERS.items():
        write_json(DOCS_DATA / filename, build())
    print("[done] JSON build completed")


if __name__ == "__main__":
    main()
