#!/usr/bin/env python3
"""Generate aliases.csv from numbers_name_matches.csv, fighters.csv, and static config."""
from __future__ import annotations

# 役割: 別名→正規ID の対応表 aliases.csv を生成する。fighters / promotions / methods の
#       3種別を 1 ファイルに alias_type で束ねる。
# アーキ上の位置: generate-stage2 で実行。fighters 別名は extract_numbers が作る
#       numbers_name_matches.csv（高信頼マッチ）と fighters.csv から導出する。出力は
#       generate_article_links が name→fighter_id 解決に、ビューア側が検索・名寄せに使う。
# 不変条件: canonical_id は各 alias_type に対応する正規テーブルの主キー
#       （fighters→fighter_id / promotions→promotion_id / methods→method code）。
#       PROMOTION_ALIASES / METHOD_ALIASES は固定知識なので静的に持つ。
# 関連スキル: .agents/skills/arakaku-data-curator
from arakaku.utils import DATA_SRC, read_csv, write_csv

OUTPUT = DATA_SRC / "aliases.csv"
FIELDS = ["alias_type", "alias", "canonical_id"]

# Static promotion aliases (Japanese name → promotion_id)
PROMOTION_ALIASES = [
    ("ターゲット", "target"),
    ("エンペラー", "emperor"),
    ("マウンテン・ヒーローズ", "mh"),
    ("M・H", "mh"),
    ("MAXバウト", "max_bout"),
]

# Static method aliases (Japanese term → method code)
METHOD_ALIASES = [
    ("KO", "KO"),
    ("TKO", "TKO"),
    ("判定", "DEC"),
    ("アナコンダチョーク", "SUB_ANACONDA_CHOKE"),
]


def main() -> None:
    rows: list[dict[str, str]] = []

    # Fighter aliases from Numbers name matches (high confidence only)
    # matched_ids に入れた fighter は次のループ（display_name 由来別名）でスキップする。
    matched_ids: set[str] = set()
    for match in read_csv(DATA_SRC / "numbers_name_matches.csv"):
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
    for fighter in read_csv(DATA_SRC / "fighters.csv"):
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

    # Promotion aliases
    for alias, cid in PROMOTION_ALIASES:
        rows.append({"alias_type": "promotions", "alias": alias, "canonical_id": cid})

    # Method aliases
    for alias, cid in METHOD_ALIASES:
        rows.append({"alias_type": "methods", "alias": alias, "canonical_id": cid})

    write_csv(OUTPUT, FIELDS, rows)
    print(f"[done] {len(rows)} alias rows written")


if __name__ == "__main__":
    main()
