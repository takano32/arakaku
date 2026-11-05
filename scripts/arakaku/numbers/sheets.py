# 役割: Apple Numbers の選手名鑑の 2 つの表 (シート「全体」と「個人成績」) を、numbers_fighters /
#   numbers_name_matches / numbers_fight_records の CSV の行にする。
# アーキ上の位置: scripts/extract_numbers.py が numbers_parser で表を開き、その Document.sheets を
#   sheet_table_rows に渡してセルを文字列にした行 (list[list[str]]) にし、ここで組み立てた行を write_csv する。
#   ここは numbers_parser を import しない (CI でも import できる)。シートが足りなければ書く前に止まる。
# 不変条件:
#   - 「全体」は 1 行目がタイトル、2 行目が見出し、3 行目からがデータ。「個人成績」は 1 行目が見出し。
#   - 行の辞書のキーは schema.CSV_HEADERS の numbers_*.csv の見出しと同じ (テストで確かめる)。
#   - Numbers 由来データは比較データで、正規 CSV へ昇格させない。
# 関連スキル: .agents/skills/arakaku-numbers-pipeline。
from __future__ import annotations

from arakaku.numbers.cells import (
    RESULT_MAP,
    NumbersSchemaError,
    clean_division,
    clean_event_number,
    clean_number,
    clean_text,
    cell_text,
    promotion_id,
    require_columns,
    row_dict,
)
from arakaku.numbers.names import NameMatch, match_name, normalized_name_map, numbers_fighter_id, numbers_record_id

# シート「全体」と「個人成績」に必要な見出し。
FIGHTER_COLUMNS = [
    "白グローブ出場回数",
    "優勝",
    "出場回",
    "ベルト",
    "名前",
    "階級",
    "キャッチコピー",
    "主戦団体",
    "年齢",
    "身長",
    "所属",
    "試合数",
    "勝",
    "負",
    "勝率",
    "備考",
]
RECORD_COLUMNS = ["名前", "階級", "団体", "No", "形式", "対戦相手", "勝敗", "詳細"]

TableRows = list[list[str]]


def sheet_table_rows(sheets, index: int, sheet_name: str) -> TableRows:
    """index 番目のシートの最初の表を、セルを文字列にした行のリストにする。

    sheets は numbers_parser の Document.sheets (ここでは型を import しない)。シートが足りないときは
    NumbersSchemaError にする (T112.6.1: 空のリストを返すと「記録なし」として見出しだけの CSV を書いてしまう)。
    """
    if len(sheets) <= index:
        raise NumbersSchemaError(f"Numbers sheet {sheet_name} (index {index}) is missing")
    return [[cell_text(cell) for cell in row] for row in sheets[index].tables[0].rows()]


def fighter_row(nf_id: str, source_row: int, name: str, raw: dict[str, str]) -> dict[str, str]:
    return {
        "numbers_fighter_id": nf_id,
        "source_sheet": "全体",
        "source_row": str(source_row),
        "display_name": name,
        "main_division": clean_division(raw["階級"]),
        "main_promotion_raw": clean_text(raw["主戦団体"]),
        "main_promotion_id": promotion_id(raw["主戦団体"]),
        "age": clean_number(raw["年齢"]),
        "height": clean_text(raw["身長"]),
        "gym": clean_text(raw["所属"]),
        "fight_count": clean_number(raw["試合数"]),
        "wins": clean_number(raw["勝"]),
        "losses": clean_number(raw["負"]),
        "win_rate": clean_text(raw["勝率"]),
        "white_glove_count": clean_number(raw["白グローブ出場回数"]),
        "tournament_win_marker": clean_text(raw["優勝"]),
        "tournament_entry_raw": clean_text(raw["出場回"]),
        "belt_marker": clean_text(raw["ベルト"]),
        "catchphrase": clean_text(raw["キャッチコピー"]),
        "notes": clean_text(raw["備考"]),
        "source_confidence": "numbers",
    }


def name_match_row(nf_id: str, name: str, match: NameMatch) -> dict[str, str]:
    return {
        "numbers_fighter_id": nf_id,
        "numbers_name": name,
        "matched_fighter_id": match.matched_id,
        "matched_display_name": match.matched_display_name,
        "candidate_fighter_id": match.candidate_id,
        "match_method": match.method,
        "match_confidence": match.confidence,
        "notes": match.notes,
    }


