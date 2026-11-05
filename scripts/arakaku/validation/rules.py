# 役割: 単一エンティティの構造に収まらない規則。ラウンド/タイムの形式、列挙値、表をまたぐ矛盾
#   (試合と大会の団体、別名の参照先、出典言及の出典、王座の喪失大会と次の獲得大会)、タイトル戦の
#   王座、日付の形式。
# アーキ上の位置: round_time_problems は entities.validate_bouts からも呼ばれる純粋関数。
#   それ以外は runner.py が呼ぶ。
# 不変条件: 各規則は追加時に実データで成立していた (T.65 / T.69 / T.76 / T.77 / T.95)。
#   違反は本物の不整合なので error。
# 関連スキル: .agents/skills/arakaku-maintainer (make validate)。
from __future__ import annotations

import re
from typing import Any

from .report import Report
from .vocab import (
    VALID_ARTICLE_STATUSES,
    VALID_ARTICLE_TYPES,
    VALID_BOUT_TYPES,
    VALID_EVENT_TYPES,
    VALID_INFERRED_CONFIDENCES,
    VALID_MENTION_TYPES,
    VALID_METHODS,
    VALID_NAME_MATCH_METHODS,
    VALID_SIDES,
)

# bouts.csv: round is "<n>R" (built as an int); time is "<m>分<s>秒" within a 5-minute round,
# or "終了" for a stop or decision at the end of the round. A time without a round is a mistake
# (T.65 found note posting timestamps such as 07分51秒 stored as fight times).
BOUT_TIME = re.compile(r'^(\d{1,2})分(\d{2})秒$')  # seconds are zero-padded: 3分04秒 (T.95)


def round_time_problems(round_value: Any, time_value: Any) -> list[str]:
    problems = []
    if round_value not in (None, '') and not (isinstance(round_value, int) and 1 <= round_value <= 5):
        problems.append(f"result.round must be an integer from 1 to 5: {round_value!r}")
    if time_value in (None, ''):
        return problems
    m = BOUT_TIME.match(time_value) if isinstance(time_value, str) else None
    if time_value != '終了' and not (m and int(m.group(2)) < 60 and int(m.group(1)) * 60 + int(m.group(2)) <= 300):
        problems.append(f"result.time must be like 3分04秒 (5:00 or less) or 終了: {time_value!r}")
    if round_value in (None, ''):
        problems.append(f"result.time without result.round: {time_value!r}")
    return problems


def check_enum(report: Report, items: list[Any], filename: str, field: str, allowed: set[str], id_field: str) -> None:
    # Empty values are allowed; a value outside the vocabulary is an error (a typo must not ship).
    for i, x in enumerate(items):
        if not isinstance(x, dict):
            continue
        value = x.get(field)
        if value not in (None, '') and value not in allowed:
            report.error(f"{filename}[{i}] ({x.get(id_field)}): unknown {field}: {value}")


def validate_enums(report: Report, data: dict[str, list[Any]]) -> None:
    check_enum(report, data['bouts'], 'bouts.json', 'bout_type', VALID_BOUT_TYPES, 'bout_id')
    check_enum(report, data['bouts'], 'bouts.json', 'inferred_confidence', VALID_INFERRED_CONFIDENCES, 'bout_id')
    check_enum(report, data['events'], 'events.json', 'event_type', VALID_EVENT_TYPES, 'event_id')
    check_enum(report, data['events'], 'events.json', 'inferred_confidence', VALID_INFERRED_CONFIDENCES, 'event_id')
    check_enum(report, data['fighters'], 'fighters.json', 'inferred_confidence', VALID_INFERRED_CONFIDENCES, 'fighter_id')
    check_enum(report, data['bout_participants'], 'bout_participants.json', 'side', VALID_SIDES, 'participant_id')
    check_enum(report, data['source_mentions'], 'source_mentions.json', 'mention_type', VALID_MENTION_TYPES, 'mention_id')
    check_enum(report, data['numbers_name_matches'], 'numbers_name_matches.json', 'match_method', VALID_NAME_MATCH_METHODS, 'numbers_fighter_id')
    check_enum(report, data['articles'], 'articles.json', 'status', VALID_ARTICLE_STATUSES, 'article_id')
    # 以前は entities.validate_articles が ID の無い形のメッセージで調べていた (T.112.6.18)。
    check_enum(report, data['articles'], 'articles.json', 'article_type', VALID_ARTICLE_TYPES, 'article_id')


