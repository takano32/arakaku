"""arakaku/review/ (note_results・mention_result_candidates・patches) の単体テスト。小さい手書きの行で確かめる。"""
from __future__ import annotations

import pytest

from arakaku.review.mention_result_candidates import nearest_hint
from arakaku.review.note_results import NoteMatchContext, match_bouts, same_value
from arakaku.review.patches import apply_patches

PAIR = frozenset(("kabuto", "iberuto"))
NOTE_LINES = ["ターゲットNo.101 試合結果", "○かぶと", "🆚", "●イベルト", "1R3分04秒KO 左フック"]


def participants(result_a="", result_b=""):
    return {"b1": [{"fighter_id": "kabuto", "fighter_name": "かぶと", "result": result_a},
                   {"fighter_id": "iberuto", "fighter_name": "イベルト", "result": result_b}]}


def context(numbers_winners=None, result_a="", result_b=""):
    return NoteMatchContext(
        participants=participants(result_a, result_b),
        events={"target-101": {"promotion_id": "target", "event_number": "101", "numbers_event_number": ""}},
        result_notes={"target-101": {"note-r"}},
        bodies={"note-r": "\n".join(NOTE_LINES)},
        names={"kabuto": {"かぶと"}, "iberuto": {"イベルト"}},
        numbers_winners=numbers_winners or {},
        numbers_details={(PAIR, "", ""): {"KO"}},
    )


def unknown_bout(**fields):
    return {"bout_id": "b1", "event_id": "target-101", "result_status": "unknown", **fields}


@pytest.mark.parametrize("numbers_winners, agreement, apply", [
    ({(PAIR, "target", "101"): {"kabuto"}, (PAIR, "", ""): {"kabuto"}}, "agree", "true"),
    ({(PAIR, "", ""): {"kabuto"}}, "agree_other_event", "false"),
    ({}, "note_only", "false"),
    ({(PAIR, "target", "101"): {"iberuto"}}, "conflict", "false"),
])
def test_unknown_bout_agreement_with_numbers(numbers_winners, agreement, apply):
    rows, method_rows = match_bouts([unknown_bout()], context(numbers_winners))
    assert method_rows == []
    [row] = rows
    assert (row["agreement"], row["apply"]) == (agreement, apply)
    assert (row["fighter_a"], row["fighter_b"], row["winner"], row["loser"]) == ("かぶと", "イベルト", "かぶと", "イベルト")
    assert (row["round"], row["time"], row["method_normalized"], row["technique"]) == ("1R", "3分04秒", "KO", "左フック")
    assert (row["source_article_id"], row["source_line_start"], row["source_line_end"]) == ("note-r", "2", "4")
    assert row["source_text"] == "○かぶと / 🆚 / ●イベルト"
    assert row["result_text"] == "1R3分04秒KO 左フック"


def test_bout_without_two_identified_fighters_is_skipped():
    ctx = context()
    ctx.participants["b1"][1]["fighter_id"] = ""
    assert match_bouts([unknown_bout()], ctx) == ([], [])


def test_known_bout_fills_empty_method_fields_when_the_winner_agrees():
    bout = {"bout_id": "b1", "event_id": "target-101", "result_status": "known", "round": "", "time": "3分4秒",
            "method_raw": "", "method_normalized": "", "technique": "", "decision_score": ""}
    rows, [method] = match_bouts([bout], context(result_a="win", result_b="loss"))
    assert rows == []
    assert method["apply"] == "true"
    assert (method["round"], method["time"], method["method_normalized"], method["technique"]) == ("1R", "", "KO", "左フック")
    assert method["existing"] == "time=3分4秒"
    assert method["clashes"] == ""
    assert method["numbers_detail"] == "KO"


def test_known_bout_with_a_clashing_round_is_not_applied():
    bout = {"bout_id": "b1", "event_id": "target-101", "result_status": "known", "round": "2R", "time": "",
            "method_raw": "", "method_normalized": "", "technique": "", "decision_score": ""}
    [], [method] = match_bouts([bout], context(result_a="win", result_b="loss"))
    assert (method["apply"], method["clashes"]) == ("false", "round: 2R / 1R")


def test_known_bout_with_another_winner_gives_no_candidate():
    bout = {"bout_id": "b1", "event_id": "target-101", "result_status": "known", "round": ""}
    assert match_bouts([bout], context(result_a="loss", result_b="win")) == ([], [])


def test_same_value_treats_padded_times_as_equal():
    assert same_value("3分4秒") == same_value("3分04秒") == "3:04"
    assert same_value(" 1R ") == "1R"


def mention(line, mention_type, hint="", text="", source="s1"):
    return {"source_id": source, "line_number": str(line), "mention_type": mention_type, "entity_hint": hint, "matched_text": text}


def test_nearest_hint_picks_the_closest_mention_in_the_same_source():
    current = mention(10, "result")
    mentions = [current, mention(4, "event", "far"), mention(13, "event", "near"), mention(19, "event", "too far"),
                mention(10, "event", "other source", source="s2"), mention(11, "matchup", "other type")]
    assert nearest_hint(mentions, current, "event") == "near"
    assert nearest_hint(mentions, current, "event", max_distance=2) == ""


def test_nearest_hint_breaks_ties_by_line_and_falls_back_to_the_text():
    current = mention(10, "result")
    mentions = [current, mention(12, "event", "after"), mention(8, "event", "", text="before")]
    assert nearest_hint(mentions, current, "event") == "before"


def test_apply_patches_applies_only_reviewed_rows_and_keeps_the_input():
    bouts = [{"bout_id": "b1", "result_status": "unknown", "round": "", "time": "", "notes": "old note."}]
    parts = [{"bout_id": "b1", "side": "red", "fighter_name": "かぶと", "result": ""},
             {"bout_id": "b1", "side": "blue", "fighter_name": "イベルト", "result": ""}]
    patch = {"apply": " Yes ", "bout_id": "b1", "winner": "イベルト", "loser": "かぶと", "fighter_a": "かぶと", "fighter_b": "イベルト",
             "round": "1R", "time": "", "source_article_id": "note-r", "source_line_start": "2", "source_line_end": "4"}
    result = apply_patches(bouts, parts, [patch, dict(patch, apply="false", round="9R"), dict(patch, bout_id="nope"), patch])
    assert (result.applied, result.unknown_bout_ids) == (2, ["nope"])
    [bout] = result.bouts
    assert (bout["result_status"], bout["round"], bout["time"]) == ("known", "1R", "")
    assert bout["notes"] == "old note. Structured result from note-r lines 2-4."
    assert [p["result"] for p in result.participants] == ["loss", "win"]
    assert bouts[0]["round"] == "" and parts[0]["result"] == ""


def test_apply_patches_without_both_names_only_fills_fields():
    bouts = [{"bout_id": "b1", "result_status": "unknown", "notes": ""}]
    parts = [{"bout_id": "b1", "side": "red", "fighter_name": "かぶと", "result": ""}]
    result = apply_patches(bouts, parts, [{"apply": "true", "bout_id": "b1", "winner": "かぶと", "loser": "", "time": "1分00秒"}])
    assert (result.bouts[0]["result_status"], result.bouts[0]["time"], result.participants[0]["result"]) == ("unknown", "1分00秒", "")
