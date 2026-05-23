#!/usr/bin/env python3
from __future__ import annotations
from typing import Any
from arakaku_utils import (
    DATA_SRC, REVIEW, DOCS_DATA,
    read_csv, write_json, none_if_empty, bool_from_text, split_list, get_jst_now_iso, EntityMapper
)

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
    return EntityMapper(read_csv(DATA_SRC / "articles.csv")).map({
        "article_id": "article_id", "title": "title", "url": "url",
        "source_type": lambda r: none_if_empty(r.get("source_type")) or "official_note",
        "article_type": "article_type", "promotion_id": "promotion_id",
        "published_at": "published_at", "last_checked_at": "last_checked_at",
        "status": lambda r: none_if_empty(r.get("status")) or "parsed",
        "notes": lambda r: none_if_empty(r.get("notes")) or ""
    })

def build_promotions() -> list[dict[str, Any]]:
    return EntityMapper(read_csv(DATA_SRC / "promotions.csv")).map({
        "promotion_id": "promotion_id", "name": "name", "name_en": "name_en",
        "category": "category", "country_scope": "country_scope",
        "summary": lambda r: none_if_empty(r.get("summary")) or "",
        "rules": lambda r: {
            "venue": none_if_empty(r.get("rule_venue")), "rounds": none_if_empty(r.get("rule_rounds")),
            "judging": none_if_empty(r.get("rule_judging")), "glove": none_if_empty(r.get("rule_glove")),
            "elbows": bool_from_text(r.get("rule_elbows")), "soccer_kicks": bool_from_text(r.get("rule_soccer_kicks")),
            "stomps": bool_from_text(r.get("rule_stomps")), "four_point_head_kicks": bool_from_text(r.get("rule_four_point_head_kicks")),
            "four_point_head_knees": bool_from_text(r.get("rule_four_point_head_knees"))
        },
        "source_article_ids": lambda r: split_list(r.get("source_article_ids"))
    })

def build_events() -> list[dict[str, Any]]:
    def parse_event_number(r):
        t = none_if_empty(r.get("event_number"))
        try: return int(t) if t else None
        except ValueError: return t
    return EntityMapper(read_csv(DATA_SRC / "events.csv")).map({
        "event_id": "event_id", "name": "name", "promotion_id": "promotion_id",
        "event_number": parse_event_number, "event_type": "event_type",
        "event_date": "event_date", "published_at": "published_at",
        "source_article_id": "source_article_id", "summary": lambda r: none_if_empty(r.get("summary")) or "",
        "source_video_ids": lambda r: split_list(r.get("source_video_ids")),
        "inferred_from": "inferred_from", "inferred_confidence": "inferred_confidence"
    })

def build_bouts() -> list[dict[str, Any]]:
    def parse_round(r):
        rt = none_if_empty(r.get("round"))
        try: return int(rt.replace("R", "")) if rt else None
        except ValueError: return rt
    def build_fighters(r):
        fa, fb = none_if_empty(r.get("fighter_a_id")), none_if_empty(r.get("fighter_b_id"))
        wi = none_if_empty(r.get("winner_id"))
        def get_res(fid, name): return "win" if wi == fid or r.get("winner") == name else "loss" if wi or none_if_empty(r.get("winner")) else "unknown"
        return [
            {"fighter_id": fa, "name": r["fighter_a"], "corner": none_if_empty(r.get("fighter_a_corner")), "result": get_res(fa, r["fighter_a"])},
            {"fighter_id": fb, "name": r["fighter_b"], "corner": none_if_empty(r.get("fighter_b_corner")), "result": get_res(fb, r["fighter_b"])}
        ]
    return EntityMapper(read_csv(DATA_SRC / "bouts.csv")).map({
        "bout_id": "bout_id", "event_id": "event_id", "promotion_id": "promotion_id",
        "bout_order": lambda r: int(r["bout_order"]) if none_if_empty(r.get("bout_order")) else None,
        "matchup": lambda r: none_if_empty(r.get("matchup")) or f"{r.get('fighter_a','')} vs {r.get('fighter_b','')}".strip(),
        "division": "division", "weight_class_id": "weight_class_id", "bout_type": "bout_type",
        "fighters": build_fighters, "winner_id": "winner_id", "winner": "winner", "loser_id": "loser_id", "loser": "loser",
        "result_status": lambda r: none_if_empty(r.get("result_status")) or ("known" if r.get("winner_id") or none_if_empty(r.get("winner")) else "unknown"),
        "result": lambda r: {
            "round": parse_round(r), "time": "time", "method_raw": "method_raw", "method_normalized": "method_normalized",
            "technique": "technique", "decision_score": "decision_score"
        },
        "title": lambda r: {
            "is_title_bout": bool_from_text(r.get("is_title_bout")) or False, "title_id": "title_id", "title_result": "title_result", "note": lambda r2: none_if_empty(r.get("title_note")) or ""
        },
        "source_article_id": "source_article_id", "notes": lambda r: none_if_empty(r.get("notes")) or "",
        "inferred_from_video_id": "inferred_from_video_id", "inferred_from_video_title": "inferred_from_video_title", "inferred_confidence": "inferred_confidence"
    })

