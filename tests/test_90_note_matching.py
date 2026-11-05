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
    # 名前の表記は set なので、そのまま回すと実行ごとに順番が変わり、引用する行が揺れうる (T112.4.2)。
    from arakaku.review import note_results
    seen = []
    monkeypatch.setattr(note_results, 'pair_verdicts', lambda lines, names_a, names_b: seen.append((names_a, names_b)) or [(True, 1, 1)])
    ctx = note_results.NoteMatchContext(result_notes={'e1': {'n1'}}, bodies={'n1': 'x'}, names={'waku': {'ワク', 'わく', 'WAKU'}, 'bill': {'ビル'}})
    result = note_results.locate_winner({'fighter_id': 'waku'}, {'fighter_id': 'bill'}, 'e1', ctx)
    assert seen == [(['WAKU', 'わく', 'ワク'], ['ビル'])]
    assert result == ('waku', 'n1', 1, 1)


# --- review/note_results の Numbers の表 (T112.6.22) ---

def test_numbers_key_prefers_matched_ids_and_needs_both_fighters():
    from arakaku.review.note_results import numbers_key
    row = {'matched_fighter_id': 'waku', 'candidate_fighter_id': 'other', 'opponent_candidate_fighter_id': 'bill',
           'promotion_id': 'target', 'event_number_normalized': 105}
    assert numbers_key(row) == (frozenset({'waku', 'bill'}), 'target', '105')
    assert numbers_key({'candidate_fighter_id': 'waku', 'opponent_candidate_fighter_id': 'bill'}) == (frozenset({'waku', 'bill'}), '', '')
    assert numbers_key({'matched_fighter_id': 'waku'}) is None


def test_numbers_winners_index_by_event_and_by_pair():
    from arakaku.review.note_results import numbers_winners
    pair = frozenset({'waku', 'bill'})
    records = [
        {'matched_fighter_id': 'waku', 'opponent_matched_fighter_id': 'bill', 'promotion_id': 'target', 'event_number_normalized': '105', 'result': 'win'},
        {'matched_fighter_id': 'bill', 'opponent_matched_fighter_id': 'waku', 'promotion_id': 'target', 'event_number_normalized': '110', 'result': 'win'},
        {'matched_fighter_id': 'waku', 'opponent_matched_fighter_id': 'bill', 'promotion_id': 'target', 'event_number_normalized': '120', 'result': 'draw'},
        {'matched_fighter_id': 'waku', 'result': 'win'},  # 対戦相手が無い行は使わない
    ]
    winners = numbers_winners(records)
    assert winners[(pair, 'target', '105')] == {'waku'}
    assert winners[(pair, 'target', '110')] == {'bill'}
    assert (pair, 'target', '120') not in winners  # 勝ち負けでない結果は数えない
    assert winners[(pair, '', '')] == {'waku', 'bill'}


def test_for_event_exact_falls_back_to_every_event_of_the_pair():
    from arakaku.review.note_results import for_event, for_event_exact
    pair = frozenset({'waku', 'bill'})
    table = {(pair, 'target', '105'): {'waku'}, (pair, '', ''): {'waku', 'bill'}}
    assert for_event_exact(table, pair, {'promotion_id': 'target', 'event_number': '105'}) == ({'waku'}, True)
    # numbers_event_number (MAXバウトの回など) が event_number より先。
    assert for_event_exact(table, pair, {'promotion_id': 'target', 'event_number': '1', 'numbers_event_number': '105'}) == ({'waku'}, True)
    assert for_event_exact(table, pair, {'promotion_id': 'target', 'event_number': '106'}) == ({'waku', 'bill'}, False)
    assert for_event_exact({}, pair, {'promotion_id': 'target'}) == (set(), False)
    assert for_event(table, pair, {'promotion_id': 'target', 'event_number': '105'}) == {'waku'}