def validate_cross_tables(report: Report, bouts: list[Any], events: list[Any], aliases: Any, fighter_ids: set[str], promotion_ids: set[str], title_reigns: list[Any], source_mentions: list[Any], source_documents: list[Any]) -> None:
    # Rules that span tables (T.69). Each held on the data when added; a violation is a real inconsistency.
    event_promotion = {e.get('event_id'): e.get('promotion_id') for e in events if isinstance(e, dict)}
    for i, b in enumerate(bouts):
        if isinstance(b, dict) and b.get('event_id') in event_promotion and b.get('promotion_id') != event_promotion[b.get('event_id')]:
            report.error(f"bouts.json[{i}] ({b.get('bout_id')}): promotion_id {b.get('promotion_id')} differs from its event {b.get('event_id')} ({event_promotion[b.get('event_id')]})")
    if isinstance(aliases, dict):
        targets = {'fighters': fighter_ids, 'promotions': promotion_ids}
        for alias_type, mapping in aliases.items():
            if not isinstance(mapping, dict):
                continue
            for alias, canonical_id in mapping.items():
                if alias_type in targets and canonical_id not in targets[alias_type]:
                    report.error(f"aliases.json[{alias_type}][{alias}]: unknown canonical_id: {canonical_id}")
                if alias_type == 'methods' and str(canonical_id).split('_')[0] not in VALID_METHODS:
                    report.error(f"aliases.json[methods][{alias}]: canonical_id does not start with a known method: {canonical_id}")
    source_ids = {d.get('source_id') for d in source_documents if isinstance(d, dict)}
    for i, m in enumerate(source_mentions):
        if isinstance(m, dict) and m.get('source_id') and m.get('source_id') not in source_ids:
            report.error(f"source_mentions.json[{i}] ({m.get('mention_id')}): unknown source_id: {m.get('source_id')}")
    # Within one title, the event where a reign ended must be the event where the next reign began.
    by_title: dict[str, list[dict[str, Any]]] = {}
    for r in title_reigns:
        if isinstance(r, dict) and str(r.get('reign_order') or '').isdigit():
            by_title.setdefault(r.get('title_id'), []).append(r)
    for title_id, reigns in by_title.items():
        reigns.sort(key=lambda r: int(r['reign_order']))
        for prev, nxt in zip(reigns, reigns[1:]):
            lost, won = prev.get('lost_at_event_id'), nxt.get('won_at_event_id')
            if lost and won and lost != won:
                report.error(f"title_reigns.json ({title_id}): reign {prev['reign_order']} ended at {lost} but reign {nxt['reign_order']} began at {won}")


def validate_bout_titles(report: Report, bouts: list[Any], titles: list[Any]) -> None:
    # A title bout names the title it was for (T.76); the title must exist and match the bout's
    # promotion and division. title_result is not stored: title_reigns.csv holds the lineage.
    by_id = {t.get('title_id'): t for t in titles if isinstance(t, dict)}
    for i, b in enumerate(bouts):
        if not isinstance(b, dict):
            continue
        title = b.get('title') or {}
        title_id = title.get('title_id') if isinstance(title, dict) else None
        if title.get('is_title_bout') and not title_id:
            report.error(f"bouts.json[{i}] ({b.get('bout_id')}): title bout has no title_id")
        if not title_id:
            continue
        t = by_id.get(title_id)
        if t is None:
            report.error(f"bouts.json[{i}] ({b.get('bout_id')}): unknown title_id: {title_id}")
        elif t.get('promotion_id') != b.get('promotion_id') or t.get('division') != b.get('division'):
            report.error(f"bouts.json[{i}] ({b.get('bout_id')}): title {title_id} is {t.get('promotion_id')} {t.get('division')}, bout is {b.get('promotion_id')} {b.get('division')}")


# Date formats per field (T.77): note dates and derived event dates are YYYY-MM-DD; YouTube
# upload dates keep the API archive's YYYYMMDD. Anything else is a mistake, not a variant.
ISO_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
YYYYMMDD = re.compile(r'^\d{8}$')


def validate_dates(report: Report, articles: list[Any], events: list[Any], source_documents: list[Any]) -> None:
    for filename, items, id_field, fields in (
        ('articles.json', articles, 'article_id', ('published_at',)),
        ('events.json', events, 'event_id', ('published_at', 'result_published_at', 'note_published_at')),
    ):
        for i, x in enumerate(items):
            for field in fields:
                value = x.get(field) if isinstance(x, dict) else None
                if value and not ISO_DATE.match(str(value)):
                    report.error(f"{filename}[{i}] ({x.get(id_field)}): {field} must be YYYY-MM-DD: {value}")
    for i, d in enumerate(source_documents):
        value = d.get('published_at') if isinstance(d, dict) else None
        if not value:
            continue
        pattern = YYYYMMDD if d.get('source_type') == 'youtube_description' else ISO_DATE
        if not pattern.match(str(value)):
            report.error(f"source_documents.json[{i}] ({d.get('source_id')}): published_at has the wrong format for {d.get('source_type')}: {value}")
