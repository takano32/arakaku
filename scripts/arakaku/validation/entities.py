# 役割: エンティティ JSON (articles / promotions / events / fighters / bouts / bout_participants /
#   titles / title_reigns / fighter_snapshots / videos) の構造・必須フィールド・参照整合性の検証。
# アーキ上の位置: runner.py が依存順 (article→promotion→event→fighter→bout…) に呼び、各関数が返す
#   *_ids 集合を後段の参照チェックに渡す。
# 不変条件: 列挙値の範囲外は error (arakaku/validation/vocab.py に無い値。T69 で warning から変更)。
#   result_status 未指定時は winner(_id) の有無から known/unknown を推定する。
# 関連スキル: .agents/skills/arakaku-maintainer (make validate)。
from __future__ import annotations

from typing import Any

from .common import collect_ids, is_http_url, require_field
from .report import Report
from .rules import round_time_problems
from .vocab import VALID_METHODS, VALID_VIDEO_LINK_STATUSES, VALID_VIDEO_TYPES


def validate_articles(report: Report, articles: list[Any]) -> set[str]:
    ids = collect_ids(report, articles, 'articles.json', 'article_id')
    for i, x in enumerate(articles):
        if isinstance(x, dict):
            require_field(report, x, 'articles.json', i, 'title')
            url = require_field(report, x, 'articles.json', i, 'url')
            if url and not is_http_url(url):
                report.error(f"articles.json[{i}]: invalid url: {url}")
    return ids


def validate_promotions(report: Report, promotions: list[Any], article_ids: set[str]) -> set[str]:
    ids = collect_ids(report, promotions, 'promotions.json', 'promotion_id')
    for i, x in enumerate(promotions):
        if not isinstance(x, dict):
            continue
        require_field(report, x, 'promotions.json', i, 'name')
        for aid in x.get('source_article_ids') or []:
            if aid not in article_ids:
                report.error(f"promotions.json[{i}]: unknown article reference: {aid}")
    return ids


def validate_events(report: Report, events: list[Any], promotion_ids: set[str], article_ids: set[str]) -> set[str]:
    ids = collect_ids(report, events, 'events.json', 'event_id')
    for i, x in enumerate(events):
        if not isinstance(x, dict):
            continue
        require_field(report, x, 'events.json', i, 'name')
        pid = require_field(report, x, 'events.json', i, 'promotion_id')
        if pid and pid not in promotion_ids:
            report.error(f"events.json[{i}]: unknown promotion reference: {pid}")
        aid = x.get('source_article_id')
        if aid and aid not in article_ids:
            report.error(f"events.json[{i}]: unknown article reference: {aid}")
    return ids


def validate_fighters(report: Report, fighters: list[Any], promotion_ids: set[str], article_ids: set[str]) -> set[str]:
    ids = collect_ids(report, fighters, 'fighters.json', 'fighter_id')
    for i, x in enumerate(fighters):
        if not isinstance(x, dict):
            continue
        require_field(report, x, 'fighters.json', i, 'display_name')
        pid = x.get('main_promotion_id')
        if pid and pid not in promotion_ids:
            report.error(f"fighters.json[{i}]: unknown promotion reference: {pid}")
        for aid in x.get('source_article_ids') or []:
            if aid not in article_ids:
                report.error(f"fighters.json[{i}]: unknown article reference: {aid}")
    return ids


def _result_status(bout: dict[str, Any]) -> str:
    # result_status 未指定時は winner(_id) の有無から known/unknown を推定する。
    return bout.get('result_status') or ('known' if bout.get('winner_id') or bout.get('winner') else 'unknown')


