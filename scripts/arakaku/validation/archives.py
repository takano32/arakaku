# 役割: アーカイブ JSON (youtube_archives / note_archives) の主キー・必須フィールド・URL の検証。
# アーキ上の位置: runner.py が呼ぶ。アーカイブは表示・検索・レビュー専用で、勝敗や選手同定は確認しない。
# 関連スキル: .agents/skills/arakaku-source-pipeline。
from __future__ import annotations

from typing import Any

from .common import collect_ids, is_http_url, require_field
from .report import Report


def validate_archive_data(report: Report, youtube_archives: list[Any], note_archives: list[Any]) -> None:
    collect_ids(report, youtube_archives, 'youtube_archives.json', 'display_id')
    for index, row in enumerate(youtube_archives):
        if not isinstance(row, dict):
            report.error(f"youtube_archives.json[{index}]: expected object")
            continue
        for field in ['webpage_url', 'fulltitle', 'archived_at']:
            require_field(report, row, 'youtube_archives.json', index, field)
        url = row.get('webpage_url')
        if url and not is_http_url(url):
            report.error(f"youtube_archives.json[{index}]: invalid webpage_url: {url}")

    collect_ids(report, note_archives, 'note_archives.json', 'filename')
    for index, row in enumerate(note_archives):
        if not isinstance(row, dict):
            report.error(f"note_archives.json[{index}]: expected object")
            continue
        for field in ['webpage_url', 'title', 'archived_at']:
            require_field(report, row, 'note_archives.json', index, field)
        url = row.get('webpage_url')
        if url and not is_http_url(url):
            report.error(f"note_archives.json[{index}]: invalid webpage_url: {url}")
