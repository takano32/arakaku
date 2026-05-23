import csv
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_SRC = ROOT / "data-src"
REVIEW = ROOT / "review"
DOCS_DATA = ROOT / "docs" / "data"
JST = timezone(timedelta(hours=9))

def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        print(f"[skip] {path} not found")
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"[write] {path}")

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

def get_jst_now_iso() -> str:
    return datetime.now(JST).isoformat(timespec="seconds")

class EntityMapper:
    def __init__(self, data: list[dict[str, str]]):
        self.data = data

    def map(self, schema: dict[str, Any]) -> list[dict[str, Any]]:
        out = []
        for r in self.data:
            obj = {}
            for key, spec in schema.items():
                if callable(spec):
                    obj[key] = spec(r)
                elif isinstance(spec, str):
                    obj[key] = none_if_empty(r.get(spec))
                elif spec is None:
                    obj[key] = None
                else:
                    obj[key] = spec
            out.append(obj)
        return out

