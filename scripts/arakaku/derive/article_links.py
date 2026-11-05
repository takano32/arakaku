# 役割: 記事→各エンティティ（promotion / title_reign / fighter_snapshot / event / bout / fighter）の
#   関係表 article_links.csv の行を作る。一部は構造化データから決定的に、一部はキャッシュ記事本文の
#   絵文字マーカー解析 (arakaku/notes/matchups.py) というヒューリスティックで導出する。
# アーキ上の位置: scripts/generate_article_links.py が ArticleLinkSources に CSV を詰めて呼ぶ。
#   出力はビューアの出典リンク表示が消費する。
# 不変条件:
#   - articles.csv の行順 (reorder_data.py の前後で変わる) に出力順を左右されないよう、記事を
#     (published_at, article_id) で並べてから処理する (T.91)。
#   - 同一 (記事, エンティティ種別, エンティティID) の重複リンクは 1 本に畳む。
#   - article_type の値（event_card/event_result/promotion_profile）は arakaku/notes/articles.py の
#     分類と同期していること。
#   - 動画リンクはここで作らない（note HTML に YouTube ID が無いため）。それは derive/video_links.py。
# 関連スキル: .agents/skills/arakaku-source-pipeline
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Callable

from arakaku.notes.matchups import extract_matchups, extract_promotion_profile_fighters, title_to_event_ids
from arakaku.schema import CsvRow

FIELDS = ["link_id", "article_id", "entity_type", "entity_id", "relation_type", "notes"]

AddLink = Callable[[str, str, str], None]


@dataclass(frozen=True)
class ArticleLinkSources:
    articles: list[CsvRow] = field(default_factory=list)
    events: list[CsvRow] = field(default_factory=list)
    fighters: list[CsvRow] = field(default_factory=list)
    aliases: list[CsvRow] = field(default_factory=list)
    bouts: list[CsvRow] = field(default_factory=list)
    bout_participants: list[CsvRow] = field(default_factory=list)
    title_reigns: list[CsvRow] = field(default_factory=list)
    fighter_snapshots: list[CsvRow] = field(default_factory=list)
    source_documents: list[CsvRow] = field(default_factory=list)


def make_link_id(article_id: str, entity_type: str, entity_id: str) -> str:
    return f"article-{article_id}-{entity_type}-{entity_id}-source"


def fighter_name_index(fighters: list[CsvRow], aliases: list[CsvRow]) -> dict[str, str]:
    """選手名 (display_name と fighters 別名) -> fighter_id。"""
    name_to_fid: dict[str, str] = {}
    for r in fighters:
        if r["display_name"]:
            name_to_fid[r["display_name"]] = r["fighter_id"]
    for r in aliases:
        if r["alias_type"] == "fighters":
            name_to_fid[r["alias"]] = r["canonical_id"]
    return name_to_fid


def _promotion_links(articles: dict[str, CsvRow], add: AddLink) -> None:
    for art in articles.values():
        if art.get("article_type") != "promotion_profile":
            continue
        promo_id = art.get("promotion_id", "")
        if promo_id:
            add(art["article_id"], "promotion", promo_id)


def _title_reign_links(title_reigns: list[CsvRow], add: AddLink) -> None:
    for reign in title_reigns:
        article_id = reign.get("source_article_id", "")
        if article_id:
            add(article_id, "title_reign", reign["reign_id"])


def _fighter_snapshot_links(snapshots: list[CsvRow], add: AddLink) -> None:
    # 出典が note 記事の時点情報だけ結ぶ（公式ニュースは articles.csv に無い）
    for snapshot in snapshots:
        source_type, _, source_ref = snapshot.get("source_id", "").partition(":")
        if source_type == "note" and source_ref:
            add(source_ref, "fighter_snapshot", snapshot["snapshot_id"])


def _event_article_links(
    articles: dict[str, CsvRow],
    source_docs: dict[str, CsvRow],
    known_events: set[str],
    name_to_fid: dict[str, str],
    bouts_by_event: dict[str, list[str]],
    bout_fighters: dict[str, set[str]],
    add: AddLink,
) -> None:
    """大会記事 (event_card / event_result) から event・bout・fighter リンク。"""
    for art in articles.values():
        article_id = art["article_id"]
        if art.get("article_type", "") not in ("event_card", "event_result"):
            continue

        doc = source_docs.get(article_id, {})
        content = doc.get("content_text", "")
        if not content:
            continue

        event_ids = [e for e in title_to_event_ids(doc.get("title", ""), known_events) if e in known_events]
        if not event_ids:
            continue

        for event_id in event_ids:
            add(article_id, "event", event_id)

        # 両選手が解決でき、かつその2人が同一イベント内のある bout 参加者集合に含まれる
        # （pair <= 参加者）ときだけ bout を結ぶ。
        for name1, name2 in extract_matchups(content):
            fid1 = name_to_fid.get(name1)
            fid2 = name_to_fid.get(name2)
            if fid1:
                add(article_id, "fighter", fid1)
            if fid2:
                add(article_id, "fighter", fid2)
            if fid1 and fid2:
                pair = {fid1, fid2}
                for event_id in event_ids:
                    for bout_id in bouts_by_event.get(event_id, []):
                        if pair <= bout_fighters.get(bout_id, set()):
                            add(article_id, "bout", bout_id)


def _profile_fighter_links(articles: dict[str, CsvRow], source_docs: dict[str, CsvRow], name_to_fid: dict[str, str], add: AddLink) -> None:
    for art in articles.values():
        if art.get("article_type") != "promotion_profile":
            continue
        content = source_docs.get(art["article_id"], {}).get("content_text", "")
        if not content:
            continue
        for name in extract_promotion_profile_fighters(content):
            fid = name_to_fid.get(name)
            if fid:
                add(art["article_id"], "fighter", fid)


def article_link_rows(src: ArticleLinkSources) -> list[dict[str, str]]:
    articles = {r["article_id"]: r for r in sorted(src.articles, key=lambda r: (r.get("published_at") or "0000-00-00", r["article_id"]))}
    known_events = {r["event_id"] for r in src.events}
    name_to_fid = fighter_name_index(src.fighters, src.aliases)

    bouts_by_event: dict[str, list[str]] = defaultdict(list)
    for r in src.bouts:
        bouts_by_event[r["event_id"]].append(r["bout_id"])

    bout_fighters: dict[str, set[str]] = defaultdict(set)
    for r in src.bout_participants:
        bout_fighters[r["bout_id"]].add(r["fighter_id"])

    source_docs = {r["source_ref_id"]: r for r in src.source_documents}

    rows: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()  # (article_id, entity_type, entity_id)

    def add(article_id: str, entity_type: str, entity_id: str) -> None:
        key = (article_id, entity_type, entity_id)
        if key in seen:
            return
        seen.add(key)
        rows.append({
            "link_id": make_link_id(article_id, entity_type, entity_id),
            "article_id": article_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "relation_type": "source",
            "notes": "",
        })

    _promotion_links(articles, add)
    _title_reign_links(src.title_reigns, add)
    _fighter_snapshot_links(src.fighter_snapshots, add)
    _event_article_links(articles, source_docs, known_events, name_to_fid, bouts_by_event, bout_fighters, add)
    _profile_fighter_links(articles, source_docs, name_to_fid, add)
    return rows
