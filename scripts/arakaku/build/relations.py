# 役割: 正規 JSON ビルド (build/canonical.py) の入力。Tables = 読み込んだ CSV の行、
#   Relations = 関係テーブル (article_links / video_links / bout_participants / aliases / アーカイブ)
#   から一度だけ作る索引。各ビルダは Relations 経由で派生情報を join する。
# アーキ上の位置: 純粋関数だけを置く。CSV を読んで Tables を作る load_tables (I/O) は build/io.py
#   (T.112.6.19)。テストは Tables / Relations を小さな行リストから直接組み立てられる。
# 不変条件:
#   - participants_by_bout は red を先, blue を次, それ以外 (未知の side) を末尾に固定する。
#     matchup の "A vs B" 表示順と winner/loser の決め方がこれに依存する。
#   - linked_video_ids は T.75 の規則: 試合の元動画 (bouts.inferred_from_video_id)・video_bout_links・
#     video_links のどれかにあれば linked。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from dataclasses import dataclass, field

from arakaku.event_dates import event_note_dates
from arakaku.schema import CsvRow


@dataclass(frozen=True)
class Tables:
    """data-src の正規 CSV と review/ の候補 CSV (読み込んだままの行)。"""

    articles: list[CsvRow] = field(default_factory=list)
    article_links: list[CsvRow] = field(default_factory=list)
    promotions: list[CsvRow] = field(default_factory=list)
    events: list[CsvRow] = field(default_factory=list)
    bouts: list[CsvRow] = field(default_factory=list)
    bout_participants: list[CsvRow] = field(default_factory=list)
    fighters: list[CsvRow] = field(default_factory=list)
    titles: list[CsvRow] = field(default_factory=list)
    title_reigns: list[CsvRow] = field(default_factory=list)
    fighter_snapshots: list[CsvRow] = field(default_factory=list)
    videos: list[CsvRow] = field(default_factory=list)
    video_links: list[CsvRow] = field(default_factory=list)
    video_bout_links: list[CsvRow] = field(default_factory=list)
    aliases: list[CsvRow] = field(default_factory=list)
    source_documents: list[CsvRow] = field(default_factory=list)
    source_mentions: list[CsvRow] = field(default_factory=list)
    youtube_archives: list[CsvRow] = field(default_factory=list)
    note_archives: list[CsvRow] = field(default_factory=list)
    # review/ の候補 CSV (人手レビュー用の参照情報) もそのまま JSON 化する。
    source_event_references: list[CsvRow] = field(default_factory=list)
    source_bout_references: list[CsvRow] = field(default_factory=list)
    source_video_references: list[CsvRow] = field(default_factory=list)


def index_link_ids(links: list[CsvRow], id_field: str) -> dict[tuple[str, str], list[str]]:
    """(entity_type, entity_id) -> リンク表の id_field 列 (article_id / video_id) のリスト。"""
    index: dict[tuple[str, str], list[str]] = {}
    for row in links:
        entity_type = row.get("entity_type")
        entity_id = row.get("entity_id")
        if entity_type is None or entity_id is None:
            continue
        index.setdefault((entity_type, entity_id), []).append(row[id_field])
    return index


def fighter_aliases(aliases: list[CsvRow]) -> dict[str, list[str]]:
    by_fighter: dict[str, list[str]] = {}
    for row in aliases:
        if row.get("alias_type") == "fighters":
            by_fighter.setdefault(row.get("canonical_id"), []).append(row["alias"])
    return by_fighter


_SIDE_ORDER = {"red": 0, "blue": 1}


def participants_by_bout(participants: list[CsvRow]) -> dict[str, list[CsvRow]]:
    by_bout: dict[str, list[CsvRow]] = {}
    for participant in participants:
        by_bout.setdefault(participant.get("bout_id"), []).append(participant)
    for rows in by_bout.values():
        rows.sort(key=lambda row: _SIDE_ORDER.get(row.get("side", ""), 99))
    return by_bout


def linked_video_ids(bouts: list[CsvRow], video_bout_links: list[CsvRow], video_links: list[CsvRow]) -> set[str]:
    return (
        {row["inferred_from_video_id"] for row in bouts if row.get("inferred_from_video_id")}
        | {row["video_id"] for row in video_bout_links}
        | {row["video_id"] for row in video_links}
    )


@dataclass(frozen=True)
class Relations:
    """関係テーブルから派生した索引。ビルダはこれだけを見て join する。"""

    article_ids_by_entity: dict[tuple[str, str], list[str]] = field(default_factory=dict)
    video_ids_by_entity: dict[tuple[str, str], list[str]] = field(default_factory=dict)
    fighter_aliases: dict[str, list[str]] = field(default_factory=dict)
    participants_by_bout: dict[str, list[CsvRow]] = field(default_factory=dict)
    youtube_archive: dict[str, CsvRow] = field(default_factory=dict)
    linked_video_ids: set[str] = field(default_factory=set)
    result_published_at: dict[str, str] = field(default_factory=dict)
    note_published_at: dict[str, str] = field(default_factory=dict)

    @classmethod
    def from_tables(cls, tables: Tables) -> "Relations":
        result_published_at, note_published_at = event_note_dates(tables.articles, tables.article_links)
        return cls(
            article_ids_by_entity=index_link_ids(tables.article_links, "article_id"),
            video_ids_by_entity=index_link_ids(tables.video_links, "video_id"),
            fighter_aliases=fighter_aliases(tables.aliases),
            participants_by_bout=participants_by_bout(tables.bout_participants),
            youtube_archive={row["display_id"]: row for row in tables.youtube_archives},
            linked_video_ids=linked_video_ids(tables.bouts, tables.video_bout_links, tables.video_links),
            result_published_at=result_published_at,
            note_published_at=note_published_at,
        )

    def article_ids_for(self, entity_type: str, entity_id: str) -> list[str]:
        return self.article_ids_by_entity.get((entity_type, entity_id), [])

    def first_article_id_for(self, entity_type: str, entity_id: str) -> str | None:
        ids = self.article_ids_for(entity_type, entity_id)
        return ids[0] if ids else None

    def video_ids_for(self, entity_type: str, entity_id: str) -> list[str]:
        return self.video_ids_by_entity.get((entity_type, entity_id), [])

    def participants_for(self, bout_id: str) -> list[CsvRow]:
        return self.participants_by_bout.get(bout_id, [])
