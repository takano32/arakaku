# 役割: data-src/*.csv (正規化済みリレーショナル CSV) から viewer 用の docs/data/*.json を組み立てる
#   ビルダ群。json_builders() が「出力ファイル名 -> ビルダ関数」を列挙し、scripts/build_json.py が
#   arakaku.io.build_json_files で順に評価して書き出す。
# アーキ上の位置: 入力 = build/relations.py の Tables と Relations、出力 = docs/data/*.json
#   (viewer = docs/assets/js が読む)。I/O はしない (import 時に CSV も読まない)。
# 不変条件:
#   - 出力 JSON のキー構造は viewer (docs/assets/js) と validation/ の契約。勝手に変えない。
#   - AGENTS.md の方針: 行を黙って落とさない・事実を捏造しない。不明値は "unknown"/None で残す。
#   - 勝者は bouts.csv に直接持たず、bout_participants の result=="win" から逆引きする
#     (単一の事実源 = participants 行を保つため)。該当者が無ければ None を返し捏造しない。
#   - 区別: ここは「正規 CSV」。official_*/numbers_* は build/official.py・build/numbers.py が担当。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any, Callable

from arakaku.build.relations import Relations, Tables
from arakaku.csvmap import field_or_default, field_or_empty, int_field, map_rows
from arakaku.schema import CsvRow
from arakaku.text import bool_from_text, none_if_empty, parse_int


def build_metadata() -> dict[str, Any]:
    return {
        "project_name": "arakaku-database",
        "display_name": "アラカク非公式データベース",
        "description": "アラカク通信のーと等をもとに、団体・大会・試合結果・選手情報を整理するデータベース。",
        "data_version": "0.2.0",
        "source_schema": "relational-csv-v1",
        "source_note": "CSV は事実データを正規化し、viewer 用 JSON は関係テーブルから派生生成しています。",
    }


