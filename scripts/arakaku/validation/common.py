# 役割: 検証関数が共有する基本の検査 (主キーの収集と一意性、必須フィールド、http(s) URL)。
# アーキ上の位置: validation/ の各モジュールが import する。
# 不変条件: collect_ids は object でない要素・空の ID・重複を error にしつつ、見つかった ID の集合を
#   返す。後段の参照整合性チェックはこの集合を受け取る。
from __future__ import annotations

from typing import Any

from .report import Report


def collect_ids(report: Report, items: list[Any], filename: str, id_field: str) -> set[str]:
    ids = set()
    seen = set()
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            report.error(f"{filename}[{i}]: expected object")
            continue
        v = item.get(id_field)
        if not isinstance(v, str) or not v.strip():
            report.error(f"{filename}[{i}]: missing required id field: {id_field}")
            continue
        if v in seen:
            report.error(f"{filename}[{i}]: duplicate {id_field}: {v}")
        seen.add(v)
        ids.add(v)
    return ids


def require_field(report: Report, obj: dict[str, Any], filename: str, index: int, field: str) -> Any:
    v = obj.get(field)
    if v is None or v == '':
        report.error(f"{filename}[{index}]: missing required field: {field}")
    return v


def is_http_url(value: Any) -> bool:
    return str(value).startswith(('http://', 'https://'))
