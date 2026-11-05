"""arakaku/sources/ (documents・mentions・archives) の単体テスト。小さい手書きの行と tmp_path のキャッシュで確かめる。"""
from __future__ import annotations

from pathlib import Path

from arakaku.notes.cache import note_cache_name
from arakaku.sources.archives import archived_at_for, note_archive_row, youtube_archive_row
from arakaku.sources.documents import keep_unchanged_fetched_at, note_documents, sha256_text, youtube_document, youtube_documents
from arakaku.sources.mentions import extract_mentions

NOTE_HTML = """<html><head><title>T</title></head><body>
<div data-name="body" id="note-body"><p>A選手 🆚 B選手</p></div></body></html>"""


def test_keep_unchanged_fetched_at_only_when_the_hash_is_the_same():
    documents = [
        {"source_id": "a", "content_hash": "h1", "fetched_at": "new"},
        {"source_id": "b", "content_hash": "h2", "fetched_at": "new"},
        {"source_id": "c", "content_hash": "h3", "fetched_at": "new"},
        {"source_id": "d", "content_hash": "h4", "fetched_at": "new"},
    ]
    previous = [
        {"source_id": "a", "content_hash": "h1", "fetched_at": "old"},
        {"source_id": "b", "content_hash": "changed", "fetched_at": "old"},
        {"source_id": "c", "content_hash": "h3", "fetched_at": ""},
    ]
    keep_unchanged_fetched_at(documents, previous)
    assert [d["fetched_at"] for d in documents] == ["old", "new", "new", "new"]


def cached_video(platform_video_id="Abc", description=" 概要  欄 \n\n2行目 "):
    return {"platform_video_id": platform_video_id, "title": "API title", "url": f"https://www.youtube.com/watch?v={platform_video_id}",
            "upload_date": "20260101", "description": description}


def test_youtube_document_prefers_the_videos_csv_title_and_url():
    video = {"video_id": "youtube_abc", "title": "CSV title", "url": "https://youtu.be/abc"}
    doc = youtube_document(video, cached_video(), "Abc.json", "2026-11-05T00:00:00+00:00")
    assert (doc["source_id"], doc["source_ref_id"], doc["title"], doc["url"], doc["published_at"]) == (
        "youtube_description:youtube_abc", "youtube_abc", "CSV title", "https://youtu.be/abc", "20260101")
    assert doc["content_text"] == "概要 欄\n2行目"
    assert doc["content_hash"] == sha256_text("概要 欄\n2行目")
    assert doc["notes"] == "Imported from YouTube Data API cache: Abc.json"


def test_youtube_document_falls_back_to_the_cache_and_skips_empty_descriptions():
    doc = youtube_document({}, cached_video(), "Abc.json", "t")
    assert (doc["source_ref_id"], doc["title"], doc["url"]) == ("youtube_Abc", "API title", "https://www.youtube.com/watch?v=Abc")
    assert youtube_document({}, cached_video(description=" \n "), "Abc.json", "t") is None


def test_youtube_documents_match_videos_by_platform_id():
    videos = [{"platform": "youtube", "platform_video_id": "Abc", "video_id": "youtube_abc"},
              {"platform": "other", "platform_video_id": "Def", "video_id": "other_def"}]
    cached = [(Path("Abc.json"), cached_video("Abc")), (Path("Def.json"), cached_video("Def"))]
    assert [d["source_ref_id"] for d in youtube_documents(videos, cached, "t")] == ["youtube_abc", "youtube_Def"]


def test_note_documents_skip_non_note_urls_missing_caches_and_empty_bodies(tmp_path):
    articles = [
        {"article_id": "note-ok", "url": "https://note.com/x/n/nok", "title": "OK", "published_at": "2026-01-01"},
        {"article_id": "note-empty", "url": "https://note.com/x/n/nempty"},
        {"article_id": "note-nocache", "url": "https://note.com/x/n/nnocache"},
        {"article_id": "web-1", "url": "https://example.com/n/web"},
    ]
    (tmp_path / note_cache_name("note-ok", "")).write_text(NOTE_HTML, encoding="utf-8")
    (tmp_path / note_cache_name("note-empty", "")).write_text("<html><body></body></html>", encoding="utf-8")
    (tmp_path / note_cache_name("web-1", "")).write_text(NOTE_HTML, encoding="utf-8")
    [doc] = note_documents(articles, tmp_path, "t")
    assert (doc["source_id"], doc["source_type"], doc["title"], doc["published_at"], doc["content_text"]) == (
        "note:note-ok", "note_article", "OK", "2026-01-01", "A選手 🆚 B選手")


def test_extract_mentions_prefers_url_hints_over_event_hints():
    document = {"source_id": "note:n1", "source_type": "note_article", "source_ref_id": "n1",
                "content_text": "ターゲットNo.5 https://note.com/x/n/n1\n\n○A vs ●B 判定\nただの行\nエンペラーNo.3"}
    rows = extract_mentions(document)
    assert [(r["mention_id"], r["line_number"], r["mention_type"], r["entity_hint"], r["confidence"]) for r in rows] == [
        ("note:n1-line-00001", "1", "event", "https://note.com/x/n/n1", "medium"),
        ("note:n1-line-00003", "3", "match_result", "", "high"),
        ("note:n1-line-00005", "5", "event", "エンペラーNo.3", "medium"),
    ]
    assert rows[1]["context"] == "○A vs ●B 判定"


def test_archive_rows_keep_the_first_archived_at():
    existing = {"Abc": {"archived_at": "2026-01-01T00:00:00"}, "Def": {"archived_at": ""}}
    assert archived_at_for(existing, "Abc", "now") == "2026-01-01T00:00:00"
    assert archived_at_for(existing, "Def", "now") == "now"
    assert archived_at_for(existing, "Ghi", "now") == "now"


def test_archive_row_shapes():
    video = {"platform_video_id": "Abc", "url": "u", "title": "t", "channel": "c", "upload_date": "20260101",
             "duration_string": "1:00", "view_count": "1", "like_count": "2", "description": "d", "thumbnail_sizes": "default"}
    assert youtube_archive_row(video, "at") == {
        "display_id": "Abc", "webpage_url": "u", "fulltitle": "t", "uploader": "c", "upload_date": "20260101",
        "duration_string": "1:00", "view_count": "1", "like_count": "2", "description": "d", "thumbnail_sizes": "default",
        "archived_at": "at",
    }
    metadata = {"webpage_url": "u", "title": "t", "description": "d", "published_at": "2026-01-01"}
    assert note_archive_row("note-n1.html", metadata, "at") == {
        "filename": "note-n1.html", "webpage_url": "u", "title": "t", "description": "d", "published_at": "2026-01-01", "archived_at": "at",
    }


def test_new_archive_rows_get_a_utc_timestamp_with_offset():
    # fetched_at と同じ形 (T.112.4.13)。既存の行の値は archived_at_for が引き継ぐ。
    from arakaku.sources.archives import archived_at_for, current_archive_time
    now = current_archive_time()
    assert now.endswith("+00:00") and len(now) == 25
    assert archived_at_for({"k": {"archived_at": "2026-06-13T04:03:42"}}, "k", now) == "2026-06-13T04:03:42"
