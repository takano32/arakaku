from __future__ import annotations

import pytest


@pytest.fixture
def crawler():
    import arakaku.notes.crawl

    return arakaku.notes.crawl


def test_invalid_api_json_is_a_failure_not_the_end_of_the_list(crawler):
    with pytest.raises(crawler.FetchFailed, match='invalid JSON'):
        crawler.parse_json_notes('<html>rate limited</html>')


def test_api_fetch_error_raises(crawler):
    def boom(url, sleep=0.5):
        raise OSError('network down')
    with pytest.raises(crawler.FetchFailed, match='api fetch failed: .*network down'):
        crawler.crawl_note_api_pages('xyz1090', 3, 0, fetch=boom)


def test_only_note_article_keys_become_rows(crawler):
    assert crawler.row_from_note_object({'key': 'n1234567890ab', 'name': 'ターゲットNo.105対戦カード'})['url'].endswith('/n/n1234567890ab')
    assert crawler.row_from_note_object({'key': 'f6726af1becf4b6ba8050777b7e118b3', 'name': 'x'}) is None


def test_merge_articles_keeps_existing_rows(crawler):
    existing = [{'article_id': 'note-a', 'url': 'https://note.com/xyz1090/n/na0000000000a', 'title': 'old'}]
    discovered = [{'article_id': 'note-a', 'url': 'https://note.com/xyz1090/n/na0000000000a', 'title': 'new'},
                  {'article_id': 'note-b', 'url': 'https://note.com/xyz1090/n/nb0000000000b', 'title': 'b'}]
    merged, added = crawler.merge_articles(existing, discovered)
    assert [r['title'] for r in merged] == ['old', 'b'] and [r['article_id'] for r in added] == ['note-b']


@pytest.fixture
def youtube():
    import arakaku.youtube

    return arakaku.youtube


@pytest.fixture
def discover(load_script, monkeypatch):
    # T.112.6.7: 以前は import するだけで何も確かめていなかった。API の呼び出しを差し替えて main を通す。
    module = load_script('discover_youtube_videos')
    writes = []
    monkeypatch.setenv('YOUTUBE_API_KEY', 'test-key')
    monkeypatch.setattr(module, 'read_csv', lambda path: [{'video_id': 'youtube_known', 'platform_video_id': 'known'}])
    monkeypatch.setattr(module, 'uploads', lambda key, handle: [
        {'id': 'known', 'title': 'old', 'published_at': '2020-01-01'},
        {'id': 'NewB', 'title': 'Full Fight！ターゲットNo.104', 'published_at': '2026-02-01'},
        {'id': 'NewA', 'title': '試合配信', 'published_at': '2026-01-01'},
        {'id': 'Short1', 'title': 'KO #shorts', 'published_at': '2026-03-01'},
    ])
    monkeypatch.setattr(module, 'durations', lambda key, ids: {'NewA': 3600, 'NewB': 900, 'Short1': 30})
    monkeypatch.setattr(module, 'write_csv', lambda path, fields, rows: writes.append(rows))
    module.writes = writes
    return module


def test_discover_appends_new_videos_oldest_first_without_shorts(discover, monkeypatch):
    monkeypatch.setattr('sys.argv', ['discover_youtube_videos.py'])
    assert discover.main() == 0
    [rows] = discover.writes
    assert [r['video_id'] for r in rows] == ['youtube_known', 'youtube_newa', 'youtube_newb']
    assert [r['video_type'] for r in rows[1:]] == ['stream_archive', 'full_fight']


def test_discover_dry_run_does_not_write(discover, monkeypatch):
    monkeypatch.setattr('sys.argv', ['discover_youtube_videos.py', '--dry-run', '--include-shorts'])
    assert discover.main() == 0
    assert discover.writes == []


def test_discover_needs_an_api_key(discover, monkeypatch):
    monkeypatch.delenv('YOUTUBE_API_KEY')
    monkeypatch.setattr('sys.argv', ['discover_youtube_videos.py'])
    assert discover.main() == 1


def test_shorts_and_types(youtube):
    assert youtube.is_short('KOシーン！！#shorts', 30)
    assert youtube.is_short('#アラカク #格闘技', 45)
    assert not youtube.is_short('Full Fight！ターゲットNo.104', 900)
    assert youtube.classify_video_type('【ブルーワンvsイスカン・アステ】…フルファイト！！') == 'full_fight'
    assert youtube.classify_video_type('第7回MAXバウトライト級GP一回戦ダイジェスト') == 'highlight'
