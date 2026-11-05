"""純粋なモジュールが入出力の層に届かないことを、ソースの ast で確かめる。

純粋なモジュールは行のリストや文字列を受け取って返すだけで、どのファイルを読み書きするかは
scripts/*.py の入口と、下の IO_MODULES (arakaku.io・arakaku.paths・build/io.py の load_tables・
validation の runner と locate) が決める。

T112.6.2: 1 段の import だけを見ると、純粋なモジュールが別の arakaku のモジュールを経由して
paths を読む場合 (以前の sources/documents.py -> youtube.py -> paths) を見逃す。そのため arakaku.* の
import を推移的にたどり、I/O のモジュールに着いたら失敗にする。あわせて、すべての arakaku/*.py が
純粋か I/O のどちらか一方に分類されていることも確かめる (新しいモジュールは分類しないと落ちる)。
たどるのはソースに書かれた import だけで、親のパッケージの __init__.py が import 時に走ることは数えない。
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

PACKAGE = Path(__file__).resolve().parents[1] / "scripts" / "arakaku"

# 読み書きをしてよい (止まってよい) モジュール。
IO_MODULES = {
    "io.py",
    "paths.py",
    "build/io.py",
    "validation/runner.py",
    "validation/locate.py",
    # パッケージの入口として runner の run と locate の locate_error を再公開している。
    "validation/__init__.py",
}

# 中のすべての *.py (__init__.py を含む) が純粋なパッケージ。
PURE_PACKAGES = ["notes", "sources", "derive", "review", "official", "numbers"]
PURE_MODULES = {
    "__init__.py",
    "csvmap.py",
    "event_dates.py",
    "schema.py",
    "text.py",
    "youtube.py",
    "build/__init__.py",
    "build/aliases.py",
    "build/articles.py",
    "build/bouts.py",
    "build/canonical.py",
    "build/events.py",
    "build/fighters.py",
    "build/numbers.py",
    "build/official.py",
    "build/promotions.py",
    "build/relations.py",
    "build/titles.py",
    "build/videos.py",
    "validation/archives.py",
    "validation/common.py",
    "validation/entities.py",
    "validation/links.py",
    "validation/numbers.py",
    "validation/official.py",
    "validation/report.py",
    "validation/rules.py",
    "validation/sources.py",
    "validation/vocab.py",
}


def rel(path: Path) -> str:
    return path.relative_to(PACKAGE).as_posix()


def all_module_names() -> set[str]:
    return {rel(path) for path in PACKAGE.rglob("*.py")}


def pure_module_names() -> set[str]:
    names = set(PURE_MODULES)
    for package in PURE_PACKAGES:
        names.update(rel(path) for path in (PACKAGE / package).glob("*.py"))
    return names


def module_file(dotted: str) -> str | None:
    """arakaku.a.b を arakaku/ からの相対パス (a/b.py か a/b/__init__.py) にする。モジュールでなければ None。"""
    parts = dotted.split(".")
    if parts[0] != "arakaku":
        return None
    base = PACKAGE.joinpath(*parts[1:])
    for candidate in (base.with_suffix(".py") if parts[1:] else None, base / "__init__.py"):
        if candidate is not None and candidate.is_file():
            return rel(candidate)
    return None


def package_of(name: str) -> list[str]:
    """arakaku/ からの相対パスのモジュールが属するパッケージの名前 (例: build/io.py -> [arakaku, build])。"""
    return ["arakaku", *name.split("/")[:-1]]


def imported_modules(path: Path) -> set[str]:
    """`import a.b`・`from a.b import c`・`from .x import y` を、モジュールの完全な名前 (a.b と a.b.c) で集める。"""
    names: set[str] = set()
    package = package_of(rel(path)) if path.is_relative_to(PACKAGE) else ["arakaku"]
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"), filename=str(path))):
        if isinstance(node, ast.Import):
            names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.level:
                base = package[: len(package) - (node.level - 1)]
                module = ".".join(base + ([node.module] if node.module else []))
            elif node.module:
                module = node.module
            else:
                continue
            names.add(module)
            names.update(f"{module}.{alias.name}" for alias in node.names)
    return names


def arakaku_imports(name: str) -> set[str]:
    """arakaku/ からの相対パスのモジュールが直接 import する arakaku のモジュール (相対パス)。"""
    files = {module_file(dotted) for dotted in imported_modules(PACKAGE / name)}
    return {f for f in files if f is not None and f != name}


def io_chain(start: str) -> list[str] | None:
    """start から arakaku の import をたどって I/O のモジュールに着く経路。着かなければ None。"""
    seen = {start}
    queue: list[list[str]] = [[start]]
    while queue:
        chain = queue.pop(0)
        for target in sorted(arakaku_imports(chain[-1])):
            if target in IO_MODULES:
                return chain + [target]
            if target not in seen:
                seen.add(target)
                queue.append(chain + [target])
    return None


def test_every_module_is_classified_exactly_once():
    pure = pure_module_names()
    assert pure & IO_MODULES == set()
    assert all_module_names() - pure - IO_MODULES == set(), "classify new modules in tests/test_00_layering.py"
    assert (pure | IO_MODULES) - all_module_names() == set(), "listed modules that do not exist"


@pytest.mark.parametrize("name", sorted(pure_module_names()))
def test_pure_module_does_not_reach_io_layer(name: str):
    chain = io_chain(name)
    assert chain is None, " -> ".join(chain or [])


def test_imported_modules_sees_all_import_forms(tmp_path: Path):
    source = tmp_path / "sample.py"
    source.write_text("import arakaku.io\nfrom arakaku import paths\nfrom arakaku.schema import CsvRow\n", encoding="utf-8")
    assert {"arakaku.io", "arakaku.paths", "arakaku.schema"} <= imported_modules(source)


def test_relative_imports_resolve_inside_the_package():
    # validation/runner.py の `from .locate import locate_error` は validation/locate.py。
    assert "validation/locate.py" in arakaku_imports("validation/runner.py")
    assert "validation/report.py" in arakaku_imports("validation/rules.py")


def test_io_chain_follows_imports_transitively(monkeypatch):
    # build/events.py は text を直接 import しないが、csvmap を経由して着く。
    monkeypatch.setitem(globals(), "IO_MODULES", {"text.py"})
    assert io_chain("build/events.py") == ["build/events.py", "csvmap.py", "text.py"]


def test_load_tables_moved_out_of_relations():
    # build/relations.py はもう I/O をせず、build/io.py の load_tables だけが読む (T112.6.19)。
    assert io_chain("build/relations.py") is None
    assert io_chain("build/io.py") == ["build/io.py", "io.py"]
