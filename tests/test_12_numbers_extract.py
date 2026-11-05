"""arakaku/numbers/ (Numbers の選手名鑑 -> numbers_*.csv の行) の単体テスト。

Numbers ファイルも numbers_parser も使わず、文字列にした小さい表で確かめる。
"""
from __future__ import annotations

import pytest

from arakaku.numbers.cells import (
    NumbersSchemaError,
    cell_text,
    clean_division,
    clean_event_number,
    clean_number,
    promotion_id,
    require_columns,
    row_dict,
)
from arakaku.numbers.names import match_name, normalized_name, normalized_name_map
from arakaku.numbers.sheets import FIGHTER_COLUMNS, RECORD_COLUMNS, extract_fight_records, extract_fighters
from arakaku.schema import CSV_HEADERS

NAME_TO_ID = {"ローリングJr.": "rolling_jr", "かぶと": "kabuto", "わく": "waku_a", "ワク": "waku_b"}


def match(name: str):
    return match_name(name, NAME_TO_ID, normalized_name_map(NAME_TO_ID))


def test_exact_display_name_match_is_high():
    m = match("かぶと")
    assert (m.matched_id, m.matched_display_name, m.method, m.confidence, m.notes, m.candidate_id) == (
        "kabuto", "かぶと", "exact_display_name", "high", "", "kabuto")


def test_unique_normalized_match_is_medium():
    m = match("ローリング Jr")
    assert (m.matched_id, m.matched_display_name, m.method, m.confidence, m.candidate_id) == (
        "rolling_jr", "ローリングJr.", "normalized_display_name", "medium", "rolling_jr")


def test_ambiguous_normalized_match_is_a_generated_candidate():
    # 中黒を除くと同じ名前になる 2 人 (正規化キーが同じ) がいると、どちらにも決めない。
    name_to_id = {"ア・イ": "ai_1", "アイ": "ai_2"}
    m = match_name("ア イ", name_to_id, normalized_name_map(name_to_id))
    assert (m.matched_id, m.matched_display_name, m.method, m.confidence) == ("", "", "generated_candidate", "candidate")
    assert m.notes == "No exact display_name match in fighters.csv."
    assert m.candidate_id and m.candidate_id not in ("ai_1", "ai_2")


def test_normalized_name_removes_dots_spaces_and_case():
    assert normalized_name("ローリング・Ｊｒ．") == normalized_name("ローリングjr") == "ローリングjr"


def test_cell_cleaning_rules():
    assert clean_event_number("第5回 1回戦A") == "5"
    assert clean_event_number(" 101.0 ") == "101"
    assert clean_division("ライト") == "ライト級"
    assert clean_division("ライト級") == "ライト級"
    assert clean_number("12.0") == "12"
    assert clean_number(" 7 ") == "7"
    assert promotion_id("ターゲット") == "target"
    assert promotion_id(" Unknown ") == "unknown"


def test_cell_text_treats_none_as_empty():
    class Cell:
        def __init__(self, value):
            self.value = value

    assert cell_text(Cell(None)) == ""
    assert cell_text(Cell(3.0)) == "3.0"


def test_row_dict_pads_short_rows_and_drops_unnamed_columns():
    assert row_dict(["a", "", "c"], ["1", "2"]) == {"a": "1", "c": ""}


def test_require_columns_names_the_sheet_and_column():
    with pytest.raises(NumbersSchemaError) as info:
        require_columns(["名前"], ["名前", "階級"], "全体")
    assert str(info.value) == "Missing required column in Numbers 全体: 階級"


def fighter_table(*rows: dict[str, str]) -> list[list[str]]:
    header = ["", *FIGHTER_COLUMNS]
    return [["アラカク選手名鑑"], header, *[[""] + [row.get(c, "") for c in FIGHTER_COLUMNS] for row in rows]]


def test_extract_fighters_from_a_small_table():
    table = fighter_table(
        {"名前": " かぶと ", "階級": "ライト", "主戦団体": "ターゲット", "年齢": "30.0", "勝": "11.0", "負": "13"},
        {"名前": ""},  # 名前の無い行は飛ばすが、行番号は数える
        {"名前": "ローリング・Jr", "主戦団体": "MH"},
        {"名前": "なぞの人"},
    )
    fighters, matches, by_name = extract_fighters(table, NAME_TO_ID)
    assert [f["numbers_fighter_id"] for f in fighters] == ["numbers_fighter_001", "numbers_fighter_002", "numbers_fighter_003"]
    assert [f["source_row"] for f in fighters] == ["3", "5", "6"]
    first = fighters[0]
    assert (first["display_name"], first["main_division"], first["main_promotion_id"], first["age"], first["wins"], first["losses"]) == (
        "かぶと", "ライト級", "target", "30", "11", "13")
    assert [m["match_method"] for m in matches] == ["exact_display_name", "normalized_display_name", "generated_candidate"]
    assert by_name["かぶと"] is first


def test_extract_fighters_needs_a_header_row():
    with pytest.raises(NumbersSchemaError, match="No fighter data found"):
        extract_fighters([["title"]], NAME_TO_ID)
    with pytest.raises(NumbersSchemaError, match="全体: 優勝"):
        extract_fighters([["title"], ["白グローブ出場回数"]], NAME_TO_ID)


def test_extract_fight_records_fills_opponents_from_fighters_csv():
    fighters, matches, by_name = extract_fighters(fighter_table({"名前": "かぶと"}), NAME_TO_ID)
    table = [
        RECORD_COLUMNS,
        ["かぶと", "ライト", "ターゲット", "第5回 1回戦A", "ワンマッチ", "わく", "⚪︎", "KO"],
        ["", "", "", "", "", "", "", ""],
        ["かぶと", "ライト", "ターゲット", "101", "ワンマッチ", "知らない人", "⚫︎", ""],
    ]
    records = extract_fight_records(table, by_name, matches, NAME_TO_ID)
    assert [r["record_id"] for r in records] == ["numbers_record_0001", "numbers_record_0002"]
    assert [r["source_row"] for r in records] == ["2", "4"]
    first, second = records
    assert (first["numbers_fighter_id"], first["matched_fighter_id"], first["event_number_normalized"], first["result"]) == (
        "numbers_fighter_001", "kabuto", "5", "win")
    # 名鑑に載っていない対戦相手は fighters.csv の完全一致で補う。
    assert (first["opponent_numbers_fighter_id"], first["opponent_matched_fighter_id"], first["opponent_candidate_fighter_id"]) == (
        "", "waku_a", "waku_a")
    assert (second["opponent_matched_fighter_id"], second["result"]) == ("", "loss")
    assert extract_fight_records([], by_name, matches, NAME_TO_ID) == []


def test_row_keys_match_the_csv_schema():
    fighters, matches, by_name = extract_fighters(fighter_table({"名前": "かぶと"}), NAME_TO_ID)
    records = extract_fight_records([RECORD_COLUMNS, ["かぶと", "", "", "", "", "わく", "", ""]], by_name, matches, NAME_TO_ID)
    assert list(fighters[0]) == CSV_HEADERS["numbers_fighters.csv"]
    assert list(matches[0]) == CSV_HEADERS["numbers_name_matches.csv"]
    assert list(records[0]) == CSV_HEADERS["numbers_fight_records.csv"]
