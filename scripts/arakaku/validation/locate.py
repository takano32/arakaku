# 役割: "bouts.json[12]: ..." のようなエラーに、元の CSV ファイル・行番号・主キーを補う
#   (AGENTS.md: file, row, field and ID を報告する)。
# アーキ上の位置: runner.py がエラーを表示する直前に呼ぶ。docs/data の JSON と data-src の CSV を
#   読むので、このパッケージで唯一 I/O をするモジュール (runner の JSON 読み込みを除く)。
# 不変条件: 生成 JSON のリストは CSV の行順を保つ前提。行番号はその index の ID が JSON と CSV で
#   一致するときだけ付け、並べ替えられたビルドが別の行を指さないようにする。
from __future__ import annotations

import re
from pathlib import Path

from arakaku.io import load_json, read_csv
from arakaku.paths import DATA_SRC, DOCS_DATA

ROW_SOURCES = {
    'bouts.json': ('bouts.csv', 'bout_id'), 'events.json': ('events.csv', 'event_id'),
    'fighters.json': ('fighters.csv', 'fighter_id'), 'bout_participants.json': ('bout_participants.csv', 'participant_id'),
    'videos.json': ('videos.csv', 'video_id'), 'title_reigns.json': ('title_reigns.csv', 'reign_id'),
    'articles.json': ('articles.csv', 'article_id'), 'titles.json': ('titles.csv', 'title_id'),
    'promotions.json': ('promotions.csv', 'promotion_id'), 'fighter_snapshots.json': ('fighter_snapshots.csv', 'snapshot_id'),
    'source_documents.json': ('source_documents.csv', 'source_id'), 'source_mentions.json': ('source_mentions.csv', 'mention_id'),
    'article_links.json': ('article_links.csv', 'link_id'), 'official_players.json': ('official_players.csv', 'id'),
}
ERROR_ROW = re.compile(r'^([a-z_]+\.json)\[(\d+)\]')


def locate_error(message: str, docs_data: Path = DOCS_DATA, data_src: Path = DATA_SRC) -> str:
    m = ERROR_ROW.match(message)
    if not m or m.group(1) not in ROW_SOURCES:
        return message
    csv_name, id_field = ROW_SOURCES[m.group(1)]
    items = load_json(docs_data / m.group(1), [])
    index = int(m.group(2))
    if not isinstance(items, list) or index >= len(items) or not isinstance(items[index], dict):
        return message
    record_id = items[index].get(id_field)
    rows = read_csv(data_src / csv_name, missing_ok=True)
    where = f"{id_field}={record_id}"
    if index < len(rows) and rows[index].get(id_field) == record_id:
        where = f"data-src/{csv_name}:{index + 2}, {where}"
    return f"{message}  [{where}]"
