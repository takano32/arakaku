from __future__ import annotations

# 役割: data-src/*.csv (正規化済みリレーショナル CSV) を読み、viewer 用の docs/data/*.json を
#   一括生成するメインのビルダ。JSON_BUILDERS に「出力ファイル名 -> ビルダ関数」を列挙し、
#   build_json_files が順に評価して書き出す。Makefile の `build` ターゲット先頭で実行される。
# アーキ上の位置: 入力 = data-src/*.csv、出力 = docs/data/*.json (viewer = docs/assets/js が読む)。
#   関係テーブル (article_links / video_links / bout_participants / title_reigns / aliases) を
#   起動時に一度だけ index 化し、各エンティティ JSON へ派生情報を join する設計。
# 不変条件:
#   - 出力 JSON のキー構造は viewer (docs/assets/js) と validate_json の契約。勝手に変えない。
#   - AGENTS.md の方針: 行を黙って落とさない/捨てない・事実を捏造しない。不明値は "unknown"/None で残す。
#   - 区別: ここは「正規 CSV」。official_*/numbers_* は別ビルダ (build_official_json.py 等) が担当。
# 関連スキル: .agents/skills/arakaku-maintainer。
from typing import Any

from arakaku.utils import (
    DATA_SRC,
    REVIEW,
    CsvRow,
    EntityMapper,
    bool_from_text,
    build_json_files,
    field_or_default,
    field_or_empty,
    int_field,
    map_csv,
    none_if_empty,
    parse_int,
    read_csv,
)
from arakaku.mapping import promotion_rules, fighter_profile, bout_result, bout_title


def rows(name: str) -> list[CsvRow]:
    return read_csv(DATA_SRC / name)


def group_by(items: list[CsvRow], key: str) -> dict[str, list[CsvRow]]:
    groups: dict[str, list[CsvRow]] = {}
    for item in items:
        value = item.get(key)
        if not value:
            continue
        groups.setdefault(value, []).append(item)
    return groups


# 関係テーブル類はモジュール読み込み時に一度だけ読む (各ビルダから何度も join するため)。
# import 副作用なので、これらの CSV が存在する前提で動く (無ければ read_csv が空リストを返す)。
ARTICLE_LINKS = rows("article_links.csv")
BOUT_PARTICIPANTS = rows("bout_participants.csv")
TITLE_REIGNS = rows("title_reigns.csv")
VIDEO_LINKS = rows("video_links.csv")
ALIASES = rows("aliases.csv")
SOURCE_DOCUMENTS = rows("source_documents.csv")


def index_link_ids(links: list[CsvRow], id_field: str) -> dict[tuple[str, str], list[str]]:
    index: dict[tuple[str, str], list[str]] = {}
    for row in links:
        entity_type = row.get("entity_type")
        entity_id = row.get("entity_id")
        if entity_type is None or entity_id is None:
            continue
        index.setdefault((entity_type, entity_id), []).append(row[id_field])
    return index


ARTICLE_IDS_BY_ENTITY = index_link_ids(ARTICLE_LINKS, "article_id")
VIDEO_IDS_BY_ENTITY = index_link_ids(VIDEO_LINKS, "video_id")

FIGHTER_ALIASES = {}
for _alias in ALIASES:
    if _alias.get("alias_type") == "fighters":
        FIGHTER_ALIASES.setdefault(_alias.get("canonical_id"), []).append(_alias["alias"])

PARTICIPANTS_BY_BOUT: dict[str, list[CsvRow]] = {}
# red を先, blue を次, それ以外 (未知の side) は末尾(99) に固定。matchup の "A vs B" 表示順が
# これに依存するので並び順は意味を持つ。
_SIDE_ORDER = {"red": 0, "blue": 1}
for _participant in BOUT_PARTICIPANTS:
    PARTICIPANTS_BY_BOUT.setdefault(_participant.get("bout_id"), []).append(_participant)
for _bout_id, _participants in PARTICIPANTS_BY_BOUT.items():
    _participants.sort(key=lambda row: _SIDE_ORDER.get(row.get("side", ""), 99))


def article_ids_for(entity_type: str, entity_id: str) -> list[str]:
    return ARTICLE_IDS_BY_ENTITY.get((entity_type, entity_id), [])


def first_article_id_for(entity_type: str, entity_id: str) -> str | None:
    ids = article_ids_for(entity_type, entity_id)
    return ids[0] if ids else None