def record_row(
    record_id: str,
    source_row: int,
    raw: dict[str, str],
    fighter: dict[str, str],
    fighter_match: dict[str, str],
    opponent: dict[str, str],
    opponent_match: dict[str, str],
) -> dict[str, str]:
    result_mark = clean_text(raw["勝敗"])
    return {
        "record_id": record_id,
        "source_sheet": "個人成績",
        "source_row": str(source_row),
        "numbers_fighter_id": fighter.get("numbers_fighter_id", ""),
        "fighter_name": clean_text(raw["名前"]),
        "matched_fighter_id": fighter_match.get("matched_fighter_id", ""),
        "candidate_fighter_id": fighter_match.get("candidate_fighter_id", ""),
        "division": clean_division(raw["階級"]),
        "promotion_raw": clean_text(raw["団体"]),
        "promotion_id": promotion_id(raw["団体"]),
        "event_number_raw": clean_text(raw["No"]),
        "event_number_normalized": clean_event_number(raw["No"]),
        "bout_format": clean_text(raw["形式"]),
        "opponent_name": clean_text(raw["対戦相手"]),
        "opponent_numbers_fighter_id": opponent.get("numbers_fighter_id", ""),
        "opponent_matched_fighter_id": opponent_match.get("matched_fighter_id", ""),
        "opponent_candidate_fighter_id": opponent_match.get("candidate_fighter_id", ""),
        "result_mark": result_mark,
        "result": RESULT_MAP.get(result_mark, ""),
        "detail_raw": clean_text(raw["詳細"]),
    }


def extract_fighters(
    table_rows: TableRows, name_to_id: dict[str, str]
) -> tuple[list[dict[str, str]], list[dict[str, str]], dict[str, dict[str, str]]]:
    """シート「全体」の行から (numbers_fighters の行, numbers_name_matches の行, 名前 -> numbers_fighters の行)。"""
    if len(table_rows) < 2:
        raise NumbersSchemaError("No fighter data found in the Numbers file.")

    # シート「全体」はヘッダが 2 行目 (index 1) にある前提。1 行目はタイトル行のため捨て、
    # データは 3 行目以降。シート「個人成績」とはヘッダ位置が異なる点に注意。
    header = list(table_rows[1])
    require_columns(header, FIGHTER_COLUMNS, "全体")

    fighters: list[dict[str, str]] = []
    matches: list[dict[str, str]] = []
    by_name: dict[str, dict[str, str]] = {}
    by_normalized_name = normalized_name_map(name_to_id)

    for source_row, row in enumerate(table_rows[2:], start=3):
        raw = row_dict(header, row)
        name = clean_text(raw["名前"])
        if not name:
            continue

        nf_id = numbers_fighter_id(len(fighters) + 1)
        fighter = fighter_row(nf_id, source_row, name, raw)
        fighters.append(fighter)
        by_name[name] = fighter
        matches.append(name_match_row(nf_id, name, match_name(name, name_to_id, by_normalized_name)))

    return fighters, matches, by_name


def extract_fight_records(
    table_rows: TableRows,
    fighters_by_name: dict[str, dict[str, str]],
    matches: list[dict[str, str]],
    name_to_id: dict[str, str],
) -> list[dict[str, str]]:
    """シート「個人成績」の行から numbers_fight_records の行。表が無ければ (行が 0 なら) 空。"""
    if not table_rows:
        return []

    match_by_numbers_id = {row["numbers_fighter_id"]: row for row in matches}

    header = list(table_rows[0])
    require_columns(header, RECORD_COLUMNS, "個人成績")

    records: list[dict[str, str]] = []
    for source_row, row in enumerate(table_rows[1:], start=2):
        raw = row_dict(header, row)
        fighter_name = clean_text(raw["名前"])
        opponent_name = clean_text(raw["対戦相手"])
        if not fighter_name and not opponent_name:
            continue

        fighter = fighters_by_name.get(fighter_name, {})
        opponent = fighters_by_name.get(opponent_name, {})
        fighter_match = match_by_numbers_id.get(fighter.get("numbers_fighter_id", ""), {})
        opponent_match = match_by_numbers_id.get(opponent.get("numbers_fighter_id", ""), {})
        # 名鑑に載っていない対戦相手は名鑑側に照合結果が無いので、fighters.csv の完全一致で補う。
        if not opponent_match and opponent_name in name_to_id:
            opponent_match = {"matched_fighter_id": name_to_id[opponent_name], "candidate_fighter_id": name_to_id[opponent_name]}

        records.append(record_row(numbers_record_id(len(records) + 1), source_row, raw, fighter, fighter_match, opponent, opponent_match))

    return records
