# 役割: data-src/*.csv (正規化済みリレーショナル CSV) から viewer 用の docs/data/*.json を組み立てる
#   入口。json_builders() が「出力ファイル名 -> ビルダ関数」を列挙し、scripts/build_json.py が
#   arakaku.io.build_json_files で順に評価して書き出す。各エンティティのビルダは build/ の
#   articles・promotions・events・bouts・fighters・titles・videos・aliases にある。
# アーキ上の位置: 入力 = build/relations.py の Tables と Relations、出力 = docs/data/*.json
#   (viewer = docs/assets/js が読む)。I/O はしない (import 時に CSV も読まない)。
# 不変条件:
#   - 出力 JSON のキー構造は viewer (docs/assets/js) と validation/ の契約。勝手に変えない。
#   - json_builders の並びが書き出し順。
#   - AGENTS.md の方針: 行を黙って落とさない・事実を捏造しない。不明値は "unknown"/None で残す。
#   - 区別: ここは「正規 CSV」。official_*/numbers_* は build/official.py・build/numbers.py が担当。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any, Callable

from arakaku.build.aliases import build_aliases
from arakaku.build.articles import build_articles, source_document_bodies, source_documents_without_bodies
from arakaku.build.bouts import build_bouts
from arakaku.build.events import build_events
from arakaku.build.fighters import build_fighter_snapshots, build_fighters
from arakaku.build.promotions import build_promotions
from arakaku.build.relations import Relations, Tables
from arakaku.build.titles import build_titles
from arakaku.build.videos import build_video_links, build_videos


def build_metadata() -> dict[str, Any]:
    return {
        "project_name": "arakaku-database",
        "display_name": "アラカク非公式データベース",
        "description": "アラカク通信のーと等をもとに、団体・大会・試合結果・選手情報を整理するデータベース。",
        "data_version": "0.2.0",
        "source_schema": "relational-csv-v1",
        "source_note": "CSV は事実データを正規化し、viewer 用 JSON は関係テーブルから派生生成しています。",
    }


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
