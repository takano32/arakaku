# 役割: 旧 arakaku.utils の名前を新しいモジュール (paths / io / text / csvmap) から再輸出する
#   一時的な互換層。利用側の import を移し終えたら削除する。
# アーキ上の位置: 新規コードはここを import しない。
# 不変条件: 新しい関数を足さない。
from __future__ import annotations

from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any, Callable

from arakaku.paths import ROOT, DATA_SRC, REVIEW, DOCS_DATA, note_cache_name  # noqa: F401
from arakaku.io import (  # noqa: F401
    CsvRow,
    atomic_open,
    read_csv,
    write_csv,
    write_json,
)
from arakaku.io import load_json as _load_json, build_json_files as _build_json_files
from arakaku.text import (  # noqa: F401
    bool_from_text,
    compact_join,
    compact_text,
    none_if_empty,
    parse_int,
    safe_slug,
    split_list,
)
from arakaku.csvmap import (  # noqa: F401
    EntityMapper,
    RowTransform,
    SchemaSpec,
    field_or_default,
    field_or_empty,
    int_field,
)

JST = timezone(timedelta(hours=9))


def build_json_files(builders: dict[str, Callable[[], Any]], done_message: str) -> None:
    _build_json_files(DOCS_DATA, builders, done_message)


def load_json(filename: str, default: Any = None) -> Any:
    return _load_json(DOCS_DATA / filename, default)


def empty_string(row: CsvRow, field: str) -> str:
    return none_if_empty(row.get(field)) or ""


def list_field(field: str) -> RowTransform:
    def _transform(row: CsvRow) -> list[str]:
        return split_list(row.get(field))

    return _transform


def line_number(row: CsvRow) -> int:
    try:
        return int(row.get("line_number") or 0)
    except ValueError:
        return 0


def get_jst_now_iso() -> str:
    return datetime.now(JST).isoformat(timespec="seconds")


def map_csv(filename: str, schema: dict[str, SchemaSpec]) -> list[dict[str, Any]]:
    return EntityMapper(read_csv(DATA_SRC / filename)).map(schema)
