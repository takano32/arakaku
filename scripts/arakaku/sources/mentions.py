# 役割: source document の本文を 1 行ずつ対戦 (matchup) / 結果 (result) / 両方 (match_result) /
#   大会 (event) / URL (note_url, youtube_url) に分類し、source_mentions.csv の行を起こす。
# アーキ上の位置: arakaku/sources/documents.py が作った document 行を受け取る。
#   build_source_documents.py が write_csv する。validation/vocab.py の VALID_MENTION_TYPES と同期。
# 不変条件:
#   - 判定は上から優先で、最初に当たった分類を返す。「vs かつ結果あり」を最も具体的 (high) とし、
#     以降ゆるい条件へ落ちていく順序が意味を持つ。
#   - RESULT_RE の英字の略語は英単語の一部 (例: URL の kobayashi) に一致させない。
#   - mention はレビュー用の手掛かりで、勝敗・出場者・タイトル系譜を確定させない。
# 関連スキル: .agents/skills/arakaku-source-pipeline。
from __future__ import annotations

import re

from arakaku.notes.patterns import NOTE_URL_RE, VS_RE, YOUTUBE_URL_RE

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

# 英字の略語は英単語の一部 (例: URL の kobayashi) に一致させない
RESULT_RE = re.compile(
    r"((?<![A-Za-z])(?:KO|TKO|RNC|NC|DQ)(?![A-Za-z])|一本|判定|ドロー|ノーコンテスト|失格|勝利|勝ち|敗北|防衛|王座|タイトル)",
    re.IGNORECASE,
)
EVENT_RE = re.compile(
    r"(ターゲット\s*No\.?\s*[0-9０-９]+|エンペラー\s*No\.?\s*[0-9０-９]+|マウンテン[・\- ]?ヒーローズ\s*No\.?\s*[0-9０-９]+|マウンテンヒーローズ\s*No\.?\s*[0-9０-９]+|MAXバウト|エリートスピリッツ|アラカクライブ)",
    re.IGNORECASE,
)


def classify_mention(line: str) -> tuple[str, str, str]:
    """(mention_type, entity_type, confidence)。どれにも当たらなければ ("", "", "")。"""
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

        rows.append(
            {
                "mention_id": f"{source_id}-line-{line_number:05d}",
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


def mention_sort_key(row: dict[str, str]) -> tuple[str, int, str]:
    return (row["source_id"], int(row["line_number"] or 0), row["mention_type"])
