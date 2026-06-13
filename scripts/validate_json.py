#!/usr/bin/env python3
from __future__ import annotations

# 役割: ビルド済み docs/data/*.json の構造・主キー一意性・参照整合性を検証する
#   Python 側バリデータ。`make validate` の最初のステップ。
# アーキ上の位置: build_json.py 等が出力した JSON を入力にする。許容値の集合
#   (VALID_METHODS など) は arakaku/validation.py から、JSON ロードと DOCS_DATA は
#   arakaku/utils.py から取得。viewer 側の整合は validate_json.js が別途検証する。
# 不変条件 / 注意: 致命的不整合は add_error (return 1)、許容範囲外だが致命的でない
#   ものは add_warning。REQUIRED_JSON_FILES は欠けると error、その他の生成 JSON は
#   存在チェックのみ warning。main() の検証順序は依存順 (article→promotion→event→
#   fighter→bout…) で、先に集めた *_ids 集合を後段の参照チェックに渡す前提なので
#   並べ替え時は ID 集合の生成タイミングを崩さないこと。
# 関連 skill: .agents/skills/arakaku-maintainer (make validate)。

import sys
from typing import Any
from arakaku.utils import DOCS_DATA, load_json
from arakaku.validation import (
    VALID_METHODS,
    VALID_VIDEO_TYPES,
    VALID_VIDEO_LINK_STATUSES,
    VALID_VIDEO_RELATION_TYPES,
    VALID_VIDEO_ENTITY_TYPES,
    VALID_ARTICLE_ENTITY_TYPES,
    VALID_ARTICLE_RELATION_TYPES,
)

ERRORS: list[str] = []
WARNINGS: list[str] = []
REQUIRED_JSON_FILES = {
    'metadata.json', 'articles.json', 'promotions.json', 'events.json', 'bouts.json', 'fighters.json',
    'official_players.json', 'official_tournaments.json', 'official_matches.json',
    'official_history.json', 'official_news.json', 'official_pages.json',
}

def add_error(m: str) -> None:
    ERRORS.append(m)

def add_warning(m: str) -> None:
    WARNINGS.append(m)

def validate_json_exists(filename: str) -> bool:
    if not (DOCS_DATA / filename).exists():
        msg = f"{'missing required json file' if filename in REQUIRED_JSON_FILES else 'optional json file not found'}: {filename}"
        (add_error if filename in REQUIRED_JSON_FILES else add_warning)(msg)
        return False
    return True

def collect_ids(items: list[Any], filename: str, id_field: str) -> set[str]:
    ids = set()
    seen = set()
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            add_error(f"{filename}[{i}]: expected object")
            continue
        v = item.get(id_field)
        if not isinstance(v, str) or not v.strip():
            add_error(f"{filename}[{i}]: missing required id field: {id_field}")
            continue
        if v in seen:
            add_error(f"{filename}[{i}]: duplicate {id_field}: {v}")
        seen.add(v)
        ids.add(v)
    return ids

def require_field(obj: dict[str, Any], filename: str, index: int, field: str) -> Any:
    v = obj.get(field)
    if v is None or v == '':
        add_error(f"{filename}[{index}]: missing required field: {field}")
    return v

def validate_articles(articles: list[Any]) -> set[str]:
    ids = collect_ids(articles, 'articles.json', 'article_id')
    for i, x in enumerate(articles):
        if isinstance(x, dict):
            require_field(x, 'articles.json', i, 'title')
            require_field(x, 'articles.json', i, 'url')
    return ids

def validate_promotions(promotions: list[Any], article_ids: set[str]) -> set[str]:
    ids = collect_ids(promotions, 'promotions.json', 'promotion_id')
    for i, x in enumerate(promotions):
        if not isinstance(x, dict):
            continue
        require_field(x, 'promotions.json', i, 'name')
        for aid in x.get('source_article_ids') or []:
            if aid not in article_ids:
                add_error(f"promotions.json[{i}]: unknown article reference: {aid}")
    return ids

