#!/usr/bin/env python3
from __future__ import annotations

from numbers_parser import Document

from arakaku.utils import DATA_SRC, ROOT, read_csv, safe_slug, write_csv


NUMBERS_PATH = ROOT / "data-raw" / "アラカク選手名鑑.numbers"

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


def cell_text(cell) -> str:
    return str(cell.value) if cell.value is not None else ""


def clean_text(value: str) -> str:
    return value.strip()


def clean_number(value: str) -> str:
    value = clean_text(value)
    if value.endswith(".0"):
        return value[:-2]
    return value


def clean_division(value: str) -> str:
    raw = clean_text(value)
    if raw in ["ライト", "ミドル", "ヘビー"]:
        return raw + "級"
    return raw


def promotion_id(value: str) -> str:
    raw = clean_text(value)
    return PROMOTION_MAP.get(raw, raw.lower())


def generated_fighter_id(name: str) -> str:
    slug = safe_slug(name).lower()
    if slug:
        return slug
    return name.replace(" ", "_").replace("　", "_")


def require_columns(header: list[str], columns: list[str], sheet_name: str) -> dict[str, int]:
    indexes: dict[str, int] = {}
    for column in columns:
        try:
            indexes[column] = header.index(column)
        except ValueError as exc:
            raise SystemExit(f"[error] Missing required column in Numbers {sheet_name}: {column}") from exc
    return indexes


def row_dict(header: list[str], row) -> dict[str, str]:
    values = [cell_text(cell) for cell in row]
    if len(values) < len(header):
        values.extend([""] * (len(header) - len(values)))
    return {name: values[index] for index, name in enumerate(header) if name}


def numbers_fighter_id(index: int) -> str:
    return f"numbers_fighter_{index:03d}"


def numbers_record_id(index: int) -> str:
    return f"numbers_record_{index:04d}"


def existing_name_map() -> dict[str, str]:
    return {
        row["display_name"]: row["fighter_id"]
        for row in read_csv(DATA_SRC / "fighters.csv")
        if row.get("display_name") and row.get("fighter_id")
    }


