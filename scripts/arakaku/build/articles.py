# 役割: articles.csv と source_documents.csv の行を docs/data の articles.json・source_documents.json・
#   source_document_bodies.json の形にする。
# アーキ上の位置: build/canonical.py の json_builders が呼ぶ。I/O はしない。
# 不変条件: source_documents は本文 (content_text) を別 JSON に分ける。両者は source_id で突き合わせる。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any

from arakaku.csvmap import field_or_default, field_or_empty, map_rows
from arakaku.schema import CsvRow


def build_articles(articles: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        articles,
        {
            "article_id": "article_id",
            "title": "title",
            "url": "url",
            "source_type": field_or_default("source_type", "official_note"),
            "article_type": "article_type",
            "promotion_id": "promotion_id",
            "published_at": "published_at",
            "last_checked_at": "last_checked_at",
            # 空のセルは null のまま出す。以前の既定値 "parsed" は vocab (unparsed だけ) に無い値だった (T112.6.10)。
            "status": "status",
            "notes": field_or_empty("notes"),
        },
    )


# source_documents は本文 (content_text) を別 JSON に分離する: メタデータは軽く、重い本文は
# source_document_bodies.json として遅延ロードできるようにするため。両者で source_id を揃えて viewer 側が突き合わせる。
def source_documents_without_bodies(source_documents: list[CsvRow]) -> list[dict[str, str]]:
    return [{k: v for k, v in row.items() if k != "content_text"} for row in source_documents]


def source_document_bodies(source_documents: list[CsvRow]) -> list[dict[str, str]]:
    return [{"source_id": row["source_id"], "content_text": row.get("content_text", "")} for row in source_documents]