def validate_events(events: list[Any], promotion_ids: set[str], article_ids: set[str]) -> set[str]:
    ids = collect_ids(events, 'events.json', 'event_id')
    for i, x in enumerate(events):
        if not isinstance(x, dict):
            continue
        require_field(x, 'events.json', i, 'name')
        pid = require_field(x, 'events.json', i, 'promotion_id')
        if pid and pid not in promotion_ids:
            add_error(f"events.json[{i}]: unknown promotion reference: {pid}")
        aid = x.get('source_article_id')
        if aid and aid not in article_ids:
            add_error(f"events.json[{i}]: unknown article reference: {aid}")
    return ids

def validate_fighters(fighters: list[Any], promotion_ids: set[str], article_ids: set[str]) -> set[str]:
    ids = collect_ids(fighters, 'fighters.json', 'fighter_id')
    for i, x in enumerate(fighters):
        if not isinstance(x, dict):
            continue
        require_field(x, 'fighters.json', i, 'display_name')
        pid = x.get('main_promotion_id')
        if pid and pid not in promotion_ids:
            add_error(f"fighters.json[{i}]: unknown promotion reference: {pid}")
        for aid in x.get('source_article_ids') or []:
            if aid not in article_ids:
                add_error(f"fighters.json[{i}]: unknown article reference: {aid}")
    return ids

def validate_bouts(bouts: list[Any], event_ids: set[str], promotion_ids: set[str], fighter_ids: set[str], article_ids: set[str]) -> set[str]:
    ids = collect_ids(bouts, 'bouts.json', 'bout_id')
    for i, x in enumerate(bouts):
        if not isinstance(x, dict):
            continue
        eid = require_field(x, 'bouts.json', i, 'event_id')
        pid = require_field(x, 'bouts.json', i, 'promotion_id')
        if eid and eid not in event_ids:
            add_error(f"bouts.json[{i}]: unknown event reference: {eid}")
        if pid and pid not in promotion_ids:
            add_error(f"bouts.json[{i}]: unknown promotion reference: {pid}")
        fs = x.get('fighters')
        if not isinstance(fs, list) or len(fs) != 2:
            add_error(f"bouts.json[{i}]: fighters must be a list of two fighters")
        else:
            names = set()
            results = []
            for j, f in enumerate(fs):
                fid = f.get('fighter_id')
                name = f.get('name')
                results.append(f.get('result'))
                names.add(name)
                if fid and fid not in fighter_ids:
                    add_error(f"bouts.json[{i}].fighters[{j}]: unknown fighter reference: {fid}")
                if not name:
                    add_error(f"bouts.json[{i}].fighters[{j}]: missing name")
            if len(names) != 2:
                add_error(f"bouts.json[{i}]: fighter names must be distinct")
            # result_status 未指定時は winner(_id) の有無から known/unknown を推定する
            # (この推定規則は下の bout レベル検証でも同じ式で再計算され一致させる)。
            result_status = x.get('result_status') or ('known' if x.get('winner_id') or x.get('winner') else 'unknown')
            if result_status == 'known' and sorted(results) != ['loss', 'win']:
                add_error(f"bouts.json[{i}]: known-result fighters must have exactly one win and one loss")
            if result_status == 'unknown' and any(r not in ('unknown', None, '') for r in results):
                add_error(f"bouts.json[{i}]: unknown-result fighters must not have win/loss results")
        for key in ['winner_id', 'loser_id']:
            fid = x.get(key)
            if fid and fid not in fighter_ids:
                add_error(f"bouts.json[{i}]: unknown fighter reference in {key}: {fid}")
        result_status = x.get('result_status') or ('known' if x.get('winner_id') or x.get('winner') else 'unknown')
        if result_status not in {'known', 'unknown'}:
            add_warning(f"bouts.json[{i}]: unusual result_status: {result_status}")
        if result_status == 'known' and not (x.get('winner_id') or x.get('winner')):
            add_error(f"bouts.json[{i}]: known-result bout is missing winner")
        if x.get('winner') and x.get('winner') == x.get('loser'):
            add_error(f"bouts.json[{i}]: winner and loser are the same: {x.get('winner')}")
        result = x.get('result') or {}
        method = result.get('method_normalized') if isinstance(result, dict) else None
        if method and method not in VALID_METHODS:
            add_warning(f"bouts.json[{i}]: unusual method_normalized: {method}")
        aid = x.get('source_article_id')
        if aid and aid not in article_ids:
            add_error(f"bouts.json[{i}]: unknown article reference: {aid}")
    return ids

