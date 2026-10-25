from __future__ import annotations

import pytest

from conftest import load_module


@pytest.fixture
def crawler(repo_root):
    return load_module('crawl_note_articles', repo_root / 'scripts' / 'crawl_note_articles.py')


def test_invalid_api_json_is_a_failure_not_the_end_of_the_list(crawler):
    with pytest.raises(crawler.FetchFailed):
        crawler.parse_json_notes('<html>rate limited</html>')


def test_api_fetch_error_raises(crawler, monkeypatch):
    def boom(url, sleep=0.5):
        raise OSError('network down')
    monkeypatch.setattr(crawler, 'fetch_text', boom)
    with pytest.raises(crawler.FetchFailed):
        crawler.crawl_note_api_pages('xyz1090', 3, 0)


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
def discover(repo_root):
    return load_module('discover_youtube_videos', repo_root / 'scripts' / 'discover_youtube_videos.py')


def test_shorts_and_types(discover):
    assert discover.is_short('KOシーン！！#shorts', 30)
    assert discover.is_short('#アラカク #格闘技', 45)
    assert not discover.is_short('Full Fight！ターゲットNo.104', 900)
    assert discover.classify_video_type('【ブルーワンvsイスカン・アステ】…フルファイト！！') == 'full_fight'
    assert discover.classify_video_type('第7回MAXバウトライト級GP一回戦ダイジェスト') == 'highlight'