# Overriding build_bouts slightly due to nested map needs
def build_bouts_fixed() -> list[dict[str, Any]]:
    def parse_round(r):
        rt = none_if_empty(r.get("round"))
        try: return int(rt.replace("R", "")) if rt else None
        except ValueError: return rt
    def build_fighters(r):
        fa, fb = none_if_empty(r.get("fighter_a_id")), none_if_empty(r.get("fighter_b_id"))
        wi = none_if_empty(r.get("winner_id"))
        def get_res(fid, name): return "win" if wi == fid or r.get("winner") == name else "loss" if wi or none_if_empty(r.get("winner")) else "unknown"
        return [
            {"fighter_id": fa, "name": r["fighter_a"], "corner": none_if_empty(r.get("fighter_a_corner")), "result": get_res(fa, r["fighter_a"])},
            {"fighter_id": fb, "name": r["fighter_b"], "corner": none_if_empty(r.get("fighter_b_corner")), "result": get_res(fb, r["fighter_b"])}
        ]
    return EntityMapper(read_csv(DATA_SRC / "bouts.csv")).map({
        "bout_id": "bout_id", "event_id": "event_id", "promotion_id": "promotion_id",
        "bout_order": lambda r: int(r["bout_order"]) if none_if_empty(r.get("bout_order")) else None,
        "matchup": lambda r: none_if_empty(r.get("matchup")) or f"{r.get('fighter_a','')} vs {r.get('fighter_b','')}".strip(),
        "division": "division", "weight_class_id": "weight_class_id", "bout_type": "bout_type",
        "fighters": build_fighters, "winner_id": "winner_id", "winner": "winner", "loser_id": "loser_id", "loser": "loser",
        "result_status": lambda r: none_if_empty(r.get("result_status")) or ("known" if r.get("winner_id") or none_if_empty(r.get("winner")) else "unknown"),
        "result": lambda r: {
            "round": parse_round(r), "time": none_if_empty(r.get("time")), "method_raw": none_if_empty(r.get("method_raw")), "method_normalized": none_if_empty(r.get("method_normalized")),
            "technique": none_if_empty(r.get("technique")), "decision_score": none_if_empty(r.get("decision_score"))
        },
        "title": lambda r: {
            "is_title_bout": bool_from_text(r.get("is_title_bout")) or False, "title_id": none_if_empty(r.get("title_id")), "title_result": none_if_empty(r.get("title_result")), "note": none_if_empty(r.get("title_note")) or ""
        },
        "source_article_id": "source_article_id", "notes": lambda r: none_if_empty(r.get("notes")) or "",
        "inferred_from_video_id": "inferred_from_video_id", "inferred_from_video_title": "inferred_from_video_title", "inferred_confidence": "inferred_confidence"
    })

def build_fighters() -> list[dict[str, Any]]:
    return EntityMapper(read_csv(DATA_SRC / "fighters.csv")).map({
        "fighter_id": "fighter_id", "display_name": "display_name", "aliases": lambda r: split_list(r.get("aliases")),
        "main_division": "main_division", "main_promotion_id": "main_promotion_id",
        "profile": lambda r: {"height": none_if_empty(r.get("height")), "age": none_if_empty(r.get("age")), "gym": none_if_empty(r.get("gym"))},
        "summary": lambda r: none_if_empty(r.get("summary")) or "",
        "source_article_ids": lambda r: split_list(r.get("source_article_ids")),
        "inferred_from_video_ids": lambda r: split_list(r.get("inferred_from_video_ids")),
        "inferred_confidence": "inferred_confidence"
    })

