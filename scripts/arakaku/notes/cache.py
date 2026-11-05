# 役割: tmp/note-html/ の note 記事キャッシュの約束事 (ファイル名の規約と、キャッシュする記事の判定)。
# アーキ上の位置: 書く側 (scripts/cache_note_html.py) と読む側 (arakaku/sources/documents.py) の
#   両方が import する。I/O はしない。
# 不変条件: note_cache_name は tmp/note-html/ のファイル名の契約。書く側と読む側で必ず同じ名前に
#   なるよう、ここ以外にファイル名の規則を書かない。
# 関連スキル: .agents/skills/arakaku-source-pipeline。
from __future__ import annotations

from arakaku.text import safe_slug


def is_note_article_url(url: str) -> bool:
    """articles.csv の行のうち、note.com の記事としてキャッシュするもの。"""
    return "note.com" in url


def note_cache_name(article_id: str, url: str) -> str:
    raw = article_id or url
    return f"{safe_slug(raw)}.html"
