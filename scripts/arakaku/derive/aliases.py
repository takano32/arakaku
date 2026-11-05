# 役割: 別名→正規ID の対応表 aliases.csv の行を作る。fighters / promotions / methods の
#   3種別を 1 ファイルに alias_type で束ねる。
# アーキ上の位置: scripts/generate_aliases.py が numbers_name_matches.csv（extract_numbers が作る）と
#   fighters.csv を読んでここに渡し、write_csv する。I/O はしない。出力は generate_article_links が
#   name→fighter_id 解決に、ビューア側が検索・名寄せに使う。
# 不変条件: canonical_id は各 alias_type に対応する正規テーブルの主キー
#   （fighters→fighter_id / promotions→promotion_id / methods→method code）。
#   PROMOTION_ALIASES / FIGHTER_ALIASES / METHOD_ALIASES は固定知識なので静的に持つ。
# 関連スキル: .agents/skills/arakaku-data-curator。
from __future__ import annotations

from arakaku.schema import CsvRow

FIELDS = ["alias_type", "alias", "canonical_id"]

# Static promotion aliases (Japanese name → promotion_id)
PROMOTION_ALIASES = [
    ("ターゲット", "target"),
    ("エンペラー", "emperor"),
    ("マウンテン・ヒーローズ", "mh"),
    ("M・H", "mh"),
    ("MAXバウト", "max_bout"),
]

# Static fighter aliases: spellings that appear in official video titles or note articles but are
# not covered by Numbers (high confidence) or by display_name. Each needs a source.
FIGHTER_ALIASES = [
    ("ローリングJr.", "rolling_jr"),  # official video titles (e.g. youtube_bujuelt6hfo); fighters.csv display_name
    ("ローリングjr", "rolling_jr"),   # official video titles (youtube_9hosl10mklo, youtube_ohxh8yuitfy) and note result articles
]

# Static method aliases (Japanese term → method code)
METHOD_ALIASES = [
    ("KO", "KO"),
    ("TKO", "TKO"),
    ("判定", "DEC"),
    ("アナコンダチョーク", "SUB_ANACONDA_CHOKE"),
]


def alias_rows(name_matches: list[CsvRow], fighters: list[CsvRow]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    # Fighter aliases from Numbers name matches (high confidence only)
    # matched_ids に入れた fighter は次のループ（display_name 由来別名）でスキップする。
    matched_ids: set[str] = set()
    for match in name_matches:
        if match["match_confidence"] != "high":
            continue
        fighter_id = match.get("matched_fighter_id", "")
        if not fighter_id:
            continue
        alias = match.get("numbers_name", "").strip()
        if alias:
            rows.append({"alias_type": "fighters", "alias": alias, "canonical_id": fighter_id})
            matched_ids.add(fighter_id)

    # Fighter aliases for fighters not covered by Numbers (display_name as alias)
    # Skip fighter_xxxxxxx IDs and medium-confidence entries — those are video-title parse artifacts
    for fighter in fighters:
        fid = fighter["fighter_id"]
        if fid in matched_ids:
            continue
        if fid.startswith("fighter_"):
            continue
        if fighter.get("inferred_confidence") == "medium":
            continue
        display = fighter.get("display_name", "").strip()
        if display and display != fid:
            rows.append({"alias_type": "fighters", "alias": display, "canonical_id": fid})

    # Static fighter aliases (skip ones the passes above already produced)
    seen = {(row["alias_type"], row["alias"]) for row in rows}
    for alias, fid in FIGHTER_ALIASES:
        if ("fighters", alias) not in seen:
            rows.append({"alias_type": "fighters", "alias": alias, "canonical_id": fid})

    # Promotion aliases
    for alias, cid in PROMOTION_ALIASES:
        rows.append({"alias_type": "promotions", "alias": alias, "canonical_id": cid})

    # Method aliases
    for alias, cid in METHOD_ALIASES:
        rows.append({"alias_type": "methods", "alias": alias, "canonical_id": cid})
    return rows
