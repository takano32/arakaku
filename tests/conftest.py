from __future__ import annotations

import importlib
import importlib.util
import json
import sys
from pathlib import Path

import pytest

# scripts/ をパスに載せ、テストが `from arakaku.x import ...` と scripts と同じ形で package を読めるようにする。
SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


@pytest.fixture
def repo_root() -> Path:
    return Path.cwd()


def load_module(module_name: str, script_path: Path):
    """scripts/<name>.py のような入口スクリプトを、import 可能なモジュールとして読む。"""
    if str(script_path.parent) not in sys.path:
        sys.path.insert(0, str(script_path.parent))
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def io_module():
    return importlib.import_module("arakaku.io")


@pytest.fixture
def text_module():
    return importlib.import_module("arakaku.text")


@pytest.fixture
def report():
    """arakaku.validation の検証関数に渡す空の Report。"""
    from arakaku.validation import Report

    return Report()


@pytest.fixture
def source_result_candidates_module():
    return importlib.import_module("arakaku.review.mention_result_candidates")


@pytest.fixture
def source_reference_candidates_module():
    return importlib.import_module("arakaku.review.reference_candidates")


@pytest.fixture
def docs_data(repo_root: Path) -> Path:
    return repo_root / "docs" / "data"


@pytest.fixture
def json_file():
    def _load(path: Path):
        return json.loads(path.read_text(encoding="utf-8"))

    return _load
