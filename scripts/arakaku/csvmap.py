# 役割: CSV 行のリストを宣言的な schema に従って JSON 用 dict へ変換する小さな DSL
#   (EntityMapper / map_rows) と、schema の値として使う「行 -> 値」変換のファクトリ。
# アーキ上の位置: build/ の各ビルダが schema を組み立てて map_rows を呼ぶ。I/O はしない
#   (行は呼び出し側が arakaku.io.read_csv で読む)。
# 不変条件: schema の値は 5 規則で解釈する (build/ 側が前提にしている契約):
#   callable -> 行を渡して呼ぶ / dict -> 再帰してネスト構造 / str -> その列名を none_if_empty 付きで
#   参照 / None -> null / それ以外 -> リテラル値をそのまま埋め込む。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any, Callable

from arakaku.io import CsvRow
from arakaku.text import none_if_empty, parse_int

SchemaSpec = Any
RowTransform = Callable[[CsvRow], Any]


# 以下のファクトリは値そのものではなく "行 -> 値" の関数を返す点に注意
# (schema の値として callable で渡される前提)。
def field_or_default(field: str, default: str) -> RowTransform:
    def _transform(row: CsvRow) -> str:
        return none_if_empty(row.get(field)) or default

    return _transform


def field_or_empty(field: str) -> RowTransform:
    def _transform(row: CsvRow) -> str:
        return none_if_empty(row.get(field)) or ""

    return _transform


def int_field(field: str, *, strip_prefix: str = "") -> RowTransform:
    def _transform(row: CsvRow) -> int | str | None:
        return parse_int(row.get(field), strip_prefix=strip_prefix)

    return _transform


class EntityMapper:
    def __init__(self, data: list[CsvRow]):
        self.data = data

    def _value(self, row: CsvRow, spec: SchemaSpec) -> Any:
        if callable(spec):
            return spec(row)
        if isinstance(spec, dict):
            return {key: self._value(row, value) for key, value in spec.items()}
        if isinstance(spec, str):
            return none_if_empty(row.get(spec))
        if spec is None:
            return None
        return spec

    def map(self, schema: dict[str, SchemaSpec]) -> list[dict[str, Any]]:
        return [{key: self._value(row, spec) for key, spec in schema.items()} for row in self.data]


def map_rows(rows: list[CsvRow], schema: dict[str, SchemaSpec]) -> list[dict[str, Any]]:
    return EntityMapper(rows).map(schema)
