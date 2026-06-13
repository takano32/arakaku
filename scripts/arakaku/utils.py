# 役割: arakaku パッケージの共有ユーティリティ。CSV/JSON の入出力、欠損値の正規化、
#   CSV 行 -> JSON 値への宣言的マッピング (EntityMapper / map_csv) を提供する土台モジュール。
# アーキ上の位置: scripts/build_json.py, build_numbers_json.py, build_official_json.py,
#   build_official_pages_json.py, build_source_documents.py などほぼ全 build スクリプトが依存する。
#   mapping.py もここの none_if_empty / bool_from_text を再利用する。
# 不変条件:
#   - ROOT/DATA_SRC/REVIEW/DOCS_DATA のパス基準を変えると全 build スクリプトの入出力先が変わる。
#   - write_json は ensure_ascii=False + indent=2 + 末尾改行で「決定的」出力にしている (diff 安定のため)。
#   - map_csv の schema DSL (callable / dict / str / None / リテラル) は build スクリプト群が前提にしている契約。
# 関連スキル: .agents/skills/arakaku-maintainer (生成パイプライン全体の取り扱い)。

import csv
import json
import re
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any, Callable

# parents[2] = リポジトリ直下 (scripts/arakaku/utils.py から 2 つ上)。ここを基準に全パスが決まる。
ROOT = Path(__file__).resolve().parents[2]
DATA_SRC = ROOT / "data-src"
REVIEW = ROOT / "review"
DOCS_DATA = ROOT / "docs" / "data"
JST = timezone(timedelta(hours=9))
CsvRow = dict[str, str]
SchemaSpec = Any
RowTransform = Callable[[CsvRow], Any]

def read_csv(path: Path) -> list[dict[str, str]]:
    # 欠損ファイルはエラーにせず空リストで返す (まだ生成されていない中間 CSV を許容するため)。
    if not path.exists():
        print(f"[warn] {path} not found")
        return []
    # utf-8-sig: Numbers/Excel 由来 CSV の先頭 BOM を取り除いて読む。
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        # lineterminator="\n": OS 非依存の改行で書き、extrasaction="ignore" で
        # fieldnames に無い余分なキーは黙って捨てる (出力スキーマを fieldnames で固定する契約)。
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"[info] {path}")

def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        # 決定的出力: 日本語をそのまま (ensure_ascii=False)、2 スペースインデント、末尾改行。
        # フォーマットを変えると docs/data/*.json の diff が無関係に膨らむので維持すること。
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"[info] {path}")

# 各 build_*.py の main() が呼ぶ共通ドライバ: {出力ファイル名: ビルダ関数} を順に評価して
# DOCS_DATA 配下へ書き出す。ビルダは「呼ぶまで実行されない」ので副作用の順序はここで決まる。
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

# 空文字/空白のみ -> None に畳む正規化の基点。bool_from_text・split_list 等もこれ経由で
# 「未入力」を一貫して None 扱いにする。JSON 上で null と空文字を区別したい意図。
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
    # 日本語の表記ゆれ (あり/有/○ ・ なし/無/×) も真偽に解釈する。語彙を変える場合は
    # CSV の実データと validate_json の期待値の両方と整合させること。
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

def empty_string(row: CsvRow, field: str) -> str:
    return none_if_empty(row.get(field)) or ""

# 以下 field_or_default / field_or_empty / list_field / int_field は「行 -> 値」の
# RowTransform を返すファクトリ。map_csv / EntityMapper の schema 値として callable で渡される
# 前提なので、これらは値そのものではなく "関数を返す" 点に注意。
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
        # 例: "R3" の "R" を落として 3 にする (build_json の round フィールド等)。
        value = value.replace(strip_prefix, "")
    try:
        return int(value)
    except ValueError:
        # 数値化できない値は破棄せず元文字列のまま返す (事実を握り潰さない方針)。
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

# CSV 行リストを schema (宣言的 DSL) に従って JSON 用 dict 群へ変換するマッパ。
# build_*.py はこの schema を組み立てるだけで CSV->JSON 変換を表現できる。
class EntityMapper:
    def __init__(self, data: list[CsvRow]):
        self.data = data

    # spec の種類で解釈を分岐する schema DSL の本体。build スクリプト群がこの 5 規則に依存している:
    #   callable -> 行を渡して呼ぶ / dict -> 再帰してネスト構造 / str -> その列名を none_if_empty
    #   付きで参照 / None -> null / それ以外 -> リテラル値をそのまま埋め込む。
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

# data-src/<filename> を読んで schema を適用する最頻出ヘルパ。filename は DATA_SRC からの相対。
def map_csv(filename: str, schema: dict[str, SchemaSpec]) -> list[dict[str, Any]]:
    return EntityMapper(read_csv(DATA_SRC / filename)).map(schema)
