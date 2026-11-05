"""純粋なモジュールが入出力の層 (arakaku.io・arakaku.paths) を import していないことを、ソースの ast で確かめる。

純粋なモジュールは行のリストや文字列を受け取って返すだけで、どのファイルを読み書きするかは
scripts/*.py の入口と build/relations.py (load_tables)・validation/runner.py が決める。
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

PACKAGE = Path(__file__).resolve().parents[1] / "scripts" / "arakaku"
IO_LAYER = {"arakaku.io", "arakaku.paths"}

PURE_PACKAGES = ["notes", "sources", "derive", "review"]
PURE_MODULES = [
    "csvmap.py",
    "text.py",
    "textparse.py",
    "event_dates.py",
    "build/canonical.py",
    "build/numbers.py",
    "build/official.py",
]


def pure_module_paths() -> list[Path]:
    paths = [path for package in PURE_PACKAGES for path in sorted((PACKAGE / package).glob("*.py"))]
    paths += [PACKAGE / name for name in PURE_MODULES]
    return paths


def imported_modules(path: Path) -> set[str]:
    """`import a.b` と `from a.b import c` の両方を、モジュールの完全な名前 (a.b と a.b.c) で集める。"""
    names: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"), filename=str(path))):
        if isinstance(node, ast.Import):
            names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            names.add(node.module)
            names.update(f"{node.module}.{alias.name}" for alias in node.names)
    return names


def test_pure_module_list_is_not_empty_and_exists():
    paths = pure_module_paths()
    assert len(paths) > len(PURE_MODULES)
    for path in paths:
        assert path.is_file(), path


@pytest.mark.parametrize("path", pure_module_paths(), ids=lambda p: p.relative_to(PACKAGE).as_posix())
def test_pure_module_does_not_import_io_layer(path: Path):
    assert imported_modules(path) & IO_LAYER == set()


def test_imported_modules_sees_both_import_forms(tmp_path: Path):
    source = tmp_path / "sample.py"
    source.write_text("import arakaku.io\nfrom arakaku import paths\nfrom arakaku.schema import CsvRow\n", encoding="utf-8")
    assert {"arakaku.io", "arakaku.paths", "arakaku.schema"} <= imported_modules(source)
