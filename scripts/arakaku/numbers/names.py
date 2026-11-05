# 役割: Numbers の選手名を fighters.csv の選手に照合する規則と、Numbers 由来の合成 ID。
# アーキ上の位置: arakaku/numbers/sheets.py が使う。I/O はしない。
# 不変条件:
#   - 照合は完全一致 (high) → 表記ゆれを除いた名前で候補が 1 人に決まるとき (medium) → どちらも無ければ
#     名前から作った候補 ID (generated_candidate) の順。あいまいな一致は採らない。
#   - normalized_name は viewer の normalizeFighterName (docs/assets/js/data/names.js) と同じ規則。
#   - numbers_fighter_* / numbers_record_* は正規 fighters.csv の ID とは別の名前空間。
# 関連スキル: .agents/skills/arakaku-numbers-pipeline。
from __future__ import annotations

import unicodedata
from dataclasses import dataclass

from arakaku.text import safe_slug


def generated_fighter_id(name: str) -> str:
    slug = safe_slug(name).lower()
    if slug:
        return slug
    return name.replace(" ", "_").replace("　", "_")


# Numbers 由来の合成 ID。正規 fighters.csv の ID とは別名前空間。突合は
# numbers_name_matches.csv 側 (matched_fighter_id) で行うので衝突を気にしなくてよい。
def numbers_fighter_id(index: int) -> str:
    return f"numbers_fighter_{index:03d}"


def numbers_record_id(index: int) -> str:
    return f"numbers_record_{index:04d}"


# viewer の normalizeFighterName (docs/assets/js/data/names.js) と同じ規則: NFKC 後に中黒・空白・ピリオドを除き小文字化。
def normalized_name(name: str) -> str:
    text = unicodedata.normalize("NFKC", name)
    for ch in ("・", "　", " ", ".", "．"):
        text = text.replace(ch, "")
    return text.lower()


def normalized_name_map(name_to_id: dict[str, str]) -> dict[str, list[tuple[str, str]]]:
    by_key: dict[str, list[tuple[str, str]]] = {}
    for display_name, fighter_id in name_to_id.items():
        by_key.setdefault(normalized_name(display_name), []).append((fighter_id, display_name))
    return by_key


@dataclass(frozen=True)
class NameMatch:
    matched_id: str
    matched_display_name: str
    method: str
    confidence: str
    notes: str
    candidate_id: str


def match_name(name: str, name_to_id: dict[str, str], by_normalized: dict[str, list[tuple[str, str]]]) -> NameMatch:
    """名鑑の名前を fighters.csv の display_name に照合する (name_to_id は display_name -> fighter_id)。"""
    matched_id = name_to_id.get(name, "")
    matched_display_name = name if matched_id else ""
    method = "exact_display_name" if matched_id else "generated_candidate"
    confidence = "high" if matched_id else "candidate"
    notes = "" if matched_id else "No exact display_name match in fighters.csv."
    # 完全一致が無いときだけ、表記ゆれ (中黒・空白・ピリオド・全半角) を除いた名前で照合する。
    # 候補が 1 人に決まる場合に限り採用し、強い対応ではないので medium にする。
    normalized_hits = by_normalized.get(normalized_name(name), [])
    if not matched_id and len(normalized_hits) == 1:
        matched_id, matched_display_name = normalized_hits[0]
        method = "normalized_display_name"
        confidence = "medium"
        notes = "Matched after removing middle dots, spaces, and periods."
    return NameMatch(
        matched_id=matched_id,
        matched_display_name=matched_display_name,
        method=method,
        confidence=confidence,
        notes=notes,
        candidate_id=matched_id or generated_fighter_id(name),
    )