def video_ids_for(entity_type: str, entity_id: str) -> list[str]:
    return VIDEO_IDS_BY_ENTITY.get((entity_type, entity_id), [])


def known_or_unknown_result(row: CsvRow) -> str:
    return none_if_empty(row.get("result_status")) or "unknown"


def sorted_participants_for_bout(bout_id: str) -> list[CsvRow]:
    return PARTICIPANTS_BY_BOUT.get(bout_id, [])


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


# 勝者は bouts.csv に直接持たず、bout_participants の result=="win" から逆引きする
# (単一の事実源 = participants 行を保つため。敗者側は loser_from_participants が同様に "loss" を引く)。
# 該当者が無ければ None を返し捏造しない。
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


def build_metadata() -> dict[str, Any]:
    return {
        "project_name": "arakaku-database",
        "display_name": "アラカク非公式データベース",
        "description": "アラカク通信のーと等をもとに、団体・大会・試合結果・選手情報を整理するデータベース。",
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
            "result": lambda row: bout_result(row, int_field),
            "title": lambda row: bout_title(row, is_title_bout),
            "source_article_id": lambda row: first_article_id_for("bout", row["bout_id"]),
            "notes": field_or_empty("notes"),
            "inferred_from_video_id": "inferred_from_video_id",
            "inferred_from_video_title": "inferred_from_video_title",
            "inferred_confidence": "inferred_confidence",
        },
    )


def build_fighters() -> list[dict[str, Any]]:
    return map_csv(
        "fighters.csv",
        {
            "fighter_id": "fighter_id",
            "display_name": "display_name",
            "aliases": lambda row: FIGHTER_ALIASES.get(row["fighter_id"], []),
            "main_division": "main_division",
            "main_promotion_id": "main_promotion_id",
            "profile": fighter_profile,
            "summary": field_or_empty("summary"),
            "source_article_ids": lambda row: article_ids_for("fighter", row["fighter_id"]),
            "inferred_from_video_ids": lambda row: video_ids_for("fighter", row["fighter_id"]),
            "inferred_confidence": "inferred_confidence",
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
    return EntityMapper(VIDEO_LINKS).map(
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
    return {
        alias_type: {
            row["alias"]: row["canonical_id"]
            for row in ALIASES
            if row["alias_type"] == alias_type
        }
        for alias_type in ["fighters", "promotions", "methods"]
    }


JSON_BUILDERS = {
    "metadata.json": build_metadata,
    "articles.json": build_articles,
    "article_links.json": lambda: ARTICLE_LINKS,
    "promotions.json": build_promotions,
    "events.json": build_events,
    "bouts.json": build_bouts,
    "bout_participants.json": lambda: BOUT_PARTICIPANTS,
    "fighters.json": build_fighters,
    "titles.json": build_titles,
    "title_reigns.json": lambda: TITLE_REIGNS,
    "fighter_snapshots.json": build_fighter_snapshots,
    "videos.json": build_videos,
    "video_links.json": build_video_links,
    "aliases.json": build_aliases,
    # source_documents は本文 (content_text) を別 JSON に分離する: メタデータは軽く、
    # 重い本文は source_document_bodies.json として遅延ロードできるようにするため。両者で
    # source_id を揃えて viewer 側が突き合わせる。
    "source_documents.json": lambda: [
        {k: v for k, v in row.items() if k != "content_text"}
        for row in SOURCE_DOCUMENTS
    ],
    "source_document_bodies.json": lambda: [
        {"source_id": row["source_id"], "content_text": row.get("content_text", "")}
        for row in SOURCE_DOCUMENTS
    ],
    "source_mentions.json": lambda: rows("source_mentions.csv"),
    "youtube_archives.json": lambda: rows("archives/youtube.csv"),
    "note_archives.json": lambda: rows("archives/note.csv"),
    # 以下は data-src ではなく review/ 配下の候補 CSV をそのまま JSON 化する (人手レビュー用の参照情報)。
    "source_event_references.json": lambda: read_csv(REVIEW / "source_event_reference_candidates.csv"),
    "source_bout_references.json": lambda: read_csv(REVIEW / "source_bout_reference_candidates.csv"),
    "source_video_references.json": lambda: read_csv(REVIEW / "source_video_reference_candidates.csv"),
}


def main() -> None:
    build_json_files(JSON_BUILDERS, "[done] JSON build completed")


if __name__ == "__main__":
    main()
