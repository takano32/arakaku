#!/usr/bin/env python3
from __future__ import annotations

# 役割: ローカルキャッシュ (note HTML / YouTube Data API JSON) を読み、本文を抽出・正規化して
#   data-src/source_documents.csv と source_mentions.csv を再生成する取り込みスクリプト。
#   行ごとに対戦/結果/イベント/URL を分類して mentions を起こす (あくまでレビュー用の手掛かり)。
# アーキ上の位置: 入力 = data-src/articles.csv・videos.csv と tmp/note-html/*・tmp/youtube-api/*.json、
#   出力 = data-src/source_*.csv。これらは後段で build_json.py が source_*.json として viewer へ流す。
#   articles.csv の生成 (generate_articles.py) はこのスクリプトより前に走らせる必要がある。
# 不変条件:
#   - キャッシュ (tmp/) はコミットしない。本文ハッシュ (content_hash) で内容同一性を表す。
#   - note キャッシュのファイル名は utils.note_cache_name() に一元化 (writer=cache_note_html.py と契約)。
#   - note 本文は記事タイトル (h1)・投稿日時 (time)・本文 (#note-body) だけを取り、ページの部品や
#     「あなたへのおすすめ」を混ぜない。#note-body の無いページ (クリエイターのトップページ) は
#     meta description を本文にする。
#   - mention はキーワード一致の機械抽出であり、勝敗・出場者・タイトル系譜を「確定」させない (AGENTS.md)。
#   - 出力は決定的にするため main() で documents/mentions をソートしてから書き出す。
#     fetched_at は本文 (content_hash) が前回と同じ行では前回の値を引き継ぐ。
# 関連スキル: .agents/skills/arakaku-source-pipeline。

import hashlib
import html
import re
from datetime import datetime, timezone
from html.parser import HTMLParser

from arakaku.textparse import NOTE_URL_RE, VS_RE, YOUTUBE_URL_RE
from arakaku.utils import DATA_SRC, ROOT, note_cache_name, read_csv, write_csv
from arakaku.youtube import iter_cached_videos


ARTICLES_CSV = DATA_SRC / "articles.csv"
VIDEOS_CSV = DATA_SRC / "videos.csv"

NOTE_HTML_DIR = ROOT / "tmp" / "note-html"

SOURCE_DOCUMENTS_CSV = DATA_SRC / "source_documents.csv"
SOURCE_MENTIONS_CSV = DATA_SRC / "source_mentions.csv"


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


