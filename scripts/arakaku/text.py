# 役割: 文字列・セル値の小さな純粋関数群。空値の正規化 (none_if_empty)、真偽・整数・リストへの
#   解釈、レビュー用の短縮表示 (compact_*)、ファイル名向けスラッグ化、NFKC 正規化を提供する。
# アーキ上の位置: arakaku パッケージの最下層 (標準ライブラリ以外に依存しない)。csvmap.py・paths.py・
#   build/・notes/・review/ が import する。
# 不変条件:
#   - none_if_empty が「未入力 = None」の基点。bool_from_text・split_list・parse_int はこれ経由で
#     空値を一貫して None / [] 扱いにする (JSON 上で null と空文字を区別する意図)。
#   - bool_from_text の語彙 (あり/有/○ ・ なし/無/×) は CSV の実データと validate の期待値に合わせる。
#   - parse_int は数値化できない値を捨てず元の文字列のまま返す (事実を握り潰さない方針)。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

import re
import unicodedata


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
    # 日本語の表記ゆれ (あり/有/○ ・ なし/無/×) も真偽に解釈する。
    if normalized in {"true", "yes", "1", "あり", "有", "○"}:
        return True
    if normalized in {"false", "no", "0", "なし", "無", "×"}:
        return False
    # 解釈不能な値は None (= 未確定) として残す。勝手に False に倒さない。
    return None


def split_list(value: str | None) -> list[str]:
    value = none_if_empty(value)
    if value is None:
        return []
    # 全角読点/スラッシュ含む複数の区切りをカンマに寄せてから分割する (区切り文字の表記ゆれ吸収)。
    for sep in ["、", "/", "／"]:
        value = value.replace(sep, ",")
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_int(value: str | None, *, strip_prefix: str = "") -> int | str | None:
    value = none_if_empty(value)
    if value is None:
        return None
    if strip_prefix:
        # 例: "R3" の "R" を落として 3 にする (bouts の round フィールド等)。
        value = value.replace(strip_prefix, "")
    try:
        return int(value)
    except ValueError:
        return value


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


def nfkc(text: str) -> str:
    """NFKC 正規化 (全角数字・英字を半角に、① を 1 に、（）を () にする)。"""
    return unicodedata.normalize("NFKC", text)