def validate_bouts(report: Report, bouts: list[Any], event_ids: set[str], promotion_ids: set[str], fighter_ids: set[str], article_ids: set[str]) -> set[str]:
    ids = collect_ids(report, bouts, 'bouts.json', 'bout_id')
    for i, x in enumerate(bouts):
        if not isinstance(x, dict):
            continue
        eid = require_field(report, x, 'bouts.json', i, 'event_id')
        pid = require_field(report, x, 'bouts.json', i, 'promotion_id')
        if eid and eid not in event_ids:
            report.error(f"bouts.json[{i}]: unknown event reference: {eid}")
        if pid and pid not in promotion_ids:
            report.error(f"bouts.json[{i}]: unknown promotion reference: {pid}")
        fs = x.get('fighters')
        if not isinstance(fs, list) or len(fs) != 2:
            report.error(f"bouts.json[{i}]: fighters must be a list of two fighters")
        else:
            names = set()
            results = []
            for j, f in enumerate(fs):
                fid = f.get('fighter_id')
                name = f.get('name')
                results.append(f.get('result'))
                names.add(name)
                if fid and fid not in fighter_ids:
                    report.error(f"bouts.json[{i}].fighters[{j}]: unknown fighter reference: {fid}")
                if not name:
                    report.error(f"bouts.json[{i}].fighters[{j}]: missing name")
            if len(names) != 2:
                report.error(f"bouts.json[{i}]: fighter names must be distinct")
            result_status = _result_status(x)
            if result_status == 'known' and sorted(results) != ['loss', 'win']:
                report.error(f"bouts.json[{i}]: known-result fighters must have exactly one win and one loss")
            if result_status == 'unknown' and any(r not in ('unknown', None, '') for r in results):
                report.error(f"bouts.json[{i}]: unknown-result fighters must not have win/loss results")
        for key in ['winner_id', 'loser_id']:
            fid = x.get(key)
            if fid and fid not in fighter_ids:
                report.error(f"bouts.json[{i}]: unknown fighter reference in {key}: {fid}")
        result_status = _result_status(x)
        if result_status not in {'known', 'unknown'}:
            report.error(f"bouts.json[{i}]: unusual result_status: {result_status}")
        if result_status == 'known' and not (x.get('winner_id') or x.get('winner')):
            report.error(f"bouts.json[{i}]: known-result bout is missing winner")
        if x.get('winner') and x.get('winner') == x.get('loser'):
            report.error(f"bouts.json[{i}]: winner and loser are the same: {x.get('winner')}")
        result = x.get('result') or {}
        method = result.get('method_normalized') if isinstance(result, dict) else None
        if method and method not in VALID_METHODS:
            report.error(f"bouts.json[{i}]: unusual method_normalized: {method}")
        if isinstance(result, dict):
            for problem in round_time_problems(result.get('round'), result.get('time')):
                report.error(f"bouts.json[{i}] ({x.get('bout_id')}): {problem}")
        aid = x.get('source_article_id')
        if aid and aid not in article_ids:
            report.error(f"bouts.json[{i}]: unknown article reference: {aid}")
    return ids


def validate_bout_participants(report: Report, participants: list[Any], bout_ids: set[str], fighter_ids: set[str]) -> set[str]:
    ids = collect_ids(report, participants, 'bout_participants.json', 'participant_id')
    by_bout: dict[str, list[dict[str, Any]]] = {}
    for i, x in enumerate(participants):
        if not isinstance(x, dict):
            continue
        bout_id = require_field(report, x, 'bout_participants.json', i, 'bout_id')
        if bout_id and bout_id not in bout_ids:
            report.error(f"bout_participants.json[{i}]: unknown bout reference: {bout_id}")
        fid = x.get('fighter_id')
        if fid and fid not in fighter_ids:
            report.error(f"bout_participants.json[{i}]: unknown fighter reference: {fid}")
        require_field(report, x, 'bout_participants.json', i, 'fighter_name')
        result = x.get('result')
        if result and result not in {'win', 'loss', 'draw', 'nc', 'unknown'}:
            report.error(f"bout_participants.json[{i}]: unusual result: {result}")
        if bout_id:
            by_bout.setdefault(bout_id, []).append(x)
    for bout_id, rows in by_bout.items():
        if len(rows) != 2:
            report.error(f"bout_participants.json: bout {bout_id} must have exactly two participants")
        sides = [row.get('side') for row in rows]
        if len(set(sides)) != len(sides):
            report.error(f"bout_participants.json: bout {bout_id} has duplicate participant side")
    return ids


def validate_titles(report: Report, titles: list[Any], promotion_ids: set[str], fighter_ids: set[str], article_ids: set[str], video_ids: set[str] | None = None) -> set[str]:
    title_ids = collect_ids(report, titles, 'titles.json', 'title_id')
    for i, x in enumerate(titles):
        if not isinstance(x, dict):
            continue
        pid = x.get('promotion_id')
        if pid and pid not in promotion_ids:
            report.error(f"titles.json[{i}]: unknown promotion reference: {pid}")
        for j, r in enumerate(x.get('lineage') or []):
            fid = r.get('fighter_id')
            aid = r.get('source_article_id')
            vid = r.get('source_video_id')
            if fid and fid not in fighter_ids:
                report.error(f"titles.json[{i}].lineage[{j}]: unknown fighter reference: {fid}")
            if aid and aid not in article_ids:
                report.error(f"titles.json[{i}].lineage[{j}]: unknown article reference: {aid}")
            if vid and video_ids is not None and vid not in video_ids:
                report.error(f"titles.json[{i}].lineage[{j}]: unknown video reference: {vid}")
    return title_ids


