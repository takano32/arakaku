# 役割: Apple Numbers の選手名鑑のセルの値を CSV の値に整える規則 (空白・小数点・回数・階級・団体・勝敗の記号) と、
#   表の見出しの検査。
# アーキ上の位置: arakaku/numbers/sheets.py が使う。cell_text だけは scripts/extract_numbers.py が
#   numbers_parser のセルを文字列にするのに使う (セルは .value を持つものなら何でもよく、numbers_parser は import しない)。
# 不変条件: 未知の団体表記は promotion_id() で lower() にフォールバックするので、PROMOTION_MAP は
#   既知の別表記の明示マップに留める。見出しが欠けていれば NumbersSchemaError (スクリプトが
#   "[error] ..." の SystemExit にする)。
# 関連スキル: .agents/skills/arakaku-numbers-pipeline。
from __future__ import annotations

import re

# Numbers 上の日本語団体表記 -> 正規 promotion_id。未知の表記は promotion_id() で
# lower() フォールバックされるため、ここは既知エイリアスの明示マップに留める。

PROMOTION_MAP = {
    "MH": "mh",
    "mh": "mh",
    "ターゲット": "target",
    "エンペラー": "emperor",
    "ジャパンファイト": "japan_fight",
    "コミックファイト": "comic_fight",
    "MAXバウト": "max_bout",
}

RESULT_MAP = {
    "⚪︎": "win",
    "⚫︎": "loss",
}


class NumbersSchemaError(ValueError):
    """Numbers の表の形が想定と違う (見出しが無い・データの行が無い)。"""


def cell_text(cell) -> str:
    return str(cell.value) if cell.value is not None else ""


def clean_text(value: str) -> str:
    return value.strip()


def clean_number(value: str) -> str:
    value = clean_text(value)
    if value.endswith(".0"):
        return value[:-2]
    return value


# MAXバウトは「第5回 1回戦A」のように回戦まで書かれている。events.csv はトーナメント全体を
# 1 大会 (event_number=5) にしているので、照合キーには回数だけを使う (回戦は event_number_raw に残る)。
def clean_event_number(value: str) -> str:
    match = re.match(r"第(\d+)回", clean_text(value))
    if match:
        return match.group(1)
    return clean_number(value)


def clean_division(value: str) -> str:
    raw = clean_text(value)
    if raw in ["ライト", "ミドル", "ヘビー"]:
        return raw + "級"
    return raw


def promotion_id(value: str) -> str:
    raw = clean_text(value)
    return PROMOTION_MAP.get(raw, raw.lower())


def require_columns(header: list[str], columns: list[str], sheet_name: str) -> dict[str, int]:
    indexes: dict[str, int] = {}
    for column in columns:
        try:
            indexes[column] = header.index(column)
        except ValueError as exc:
            raise NumbersSchemaError(f"Missing required column in Numbers {sheet_name}: {column}") from exc
    return indexes


def row_dict(header: list[str], values: list[str]) -> dict[str, str]:
    """文字列にした 1 行を {見出し: 値} にする。足りないセルは ""、見出しが空の列は捨てる。"""
    values = list(values)
    if len(values) < len(header):
        values.extend([""] * (len(header) - len(values)))
    return {name: values[index] for index, name in enumerate(header) if name}
