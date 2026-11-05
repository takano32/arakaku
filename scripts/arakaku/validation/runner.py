# 役割: docs/data/*.json を全部読み、検証関数を依存順に呼んで Report にまとめる (validate_docs_data)。
#   run() はその結果を stderr/stdout に出し、終了コードを返す (`make validate` の最初のステップ)。
# アーキ上の位置: scripts/validate_json.py の main() がここの run() を呼ぶ。検証関数本体は同じ
#   パッケージの entities / links / rules / sources / numbers / archives / official。
# 不変条件 / 注意: 生成 JSON は make build が必ず全部書くので、欠けていれば error、壊れていれば例外
#   (arakaku.io.load_json)。検証順序は依存順 (article→promotion→event→fighter→bout…) で、先に集めた
#   *_ids 集合を後段の参照チェックに渡す前提なので、並べ替え時は ID 集合の生成タイミングを崩さないこと。
# 関連スキル: .agents/skills/arakaku-maintainer (make validate)。
from __future__ import annotations

import sys
from pathlib import Path

from arakaku.io import load_json
from arakaku.paths import DATA_SRC, DOCS_DATA

from .archives import validate_archive_data
from .entities import (
    validate_articles,
    validate_bout_participants,
    validate_bouts,
    validate_events,
    validate_fighter_snapshots,
    validate_fighters,
    validate_promotions,
    validate_title_reigns,
    validate_titles,
    validate_videos,
)
from .links import validate_aliases, validate_article_links, validate_video_links
from .locate import locate_error
from .numbers import validate_numbers_data
from .official import (
    validate_official_history,
    validate_official_matches,
    validate_official_news,
    validate_official_pages,
    validate_official_players,
    validate_official_tournaments,
)
from .report import Report
from .rules import validate_bout_titles, validate_cross_tables, validate_dates, validate_enums
from .sources import (
    validate_source_document_bodies,
    validate_source_documents,
    validate_source_mentions,
    validate_source_references,
)

# viewer の最初の描画に必要なファイル。
REQUIRED_JSON_FILES = {
    'metadata.json', 'articles.json', 'promotions.json', 'events.json', 'bouts.json', 'fighters.json',
    'official_players.json', 'official_tournaments.json', 'official_matches.json',
    'official_history.json', 'official_news.json', 'official_pages.json',
}
# make build が書く残りのファイル。どれが欠けても error。
ALL_JSON_FILES = REQUIRED_JSON_FILES | {
    'article_links.json', 'titles.json', 'title_reigns.json',
    'bout_participants.json', 'fighter_snapshots.json', 'videos.json',
    'video_links.json', 'aliases.json',
    'source_documents.json', 'source_document_bodies.json', 'source_mentions.json',
    'numbers_fighters.json', 'numbers_name_matches.json',
    'numbers_fight_records.json',
    'youtube_archives.json', 'note_archives.json',
    'source_event_references.json', 'source_bout_references.json',
    'source_video_references.json',
}


