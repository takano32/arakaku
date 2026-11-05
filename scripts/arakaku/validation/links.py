# 役割: 関係テーブル JSON (video_links / article_links) と aliases.json の検証。
#   entity_type ごとに参照先の ID 集合を切り替え、(id, entity_type, entity_id, relation_type) の重複を見る。
# アーキ上の位置: runner.py がエンティティの検証で集めた ID 集合を渡して呼ぶ。
# 関連スキル: .agents/skills/arakaku-maintainer (make validate)。
from __future__ import annotations

from typing import Any

from .common import collect_ids, require_field
from .report import Report
from .vocab import (
    VALID_ARTICLE_ENTITY_TYPES,
    VALID_ARTICLE_RELATION_TYPES,
    VALID_VIDEO_ENTITY_TYPES,
    VALID_VIDEO_RELATION_TYPES,
)


def validate_video_links(report: Report, video_links: list[Any], video_ids: set[str], event_ids: set[str], bout_ids: set[str], fighter_ids: set[str], promotion_ids: set[str], title_ids: set[str]) -> None:
    seen = set()
    entity_sets = {'event': event_ids, 'bout': bout_ids, 'fighter': fighter_ids, 'promotion': promotion_ids, 'title': title_ids}
    for i, x in enumerate(video_links):
        if not isinstance(x, dict):
            report.error(f"video_links.json[{i}]: expected object")
            continue
        video_id = require_field(report, x, 'video_links.json', i, 'video_id')
        entity_type = require_field(report, x, 'video_links.json', i, 'entity_type')
        entity_id = require_field(report, x, 'video_links.json', i, 'entity_id')
        relation_type = x.get('relation_type') or 'reference'
        marker = (video_id, entity_type, entity_id, relation_type)
        if marker in seen:
            report.error(f"video_links.json[{i}]: duplicate video link: {marker}")
        seen.add(marker)
        if video_id and video_id not in video_ids:
            report.error(f"video_links.json[{i}]: unknown video reference: {video_id}")
        if entity_type and entity_type not in VALID_VIDEO_ENTITY_TYPES:
            report.error(f"video_links.json[{i}]: invalid entity_type: {entity_type}")
            continue
        if relation_type and relation_type not in VALID_VIDEO_RELATION_TYPES:
            report.error(f"video_links.json[{i}]: unusual relation_type: {relation_type}")
        if entity_id and entity_type in entity_sets and entity_id not in entity_sets[entity_type]:
            report.error(f"video_links.json[{i}]: unknown {entity_type} reference: {entity_id}")


def validate_article_links(report: Report, article_links: list[Any], article_ids: set[str], event_ids: set[str], bout_ids: set[str], fighter_ids: set[str], snapshot_ids: set[str], promotion_ids: set[str], title_ids: set[str], reign_ids: set[str], video_ids: set[str]) -> None:
    seen = set()
    entity_sets = {
        'event': event_ids,
        'bout': bout_ids,
        'fighter': fighter_ids,
        'fighter_snapshot': snapshot_ids,
        'promotion': promotion_ids,
        'title': title_ids,
        'title_reign': reign_ids,
        'video': video_ids,
    }
    collect_ids(report, article_links, 'article_links.json', 'link_id')
    for i, x in enumerate(article_links):
        if not isinstance(x, dict):
            report.error(f"article_links.json[{i}]: expected object")
            continue
        article_id = require_field(report, x, 'article_links.json', i, 'article_id')
        entity_type = require_field(report, x, 'article_links.json', i, 'entity_type')
        entity_id = require_field(report, x, 'article_links.json', i, 'entity_id')
        relation_type = x.get('relation_type') or 'source'
        marker = (article_id, entity_type, entity_id, relation_type)
        if marker in seen:
            report.error(f"article_links.json[{i}]: duplicate article link: {marker}")
        seen.add(marker)
        if article_id and article_id not in article_ids:
            report.error(f"article_links.json[{i}]: unknown article reference: {article_id}")
        if entity_type and entity_type not in VALID_ARTICLE_ENTITY_TYPES:
            report.error(f"article_links.json[{i}]: invalid entity_type: {entity_type}")
            continue
        if relation_type and relation_type not in VALID_ARTICLE_RELATION_TYPES:
            report.error(f"article_links.json[{i}]: unusual relation_type: {relation_type}")
        if entity_id and entity_type in entity_sets and entity_id not in entity_sets[entity_type]:
            report.error(f"article_links.json[{i}]: unknown {entity_type} reference: {entity_id}")


def validate_aliases(report: Report, aliases: Any) -> None:
    if not isinstance(aliases, dict):
        report.error('aliases.json: expected object')
        return
    for k, v in aliases.items():
        if not isinstance(v, dict):
            report.error(f"aliases.json[{k}]: expected object")