def validate_bout_participants(participants: list[Any], bout_ids: set[str], fighter_ids: set[str]) -> set[str]:
    ids = collect_ids(participants, 'bout_participants.json', 'participant_id')
    by_bout: dict[str, list[dict[str, Any]]] = {}
    for i, x in enumerate(participants):
        if not isinstance(x, dict):
            continue
        bout_id = require_field(x, 'bout_participants.json', i, 'bout_id')
        if bout_id and bout_id not in bout_ids:
            add_error(f"bout_participants.json[{i}]: unknown bout reference: {bout_id}")
        fid = x.get('fighter_id')
        if fid and fid not in fighter_ids:
            add_error(f"bout_participants.json[{i}]: unknown fighter reference: {fid}")
        require_field(x, 'bout_participants.json', i, 'fighter_name')
        result = x.get('result')
        if result and result not in {'win', 'loss', 'draw', 'nc', 'unknown'}:
            add_warning(f"bout_participants.json[{i}]: unusual result: {result}")
        if bout_id:
            by_bout.setdefault(bout_id, []).append(x)
    for bout_id, rows in by_bout.items():
        if len(rows) != 2:
            add_error(f"bout_participants.json: bout {bout_id} must have exactly two participants")
        sides = [row.get('side') for row in rows]
        if len(set(sides)) != len(sides):
            add_error(f"bout_participants.json: bout {bout_id} has duplicate participant side")
    return ids

def validate_titles(titles: list[Any], promotion_ids: set[str], fighter_ids: set[str], article_ids: set[str], video_ids: set[str] | None = None) -> None:
    collect_ids(titles, 'titles.json', 'title_id')
    for i, x in enumerate(titles):
        if not isinstance(x, dict):
            continue
        pid = x.get('promotion_id')
        if pid and pid not in promotion_ids:
            add_error(f"titles.json[{i}]: unknown promotion reference: {pid}")
        for j, r in enumerate(x.get('lineage') or []):
            fid = r.get('fighter_id')
            aid = r.get('source_article_id')
            vid = r.get('source_video_id')
            if fid and fid not in fighter_ids:
                add_error(f"titles.json[{i}].lineage[{j}]: unknown fighter reference: {fid}")
            if aid and aid not in article_ids:
                add_error(f"titles.json[{i}].lineage[{j}]: unknown article reference: {aid}")
            if vid and video_ids is not None and vid not in video_ids:
                add_error(f"titles.json[{i}].lineage[{j}]: unknown video reference: {vid}")

