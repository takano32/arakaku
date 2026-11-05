# 役割: note.com の記事 HTML から必要な部分だけを取り出す。
#   note_content_text = 記事タイトル (h1)・投稿日時 (time)・本文 (#note-body) をテキスト化する
#   (source_documents.csv の content_text)。#note-body の無いページ (クリエイターのトップページ) は
#   meta description を本文にする。
# アーキ上の位置: arakaku/sources/documents.py (build_source_documents.py) が使う。
# 不変条件:
#   - ページの部品や「あなたへのおすすめ」を混ぜない (h1 / time / #note-body 以外は捨てる)。
#   - 切り出しは生 HTML のまま行い、strip_tags() で既存と同じ改行規則のテキストにする
#     (br / p / div / li / 見出しの終わりで改行、script / style は捨てる)。
# 関連スキル: .agents/skills/arakaku-source-pipeline。
from __future__ import annotations

import html
import re
from html.parser import HTMLParser

from arakaku.text import normalize_text


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
