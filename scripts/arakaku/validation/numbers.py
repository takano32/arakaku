# 役割: Apple Numbers 由来の numbers_*.json (fighters / name_matches / fight_records) の検証。
#   名鑑 ID の一意性と、正規 fighters への照合先 (matched_fighter_id) の存在を見る。
# アーキ上の位置: runner.py が fighters の検証で集めた fighter_ids を渡して呼ぶ。
# 関連スキル: .agents/skills/arakaku-numbers-pipeline。
from __future__ import annotations

from typing import Any

from .common import collect_ids, require_field
from .report import Report


def validate_numbers_data(report: Report, numbers_fighters: list[Any], matches: list[Any], records: list[Any], fighter_ids: set[str]) -> None:
    numbers_ids = collect_ids(report, numbers_fighters, 'numbers_fighters.json', 'numbers_fighter_id')
    matched_by_numbers_id = set()
    for index, row in enumerate(matches):
        if not isinstance(row, dict):
            report.error(f"numbers_name_matches.json[{index}]: expected object")
            continue
        numbers_id = require_field(report, row, 'numbers_name_matches.json', index, 'numbers_fighter_id')
        if numbers_id and numbers_id not in numbers_ids:
            report.error(f"numbers_name_matches.json[{index}]: unknown numbers_fighter_id: {numbers_id}")
        if numbers_id in matched_by_numbers_id:
            report.error(f"numbers_name_matches.json[{index}]: duplicate numbers_fighter_id: {numbers_id}")
        matched_by_numbers_id.add(numbers_id)
        matched_fighter_id = row.get('matched_fighter_id')
        if matched_fighter_id and matched_fighter_id not in fighter_ids:
            report.error(f"numbers_name_matches.json[{index}]: unknown matched_fighter_id: {matched_fighter_id}")
        require_field(report, row, 'numbers_name_matches.json', index, 'candidate_fighter_id')
        require_field(report, row, 'numbers_name_matches.json', index, 'match_method')

    collect_ids(report, records, 'numbers_fight_records.json', 'record_id')
    for index, row in enumerate(records):
        if not isinstance(row, dict):
            report.error(f"numbers_fight_records.json[{index}]: expected object")
            continue
        numbers_id = row.get('numbers_fighter_id')
        if numbers_id and numbers_id not in numbers_ids:
            report.error(f"numbers_fight_records.json[{index}]: unknown numbers_fighter_id: {numbers_id}")
        opponent_numbers_id = row.get('opponent_numbers_fighter_id')
        if opponent_numbers_id and opponent_numbers_id not in numbers_ids:
            report.error(f"numbers_fight_records.json[{index}]: unknown opponent_numbers_fighter_id: {opponent_numbers_id}")
        for field in ['matched_fighter_id', 'opponent_matched_fighter_id']:
            fighter_id = row.get(field)
            if fighter_id and fighter_id not in fighter_ids:
                report.error(f"numbers_fight_records.json[{index}]: unknown {field}: {fighter_id}")
        result = row.get('result')
        if result and result not in {'win', 'loss'}:
            report.error(f"numbers_fight_records.json[{index}]: unusual result: {result}")