def validate_title_reigns(reigns: list[Any], title_ids: set[str], fighter_ids: set[str], event_ids: set[str], article_ids: set[str], video_ids: set[str]) -> set[str]:
    ids = collect_ids(reigns, 'title_reigns.json', 'reign_id')
    seen_order = set()
    for i, x in enumerate(reigns):
        if not isinstance(x, dict):
            continue
        title_id = require_field(x, 'title_reigns.json', i, 'title_id')
        if title_id and title_id not in title_ids:
            add_error(f"title_reigns.json[{i}]: unknown title reference: {title_id}")
        order = require_field(x, 'title_reigns.json', i, 'reign_order')
        marker = (title_id, order)
        if marker in seen_order:
            add_error(f"title_reigns.json[{i}]: duplicate title/reign_order: {marker}")
        seen_order.add(marker)
        fid = x.get('fighter_id')
        if fid and fid not in fighter_ids:
            add_error(f"title_reigns.json[{i}]: unknown fighter reference: {fid}")
        for key in ['won_at_event_id', 'lost_at_event_id']:
            eid = x.get(key)
            if eid and eid not in event_ids:
                add_error(f"title_reigns.json[{i}]: unknown event reference in {key}: {eid}")
        aid = x.get('source_article_id')
        if aid and aid not in article_ids:
            add_error(f"title_reigns.json[{i}]: unknown article reference: {aid}")
        vid = x.get('source_video_id')
        if vid and vid not in video_ids:
            add_error(f"title_reigns.json[{i}]: unknown video reference: {vid}")
    return ids

def validate_fighter_snapshots(snapshots: list[Any], fighter_ids: set[str], event_ids: set[str], article_ids: set[str], promotion_ids: set[str]) -> None:
    collect_ids(snapshots, 'fighter_snapshots.json', 'snapshot_id')
    for i, x in enumerate(snapshots):
        if not isinstance(x, dict):
            continue
        for key, ids, name in [('fighter_id', fighter_ids, 'fighter'), ('event_id', event_ids, 'event'), ('source_article_id', article_ids, 'article'), ('main_promotion_id', promotion_ids, 'promotion')]:
            v = x.get(key)
            if v and v not in ids:
                add_error(f"fighter_snapshots.json[{i}]: unknown {name} reference: {v}")

def validate_videos(videos: list[Any], article_ids: set[str]) -> set[str]:
    ids = collect_ids(videos, 'videos.json', 'video_id')
    seen_platform_ids = set()
    for i, x in enumerate(videos):
        if not isinstance(x, dict):
            continue
        platform = require_field(x, 'videos.json', i, 'platform')
        platform_video_id = x.get('platform_video_id')
        url = require_field(x, 'videos.json', i, 'url')
        require_field(x, 'videos.json', i, 'title')
        if url and not str(url).startswith(('http://', 'https://')):
            add_error(f"videos.json[{i}]: invalid url: {url}")
        if platform and platform_video_id:
            key = (platform, platform_video_id)
            if key in seen_platform_ids:
                add_error(f"videos.json[{i}]: duplicate platform/platform_video_id: {platform}/{platform_video_id}")
            seen_platform_ids.add(key)
        video_type = x.get('video_type')
        if video_type and video_type not in VALID_VIDEO_TYPES:
            add_warning(f"videos.json[{i}]: unusual video_type: {video_type}")
        link_status = x.get('link_status')
        if link_status and link_status not in VALID_VIDEO_LINK_STATUSES:
            add_warning(f"videos.json[{i}]: unusual link_status: {link_status}")
        for aid in x.get('source_article_ids') or []:
            if aid not in article_ids:
                add_error(f"videos.json[{i}]: unknown article reference: {aid}")
    return ids

def validate_video_links(video_links: list[Any], video_ids: set[str], event_ids: set[str], bout_ids: set[str], fighter_ids: set[str], promotion_ids: set[str], title_ids: set[str]) -> None:
    seen = set()
    entity_sets = {'event': event_ids, 'bout': bout_ids, 'fighter': fighter_ids, 'promotion': promotion_ids, 'title': title_ids}
    for i, x in enumerate(video_links):
        if not isinstance(x, dict):
            add_error(f"video_links.json[{i}]: expected object")
            continue
        video_id = require_field(x, 'video_links.json', i, 'video_id')
        entity_type = require_field(x, 'video_links.json', i, 'entity_type')
        entity_id = require_field(x, 'video_links.json', i, 'entity_id')
        relation_type = x.get('relation_type') or 'reference'
        marker = (video_id, entity_type, entity_id, relation_type)
        if marker in seen:
            add_error(f"video_links.json[{i}]: duplicate video link: {marker}")
        seen.add(marker)
        if video_id and video_id not in video_ids:
            add_error(f"video_links.json[{i}]: unknown video reference: {video_id}")
        if entity_type and entity_type not in VALID_VIDEO_ENTITY_TYPES:
            add_error(f"video_links.json[{i}]: invalid entity_type: {entity_type}")
            continue
        if relation_type and relation_type not in VALID_VIDEO_RELATION_TYPES:
            add_warning(f"video_links.json[{i}]: unusual relation_type: {relation_type}")
        if entity_id and entity_type in entity_sets and entity_id not in entity_sets[entity_type]:
            add_error(f"video_links.json[{i}]: unknown {entity_type} reference: {entity_id}")