def extract_fighters(doc: Document, name_to_id: dict[str, str]) -> tuple[list[dict[str, str]], list[dict[str, str]], dict[str, dict[str, str]]]:
    sheet = doc.sheets[0]
    table = sheet.tables[0]
    table_rows = list(table.rows())
    if len(table_rows) < 2:
        raise SystemExit("[error] No fighter data found in the Numbers file.")

    header = [cell_text(cell) for cell in table_rows[1]]
    required = [
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
    require_columns(header, required, "全体")

    fighters: list[dict[str, str]] = []
    matches: list[dict[str, str]] = []
    by_name: dict[str, dict[str, str]] = {}

    for source_row, row in enumerate(table_rows[2:], start=3):
        raw = row_dict(header, row)
        name = clean_text(raw["名前"])
        if not name:
            continue

        index = len(fighters) + 1
        nf_id = numbers_fighter_id(index)
        matched_id = name_to_id.get(name, "")
        candidate_id = matched_id or generated_fighter_id(name)

        fighter = {
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
        fighters.append(fighter)
        by_name[name] = fighter

        matches.append(
            {
                "numbers_fighter_id": nf_id,
                "numbers_name": name,
                "matched_fighter_id": matched_id,
                "matched_display_name": name if matched_id else "",
                "candidate_fighter_id": candidate_id,
                "match_method": "exact_display_name" if matched_id else "generated_candidate",
                "match_confidence": "high" if matched_id else "candidate",
                "notes": "" if matched_id else "No exact display_name match in fighters.csv.",
            }
        )

    return fighters, matches, by_name


def extract_fight_records(doc: Document, fighters_by_name: dict[str, dict[str, str]], matches: list[dict[str, str]]) -> list[dict[str, str]]:
    if len(doc.sheets) < 2:
        return []

    match_by_numbers_id = {row["numbers_fighter_id"]: row for row in matches}
    fighter_by_name = fighters_by_name

    sheet = doc.sheets[1]
    table = sheet.tables[0]
    table_rows = list(table.rows())
    if not table_rows:
        return []

    header = [cell_text(cell) for cell in table_rows[0]]
    required = ["名前", "階級", "団体", "No", "形式", "対戦相手", "勝敗", "詳細"]
    require_columns(header, required, "個人成績")

    records: list[dict[str, str]] = []
    for source_row, row in enumerate(table_rows[1:], start=2):
        raw = row_dict(header, row)
        fighter_name = clean_text(raw["名前"])
        opponent_name = clean_text(raw["対戦相手"])
        if not fighter_name and not opponent_name:
            continue

        fighter = fighter_by_name.get(fighter_name, {})
        opponent = fighter_by_name.get(opponent_name, {})
        fighter_match = match_by_numbers_id.get(fighter.get("numbers_fighter_id", ""), {})
        opponent_match = match_by_numbers_id.get(opponent.get("numbers_fighter_id", ""), {})
        result_mark = clean_text(raw["勝敗"])

        records.append(
            {
                "record_id": numbers_record_id(len(records) + 1),
                "source_sheet": "個人成績",
                "source_row": str(source_row),
                "numbers_fighter_id": fighter.get("numbers_fighter_id", ""),
                "fighter_name": fighter_name,
                "matched_fighter_id": fighter_match.get("matched_fighter_id", ""),
                "candidate_fighter_id": fighter_match.get("candidate_fighter_id", ""),
                "division": clean_division(raw["階級"]),
                "promotion_raw": clean_text(raw["団体"]),
                "promotion_id": promotion_id(raw["団体"]),
                "event_number_raw": clean_text(raw["No"]),
                "event_number_normalized": clean_number(raw["No"]),
                "bout_format": clean_text(raw["形式"]),
                "opponent_name": opponent_name,
                "opponent_numbers_fighter_id": opponent.get("numbers_fighter_id", ""),
                "opponent_matched_fighter_id": opponent_match.get("matched_fighter_id", ""),
                "opponent_candidate_fighter_id": opponent_match.get("candidate_fighter_id", ""),
                "result_mark": result_mark,
                "result": RESULT_MAP.get(result_mark, ""),
                "detail_raw": clean_text(raw["詳細"]),
            }
        )

    return records


def main() -> None:
    if not NUMBERS_PATH.exists():
        raise SystemExit(f"[error] {NUMBERS_PATH} not found.")

    doc = Document(str(NUMBERS_PATH))
    name_to_id = existing_name_map()
    fighters, matches, fighters_by_name = extract_fighters(doc, name_to_id)
    fight_records = extract_fight_records(doc, fighters_by_name, matches)

    write_csv(
        DATA_SRC / "numbers_fighters.csv",
        [
            "numbers_fighter_id",
            "source_sheet",
            "source_row",
            "display_name",
            "main_division",
            "main_promotion_raw",
            "main_promotion_id",
            "age",
            "height",
            "gym",
            "fight_count",
            "wins",
            "losses",
            "win_rate",
            "white_glove_count",
            "tournament_win_marker",
            "tournament_entry_raw",
            "belt_marker",
            "catchphrase",
            "notes",
            "source_confidence",
        ],
        fighters,
    )
    write_csv(
        DATA_SRC / "numbers_name_matches.csv",
        [
            "numbers_fighter_id",
            "numbers_name",
            "matched_fighter_id",
            "matched_display_name",
            "candidate_fighter_id",
            "match_method",
            "match_confidence",
            "notes",
        ],
        matches,
    )
    write_csv(
        DATA_SRC / "numbers_fight_records.csv",
        [
            "record_id",
            "source_sheet",
            "source_row",
            "numbers_fighter_id",
            "fighter_name",
            "matched_fighter_id",
            "candidate_fighter_id",
            "division",
            "promotion_raw",
            "promotion_id",
            "event_number_raw",
            "event_number_normalized",
            "bout_format",
            "opponent_name",
            "opponent_numbers_fighter_id",
            "opponent_matched_fighter_id",
            "opponent_candidate_fighter_id",
            "result_mark",
            "result",
            "detail_raw",
        ],
        fight_records,
    )
    print(
        "[done] Numbers export completed: "
        f"{len(fighters)} fighters, {len(matches)} matches, {len(fight_records)} fight records."
    )


if __name__ == "__main__":
    main()
