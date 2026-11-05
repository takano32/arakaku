from __future__ import annotations

from arakaku.notes.articles import article_row
from arakaku.sources.documents import youtube_document


def test_article_title_is_stripped_with_or_without_the_site_suffix():
    # 以前は「｜」があるときだけ strip していた (T.112.4.11)。
    note = {"filename": "note-x.html", "title": " ターゲットNo.1 試合結果 ", "description": ""}
    assert article_row(note)["title"] == "ターゲットNo.1 試合結果"
    note["title"] = " ターゲットNo.1 試合結果 ｜アラカク通信のーと"
    assert article_row(note)["title"] == "ターゲットNo.1 試合結果"


def test_youtube_document_takes_the_date_from_the_cache():
    # videos.csv に日付の列は無いので、日付はキャッシュの upload_date (T.112.4.9)。
    cached = {"platform_video_id": "abc", "title": "API title", "url": "https://www.youtube.com/watch?v=abc", "upload_date": "2026-01-02", "description": "本文"}
    video = {"video_id": "youtube_abc", "title": "CSV title", "url": "https://www.youtube.com/watch?v=abc", "published_at": "1999-01-01"}
    doc = youtube_document(video, cached, "abc.json", "2026-11-05T00:00:00+00:00")
    assert doc["published_at"] == "2026-01-02"
    assert doc["title"] == "CSV title"
