# 役割: ローカルキャッシュ (note HTML / YouTube Data API JSON) から source_documents.csv の行を作る。
#   本文 (content_text) と sha256 の content_hash、取得日時 (fetched_at) を持つ。
# アーキ上の位置: build_source_documents.py が articles.csv / videos.csv を読んでここに渡し、
#   mentions.py で言及を起こして write_csv する。note 本文の抽出は arakaku/notes/html.py。
# 不変条件:
#   - キャッシュ (tmp/) はコミットしない。本文ハッシュ (content_hash) で内容同一性を表す。
#   - note キャッシュのファイル名は arakaku.paths.note_cache_name (writer=cache_note_html.py と契約)。
#   - videos.csv に登録済みなら正規の値 (video_id / title / url) を優先し、未登録分は API キャッシュから補う
#     (CSV を事実源として尊重しつつ取りこぼさない)。
#   - fetched_at は本文 (content_hash) が前回と同じ行では前回の値を引き継ぐ
#     (再実行だけで全行が差分にならないように)。
# 関連スキル: .agents/skills/arakaku-source-pipeline。
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from arakaku.io import CsvRow
from arakaku.notes.html import note_content_text
from arakaku.paths import note_cache_name
from arakaku.text import normalize_text

DOCUMENT_FIELDS = [
    "source_id",
    "source_type",
    "source_ref_id",
    "title",
    "url",
    "published_at",
    "fetched_at",
    "content_format",
    "content_hash",
    "content_text",
    "content_preview",
    "notes",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def note_document(article: CsvRow, content_text: str, fetched_at: str) -> dict[str, str]:
    article_id = article.get("article_id", "")
    return {
        "source_id": f"note:{article_id}",
        "source_type": "note_article",
        "source_ref_id": article_id,
        "title": article.get("title", ""),
        "url": article.get("url", ""),
        "published_at": article.get("published_at", ""),
        "fetched_at": fetched_at,
        "content_format": "plain_text",
        "content_hash": sha256_text(content_text),
        "content_text": content_text,
        "content_preview": content_text[:300],
        "notes": "Imported from cached note HTML.",
    }


def note_documents(articles: list[CsvRow], html_dir: Path, fetched_at: str) -> list[dict[str, str]]:
    """note.com の記事のうち、キャッシュ HTML があり本文が空でないものだけを document にする。"""
    rows = []
    for article in articles:
        url = article.get("url", "")
        article_id = article.get("article_id", "")
        if "note.com" not in url:
            continue
        html_path = html_dir / note_cache_name(article_id, url)
        if not html_path.exists():
            continue
        content_text = note_content_text(html_path.read_text(encoding="utf-8", errors="replace"))
        if not content_text:
            continue
        rows.append(note_document(article, content_text, fetched_at))
    return rows


def youtube_document(video: CsvRow, cached: dict[str, str], cache_name: str, fetched_at: str) -> dict[str, str] | None:
    """API キャッシュ 1 件 (arakaku.youtube.flatten_video の形) から document を作る。概要欄が空なら None。"""
    platform_video_id = cached["platform_video_id"]
    video_id = video.get("video_id") or f"youtube_{platform_video_id}"
    description = normalize_text(cached["description"])
    if not description:
        return None
    return {
        "source_id": f"youtube_description:{video_id}",
        "source_type": "youtube_description",
        "source_ref_id": video_id,
        "title": video.get("title") or cached["title"],
        "url": video.get("url") or cached["url"],
        "published_at": cached["upload_date"],  # videos.csv に日付の列は無い (T.112.4.9)
        "fetched_at": fetched_at,
        "content_format": "plain_text",
        "content_hash": sha256_text(description),
        "content_text": description,
        "content_preview": description[:300],
        "notes": f"Imported from YouTube Data API cache: {cache_name}",
    }


def youtube_documents(videos: list[CsvRow], cached_videos: Iterable[tuple[Path, dict[str, str]]], fetched_at: str) -> list[dict[str, str]]:
    videos_by_platform_id = {row.get("platform_video_id", ""): row for row in videos if row.get("platform") == "youtube"}
    rows = []
    for cache_path, cached in cached_videos:
        video = videos_by_platform_id.get(cached["platform_video_id"], {})
        document = youtube_document(video, cached, cache_path.name, fetched_at)
        if document:
            rows.append(document)
    return rows


def keep_unchanged_fetched_at(documents: list[dict[str, str]], previous_rows: list[CsvRow]) -> None:
    """本文が変わっていない行は前回の fetched_at を引き継ぐ (その場で書き換える)。"""
    previous = {row["source_id"]: row for row in previous_rows}
    for document in documents:
        old = previous.get(document["source_id"])
        if old and old.get("content_hash") == document["content_hash"] and old.get("fetched_at"):
            document["fetched_at"] = old["fetched_at"]


def document_sort_key(row: dict[str, str]) -> tuple[str, str]:
    return (row["source_type"], row["source_ref_id"])
