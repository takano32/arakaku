from __future__ import annotations

def test_none_if_empty(build_json_module):
    assert build_json_module.none_if_empty(None) is None
    assert build_json_module.none_if_empty('') is None
    assert build_json_module.none_if_empty('   ') is None
    assert build_json_module.none_if_empty(' わく ') == 'わく'

def test_bool_from_text(build_json_module):
    assert build_json_module.bool_from_text('true') is True
    assert build_json_module.bool_from_text('yes') is True
    assert build_json_module.bool_from_text('1') is True
    assert build_json_module.bool_from_text('あり') is True
    assert build_json_module.bool_from_text('有') is True
    assert build_json_module.bool_from_text('○') is True
    assert build_json_module.bool_from_text('false') is False
    assert build_json_module.bool_from_text('no') is False
    assert build_json_module.bool_from_text('0') is False
    assert build_json_module.bool_from_text('なし') is False
    assert build_json_module.bool_from_text('無') is False
    assert build_json_module.bool_from_text('×') is False
    assert build_json_module.bool_from_text('') is None
    assert build_json_module.bool_from_text(None) is None
    assert build_json_module.bool_from_text('不明') is None

def test_split_list(build_json_module):
    assert build_json_module.split_list('') == []
    assert build_json_module.split_list(None) == []
    assert build_json_module.split_list('note-target,note-target-103') == ['note-target','note-target-103']
    assert build_json_module.split_list('ターゲット、エンペラー／M・H') == ['ターゲット','エンペラー','M・H']
