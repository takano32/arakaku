from __future__ import annotations


def test_source_mention_result_candidate_hints(source_result_candidates_module):
    mentions = [
        {
            "mention_id": "m1",
            "source_id": "note:sample",
            "source_type": "note_article",
            "source_ref_id": "note-sample",
            "line_number": "10",
            "mention_type": "event",
            "entity_hint": "サンプル大会",
            "matched_text": "サンプル大会",
            "context": "サンプル大会",
            "confidence": "medium",
            "notes": "",
        },
        {
            "mention_id": "m2",
            "source_id": "note:sample",
            "source_type": "note_article",
            "source_ref_id": "note-sample",
            "line_number": "11",
            "mention_type": "matchup",
            "entity_hint": "わく vs つくりはら",
            "matched_text": "わく vs つくりはら",
            "context": "わく vs つくりはら",
            "confidence": "medium",
            "notes": "",
        },
        {
            "mention_id": "m3",
            "source_id": "note:sample",
            "source_type": "note_article",
            "source_ref_id": "note-sample",
            "line_number": "12",
            "mention_type": "result",
            "entity_hint": "",
            "matched_text": "（2R3分46秒KO 左フック）",
            "context": "（2R3分46秒KO 左フック）",
            "confidence": "medium",
            "notes": "",
        },
    ]

    rows = source_result_candidates_module.build_rows(mentions)

    assert len(rows) == 1
    assert rows[0]["candidate_id"] == "source-result-0001"
    assert rows[0]["event_hint"] == "サンプル大会"
    assert rows[0]["matchup_hint"] == "わく vs つくりはら"
    assert rows[0]["method_hint"] == "KO"
    assert rows[0]["round_hint"] == "2R"
    assert rows[0]["time_hint"] == "3分46秒"
    assert rows[0]["confidence"] == "medium"
    assert rows[0]["winner_hint"] == ""


def test_source_mention_result_candidate_keeps_weak_rows_low(source_result_candidates_module):
    mentions = [
        {
            "mention_id": "m1",
            "source_id": "note:sample",
            "source_type": "note_article",
            "source_ref_id": "note-sample",
            "line_number": "1",
            "mention_type": "result",
            "entity_hint": "",
            "matched_text": "タイトルマッチ",
            "context": "タイトルマッチ",
            "confidence": "medium",
            "notes": "",
        }
    ]

    rows = source_result_candidates_module.build_rows(mentions)

    assert len(rows) == 1
    assert rows[0]["confidence"] == "low"
    assert rows[0]["method_hint"] == ""
    assert rows[0]["round_hint"] == ""
    assert rows[0]["time_hint"] == ""