def validate_article_links(article_links: list[Any], article_ids: set[str], event_ids: set[str], bout_ids: set[str], fighter_ids: set[str], snapshot_ids: set[str], promotion_ids: set[str], title_ids: set[str], reign_ids: set[str], video_ids: set[str]) -> None:
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
    collect_ids(article_links, 'article_links.json', 'link_id')
    for i, x in enumerate(article_links):
        if not isinstance(x, dict):
            add_error(f"article_links.json[{i}]: expected object")
            continue
        article_id = require_field(x, 'article_links.json', i, 'article_id')
        entity_type = require_field(x, 'article_links.json', i, 'entity_type')
        entity_id = require_field(x, 'article_links.json', i, 'entity_id')
        relation_type = x.get('relation_type') or 'source'
        marker = (article_id, entity_type, entity_id, relation_type)
        if marker in seen:
            add_error(f"article_links.json[{i}]: duplicate article link: {marker}")
        seen.add(marker)
        if article_id and article_id not in article_ids:
            add_error(f"article_links.json[{i}]: unknown article reference: {article_id}")
        if entity_type and entity_type not in VALID_ARTICLE_ENTITY_TYPES:
            add_error(f"article_links.json[{i}]: invalid entity_type: {entity_type}")
            continue
        if relation_type and relation_type not in VALID_ARTICLE_RELATION_TYPES:
            add_warning(f"article_links.json[{i}]: unusual relation_type: {relation_type}")
        if entity_id and entity_type in entity_sets and entity_id not in entity_sets[entity_type]:
            add_error(f"article_links.json[{i}]: unknown {entity_type} reference: {entity_id}")

def validate_aliases(aliases: Any) -> None:
    if not isinstance(aliases, dict):
        add_error('aliases.json: expected object')
        return
    for k, v in aliases.items():
        if not isinstance(v, dict):
            add_error(f"aliases.json[{k}]: expected object")

def validate_source_documents(data: list[Any]) -> None:
    seen = set()
    for index, row in enumerate(data):
        source_id = row.get("source_id")
        if not source_id:
            add_error(f"source_documents.json[{index}]: missing source_id")
            continue
        if source_id in seen:
            add_error(f"source_documents.json[{index}]: duplicate source_id: {source_id}")
        seen.add(source_id)
        if not row.get("source_type"):
            add_error(f"source_documents.json[{index}]: missing source_type")
        if not row.get("source_ref_id"):
            add_error(f"source_documents.json[{index}]: missing source_ref_id")
        if not row.get("content_hash"):
            add_error(f"source_documents.json[{index}]: missing content_hash")

def validate_source_document_bodies(data: list[Any]) -> None:
    seen: set[str] = set()
    for index, row in enumerate(data):
        source_id = row.get("source_id")
        if not source_id:
            add_error(f"source_document_bodies.json[{index}]: missing source_id")
            continue
        if source_id in seen:
            add_error(f"source_document_bodies.json[{index}]: duplicate source_id: {source_id}")
        seen.add(source_id)

