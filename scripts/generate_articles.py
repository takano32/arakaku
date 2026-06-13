#!/usr/bin/env python3
"""Generate articles.csv from archives/note.csv."""
from __future__ import annotations

import re

# 役割: note 記事マスタ articles.csv を archives/note.csv（アーカイブ済みメタデータ）から
#       生成し、各記事を article_type（promotion_profile / event_card / event_result /
#       note_article / youtube_description_source）に分類する。
# アーキ上の位置: generate-stage1 で archive_metadata の後・build_source_documents の前に
#       実行する（article_id を後段が参照するため順序固定）。article_id はファイル名から
#       拡張子 .html を除いたもので、source_documents / article_links の結合キーになる。
# 不変条件: article_type は generate_article_links 側の分岐（event_card/event_result/
#       promotion_profile を特別扱い）と必ず同期させること。detect_promotion の優先順位は
#       PROMOTIONS_BY_PRIORITY の並び順依存（より具体的な団体を先に判定）。
# 関連スキル: .agents/skills/arakaku-source-pipeline
from arakaku.utils import DATA_SRC, read_csv, write_csv

OUTPUT = DATA_SRC / "articles.csv"
FIELDS = [
    "article_id", "title", "url", "source_type", "article_type",
    "promotion_id", "published_at", "last_checked_at", "status", "notes",
]

PROMOTIONS_BY_PRIORITY = [
    ("target", ["ターゲット"]),
    ("emperor", ["エンペラー"]),
    ("mh", ["マウンテン", "M・H"]),
    ("max_bout", ["MAXバウト", "MAX", "第"]),
]


def detect_promotion(title: str) -> str:
    # 並び順が優先順位。max_bout のキーワード "第" は汎用的すぎるので必ず最後に置く。
    for promo, keywords in PROMOTIONS_BY_PRIORITY:
        if any(kw in title for kw in keywords):
            return promo
    return ""


def classify_article(filename: str, title: str) -> tuple[str, str, str]:
    """Returns (article_type, promotion_id, notes)."""
    clean = title.split("｜")[0].strip()
    aid = filename.replace(".html", "")

    # Special case: user profile page
    if aid == "note-xyz1090":
        return "youtube_description_source", "", "Found in YouTube description: -1QlPvbzpX4"

    # Promotion profile articles (fixed filenames)
    promo_files = {
        "note-target": ("promotion_profile", "target", "団体設定・ルール・歴代王者"),
        "note-emperor": ("promotion_profile", "emperor", "団体設定・ルール・歴代王者"),
        "note-mh": ("promotion_profile", "mh", "団体設定・ルール・歴代王者"),
        "note-max-bout": ("promotion_profile", "max_bout", "ルール・歴代王者"),
    }
    if aid in promo_files:
        return promo_files[aid]

    # Special case: target-103 event articles
    if aid == "note-target-103-card":
        return "event_card", "target", "ターゲットNo.103の対戦カードと選手プロフィール"
    if aid == "note-target-103-result":
        return "event_result", "target", "ターゲットNo.103の試合結果"

    promo = detect_promotion(clean)

    if "試合結果" in clean or re.search(r"試合結果|結果$", clean):
        return "event_result", promo, "Crawled from note JSON/API."
    if "対戦カード" in clean or "カード" in clean:
        return "event_card", promo, "Crawled from note JSON/API."

    return "note_article", promo, "Crawled from note JSON/API."


def main() -> None:
    rows: list[dict[str, str]] = []

    for note in read_csv(DATA_SRC / "archives/note.csv"):
        filename = note["filename"]
        article_id = filename.replace(".html", "")
        title_raw = note.get("title", "")
        title = title_raw.split("｜")[0].strip() if "｜" in title_raw else title_raw
        url = note.get("webpage_url", "")

        art_type, promo, article_notes = classify_article(filename, title_raw)

        rows.append({
            "article_id": article_id,
            "title": title,
            "url": url,
            "source_type": "official_note",
            "article_type": art_type,
            "promotion_id": promo,
            "published_at": "",
            "last_checked_at": note.get("archived_at", ""),
            "status": "unparsed",
            "notes": article_notes,
        })

    write_csv(OUTPUT, FIELDS, rows)
    print(f"[done] {len(rows)} article rows written")


if __name__ == "__main__":
    main()
