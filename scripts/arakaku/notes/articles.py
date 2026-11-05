# 役割: アーカイブ済み note メタデータ (archives/note.csv の行) から articles.csv の行を作り、各記事を
#   article_type (promotion_profile / event_card / event_result / note_article / youtube_description_source)
#   に分類する。
# アーキ上の位置: scripts/generate_articles.py が archives/note.csv を読んでここに渡し、write_csv する。
#   article_id はファイル名から拡張子 .html を除いたもので、source_documents / article_links の結合キー。
# 不変条件:
#   - article_type は arakaku/derive/article_links.py 側の分岐 (event_card / event_result /
#     promotion_profile を特別扱い) と必ず同期させること。
#   - detect_promotion の優先順位は PROMOTIONS_BY_PRIORITY の並び順依存 (より具体的な団体を先に判定)。
#     max_bout のキーワード "第" は汎用的すぎるので必ず最後に置く。
# 関連スキル: .agents/skills/arakaku-source-pipeline。
from __future__ import annotations

import re

from arakaku.io import CsvRow

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
    for promo, keywords in PROMOTIONS_BY_PRIORITY:
        if any(kw in title for kw in keywords):
            return promo
    return ""


# 冒頭 (meta description) が対戦カードの形かどうか。タイトルに「対戦カード」が無いカード記事
# (例:「第5回MAXバウトミドル級ＧＰ一回戦Aグループ」「マウンテン・ヒーローズNo.37」) を拾う (T.97)。
CARD_BODY_RE = re.compile(r"🆚|🚨\s*①名前|[☆🟥🟦][^\n]{0,20}級")


def looks_like_card(description: str) -> bool:
    return bool(CARD_BODY_RE.search(description)) and not re.search(r"[○◯〇●]", description)


def classify_article(filename: str, title: str, description: str = "") -> tuple[str, str, str]:
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
    if "対戦カード" in clean or "カード" in clean or looks_like_card(description):
        return "event_card", promo, "Crawled from note JSON/API."

    return "note_article", promo, "Crawled from note JSON/API."


def article_row(note: CsvRow) -> dict[str, str]:
    """archives/note.csv の 1 行 -> articles.csv の 1 行。"""
    filename = note["filename"]
    title_raw = note.get("title", "")
    art_type, promo, article_notes = classify_article(filename, title_raw, note.get("description", ""))
    return {
        "article_id": filename.replace(".html", ""),
        "title": title_raw.split("｜")[0].strip() if "｜" in title_raw else title_raw,
        "url": note.get("webpage_url", ""),
        "source_type": "official_note",
        "article_type": art_type,
        "promotion_id": promo,
        "published_at": note.get("published_at", ""),
        "last_checked_at": note.get("archived_at", ""),
        "status": "unparsed",
        "notes": article_notes,
    }


def article_rows(notes: list[CsvRow]) -> list[dict[str, str]]:
    return [article_row(note) for note in notes]
