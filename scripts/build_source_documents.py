#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

ARTICLES_CSV = ROOT / "data-src" / "articles.csv"
VIDEOS_CSV = ROOT / "data-src" / "videos.csv"

NOTE_HTML_DIR = ROOT / "tmp" / "note-html"
YOUTUBE_INFO_DIR = ROOT / "tmp" / "youtube-info"

SOURCE_DOCUMENTS_CSV = ROOT / "data-src" / "source_documents.csv"
SOURCE_MENTIONS_CSV = ROOT / "data-src" / "source_mentions.csv"


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

MENTION_FIELDS = [
    "mention_id",
    "source_id",
    "source_type",
    "source_ref_id",
    "line_number",
    "mention_type",
    "entity_type",
    "entity_hint",
    "matched_text",
    "context",
    "confidence",
    "notes",
]


VS_RE = re.compile(r"(?i)\bvs\.?\b|ＶＳ|ｖｓ|対")
RESULT_RE = re.compile(
    r"(KO|TKO|一本|判定|ドロー|ノーコンテスト|NC|失格|DQ|勝利|勝ち|敗北|防衛|王座|タイトル)",
    re.IGNORECASE,
)
NOTE_URL_RE = re.compile(r"https?://note\.com/[^\s)）]+")
YOUTUBE_URL_RE = re.compile(r"https?://(?:www\.)?(?:youtube\.com|youtu\.be)/[^\s)）]+")
EVENT_RE = re.compile(
    r"(ターゲット\s*No\.?\s*[0-9０-９]+|エンペラー\s*No\.?\s*[0-9０-９]+|マウンテン[・\- ]?ヒーローズ\s*No\.?\s*[0-9０-９]+|マウンテンヒーローズ\s*No\.?\s*[0-9０-９]+|MAXバウト|エリートスピリッツ|アラカクライブ)",
    re.IGNORECASE,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def strip_tags(text: str) -> str:
    text = re.sub(r"<script\b.*?</script>", "\n", text, flags=re.S | re.I)
    text = re.sub(r"<style\b.*?</style>", "\n", text, flags=re.S | re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>|</div>|</li>|</h[1-6]>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\r\n?", "\n", text)
    return normalize_text(text)


def normalize_text(text: str) -> str:
    lines = []

    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if line:
            lines.append(line)

    return "\n".join(lines)


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def cache_name_for_article(article_id: str, url: str) -> str:
    raw = article_id or url
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "_", raw).strip("_")
    return f"{safe}.html"


def classify_mention(line: str) -> tuple[str, str, str]:
    if VS_RE.search(line) and RESULT_RE.search(line):
        return "match_result", "bout", "high"

    if VS_RE.search(line):
        return "matchup", "bout", "medium"

    if RESULT_RE.search(line):
        return "result", "bout", "medium"

    if EVENT_RE.search(line):
        return "event", "event", "medium"

    if NOTE_URL_RE.search(line):
        return "note_url", "article", "high"

    if YOUTUBE_URL_RE.search(line):
        return "youtube_url", "video", "high"

    return "", "", ""


def extract_mentions(document: dict[str, str]) -> list[dict[str, str]]:
    source_id = document["source_id"]
    source_type = document["source_type"]
    source_ref_id = document["source_ref_id"]
    text = document["content_text"]

    rows = []

    for line_number, line in enumerate(text.splitlines(), start=1):
        mention_type, entity_type, confidence = classify_mention(line)

        if not mention_type:
            continue

        entity_hint = ""

        event_match = EVENT_RE.search(line)
        if event_match:
            entity_hint = event_match.group(0)

        urls = NOTE_URL_RE.findall(line) + YOUTUBE_URL_RE.findall(line)
        if urls:
            entity_hint = ",".join(urls)

        mention_id = f"{source_id}-line-{line_number:05d}"

        rows.append(
            {
                "mention_id": mention_id,
                "source_id": source_id,
                "source_type": source_type,
                "source_ref_id": source_ref_id,
                "line_number": str(line_number),
                "mention_type": mention_type,
                "entity_type": entity_type,
                "entity_hint": entity_hint,
                "matched_text": line[:300],
                "context": line,
                "confidence": confidence,
                "notes": "Auto-extracted from source document text.",
            }
        )

    return rows


def build_note_documents() -> list[dict[str, str]]:
    articles = read_csv(ARTICLES_CSV)
    fetched_at = now_iso()
    rows = []

    for article in articles:
        url = article.get("url", "")
        article_id = article.get("article_id", "")

        if "note.com" not in url:
            continue

        html_path = NOTE_HTML_DIR / cache_name_for_article(article_id, url)

        if not html_path.exists():
            continue

        raw_html = html_path.read_text(encoding="utf-8", errors="replace")
        content_text = strip_tags(raw_html)

        if not content_text:
            continue

        source_id = f"note:{article_id}"

        rows.append(
            {
                "source_id": source_id,
                "source_type": "note_article",
                "source_ref_id": article_id,
                "title": article.get("title", ""),
                "url": url,
                "published_at": article.get("published_at", ""),
                "fetched_at": fetched_at,
                "content_format": "plain_text",
                "content_hash": sha256_text(content_text),
                "content_text": content_text,
                "content_preview": content_text[:300],
                "notes": "Imported from cached note HTML.",
            }
        )

    return rows


def build_youtube_documents() -> list[dict[str, str]]:
    videos = read_csv(VIDEOS_CSV)
    videos_by_platform_id = {
        row.get("platform_video_id", ""): row
        for row in videos
        if row.get("platform") == "youtube"
    }

    fetched_at = now_iso()
    rows = []

    for info_path in sorted(YOUTUBE_INFO_DIR.glob("*.info.json")):
        try:
            data = json.loads(info_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue

        platform_video_id = str(data.get("id") or info_path.stem.replace(".info", ""))
        video = videos_by_platform_id.get(platform_video_id, {})

        video_id = video.get("video_id") or f"youtube_{platform_video_id}"
        title = video.get("title") or str(data.get("title") or "")
        url = video.get("url") or str(data.get("webpage_url") or data.get("original_url") or "")
        published_at = video.get("published_at") or str(data.get("upload_date") or "")

        description = normalize_text(str(data.get("description") or ""))

        if not description:
            continue

        source_id = f"youtube_description:{video_id}"

        rows.append(
            {
                "source_id": source_id,
                "source_type": "youtube_description",
                "source_ref_id": video_id,
                "title": title,
                "url": url,
                "published_at": published_at,
                "fetched_at": fetched_at,
                "content_format": "plain_text",
                "content_hash": sha256_text(description),
                "content_text": description,
                "content_preview": description[:300],
                "notes": f"Imported from yt-dlp info.json: {info_path.name}",
            }
        )

    return rows


def main() -> int:
    documents = []
    documents.extend(build_note_documents())
    documents.extend(build_youtube_documents())

    mentions = []
    for document in documents:
        mentions.extend(extract_mentions(document))

    documents.sort(key=lambda row: (row["source_type"], row["source_ref_id"]))
    mentions.sort(key=lambda row: (row["source_id"], int(row["line_number"] or 0), row["mention_type"]))

    write_csv(SOURCE_DOCUMENTS_CSV, DOCUMENT_FIELDS, documents)
    write_csv(SOURCE_MENTIONS_CSV, MENTION_FIELDS, mentions)

    print(f"[info] {SOURCE_DOCUMENTS_CSV}")
    print(f"[info] {len(documents)}")
    print(f"[info] {SOURCE_MENTIONS_CSV}")
    print(f"[info] {len(mentions)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
