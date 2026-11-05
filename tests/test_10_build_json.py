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
