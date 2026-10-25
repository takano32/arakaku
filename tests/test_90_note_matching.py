from __future__ import annotations

import pytest

from conftest import load_module


@pytest.fixture
def matcher(repo_root):
    return load_module('match_unknown_bouts_to_note_results', repo_root / 'scripts' / 'match_unknown_bouts_to_note_results.py')


@pytest.mark.parametrize('text, expected', [
    ('1R1分50秒KO 左ボディブロー', ('1R', '1分50秒', 'KO', '左ボディブロー', '')),
    ('3R終了 判定3-0', ('3R', '終了', 'DEC', '', '3-0')),
    ('1R終了時TKO ドクターストップ 足の負傷', ('1R', '終了', 'TKO', 'ドクターストップ 足の負傷', '')),
    ('1R3分51秒KO(飛びヒザ蹴り)', ('1R', '3分51秒', 'KO', '飛びヒザ蹴り', '')),
    ('2R0分28秒 左ハイKO', ('2R', '0分28秒', 'KO', '左ハイ', '')),
    ('1R 3分4秒 (アームバー)', ('1R', '3分04秒', 'SUB', 'アームバー', '')),
    ('3R 判定29-28', ('3R', '', 'DEC', '', '29-28')),
])
def test_parse_result(matcher, text, expected):
    r = matcher.parse_result(text)
    assert (r['round'], r['time'], r['method_normalized'], r['technique'], r['decision_score']) == expected


def test_occurrences_reads_marks_and_skips_longer_words(matcher):
    lines = ['○アイス・トロン🆚●ナパーム', '〇ブルーワンvs●きたむら', '🟦 ①ルージュド・スターリー', 'フロントチョーク']
    assert matcher.occurrences(lines, 'アイス・トロン') == [(0, '○')]
    assert matcher.occurrences(lines, 'ブルーワン') == [(1, '〇')]
    assert matcher.occurrences(lines, 'きたむら') == [(1, '●')]
    assert matcher.occurrences(lines, 'ルージュド・スターリー') == [(2, '')]
    assert matcher.occurrences(lines, 'ロン') == []  # inside アイス・トロン and フロントチョーク


def test_result_text_finds_the_result_line(matcher):
    lines = ['☆ミドル級ワンマッチ', '●ローリングJr.', '29歳186cm', '【5勝4敗】', '🆚', '○ぱいそんはやし', '26歳 188cm', '【1勝0敗】', '（3R終了 判定3-0）', '☆次の試合']
    assert matcher.result_text(lines, 1, 5) == '3R終了 判定3-0'
    assert matcher.result_text(['○A(ジムX)🆚●B(1R2分KO 左フック)'], 0, 0) == '1R2分KO 左フック'
