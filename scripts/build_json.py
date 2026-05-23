#!/usr/bin/env python3
from __future__ import annotations
from typing import Any
from arakaku_utils import (
    DATA_SRC, REVIEW, DOCS_DATA,
    read_csv, write_json, none_if_empty, bool_from_text, split_list,
    parse_int, get_jst_now_iso, map_csv,
    field_or_default, field_or_empty, int_field, list_field, CsvRow,
)
from models import Bout


def known_or_unknown_result(row: CsvRow) -> str:
    if none_if_empty(row.get("result_status")):
        return none_if_empty(row.get("result_status")) or "unknown"
    return "known" if row.get("winner_id") or none_if_empty(row.get("winner")) else "unknown"


def bout_matchup(row: CsvRow) -> str:
    existing = none_if_empty(row.get("matchup"))
    if existing:
        return existing
    return f"{row.get('fighter_a', '')} vs {row.get('fighter_b', '')}".strip()


def bout_fighter_result(row: CsvRow, fighter_id: str | None, name: str) -> str:
    winner_id = none_if_empty(row.get("winner_id"))
    winner_name = none_if_empty(row.get("winner"))
    if winner_id == fighter_id or winner_name == name:
        return "win"
    if winner_id or winner_name:
        return "loss"
    return "unknown"


def bout_fighters(row: CsvRow) -> list[dict[str, Any]]:
    fighter_a_id = none_if_empty(row.get("fighter_a_id"))
    fighter_b_id = none_if_empty(row.get("fighter_b_id"))
    fighter_a = row["fighter_a"]
    fighter_b = row["fighter_b"]
    return [
        {
            "fighter_id": fighter_a_id,
            "name": fighter_a,
            "corner": none_if_empty(row.get("fighter_a_corner")),
            "result": bout_fighter_result(row, fighter_a_id, fighter_a),
        },
        {
            "fighter_id": fighter_b_id,
            "name": fighter_b,
            "corner": none_if_empty(row.get("fighter_b_corner")),
            "result": bout_fighter_result(row, fighter_b_id, fighter_b),
        },
    ]


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
        "data_version": "0.1.0",
        "source_note": "公式表記を尊重しつつ、検索・集計用に一部正規化しています。"
    }

def build_articles() -> list[dict[str, Any]]:
    return map_csv("articles.csv", {
        "article_id": "article_id", "title": "title", "url": "url",
        "source_type": field_or_default("source_type", "official_note"),
        "article_type": "article_type", "promotion_id": "promotion_id",
        "published_at": "published_at", "last_checked_at": "last_checked_at",
        "status": field_or_default("status", "parsed"),
        "notes": field_or_empty("notes"),
    })

def build_promotions() -> list[dict[str, Any]]:
    return map_csv("promotions.csv", {
        "promotion_id": "promotion_id", "name": "name", "name_en": "name_en",
        "category": "category", "country_scope": "country_scope",
        "summary": field_or_empty("summary"),
        "rules": promotion_rules,
        "source_article_ids": list_field("source_article_ids"),
    })

def build_events() -> list[dict[str, Any]]:
    return map_csv("events.csv", {
        "event_id": "event_id", "name": "name", "promotion_id": "promotion_id",
        "event_number": int_field("event_number"), "event_type": "event_type",
        "event_date": "event_date", "published_at": "published_at",
        "source_article_id": "source_article_id", "summary": field_or_empty("summary"),
        "source_video_ids": list_field("source_video_ids"),
        "inferred_from": "inferred_from", "inferred_confidence": "inferred_confidence"
    })

def build_bouts() -> list[Bout]:
    return map_csv("bouts.csv", {
        "bout_id": "bout_id", "event_id": "event_id", "promotion_id": "promotion_id",
        "bout_order": int_field("bout_order"),
        "matchup": bout_matchup,
        "division": "division", "weight_class_id": "weight_class_id", "bout_type": "bout_type",
        "fighters": bout_fighters, "winner_id": "winner_id", "winner": "winner", "loser_id": "loser_id", "loser": "loser",
        "result_status": known_or_unknown_result,
        "result": {
            "round": int_field("round", strip_prefix="R"), "time": "time", "method_raw": "method_raw", "method_normalized": "method_normalized",
            "technique": "technique", "decision_score": "decision_score"
        },
        "title": {
            "is_title_bout": is_title_bout,
            "title_id": "title_id", "title_result": "title_result",
            "note": field_or_empty("title_note"),
        },
        "source_article_id": "source_article_id", "notes": field_or_empty("notes"),
        "inferred_from_video_id": "inferred_from_video_id", "inferred_from_video_title": "inferred_from_video_title", "inferred_confidence": "inferred_confidence"
    })

