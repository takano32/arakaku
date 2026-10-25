from __future__ import annotations

import csv

import pytest

from conftest import load_module


def rows(repo_root, name):
    with (repo_root / 'data-src' / name).open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


@pytest.fixture
def generate_articles(repo_root):
    return load_module('generate_articles', repo_root / 'scripts' / 'generate_articles.py')


def test_card_notes_are_recognised_from_their_opening(generate_articles):
    card = '第5回MAXバウトミドル級ＧＰ 1回戦Aグループ  🚨①名前②キャッチコピー'
    assert generate_articles.classify_article('note-x.html', '第5回MAXバウトミドル級ＧＰ一回戦Aグループ｜アラカク通信のーと', card)[0] == 'event_card'
    assert generate_articles.classify_article('note-y.html', 'ターゲットNo.87 試合結果', '○A🆚●B')[0] == 'event_result'
    assert generate_articles.classify_article('note-z.html', 'おめでとうございます', '誕生日です')[0] == 'note_article'


@pytest.fixture
def archive_metadata(repo_root):
    return load_module('archive_metadata', repo_root / 'scripts' / 'archive_metadata.py')


def test_note_publish_date_comes_from_json_ld(archive_metadata):
    html = '<title>T｜アラカク通信のーと</title><script>{"datePublished":"2026-07-31T09:42:15.000+09:00"}</script>'
    assert archive_metadata.parse_note_metadata(html)['published_at'] == '2026-07-31'
    assert archive_metadata.parse_note_metadata('<title>x</title>')['published_at'] == ''


def event_note_dates(repo_root):
    articles = {a['article_id']: a for a in rows(repo_root, 'articles.csv')}
    result, first = {}, {}
    for link in rows(repo_root, 'article_links.csv'):
        a = articles.get(link['article_id'], {})
        if link['entity_type'] != 'event' or not a.get('published_at'):
            continue
        d = a['published_at']
        if a['article_type'] == 'event_result' and d < result.get(link['entity_id'], '9999'):
            result[link['entity_id']] = d
        if d < first.get(link['entity_id'], '9999'):
            first[link['entity_id']] = d
    return result, first


def test_events_csv_is_ordered_by_note_dates(repo_root):
    result, first = event_note_dates(repo_root)
    keys = [(result.get(e['event_id']) or first.get(e['event_id']) or e['published_at'] or '0000-00-00', e['event_id'])
            for e in rows(repo_root, 'events.csv')]
    assert keys == sorted(keys)


def test_events_json_dates_follow_the_notes(repo_root, docs_data, json_file):
    result, first = event_note_dates(repo_root)
    for e in json_file(docs_data / 'events.json'):
        assert e['result_published_at'] == result.get(e['event_id'])
        assert e['note_published_at'] == first.get(e['event_id'])


def test_video_link_status_follows_the_link_tables(repo_root, docs_data, json_file):
    linked = ({b['inferred_from_video_id'] for b in rows(repo_root, 'bouts.csv') if b['inferred_from_video_id']}
              | {r['video_id'] for r in rows(repo_root, 'video_bout_links.csv')}
              | {r['video_id'] for r in rows(repo_root, 'video_links.csv')})
    for v in json_file(docs_data / 'videos.json'):
        assert v['link_status'] == ('linked' if v['video_id'] in linked else 'unlinked')
