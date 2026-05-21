from __future__ import annotations
import importlib.util, json
from pathlib import Path
import pytest
@pytest.fixture
def repo_root() -> Path: return Path.cwd()
def load_module(module_name: str, script_path: Path):
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module); return module
@pytest.fixture
def build_json_module(repo_root: Path): return load_module('build_json', repo_root/'scripts'/'build_json.py')
@pytest.fixture
def validate_json_module(repo_root: Path): return load_module('validate_json', repo_root/'scripts'/'validate_json.py')
@pytest.fixture
def source_result_candidates_module(repo_root: Path): return load_module('source_result_candidates', repo_root/'scripts'/'make_source_mention_result_candidates.py')
@pytest.fixture
def docs_data(repo_root: Path) -> Path: return repo_root/'docs'/'data'
@pytest.fixture
def json_file():
    def _load(path: Path): return json.loads(path.read_text(encoding='utf-8'))
    return _load