def validate_title_reigns(report: Report, reigns: list[Any], title_ids: set[str], fighter_ids: set[str], event_ids: set[str], article_ids: set[str], video_ids: set[str]) -> set[str]:
    ids = collect_ids(report, reigns, 'title_reigns.json', 'reign_id')
    seen_order = set()
    for i, x in enumerate(reigns):
        if not isinstance(x, dict):
            continue
        title_id = require_field(report, x, 'title_reigns.json', i, 'title_id')
        if title_id and title_id not in title_ids:
            report.error(f"title_reigns.json[{i}]: unknown title reference: {title_id}")
        order = require_field(report, x, 'title_reigns.json', i, 'reign_order')
        if order and not str(order).isdigit():
            report.error(f"title_reigns.json[{i}]: reign_order is not a number: {order}")
        marker = (title_id, order)
        if marker in seen_order:
            report.error(f"title_reigns.json[{i}]: duplicate title/reign_order: {marker}")
        seen_order.add(marker)
        fid = x.get('fighter_id')
        if fid and fid not in fighter_ids:
            report.error(f"title_reigns.json[{i}]: unknown fighter reference: {fid}")
        for key in ['won_at_event_id', 'lost_at_event_id']:
            eid = x.get(key)
            if eid and eid not in event_ids:
                report.error(f"title_reigns.json[{i}]: unknown event reference in {key}: {eid}")
        end_reason = x.get('end_reason')
        if end_reason not in (None, '', 'vacated'):
            report.error(f"title_reigns.json[{i}]: unknown end_reason: {end_reason}")
        if end_reason == 'vacated' and x.get('lost_at_event_id'):
            report.error(f"title_reigns.json[{i}]: vacated reign must not have lost_at_event_id")
        aid = x.get('source_article_id')
        if aid and aid not in article_ids:
            report.error(f"title_reigns.json[{i}]: unknown article reference: {aid}")
        vid = x.get('source_video_id')
        if vid and vid not in video_ids:
            report.error(f"title_reigns.json[{i}]: unknown video reference: {vid}")
    return ids


def validate_fighter_snapshots(report: Report, snapshots: list[Any], fighter_ids: set[str], event_ids: set[str], article_ids: set[str], promotion_ids: set[str], official_news_slugs: set[str] | None = None) -> set[str]:
    snapshot_ids = collect_ids(report, snapshots, 'fighter_snapshots.json', 'snapshot_id')
    for i, x in enumerate(snapshots):
        if not isinstance(x, dict):
            continue
        for key, ids, name in [('fighter_id', fighter_ids, 'fighter'), ('event_id', event_ids, 'event'), ('source_article_id', article_ids, 'article'), ('main_promotion_id', promotion_ids, 'promotion')]:
            v = x.get(key)
            if v and v not in ids:
                report.error(f"fighter_snapshots.json[{i}]: unknown {name} reference: {v}")
        source_type, _, source_ref = (x.get('source_id') or '').partition(':')
        if source_type not in ('note', 'official_news') or not source_ref:
            report.error(f"fighter_snapshots.json[{i}]: source_id must be note:<article_id> or official_news:<slug>: {x.get('source_id')}")
        elif source_type == 'note' and source_ref not in article_ids:
            report.error(f"fighter_snapshots.json[{i}]: unknown article reference in source_id: {source_ref}")
        elif source_type == 'official_news' and official_news_slugs is not None and source_ref not in official_news_slugs:
            report.error(f"fighter_snapshots.json[{i}]: unknown official news reference in source_id: {source_ref}")
    return snapshot_ids


def validate_videos(report: Report, videos: list[Any], article_ids: set[str]) -> set[str]:
    ids = collect_ids(report, videos, 'videos.json', 'video_id')
    seen_platform_ids = set()
    for i, x in enumerate(videos):
        if not isinstance(x, dict):
            continue
        platform = require_field(report, x, 'videos.json', i, 'platform')
        platform_video_id = x.get('platform_video_id')
        url = require_field(report, x, 'videos.json', i, 'url')
        require_field(report, x, 'videos.json', i, 'title')
        if url and not is_http_url(url):
            report.error(f"videos.json[{i}]: invalid url: {url}")
        if platform and platform_video_id:
            key = (platform, platform_video_id)
            if key in seen_platform_ids:
                report.error(f"videos.json[{i}]: duplicate platform/platform_video_id: {platform}/{platform_video_id}")
            seen_platform_ids.add(key)
        video_type = x.get('video_type')
        if video_type and video_type not in VALID_VIDEO_TYPES:
            report.error(f"videos.json[{i}]: unusual video_type: {video_type}")
        link_status = x.get('link_status')
        if link_status and link_status not in VALID_VIDEO_LINK_STATUSES:
            report.error(f"videos.json[{i}]: unusual link_status: {link_status}")
        for aid in x.get('source_article_ids') or []:
            if aid not in article_ids:
                report.error(f"videos.json[{i}]: unknown article reference: {aid}")
    return ids
