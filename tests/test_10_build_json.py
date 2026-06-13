from __future__ import annotations

def test_none_if_empty(utils_module):
    assert utils_module.none_if_empty(None) is None
    assert utils_module.none_if_empty('') is None
    assert utils_module.none_if_empty('   ') is None
    assert utils_module.none_if_empty(' わく ') == 'わく'

def test_bool_from_text(utils_module):
    assert utils_module.bool_from_text('true') is True
    assert utils_module.bool_from_text('yes') is True
    assert utils_module.bool_from_text('1') is True
    assert utils_module.bool_from_text('あり') is True
    assert utils_module.bool_from_text('有') is True
    assert utils_module.bool_from_text('○') is True
    assert utils_module.bool_from_text('false') is False
    assert utils_module.bool_from_text('no') is False
    assert utils_module.bool_from_text('0') is False
    assert utils_module.bool_from_text('なし') is False
    assert utils_module.bool_from_text('無') is False
    assert utils_module.bool_from_text('×') is False
    assert utils_module.bool_from_text('') is None
    assert utils_module.bool_from_text(None) is None
    assert utils_module.bool_from_text('不明') is None

def test_split_list(utils_module):
    assert utils_module.split_list('') == []
    assert utils_module.split_list(None) == []
    assert utils_module.split_list('note-target,note-target-103') == ['note-target','note-target-103']
    assert utils_module.split_list('ターゲット、エンペラー／M・H') == ['ターゲット','エンペラー','M・H']