RESULT_RE = re.compile(
    r"(KO|TKO|一本|判定|ドロー|ノーコンテスト|NC|失格|DQ|勝利|勝ち|敗北|防衛|王座|タイトル)",
    re.IGNORECASE,
)
EVENT_RE = re.compile(
    r"(ターゲット\s*No\.?\s*[0-9０-９]+|エンペラー\s*No\.?\s*[0-9０-９]+|マウンテン[・\- ]?ヒーローズ\s*No\.?\s*[0-9０-９]+|マウンテンヒーローズ\s*No\.?\s*[0-9０-９]+|MAXバウト|エリートスピリッツ|アラカクライブ)",
    re.IGNORECASE,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def strip_tags(text: str) -> str:
    text = re.sub(r"<script\b.*?</script>", "\n", text, flags=re.S | re.I)
    text = re.sub(r"<style\b.*?</style>", "\n", text, flags=re.S | re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>|</div>|</li>|</h[1-6]>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\r\n?", "\n", text)
    return normalize_text(text)


# note 記事ページから、最初の h1・最初の time・id="note-body" の中身を生 HTML のまま切り出す。
# 生 HTML で持つのは、後段の strip_tags() で既存と同じ改行規則のテキストにするため。
class NoteArticleParser(HTMLParser):
    VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.parts: dict[str, list[str]] = {}
        self.description = ""
        self.current = ""
        self.depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {name: value or "" for name, value in attrs}
        if self.current:
            self.parts[self.current].append(self.get_starttag_text() or "")
            if tag not in self.VOID_TAGS:
                self.depth += 1
            return
        if tag == "meta" and attr.get("name") == "description":
            self.description = attr.get("content", "")
        key = "body" if attr.get("id") == "note-body" else tag if tag in ("h1", "time") else ""
        if key and key not in self.parts and tag not in self.VOID_TAGS:
            self.parts[key] = []
            self.current = key
            self.depth = 1

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.current:
            self.parts[self.current].append(self.get_starttag_text() or "")
        elif tag == "meta" and dict(attrs).get("name") == "description":
            self.description = dict(attrs).get("content") or ""

    def handle_endtag(self, tag: str) -> None:
        if not self.current or tag in self.VOID_TAGS:
            return
        self.depth -= 1
        if self.depth == 0:
            self.current = ""
        else:
            self.parts[self.current].append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        if self.current:
            self.parts[self.current].append(data)

    def handle_entityref(self, name: str) -> None:
        if self.current:
            self.parts[self.current].append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if self.current:
            self.parts[self.current].append(f"&#{name};")


def note_content_text(raw_html: str) -> str:
    parser = NoteArticleParser()
    parser.feed(raw_html)
    if "body" not in parser.parts:
        return normalize_text(html.unescape(parser.description))
    fragments = ["".join(parser.parts.get(key, [])) for key in ("h1", "time", "body")]
    return strip_tags("\n".join(fragments))


def normalize_text(text: str) -> str:
    lines = []

    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if line:
            lines.append(line)

    return "\n".join(lines)


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# 1 行を mention 種別へ分類する。判定は上から優先で、最初に当たった分類を返す。
# 「vs かつ結果あり」を最も具体的(high)とし、以降ゆるい条件へ落ちていく順序が意味を持つ。
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

        # URL があれば event_hint より URL を優先 (後勝ちで上書き): URL の方が同定に強いヒント。
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

        html_path = NOTE_HTML_DIR / note_cache_name(article_id, url)

        if not html_path.exists():
            continue

        raw_html = html_path.read_text(encoding="utf-8", errors="replace")
        content_text = note_content_text(raw_html)

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

    for cache_path, cached in iter_cached_videos():
        platform_video_id = cached["platform_video_id"]
        video = videos_by_platform_id.get(platform_video_id, {})

        # videos.csv に登録済みなら正規の値を優先し、未登録分は API キャッシュから補う
        # (video_id が無ければ platform id から合成。CSV を事実源として尊重しつつ取りこぼさない)。
        video_id = video.get("video_id") or f"youtube_{platform_video_id}"
        title = video.get("title") or cached["title"]
        url = video.get("url") or cached["url"]
        published_at = video.get("published_at") or cached["upload_date"]

        description = normalize_text(cached["description"])

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
                "notes": f"Imported from YouTube Data API cache: {cache_path.name}",
            }
        )

    return rows


# 本文が変わっていない行は前回の fetched_at を引き継ぎ、再実行だけで全行が差分にならないようにする。
def keep_unchanged_fetched_at(documents: list[dict[str, str]]) -> None:
    previous = {row["source_id"]: row for row in read_csv(SOURCE_DOCUMENTS_CSV)}
    for document in documents:
        old = previous.get(document["source_id"])
        if old and old.get("content_hash") == document["content_hash"] and old.get("fetched_at"):
            document["fetched_at"] = old["fetched_at"]


def main() -> int:
    documents = []
    documents.extend(build_note_documents())
    documents.extend(build_youtube_documents())
    keep_unchanged_fetched_at(documents)

    mentions = []
    for document in documents:
        mentions.extend(extract_mentions(document))

    # 出力 CSV の diff を安定させるため決定的にソートしてから書き出す。
    documents.sort(key=lambda row: (row["source_type"], row["source_ref_id"]))
    mentions.sort(key=lambda row: (row["source_id"], int(row["line_number"] or 0), row["mention_type"]))

    write_csv(SOURCE_DOCUMENTS_CSV, DOCUMENT_FIELDS, documents)
    write_csv(SOURCE_MENTIONS_CSV, MENTION_FIELDS, mentions)

    print(f"[info] {len(documents)}")
    print(f"[info] {len(mentions)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