def validate_docs_data(docs_data: Path = DOCS_DATA) -> Report:
    report = Report()

    for filename in sorted(ALL_JSON_FILES):
        # make build always writes every file, so a missing one is an error, not a warning.
        if not (docs_data / filename).exists():
            report.error(f"missing json file: {filename}")

    def load(filename: str, default):
        return load_json(docs_data / filename, default)

    articles = load('articles.json', [])
    promotions = load('promotions.json', [])
    events = load('events.json', [])
    bouts = load('bouts.json', [])
    bout_participants = load('bout_participants.json', [])
    fighters = load('fighters.json', [])
    titles = load('titles.json', [])
    title_reigns = load('title_reigns.json', [])
    snapshots = load('fighter_snapshots.json', [])
    videos = load('videos.json', [])
    video_links = load('video_links.json', [])
    article_links = load('article_links.json', [])
    aliases = load('aliases.json', {})
    source_documents = load('source_documents.json', [])
    source_document_bodies = load('source_document_bodies.json', [])
    source_mentions = load('source_mentions.json', [])
    numbers_fighters = load('numbers_fighters.json', [])
    numbers_name_matches = load('numbers_name_matches.json', [])
    numbers_fight_records = load('numbers_fight_records.json', [])
    youtube_archives = load('youtube_archives.json', [])
    note_archives = load('note_archives.json', [])
    official_players = load('official_players.json', [])
    official_tournaments = load('official_tournaments.json', [])
    official_matches = load('official_matches.json', [])
    official_history = load('official_history.json', [])
    official_news = load('official_news.json', [])
    official_pages = load('official_pages.json', [])

    # 以降は依存順に検証する。各バリデータが返す *_ids 集合を後続の参照整合性チェックへ渡すため、
    # この呼び出し順 (article→promotion→event→fighter→bout…) を入れ替えると未定義 ID 集合を参照して壊れる。
    article_ids = validate_articles(report, articles)
    promotion_ids = validate_promotions(report, promotions, article_ids)
    event_ids = validate_events(report, events, promotion_ids, article_ids)
    fighter_ids = validate_fighters(report, fighters, promotion_ids, article_ids)
    bout_ids = validate_bouts(report, bouts, event_ids, promotion_ids, fighter_ids, article_ids)
    video_ids = validate_videos(report, videos, article_ids)
    # titles と fighter_snapshots の ID はそれぞれのバリデータが 1 回だけ集める (T.112.4.7。以前は
    # ここでも collect_ids を呼んでいたので、重複 ID が 2 回報告された)。
    title_ids = validate_titles(report, titles, promotion_ids, fighter_ids, article_ids, video_ids)
    snapshot_ids = validate_fighter_snapshots(report, snapshots, fighter_ids, event_ids, article_ids, promotion_ids, {x.get('slug') for x in official_news if isinstance(x, dict)})
    reign_ids = validate_title_reigns(report, title_reigns, title_ids, fighter_ids, event_ids, article_ids, video_ids)

    validate_bout_participants(report, bout_participants, bout_ids, fighter_ids)
    validate_video_links(report, video_links, video_ids, event_ids, bout_ids, fighter_ids, promotion_ids, title_ids)
    validate_article_links(report, article_links, article_ids, event_ids, bout_ids, fighter_ids, snapshot_ids, promotion_ids, title_ids, reign_ids, video_ids)
    validate_source_documents(report, source_documents)
    validate_source_document_bodies(report, source_document_bodies)
    validate_source_mentions(report, source_mentions)
    validate_source_references(report, load('source_event_references.json', []), 'source_event_references.json', 'event_id', event_ids)
    validate_source_references(report, load('source_bout_references.json', []), 'source_bout_references.json', 'bout_id', bout_ids)
    validate_source_references(report, load('source_video_references.json', []), 'source_video_references.json', 'video_id', video_ids)
    validate_aliases(report, aliases)
    validate_bout_titles(report, bouts, titles)
    validate_dates(report, articles, events, source_documents)
    validate_cross_tables(report, bouts, events, aliases, fighter_ids, promotion_ids, title_reigns, source_mentions, source_documents)
    validate_enums(report, {
        'bouts': bouts, 'events': events, 'fighters': fighters, 'bout_participants': bout_participants,
        'source_mentions': source_mentions, 'numbers_name_matches': numbers_name_matches,
        'articles': articles,
    })
    validate_numbers_data(report, numbers_fighters, numbers_name_matches, numbers_fight_records, fighter_ids)
    validate_archive_data(report, youtube_archives, note_archives)
    validate_official_players(report, official_players)
    validate_official_tournaments(report, official_tournaments)
    validate_official_matches(report, official_matches)
    validate_official_history(report, official_history)
    validate_official_news(report, official_news)
    validate_official_pages(report, official_pages)
    return report


def run(docs_data: Path = DOCS_DATA, data_src: Path = DATA_SRC) -> int:
    report = validate_docs_data(docs_data)
    for w in report.warnings:
        print(f"WARNING: {w}", file=sys.stderr)
    for e in report.errors:
        print(f"ERROR: {locate_error(e, docs_data, data_src)}", file=sys.stderr)
    if report.errors:
        print(f"json validation failed: {len(report.errors)} error(s), {len(report.warnings)} warning(s)", file=sys.stderr)
        return 1
    print(f"json validation passed: {len(report.warnings)} warning(s)")
    return 0