def validate_source_mentions(data: list[Any]) -> None:
    seen = set()
    for index, row in enumerate(data):
        mention_id = row.get("mention_id")
        if not mention_id:
            add_error(f"source_mentions.json[{index}]: missing mention_id")
            continue
        if mention_id in seen:
            add_error(f"source_mentions.json[{index}]: duplicate mention_id: {mention_id}")
        seen.add(mention_id)
        if not row.get("source_id"):
            add_error(f"source_mentions.json[{index}]: missing source_id")
        if not row.get("mention_type"):
            add_error(f"source_mentions.json[{index}]: missing mention_type")

def validate_source_references(data: list[Any], filename: str, id_field: str, known_ids: set[str]) -> set[str]:
    ids = collect_ids(data, filename, "candidate_id")
    for index, row in enumerate(data):
        if not isinstance(row, dict):
            continue
        entity_id = row.get(id_field)
        if not entity_id:
            add_error(f"{filename}[{index}]: missing {id_field}")
        elif entity_id not in known_ids:
            add_error(f"{filename}[{index}]: unknown {id_field}: {entity_id}")
        for field in ["source_id", "source_type", "source_ref_id", "confidence"]:
            if not row.get(field):
                add_error(f"{filename}[{index}]: missing {field}")
    return ids

def validate_numbers_data(numbers_fighters: list[Any], matches: list[Any], records: list[Any], fighter_ids: set[str]) -> None:
    numbers_ids = collect_ids(numbers_fighters, 'numbers_fighters.json', 'numbers_fighter_id')
    matched_by_numbers_id = set()
    for index, row in enumerate(matches):
        if not isinstance(row, dict):
            add_error(f"numbers_name_matches.json[{index}]: expected object")
            continue
        numbers_id = require_field(row, 'numbers_name_matches.json', index, 'numbers_fighter_id')
        if numbers_id and numbers_id not in numbers_ids:
            add_error(f"numbers_name_matches.json[{index}]: unknown numbers_fighter_id: {numbers_id}")
        if numbers_id in matched_by_numbers_id:
            add_error(f"numbers_name_matches.json[{index}]: duplicate numbers_fighter_id: {numbers_id}")
        matched_by_numbers_id.add(numbers_id)
        matched_fighter_id = row.get('matched_fighter_id')
        if matched_fighter_id and matched_fighter_id not in fighter_ids:
            add_error(f"numbers_name_matches.json[{index}]: unknown matched_fighter_id: {matched_fighter_id}")
        require_field(row, 'numbers_name_matches.json', index, 'candidate_fighter_id')
        require_field(row, 'numbers_name_matches.json', index, 'match_method')

    collect_ids(records, 'numbers_fight_records.json', 'record_id')
    for index, row in enumerate(records):
        if not isinstance(row, dict):
            add_error(f"numbers_fight_records.json[{index}]: expected object")
            continue
        numbers_id = row.get('numbers_fighter_id')
        if numbers_id and numbers_id not in numbers_ids:
            add_error(f"numbers_fight_records.json[{index}]: unknown numbers_fighter_id: {numbers_id}")
        opponent_numbers_id = row.get('opponent_numbers_fighter_id')
        if opponent_numbers_id and opponent_numbers_id not in numbers_ids:
            add_error(f"numbers_fight_records.json[{index}]: unknown opponent_numbers_fighter_id: {opponent_numbers_id}")
        for field in ['matched_fighter_id', 'opponent_matched_fighter_id']:
            fighter_id = row.get(field)
            if fighter_id and fighter_id not in fighter_ids:
                add_error(f"numbers_fight_records.json[{index}]: unknown {field}: {fighter_id}")
        result = row.get('result')
        if result and result not in {'win', 'loss'}:
            add_warning(f"numbers_fight_records.json[{index}]: unusual result: {result}")

