from __future__ import annotations

import pytest


def test_none_if_empty(text_module):
    assert text_module.none_if_empty(None) is None
    assert text_module.none_if_empty('') is None
    assert text_module.none_if_empty('   ') is None
    assert text_module.none_if_empty(' わく ') == 'わく'

def test_bool_from_text(text_module):
    assert text_module.bool_from_text('true') is True
    assert text_module.bool_from_text('yes') is True
    assert text_module.bool_from_text('1') is True
    assert text_module.bool_from_text('あり') is True
    assert text_module.bool_from_text('有') is True
    assert text_module.bool_from_text('○') is True
    assert text_module.bool_from_text('false') is False
    assert text_module.bool_from_text('no') is False
    assert text_module.bool_from_text('0') is False
    assert text_module.bool_from_text('なし') is False
    assert text_module.bool_from_text('無') is False
    assert text_module.bool_from_text('×') is False
    assert text_module.bool_from_text('') is None
    assert text_module.bool_from_text(None) is None
    assert text_module.bool_from_text('不明') is None

def test_split_list(text_module):
    assert text_module.split_list('') == []
    assert text_module.split_list(None) == []
    assert text_module.split_list('note-target,note-target-103') == ['note-target','note-target-103']
    assert text_module.split_list('ターゲット、エンペラー／M・H') == ['ターゲット','エンペラー','M・H']

def test_load_json_raises_on_invalid_json(io_module, tmp_path):
    (tmp_path / "broken.json").write_text('[{"a": 1', encoding="utf-8")
    with pytest.raises(ValueError, match="invalid JSON"):
        io_module.load_json(tmp_path / "broken.json", [])
    assert io_module.load_json(tmp_path / "absent.json", []) == []


def test_read_json_raises_on_missing_file(io_module, tmp_path):
    # 必須の入力が無いのに空として扱うと、review の CSV を見出しだけで上書きしてしまう (T.112.1.11)。
    with pytest.raises(FileNotFoundError, match="run make build"):
        io_module.read_json(tmp_path / "absent.json")
    (tmp_path / "ok.json").write_text("[1]", encoding="utf-8")
    assert io_module.read_json(tmp_path / "ok.json") == [1]


def test_read_csv_required_raises_outside_data_src(io_module, tmp_path):
    # data-src の外 (review/) の CSV は既定では [warn] と空だが、required=True ならエラー (T.112.4.5)。
    assert io_module.read_csv(tmp_path / "absent.csv") == []
    with pytest.raises(FileNotFoundError):
        io_module.read_csv(tmp_path / "absent.csv", required=True)


def test_load_tables_fails_when_a_review_candidate_csv_is_missing(repo_root, tmp_path):
    import shutil
    from arakaku.build.io import load_tables
    review = tmp_path / "review"
    shutil.copytree(repo_root / "review", review)
    load_tables(review=review)
    (review / "source_bout_reference_candidates.csv").unlink()
    with pytest.raises(FileNotFoundError, match="source_bout_reference_candidates.csv"):
        load_tables(review=review)
