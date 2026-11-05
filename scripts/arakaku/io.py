# 役割: CSV / JSON の入出力。data-src の CSV はヘッダを schema.CSV_HEADERS と照合して読み、
#   書き込みは同じディレクトリの一時ファイルに書いてから原子的に差し替える。
# アーキ上の位置: paths.py と schema.py にだけ依存する。読み書きをする全スクリプトと build/ が import する。
#   純粋なロジック (notes/ sources/ derive/ review/ と build/ の組み立て) は型 CsvRow だけを import し、
#   読み書きの関数は使わずに行のリストを受け取る。読み書きをするのは build/relations.py (load_tables) と、
#   docs/data を読む validation/runner.py・locate.py。
# 不変条件:
#   - read_csv は data-src 配下の CSV のヘッダ違い・欠落をエラーにする (列の改名や消えたファイルを
#     空の値として黙って通さないため)。まだ生成されていない中間 CSV だけ missing_ok=True で空リスト。
#   - write_json は ensure_ascii=False + indent=2 + 末尾改行の「決定的」出力 (docs/data の diff 安定のため)。
#   - write_csv は lineterminator="\n"・extrasaction="ignore" で、fieldnames が出力スキーマを固定する契約。
#   - 原子的書き込み: 書きかけのファイルを並行プロセス (make validate など) が読んで壊れた JSON と
#     判定することがあったため (T.69)。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

import csv
import json
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable, Iterator, TextIO

from arakaku.paths import DATA_SRC
from arakaku.schema import CSV_HEADERS

CsvRow = dict[str, str]


def read_csv(path: Path, missing_ok: bool = False) -> list[CsvRow]:
    try:
        rel = path.resolve().relative_to(DATA_SRC).as_posix()
    except ValueError:
        rel = None
    if not path.exists():
        if missing_ok or rel not in CSV_HEADERS:
            print(f"[warn] {path} not found")
            return []
        raise FileNotFoundError(f"{path}: required CSV is missing")
    # utf-8-sig: Numbers/Excel 由来 CSV の先頭 BOM を取り除いて読む。
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    expected = CSV_HEADERS.get(rel) if rel else None
    if expected is not None and reader.fieldnames != expected:
        actual = reader.fieldnames or []
        missing = [c for c in expected if c not in actual]
        extra = [c for c in actual if c not in expected]
        raise ValueError(
            f"{path}: header does not match arakaku/schema.py "
            f"(missing: {missing or '-'}, unexpected: {extra or '-'}, order differs: {not missing and not extra})"
        )
    return rows


def read_raw_csv(path: Path) -> tuple[list[CsvRow], list[str]]:
    """ヘッダを照合せずに読み、(行, 列名) を返す。同じ列構成で書き戻すスクリプト用。"""
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader), list(reader.fieldnames or [])


_UMASK = os.umask(0)
os.umask(_UMASK)


@contextmanager
def atomic_open(path: Path, newline: str | None = None) -> Iterator[TextIO]:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline=newline) as f:
            yield f
        os.chmod(tmp, 0o666 & ~_UMASK)  # mkstemp は 0600 で作るので、通常の open と同じ権限に戻す
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    with atomic_open(path, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"[info] {path}")


def write_json(path: Path, data: Any) -> None:
    with atomic_open(path) as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"[info] {path}")


def read_json(path: Path) -> Any:
    """必須の JSON を読む。無ければ FileNotFoundError (空として扱って出力を上書きしないため)。"""
    if not path.exists():
        raise FileNotFoundError(f"{path}: required JSON is missing (run make build)")
    return load_json(path)


def load_json(path: Path, default: Any = None) -> Any:
    # 無いファイルは default (存在の検査は呼び出し側。validation/runner.py が自分で欠けを報告する)。
    # 壊れた JSON は握りつぶさずにエラーにする。
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(f"{path}: invalid JSON: {error}") from error


def build_json_files(out_dir: Path, builders: dict[str, Callable[[], Any]], done_message: str) -> None:
    """{出力ファイル名: ビルダ関数} を順に評価して out_dir へ書き出す共通ドライバ。
    ビルダは「呼ぶまで実行されない」ので、副作用 (書き込み) の順序はここで決まる。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    for filename, build in builders.items():
        write_json(out_dir / filename, build())
    print(done_message)
