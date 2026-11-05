# 役割: aliases.csv の行を docs/data/aliases.json ({alias_type: {別名: 正規 ID}}) の形にする。
# アーキ上の位置: build/canonical.py の json_builders が呼ぶ。I/O はしない。
# 不変条件: alias_type は fighters・promotions・methods の 3 つ (行が無くても空の辞書で出す)。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from arakaku.schema import CsvRow


def build_aliases(aliases: list[CsvRow]) -> dict[str, dict[str, str]]:
    return {
        alias_type: {row["alias"]: row["canonical_id"] for row in aliases if row["alias_type"] == alias_type}
        for alias_type in ["fighters", "promotions", "methods"]
    }