def validate_archive_data(youtube_archives: list[Any], note_archives: list[Any]) -> None:
    collect_ids(youtube_archives, 'youtube_archives.json', 'display_id')
    for index, row in enumerate(youtube_archives):
        if not isinstance(row, dict):
            add_error(f"youtube_archives.json[{index}]: expected object")
            continue
        for field in ['webpage_url', 'fulltitle', 'archived_at']:
            require_field(row, 'youtube_archives.json', index, field)
        url = row.get('webpage_url')
        if url and not str(url).startswith(('http://', 'https://')):
            add_error(f"youtube_archives.json[{index}]: invalid webpage_url: {url}")

    collect_ids(note_archives, 'note_archives.json', 'filename')
    for index, row in enumerate(note_archives):
        if not isinstance(row, dict):
            add_error(f"note_archives.json[{index}]: expected object")
            continue
        for field in ['webpage_url', 'title', 'archived_at']:
            require_field(row, 'note_archives.json', index, field)
        url = row.get('webpage_url')
        if url and not str(url).startswith(('http://', 'https://')):
            add_error(f"note_archives.json[{index}]: invalid webpage_url: {url}")

def validate_official_players(players: list[Any]) -> None:
    # Built unconditionally by build_official_json.py; consumed by the 公式 tab,
    # fighter-profile enrichment (data-enricher.js matches on `name`) and the
    # data-repository discovery of official-only fighters.
    collect_ids(players, 'official_players.json', 'id')
    for i, x in enumerate(players):
        if not isinstance(x, dict):
            continue
        require_field(x, 'official_players.json', i, 'name')

def validate_official_tournaments(tournaments: list[Any]) -> None:
    # data-enricher.js normalizes `id` to match events and renders `name`.
    collect_ids(tournaments, 'official_tournaments.json', 'id')
    for i, x in enumerate(tournaments):
        if not isinstance(x, dict):
            continue
        require_field(x, 'official_tournaments.json', i, 'name')

def validate_official_matches(matches: list[Any]) -> None:
    # tab-renderers.js shows `id` in the detail disclosure; other fields are guarded.
    collect_ids(matches, 'official_matches.json', 'id')

def validate_official_history(history: list[Any]) -> None:
    # No id column (build_official_json.py); tab-renderers.js renders `title`.
    for i, x in enumerate(history):
        if not isinstance(x, dict):
            add_error(f"official_history.json[{i}]: expected object")
            continue
        require_field(x, 'official_history.json', i, 'title')

def validate_official_news(news: list[Any]) -> None:
    # tab-renderers.js renders `title` and the slug is the primary key.
    collect_ids(news, 'official_news.json', 'slug')
    for i, x in enumerate(news):
        if not isinstance(x, dict):
            continue
        require_field(x, 'official_news.json', i, 'title')

def validate_official_pages(pages: list[Any]) -> None:
    # tab-renderers.js renders `title` and injects `body_html` as raw HTML.
    collect_ids(pages, 'official_pages.json', 'slug')
    for i, x in enumerate(pages):
        if not isinstance(x, dict):
            continue
        require_field(x, 'official_pages.json', i, 'title')
        require_field(x, 'official_pages.json', i, 'body_html')

