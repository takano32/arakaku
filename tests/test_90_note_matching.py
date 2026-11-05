from __future__ import annotations

import pytest

from arakaku.notes import results as matcher


@pytest.mark.parametrize('text, expected', [
    ('1R1分50秒KO 左ボディブロー', ('1R', '1分50秒', 'KO', '左ボディブロー', '')),
    ('3R終了 判定3-0', ('3R', '終了', 'DEC', '', '3-0')),
    ('1R終了時TKO ドクターストップ 足の負傷', ('1R', '終了', 'TKO', 'ドクターストップ 足の負傷', '')),
    ('1R3分51秒KO(飛びヒザ蹴り)', ('1R', '3分51秒', 'KO', '飛びヒザ蹴り', '')),
    ('2R0分28秒 左ハイKO', ('2R', '0分28秒', 'KO', '左ハイ', '')),
    ('1R 3分4秒 (アームバー)', ('1R', '3分04秒', 'SUB', 'アームバー', '')),
    ('3R 判定29-28', ('3R', '', 'DEC', '', '29-28')),
])
def test_parse_result(text, expected):
    r = matcher.parse_result(text)
    assert (r['round'], r['time'], r['method_normalized'], r['technique'], r['decision_score']) == expected


def test_occurrences_reads_marks_and_skips_longer_words():
    lines = ['○アイス・トロン🆚●ナパーム', '〇ブルーワンvs●きたむら', '🟦 ①ルージュド・スターリー', 'フロントチョーク']
    assert matcher.occurrences(lines, 'アイス・トロン') == [(0, '○')]
    assert matcher.occurrences(lines, 'ブルーワン') == [(1, '〇')]
    assert matcher.occurrences(lines, 'きたむら') == [(1, '●')]
    assert matcher.occurrences(lines, 'ルージュド・スターリー') == [(2, '')]
    assert matcher.occurrences(lines, 'ロン') == []  # inside アイス・トロン and フロントチョーク


def test_result_text_finds_the_result_line():
    lines = ['☆ミドル級ワンマッチ', '●ローリングJr.', '29歳186cm', '【5勝4敗】', '🆚', '○ぱいそんはやし', '26歳 188cm', '【1勝0敗】', '（3R終了 判定3-0）', '☆次の試合']
    assert matcher.result_text(lines, 1, 5) == '3R終了 判定3-0'
    assert matcher.result_text(['○A(ジムX)🆚●B(1R2分KO 左フック)'], 0, 0) == '1R2分KO 左フック'



def test_locate_winner_passes_name_variants_in_sorted_order(monkeypatch):
    # 名前の表記は set なので、そのまま回すと実行ごとに順番が変わり、引用する行が揺れうる (T.112.4.2)。
    from arakaku.review import note_results
    seen = []
    monkeypatch.setattr(note_results, 'pair_verdicts', lambda lines, names_a, names_b: seen.append((names_a, names_b)) or [(True, 1, 1)])
    ctx = note_results.NoteMatchContext(result_notes={'e1': {'n1'}}, bodies={'n1': 'x'}, names={'waku': {'ワク', 'わく', 'WAKU'}, 'bill': {'ビル'}})
    result = note_results.locate_winner({'fighter_id': 'waku'}, {'fighter_id': 'bill'}, 'e1', ctx)
    assert seen == [(['WAKU', 'わく', 'ワク'], ['ビル'])]
    assert result == ('waku', 'n1', 1, 1)
