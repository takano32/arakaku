import csv
import json
import re
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
DATA_SRC = ROOT / "data-src"
REVIEW = ROOT / "review"
DOCS_DATA = ROOT / "docs" / "data"
JST = timezone(timedelta(hours=9))
CsvRow = dict[str, str]
SchemaSpec = Any
RowTransform = Callable[[CsvRow], Any]

def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        print(f"[warn] {path} not found")
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"[info] {path}")

def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"[info] {path}")

def build_json_files(builders: dict[str, Callable[[], Any]], done_message: str) -> None:
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    for filename, build in builders.items():
        write_json(DOCS_DATA / filename, build())
    print(done_message)

def load_json(filename: str, default: Any = None) -> Any:
    p = DOCS_DATA / filename
    if not p.exists():
        return default
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default

def none_if_empty(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value if value else None

def bool_from_text(value: str | None) -> bool | None:
    value = none_if_empty(value)
    if value is None:
        return None
    normalized = value.lower()
    if normalized in {"true", "yes", "1", "あり", "有", "○"}:
        return True
    if normalized in {"false", "no", "0", "なし", "無", "×"}:
        return False
    return None

def split_list(value: str | None) -> list[str]:
    value = none_if_empty(value)
    if value is None:
        return []
    for sep in ["、", "/", "／"]:
        value = value.replace(sep, ",")
    return [item.strip() for item in value.split(",") if item.strip()]

def empty_string(row: CsvRow, field: str) -> str:
    return none_if_empty(row.get(field)) or ""

def field_or_default(field: str, default: str) -> RowTransform:
    def _transform(row: CsvRow) -> str:
        return none_if_empty(row.get(field)) or default

    return _transform

def field_or_empty(field: str) -> RowTransform:
    def _transform(row: CsvRow) -> str:
        return empty_string(row, field)

    return _transform

def list_field(field: str) -> RowTransform:
    def _transform(row: CsvRow) -> list[str]:
        return split_list(row.get(field))

    return _transform

def parse_int(value: str | None, *, strip_prefix: str = "") -> int | str | None:
    value = none_if_empty(value)
    if value is None:
        return None
    if strip_prefix:
        value = value.replace(strip_prefix, "")
    try:
        return int(value)
    except ValueError:
        return value

def int_field(field: str, *, strip_prefix: str = "") -> RowTransform:
    def _transform(row: CsvRow) -> int | str | None:
        return parse_int(row.get(field), strip_prefix=strip_prefix)

    return _transform

def compact_join(values: list[str], limit: int = 5) -> str:
    unique = []
    for value in values:
        value = (value or "").strip()
        if value and value not in unique:
            unique.append(value)
    return " | ".join(unique[:limit])

def compact_text(value: str, limit: int = 240) -> str:
    value = " ".join((value or "").split())
    if len(value) <= limit:
        return value
    return value[:limit].rstrip() + "..."

def safe_slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", value).strip("_")

def note_cache_name(article_id: str, url: str) -> str:
    # tmp/note-html/ のキャッシュファイル名契約。writer (cache_note_html.py) と
    # reader (build_source_documents.py) で必ず同じ名前になるようここで一元管理する。
    raw = article_id or url
    return f"{safe_slug(raw)}.html"

def line_number(row: CsvRow) -> int:
    try:
        return int(row.get("line_number") or 0)
    except ValueError:
        return 0

def get_jst_now_iso() -> str:
    return datetime.now(JST).isoformat(timespec="seconds")

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

    def map(self, schema: dict[str, Any]) -> list[dict[str, Any]]:
        out = []
        for r in self.data:
            out.append({key: self._value(r, spec) for key, spec in schema.items()})
        return out

def map_csv(filename: str, schema: dict[str, SchemaSpec]) -> list[dict[str, Any]]:
    return EntityMapper(read_csv(DATA_SRC / filename)).map(schema)