def main() -> int:
    ERRORS.clear()
    WARNINGS.clear()
    
    # Check existence and load
    all_files = REQUIRED_JSON_FILES | {
        'article_links.json', 'titles.json', 'title_reigns.json',
        'bout_participants.json', 'fighter_snapshots.json', 'videos.json',
        'video_links.json', 'aliases.json', 'metadata.json',
        'source_documents.json', 'source_document_bodies.json', 'source_mentions.json',
        'numbers_fighters.json', 'numbers_name_matches.json',
        'numbers_fight_records.json',
        'youtube_archives.json', 'note_archives.json',
        'source_event_references.json', 'source_bout_references.json',
        'source_video_references.json'
    }
    for f in all_files:
        validate_json_exists(f)
    
    articles = load_json('articles.json', [])
    promotions = load_json('promotions.json', [])
    events = load_json('events.json', [])
    bouts = load_json('bouts.json', [])
    bout_participants = load_json('bout_participants.json', [])
    fighters = load_json('fighters.json', [])
    titles = load_json('titles.json', [])
    title_reigns = load_json('title_reigns.json', [])
    snapshots = load_json('fighter_snapshots.json', [])
    videos = load_json('videos.json', [])
    video_links = load_json('video_links.json', [])
    article_links = load_json('article_links.json', [])
    aliases = load_json('aliases.json', {})
    numbers_fighters = load_json('numbers_fighters.json', [])
    numbers_name_matches = load_json('numbers_name_matches.json', [])
    numbers_fight_records = load_json('numbers_fight_records.json', [])
    youtube_archives = load_json('youtube_archives.json', [])
    note_archives = load_json('note_archives.json', [])
    official_players = load_json('official_players.json', [])
    official_tournaments = load_json('official_tournaments.json', [])
    official_matches = load_json('official_matches.json', [])
    official_history = load_json('official_history.json', [])
    official_news = load_json('official_news.json', [])
    official_pages = load_json('official_pages.json', [])

    # 以降は依存順に検証する。各バリデータが返す *_ids 集合を後続の参照整合性
    # チェックへ渡すため、この呼び出し順 (article→promotion→event→fighter→bout…)
    # を入れ替えると未定義 ID 集合を参照して壊れる。
    article_ids = validate_articles(articles)
    promotion_ids = validate_promotions(promotions, article_ids)
    event_ids = validate_events(events, promotion_ids, article_ids)
    fighter_ids = validate_fighters(fighters, promotion_ids, article_ids)
    bout_ids = validate_bouts(bouts, event_ids, promotion_ids, fighter_ids, article_ids)
    title_ids = collect_ids(titles, 'titles.json', 'title_id')
    video_ids = validate_videos(videos, article_ids)
    snapshot_ids = collect_ids(snapshots, 'fighter_snapshots.json', 'snapshot_id')
    reign_ids = validate_title_reigns(title_reigns, title_ids, fighter_ids, event_ids, article_ids, video_ids)
    
    validate_titles(titles, promotion_ids, fighter_ids, article_ids, video_ids)
    validate_bout_participants(bout_participants, bout_ids, fighter_ids)
    validate_fighter_snapshots(snapshots, fighter_ids, event_ids, article_ids, promotion_ids)
    validate_video_links(video_links, video_ids, event_ids, bout_ids, fighter_ids, promotion_ids, title_ids)
    validate_article_links(article_links, article_ids, event_ids, bout_ids, fighter_ids, snapshot_ids, promotion_ids, title_ids, reign_ids, video_ids)
    validate_source_documents(load_json('source_documents.json', []))
    validate_source_document_bodies(load_json('source_document_bodies.json', []))
    validate_source_mentions(load_json('source_mentions.json', []))
    validate_source_references(load_json('source_event_references.json', []), 'source_event_references.json', 'event_id', event_ids)
    validate_source_references(load_json('source_bout_references.json', []), 'source_bout_references.json', 'bout_id', bout_ids)
    validate_source_references(load_json('source_video_references.json', []), 'source_video_references.json', 'video_id', video_ids)
    validate_aliases(aliases)
    validate_numbers_data(numbers_fighters, numbers_name_matches, numbers_fight_records, fighter_ids)
    validate_archive_data(youtube_archives, note_archives)
    validate_official_players(official_players)
    validate_official_tournaments(official_tournaments)
    validate_official_matches(official_matches)
    validate_official_history(official_history)
    validate_official_news(official_news)
    validate_official_pages(official_pages)

    for w in WARNINGS:
        print(f"WARNING: {w}", file=sys.stderr)
    for e in ERRORS:
        print(f"ERROR: {e}", file=sys.stderr)
        
    if ERRORS:
        print(f"json validation failed: {len(ERRORS)} error(s), {len(WARNINGS)} warning(s)", file=sys.stderr)
        return 1
    print(f"json validation passed: {len(WARNINGS)} warning(s)")
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