def build_articles(articles: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        articles,
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


def _promotion_rules(row: CsvRow) -> dict[str, Any]:
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


def build_promotions(promotions: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    return map_rows(
        promotions,
        {
            "promotion_id": "promotion_id",
            "name": "name",
            "name_en": "name_en",
            "category": "category",
            "country_scope": "country_scope",
            "summary": field_or_empty("summary"),
            "rules": _promotion_rules,
            "source_article_ids": lambda row: rel.article_ids_for("promotion", row["promotion_id"]),
        },
    )


def build_events(events: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    return map_rows(
        events,
        {
            "event_id": "event_id",
            "name": "name",
            "promotion_id": "promotion_id",
            "event_number": int_field("event_number"),
            "numbers_event_number": "numbers_event_number",
            "event_type": "event_type",
            # 結果 note の投稿日。結果 note が無ければ null (arakaku/event_dates.py)。
            "result_published_at": lambda row: rel.result_published_at.get(row["event_id"]),
            "note_published_at": lambda row: rel.note_published_at.get(row["event_id"]),
            "published_at": "published_at",
            "source_article_id": lambda row: rel.first_article_id_for("event", row["event_id"]),
            "summary": field_or_empty("summary"),
            "source_video_ids": lambda row: rel.video_ids_for("event", row["event_id"]),
            "inferred_from": "inferred_from",
            "inferred_confidence": "inferred_confidence",
        },
    )


def _bout_matchup(participants: list[CsvRow]) -> str:
    names = [p.get("fighter_name", "") for p in participants]
    return " vs ".join(name for name in names if name)


def _bout_fighters(participants: list[CsvRow]) -> list[dict[str, Any]]:
    return [
        {
            "fighter_id": none_if_empty(participant.get("fighter_id")),
            "name": participant.get("fighter_name", ""),
            "side": participant.get("side", ""),
            "corner": none_if_empty(participant.get("corner")),
            "result": none_if_empty(participant.get("result")) or "unknown",
        }
        for participant in participants
    ]


def _participant_field(participants: list[CsvRow], result: str, field: str) -> str | None:
    """result ("win"/"loss") を持つ最初の出場者の field。該当者が無ければ None。"""
    matched = [p for p in participants if p.get("result") == result]
    if not matched:
        return None
    return none_if_empty(matched[0].get(field))


def _is_title_bout(row: CsvRow) -> bool:
    return bool_from_text(row.get("is_title_bout")) or False


def _bout_result(row: CsvRow) -> dict[str, Any]:
    return {
        # "R3" 形式から "R" を除いて数値化する。
        "round": int_field("round", strip_prefix="R")(row),
        "time": row.get("time"),
        "method_raw": row.get("method_raw"),
        "method_normalized": row.get("method_normalized"),
        "technique": row.get("technique"),
        "decision_score": row.get("decision_score"),
    }


def _bout_title(row: CsvRow) -> dict[str, Any]:
    return {
        "is_title_bout": _is_title_bout(row),
        "title_id": row.get("title_id"),
        "title_result": row.get("title_result"),
        "note": none_if_empty(row.get("title_note")) or "",
    }


def build_bouts(bouts: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    def participants(row: CsvRow) -> list[CsvRow]:
        return rel.participants_for(row["bout_id"])

    return map_rows(
        bouts,
        {
            "bout_id": "bout_id",
            "event_id": "event_id",
            "promotion_id": "promotion_id",
            "bout_order": int_field("bout_order"),
            "matchup": lambda row: _bout_matchup(participants(row)),
            "division": "division",
            "weight_class_id": "weight_class_id",
            "bout_type": "bout_type",
            "fighters": lambda row: _bout_fighters(participants(row)),
            "winner_id": lambda row: _participant_field(participants(row), "win", "fighter_id"),
            "winner": lambda row: _participant_field(participants(row), "win", "fighter_name"),
            "loser_id": lambda row: _participant_field(participants(row), "loss", "fighter_id"),
            "loser": lambda row: _participant_field(participants(row), "loss", "fighter_name"),
            "result_status": field_or_default("result_status", "unknown"),
            "result": _bout_result,
            "title": _bout_title,
            "source_article_id": lambda row: rel.first_article_id_for("bout", row["bout_id"]),
            "notes": field_or_empty("notes"),
            "inferred_from_video_id": "inferred_from_video_id",
            "inferred_from_video_title": "inferred_from_video_title",
            "inferred_confidence": "inferred_confidence",
        },
    )


def _fighter_profile(row: CsvRow) -> dict[str, Any]:
    return {
        "height": none_if_empty(row.get("height")),
        "age": none_if_empty(row.get("age")),
        "gym": none_if_empty(row.get("gym")),
    }


def build_fighters(fighters: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    return map_rows(
        fighters,
        {
            "fighter_id": "fighter_id",
            "display_name": "display_name",
            "aliases": lambda row: rel.fighter_aliases.get(row["fighter_id"], []),
            "main_division": "main_division",
            "main_promotion_id": "main_promotion_id",
            "profile": _fighter_profile,
            "summary": field_or_empty("summary"),
            "source_article_ids": lambda row: rel.article_ids_for("fighter", row["fighter_id"]),
            "inferred_from_video_ids": lambda row: rel.video_ids_for("fighter", row["fighter_id"]),
            "inferred_confidence": "inferred_confidence",
        },
    )


def _group_by(items: list[CsvRow], key: str) -> dict[str, list[CsvRow]]:
    groups: dict[str, list[CsvRow]] = {}
    for item in items:
        value = item.get(key)
        if not value:
            continue
        groups.setdefault(value, []).append(item)
    return groups


def build_titles(titles: list[CsvRow], title_reigns: list[CsvRow]) -> list[dict[str, Any]]:
    reigns_by_title = _group_by(title_reigns, "title_id")
    out = []
    for title in titles:
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
                    "end_reason": none_if_empty(reign.get("end_reason")),
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


def build_fighter_snapshots(snapshots: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    return map_rows(
        snapshots,
        {
            "snapshot_id": "snapshot_id",
            "fighter_id": "fighter_id",
            "event_id": "event_id",
            "source_id": "source_id",
            "source_article_id": lambda row: rel.first_article_id_for("fighter_snapshot", row["snapshot_id"]),
            "age": "age",
            "height": "height",
            "gym": "gym",
            "record_text": "record_text",
            "main_promotion_id": "main_promotion_id",
            "titles_text": "titles_text",
            "catchphrase": "catchphrase",
        },
    )


def _thumbnail_sizes(row: CsvRow, rel: Relations) -> str:
    # videos.json は viewer の最初の描画で使うため、後から読み込まれる youtube_archives.json を
    # 待たずに済むようサムネイルの種類だけここで写す。未アーカイブの動画は空文字。
    if (row.get("platform") or "youtube") != "youtube":
        return ""
    archive = rel.youtube_archive.get(row["platform_video_id"])
    return archive["thumbnail_sizes"] if archive else ""


def build_videos(videos: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    def archive_value(row: CsvRow, column: str) -> str | None:
        return none_if_empty(rel.youtube_archive.get(row["platform_video_id"], {}).get(column))

    return map_rows(
        videos,
        {
            "video_id": "video_id",
            "platform": field_or_default("platform", "youtube"),
            "platform_video_id": "platform_video_id",
            "url": "url",
            "title": "title",
            "original_title": "original_title",
            # チャンネル名と公開日はアーカイブ (archives/youtube.csv) の表示用メタデータから写す
            # (T.75: videos.csv の列は全件 NA / 空のプレースホルダだった)。viewer の enricher も同じ値で上書きする。
            "channel_name": lambda row: archive_value(row, "uploader"),
            "published_at": lambda row: archive_value(row, "upload_date"),
            "official_status": field_or_default("official_status", "unknown"),
            "video_type": field_or_default("video_type", "reference"),
            # 動画の紐づけ状態はリンク表から導く (T.75: 以前は videos.csv の手入力列で、355 本が古い unlinked のままだった)。
            "link_status": lambda row: "linked" if row["video_id"] in rel.linked_video_ids else "unlinked",
            "duplicate_group_id": "duplicate_group_id",
            "duplicate_note": "duplicate_note",
            "notes": field_or_empty("notes"),
            "source_article_ids": lambda row: rel.article_ids_for("video", row["video_id"]),
            "thumbnail_sizes": lambda row: _thumbnail_sizes(row, rel),
        },
    )


def build_video_links(video_links: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        video_links,
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


def build_aliases(aliases: list[CsvRow]) -> dict[str, dict[str, str]]:
    return {
        alias_type: {row["alias"]: row["canonical_id"] for row in aliases if row["alias_type"] == alias_type}
        for alias_type in ["fighters", "promotions", "methods"]
    }


# source_documents は本文 (content_text) を別 JSON に分離する: メタデータは軽く、重い本文は
# source_document_bodies.json として遅延ロードできるようにするため。両者で source_id を揃えて viewer 側が突き合わせる。
def source_documents_without_bodies(source_documents: list[CsvRow]) -> list[dict[str, str]]:
    return [{k: v for k, v in row.items() if k != "content_text"} for row in source_documents]


def source_document_bodies(source_documents: list[CsvRow]) -> list[dict[str, str]]:
    return [{"source_id": row["source_id"], "content_text": row.get("content_text", "")} for row in source_documents]


def json_builders(tables: Tables) -> dict[str, Callable[[], Any]]:
    """出力ファイル名 -> ビルダ。この並びが書き出し順。"""
    rel = Relations.from_tables(tables)
    return {
        "metadata.json": build_metadata,
        "articles.json": lambda: build_articles(tables.articles),
        "article_links.json": lambda: tables.article_links,
        "promotions.json": lambda: build_promotions(tables.promotions, rel),
        "events.json": lambda: build_events(tables.events, rel),
        "bouts.json": lambda: build_bouts(tables.bouts, rel),
        "bout_participants.json": lambda: tables.bout_participants,
        "fighters.json": lambda: build_fighters(tables.fighters, rel),
        "titles.json": lambda: build_titles(tables.titles, tables.title_reigns),
        "title_reigns.json": lambda: tables.title_reigns,
        "fighter_snapshots.json": lambda: build_fighter_snapshots(tables.fighter_snapshots, rel),
        "videos.json": lambda: build_videos(tables.videos, rel),
        "video_links.json": lambda: build_video_links(tables.video_links),
        "aliases.json": lambda: build_aliases(tables.aliases),
        "source_documents.json": lambda: source_documents_without_bodies(tables.source_documents),
        "source_document_bodies.json": lambda: source_document_bodies(tables.source_documents),
        "source_mentions.json": lambda: tables.source_mentions,
        "youtube_archives.json": lambda: tables.youtube_archives,
        "note_archives.json": lambda: tables.note_archives,
        "source_event_references.json": lambda: tables.source_event_references,
        "source_bout_references.json": lambda: tables.source_bout_references,
        "source_video_references.json": lambda: tables.source_video_references,
    }
