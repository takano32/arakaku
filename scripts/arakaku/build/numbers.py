# 役割: Apple Numbers (アラカク選手名鑑.numbers) 由来の numbers_*.csv の行を docs/data/numbers_*.json の
#   形に組み立てる。viewer は実行時にこの比較データで正規 CSV を補完する (人手検証済み Numbers が優先)。
# アーキ上の位置: 入力 = data-src/numbers_*.csv の行 (scripts/extract_numbers.py が Numbers から生成)、
#   出力 = docs/data/numbers_*.json。build/canonical.py とは別系統で、正規 CSV を上書きしない比較レイヤ。
#   I/O は scripts/build_numbers_json.py が行う。
# 不変条件: Numbers の事実を捏造・改変しない。正規データへの「直接置換」ではなく比較データとして扱う。
# 関連スキル: .agents/skills/arakaku-numbers-pipeline。
from __future__ import annotations

from typing import Any, Callable

from arakaku.csvmap import field_or_empty, int_field, map_rows
from arakaku.schema import CsvRow


def build_numbers_fighters(numbers_fighters: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        numbers_fighters,
        {
            "numbers_fighter_id": "numbers_fighter_id",
            "source_sheet": "source_sheet",
            "source_row": int_field("source_row"),
            "display_name": "display_name",
            "main_division": "main_division",
            "main_promotion_raw": "main_promotion_raw",
            "main_promotion_id": "main_promotion_id",
            "profile": {
                "age": "age",
                "height": "height",
                "gym": "gym",
            },
            "stats": {
                "fight_count": int_field("fight_count"),
                "wins": int_field("wins"),
                "losses": int_field("losses"),
                "win_rate": "win_rate",
            },
            "achievements": {
                "white_glove_count": int_field("white_glove_count"),
                "tournament_win_marker": "tournament_win_marker",
                "tournament_entry_raw": "tournament_entry_raw",
                "belt_marker": "belt_marker",
            },
            "catchphrase": "catchphrase",
            "notes": field_or_empty("notes"),
            "source_confidence": "source_confidence",
        },
    )


def json_builders(
    numbers_fighters: list[CsvRow], name_matches: list[CsvRow], fight_records: list[CsvRow]
) -> dict[str, Callable[[], Any]]:
    return {
        "numbers_fighters.json": lambda: build_numbers_fighters(numbers_fighters),
        "numbers_name_matches.json": lambda: name_matches,
        "numbers_fight_records.json": lambda: fight_records,
    }