def build_fighters() -> list[dict[str, Any]]:
    return map_csv("fighters.csv", {
        "fighter_id": "fighter_id", "display_name": "display_name", "aliases": list_field("aliases"),
        "main_division": "main_division", "main_promotion_id": "main_promotion_id",
        "profile": fighter_profile,
        "summary": field_or_empty("summary"),
        "source_article_ids": list_field("source_article_ids"),
        "inferred_from_video_ids": list_field("inferred_from_video_ids"),
        "inferred_confidence": "inferred_confidence"
    })

def build_titles() -> list[dict[str, Any]]:
    g = {}
    for r in read_csv(DATA_SRC / "titles.csv"):
        tid = r["title_id"]
        g.setdefault(tid, {"title_id": tid, "promotion_id": r["promotion_id"], "division": r["division"], "lineage": []})["lineage"].append({
            "order": parse_int(r.get("order")),
            "fighter_id": none_if_empty(r.get("fighter_id")), "fighter_name": r["fighter_name"],
            "reign_label": none_if_empty(r.get("reign_label")), "won_at_event_id": none_if_empty(r.get("won_at_event_id")),
            "lost_at_event_id": none_if_empty(r.get("lost_at_event_id")), "source_article_id": none_if_empty(r.get("source_article_id")),
            "source_video_id": none_if_empty(r.get("source_video_id"))
        })
    return list(g.values())

def build_fighter_snapshots() -> list[dict[str, Any]]:
    return map_csv("fighter_snapshots.csv", {
        "snapshot_id": "snapshot_id", "fighter_id": "fighter_id", "event_id": "event_id", "source_article_id": "source_article_id",
        "age": "age", "height": "height", "gym": "gym", "record_text": "record_text", "main_promotion_id": "main_promotion_id",
        "titles_text": "titles_text", "catchphrase": "catchphrase"
    })

def build_videos() -> list[dict[str, Any]]:
    return map_csv("videos.csv", {
        "video_id": "video_id", "platform": field_or_default("platform", "youtube"),
        "platform_video_id": "platform_video_id", "url": "url", "title": "title", "original_title": "original_title",
        "channel_name": "channel_name", "published_at": "published_at",
        "official_status": field_or_default("official_status", "unknown"),
        "video_type": field_or_default("video_type", "reference"),
        "link_status": field_or_default("link_status", "unlinked"),
        "duplicate_group_id": "duplicate_group_id", "duplicate_note": "duplicate_note",
        "notes": field_or_empty("notes"),
        "source_article_ids": list_field("source_article_ids"),
    })

def build_video_links() -> list[dict[str, Any]]:
    return map_csv("video_links.csv", {
        "video_id": "video_id", "entity_type": "entity_type", "entity_id": "entity_id",
        "relation_type": field_or_default("relation_type", "reference"),
        "start_time": "start_time", "end_time": "end_time", "notes": field_or_empty("notes")
    })


def build_aliases() -> dict[str, dict[str, str]]:
    aliases = read_csv(DATA_SRC / "aliases.csv")
    return {
        alias_type: {
            row["alias"]: row["canonical_id"]
            for row in aliases
            if row["alias_type"] == alias_type
        }
        for alias_type in ["fighters", "promotions", "methods"]
    }


JSON_BUILDERS = {
    "metadata.json": build_metadata,
    "articles.json": build_articles,
    "promotions.json": build_promotions,
    "events.json": build_events,
    "bouts.json": build_bouts,
    "fighters.json": build_fighters,
    "titles.json": build_titles,
    "fighter_snapshots.json": build_fighter_snapshots,
    "videos.json": build_videos,
    "video_links.json": build_video_links,
    "aliases.json": build_aliases,
    "source_documents.json": lambda: read_csv(DATA_SRC / "source_documents.csv"),
    "source_mentions.json": lambda: read_csv(DATA_SRC / "source_mentions.csv"),
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