def build_titles() -> list[dict[str, Any]]:
    g = {}
    for r in read_csv(DATA_SRC / "titles.csv"):
        tid = r["title_id"]
        g.setdefault(tid, {"title_id": tid, "promotion_id": r["promotion_id"], "division": r["division"], "lineage": []})["lineage"].append({
            "order": int(r["order"]) if none_if_empty(r.get("order")) else None,
            "fighter_id": none_if_empty(r.get("fighter_id")), "fighter_name": r["fighter_name"],
            "reign_label": none_if_empty(r.get("reign_label")), "won_at_event_id": none_if_empty(r.get("won_at_event_id")),
            "lost_at_event_id": none_if_empty(r.get("lost_at_event_id")), "source_article_id": none_if_empty(r.get("source_article_id")),
            "source_video_id": none_if_empty(r.get("source_video_id"))
        })
    return list(g.values())

def build_fighter_snapshots() -> list[dict[str, Any]]:
    return EntityMapper(read_csv(DATA_SRC / "fighter_snapshots.csv")).map({
        "snapshot_id": "snapshot_id", "fighter_id": "fighter_id", "event_id": "event_id", "source_article_id": "source_article_id",
        "age": "age", "height": "height", "gym": "gym", "record_text": "record_text", "main_promotion_id": "main_promotion_id",
        "titles_text": "titles_text", "catchphrase": "catchphrase"
    })

def build_videos() -> list[dict[str, Any]]:
    return EntityMapper(read_csv(DATA_SRC / "videos.csv")).map({
        "video_id": "video_id", "platform": lambda r: none_if_empty(r.get("platform")) or "youtube",
        "platform_video_id": "platform_video_id", "url": "url", "title": "title", "original_title": "original_title",
        "channel_name": "channel_name", "published_at": "published_at",
        "official_status": lambda r: none_if_empty(r.get("official_status")) or "unknown",
        "video_type": lambda r: none_if_empty(r.get("video_type")) or "reference",
        "link_status": lambda r: none_if_empty(r.get("link_status")) or "unlinked",
        "duplicate_group_id": "duplicate_group_id", "duplicate_note": "duplicate_note",
        "notes": lambda r: none_if_empty(r.get("notes")) or "",
        "source_article_ids": lambda r: split_list(r.get("source_article_ids"))
    })

def build_video_links() -> list[dict[str, Any]]:
    return EntityMapper(read_csv(DATA_SRC / "video_links.csv")).map({
        "video_id": "video_id", "entity_type": "entity_type", "entity_id": "entity_id",
        "relation_type": lambda r: none_if_empty(r.get("relation_type")) or "reference",
        "start_time": "start_time", "end_time": "end_time", "notes": lambda r: none_if_empty(r.get("notes")) or ""
    })

def main() -> None:
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    builders = {
        "metadata.json": build_metadata, "articles.json": build_articles, "promotions.json": build_promotions,
        "events.json": build_events, "bouts.json": build_bouts_fixed, "fighters.json": build_fighters,
        "titles.json": build_titles, "fighter_snapshots.json": build_fighter_snapshots, "videos.json": build_videos,
        "video_links.json": build_video_links,
        "aliases.json": lambda: {t: {r["alias"]: r["canonical_id"] for r in read_csv(DATA_SRC / "aliases.csv") if r["alias_type"] == t} for t in ["fighters", "promotions", "methods"]},
        "source_documents.json": lambda: read_csv(DATA_SRC / "source_documents.csv"),
        "source_mentions.json": lambda: read_csv(DATA_SRC / "source_mentions.csv"),
        "source_event_references.json": lambda: read_csv(REVIEW / "source_event_reference_candidates.csv"),
        "source_bout_references.json": lambda: read_csv(REVIEW / "source_bout_reference_candidates.csv"),
        "source_video_references.json": lambda: read_csv(REVIEW / "source_video_reference_candidates.csv"),
    }
    for fn, b in builders.items(): write_json(DOCS_DATA / fn, b())
    print("[done] JSON build completed")

if __name__ == "__main__": main()
