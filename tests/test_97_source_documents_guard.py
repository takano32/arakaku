from __future__ import annotations

import pytest


@pytest.fixture
def script(load_script, monkeypatch):
    module = load_script('build_source_documents')
    writes = []
    monkeypatch.setattr(module, 'read_csv', lambda *a, **k: [])
    monkeypatch.setattr(module, 'iter_cached_videos', lambda cache_dir: [])
    monkeypatch.setattr(module, 'write_csv', lambda path, fields, rows: writes.append(path.name))
    module.writes = writes
    return module


def doc(source_type):
    return {'source_id': f'{source_type}:x', 'source_type': source_type, 'published_at': '', 'content_text': ''}


def test_refuses_to_overwrite_when_note_cache_is_missing(script, monkeypatch):
    # tmp/ が空の clone で走らせても、本文 DB を空で上書きしない (T.112.4.1)。
    monkeypatch.setattr(script, 'note_documents', lambda *a: [])
    monkeypatch.setattr(script, 'youtube_documents', lambda *a: [doc('youtube_description')])
    with pytest.raises(SystemExit, match='no cached note sources'):
        script.main()
    assert script.writes == []


def test_refuses_when_both_caches_are_missing(script, monkeypatch):
    monkeypatch.setattr(script, 'note_documents', lambda *a: [])
    monkeypatch.setattr(script, 'youtube_documents', lambda *a: [])
    with pytest.raises(SystemExit, match='note / YouTube'):
        script.main()
    assert script.writes == []


def test_writes_when_both_kinds_are_present(script, monkeypatch):
    monkeypatch.setattr(script, 'note_documents', lambda *a: [doc('note_article')])
    monkeypatch.setattr(script, 'youtube_documents', lambda *a: [doc('youtube_description')])
    monkeypatch.setattr(script, 'keep_unchanged_fetched_at', lambda docs, prev: None)
    monkeypatch.setattr(script, 'extract_mentions', lambda d: [])
    monkeypatch.setattr(script, 'document_sort_key', lambda d: d['source_id'])
    assert script.main() == 0
    assert script.writes == ['source_documents.csv', 'source_mentions.csv']
