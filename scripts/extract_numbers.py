#!/usr/bin/env python3
from __future__ import annotations

# 役割: Apple Numbers の選手名鑑 (data-raw/*.numbers) を読み、比較用データとして
#   data-src/numbers_*.csv 3 本 (fighters / name_matches / fight_records) に書き出す。
#   numbers_parser で表を開くところまでがここで、セルの文字列化・行の組み立て・名前の照合は
#   arakaku/numbers/ (cells・names・sheets) にある。
# アーキ上の位置: 取り込みパイプラインの入口。下流は build_numbers_json.py が
#   この CSV を JSON 化し、ビューワが DataRepository 経由で正規 CSV と突き合わせる。
# 不変条件: Numbers 由来データは「確定事実」ではなく比較データ。ここで生成した CSV を
#   そのまま bouts.csv / fighters.csv 等の正規データへ昇格させてはならない。
#   出力の列は schema.CSV_HEADERS の numbers_*.csv (行の辞書のキーと同じことを tests/test_12 が確かめる)。
#   numbers_parser を import するのはこのスクリプトだけ。
# 関連スキル: .agents/skills/arakaku-numbers-pipeline/SKILL.md を必ず参照。
from numbers_parser import Document

from arakaku.io import read_csv, write_csv
from arakaku.numbers.cells import NumbersSchemaError
from arakaku.numbers.sheets import extract_fight_records, extract_fighters, sheet_table_rows
from arakaku.paths import DATA_SRC, NUMBERS_PATH
from arakaku.schema import CSV_HEADERS


def existing_name_map() -> dict[str, str]:
    return {
        row["display_name"]: row["fighter_id"]
        for row in read_csv(DATA_SRC / "fighters.csv")
        if row.get("display_name") and row.get("fighter_id")
    }


def main() -> None:
    if not NUMBERS_PATH.exists():
        raise SystemExit(f"[error] {NUMBERS_PATH} not found.")

    doc = Document(str(NUMBERS_PATH))
    name_to_id = existing_name_map()
    try:
        fighters, matches, fighters_by_name = extract_fighters(sheet_table_rows(doc.sheets, 0, "全体"), name_to_id)
        fight_records = extract_fight_records(sheet_table_rows(doc.sheets, 1, "個人成績"), fighters_by_name, matches, name_to_id)
    except NumbersSchemaError as exc:
        raise SystemExit(f"[error] {exc}") from exc

    write_csv(DATA_SRC / "numbers_fighters.csv", CSV_HEADERS["numbers_fighters.csv"], fighters)
    write_csv(DATA_SRC / "numbers_name_matches.csv", CSV_HEADERS["numbers_name_matches.csv"], matches)
    write_csv(DATA_SRC / "numbers_fight_records.csv", CSV_HEADERS["numbers_fight_records.csv"], fight_records)
    print(
        "[done] Numbers export completed: "
        f"{len(fighters)} fighters, {len(matches)} matches, {len(fight_records)} fight records."
    )


if __name__ == "__main__":
    main()
