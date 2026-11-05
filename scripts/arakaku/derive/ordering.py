# 役割: data-src の主要な CSV の行の並べ替えキー (時系列 + 安定したタイ・ブレイク)。
#   scripts/reorder_data.py が CSV を読み、ここのキーで並べて書き戻す。
# アーキ上の位置: 純粋関数のみ。大会の日付は arakaku/event_dates.py の event_note_dates が作る 2 つの表から引く
#   (build/relations.py の events.json と同じ規則)。
# 不変条件:
#   - 空の日付は "0000-00-00" で、先頭 (最古) に寄せる。
#   - 数字でない bout_order は 0 として扱う。reign_order は build/titles.py の lineage と同じく、空は 0、
#     数字でない値は数字の後ろに文字列の順で置く (T.112.6.12)。
#   - キーの最後に主キーや順序列を入れて、同じ日付でも並びが揺れないようにする。
# 関連スキル: .agents/skills/arakaku-sorting-strategy。
from __future__ import annotations

from arakaku.schema import CsvRow
from arakaku.text import parse_int

EMPTY_DATE = "0000-00-00"


def sort_key_date(row: CsvRow, field: str) -> str:
    return row.get(field, "") or EMPTY_DATE


def _int_or_zero(value: str) -> int:
    try:
        return int(value)
    except ValueError:
        return 0


def event_sort_date(event: CsvRow, result_dates: dict[str, str], note_dates: dict[str, str]) -> str:
    """結果 note の投稿日、無ければその大会の note のいちばん早い投稿日、それも無ければ published_at (T.77)。"""
    event_id = event["event_id"]
    return result_dates.get(event_id) or note_dates.get(event_id) or sort_key_date(event, "published_at")


def bout_sort_key(bout: CsvRow, event_dates: dict[str, str]) -> tuple[str, str, int]:
    """(大会の日付, event_id, bout_order)。bouts.csv に日付列は無いので event_id -> 日付の表から引く。"""
    return (event_dates.get(bout["event_id"], EMPTY_DATE), bout["event_id"], _int_or_zero(bout.get("bout_order", "0")))


def reign_sort_key(reign: CsvRow) -> tuple[str, int, int, str]:
    # 以前は数字でない値を 0 (先頭) にしていて、build/titles.py の lineage (末尾) と逆だった (T.112.6.12)。
    order = parse_int(reign.get("reign_order"))
    if isinstance(order, str):
        return (reign["title_id"], 1, 0, order)
    return (reign["title_id"], 0, order or 0, "")
