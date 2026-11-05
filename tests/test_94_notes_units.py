"""arakaku/notes/ (matchups・results・crawl・html・articles) と notes/patterns の単体テスト。小さい手書きの文字列で確かめる。"""
from __future__ import annotations

import pytest

from arakaku.notes import crawl
from arakaku.notes.articles import article_row
from arakaku.notes.html import parse_note_metadata
from arakaku.notes.matchups import clean_fighter_name, extract_matchups, max_bout_event_id, title_to_event_ids
from arakaku.notes.patterns import infer_time, strip_name_prefix
from arakaku.notes.results import pair_verdicts


# --- notes/matchups ---

def test_extract_matchups_inline_versus_marks():
    assert extract_matchups("●かぶと【1勝2敗】🆚○イベルト（王者）") == [("かぶと", "イベルト")]


def test_extract_matchups_inline_vs_needs_a_corner_or_result_mark():
    assert extract_matchups("○かぶとvs●イベルト\nかぶとvsイベルト") == [("かぶと", "イベルト")]


def test_extract_matchups_standalone_versus_line():
    assert extract_matchups("🟥かぶと\n31歳\n🆚\n🟦イベルト") == [("かぶと", "イベルト")]


def test_extract_matchups_standalone_versus_stops_at_a_bout_heading():
    assert extract_matchups("🟥かぶと\n☆ライト級\n🆚\n🟦イベルト") == []
    assert extract_matchups("🟥かぶと\n🆚\n☆ライト級\n🟦イベルト") == []


def test_clean_fighter_name():
    assert clean_fighter_name(" 🟦○①かぶと【11勝13敗】（王者） ") == "かぶと"


def test_title_to_event_ids_returns_every_event_of_a_joint_event():
    known = {"target-90", "emperor-111"}
    assert title_to_event_ids("ターゲットNo.90　エンペラーNo.111合同大会試合結果", known) == ["target-90", "emperor-111"]
    assert title_to_event_ids("マウンテン・ヒーローズNo.37", set()) == ["mh-37"]
    assert title_to_event_ids("おしらせ", known) == []


def test_max_bout_gp_and_tournament_fall_back_to_the_known_event():
    assert max_bout_event_id("第5回MAXバウトミドル級GP一回戦", {"max-bout-5-middleweight-gp"}) == "max-bout-5-middleweight-gp"
    assert max_bout_event_id("第5回MAXバウトミドル級GP一回戦", set()) == "max-bout-5-middleweight-tournament"
    assert max_bout_event_id("第3回MAXバウトライト級トーナメント", {"max-bout-3-lightweight-gp"}) == "max-bout-3-lightweight-gp"
    assert max_bout_event_id("第3回MAXバウトライト級トーナメント", set()) == "max-bout-3-lightweight-tournament"
    assert max_bout_event_id("MAXバウトワンマッチ大会No.2", set()) == "max-bout-special-2"
    assert max_bout_event_id("MAXバウトワンマッチ大会", set()) == "max-bout-special-1"
    assert title_to_event_ids("第5回MAXバウトミドル級ＧＰ", {"max-bout-5-middleweight-gp"}) == ["max-bout-5-middleweight-gp"]


# --- notes/results.pair_verdicts ---

def test_pair_verdicts_reads_the_win_and_loss_marks():
    assert pair_verdicts(["○かぶと", "🆚", "●イベルト"], ["かぶと"], ["イベルト"]) == [(True, 0, 2)]
    assert pair_verdicts(["●かぶと🆚〇イベルト"], ["かぶと"], ["イベルト"]) == [(False, 0, 0)]


def test_pair_verdicts_has_no_winner_without_marks_or_with_two_winners():
    assert pair_verdicts(["かぶと", "🆚", "イベルト", "引き分け"], ["かぶと"], ["イベルト"]) == []
    assert pair_verdicts(["○かぶと", "🆚", "○イベルト"], ["かぶと"], ["イベルト"]) == []


def test_pair_verdicts_does_not_cross_a_bout_heading_or_a_second_versus():
    assert pair_verdicts(["○かぶと", "☆ミドル級", "●イベルト"], ["かぶと"], ["イベルト"]) == []
    assert pair_verdicts(["○かぶと", "🆚", "●ザモン", "🆚", "●イベルト"], ["かぶと"], ["イベルト"]) == []


# --- notes/crawl ---

def test_normalize_url_and_article_id():
    assert crawl.normalize_url(" https://note.com/xyz1090/n/nABC/?a=1&amp;b=2#top ") == "https://note.com/xyz1090/n/nABC"
    assert crawl.article_id_from_url("https://note.com/xyz1090/n/nABC123") == "note-nabc123"
    assert crawl.article_id_from_url("https://example.com/foo bar") == "note-https-example-com-foo-bar"


def test_merge_articles_skips_known_urls_and_suffixes_clashing_ids():
    existing = [{"article_id": "note-a", "url": "https://note.com/x/n/na"}]
    discovered = [
        {"article_id": "note-a", "url": "https://note.com/x/n/na/?ref=rss"},
        {"article_id": "note-a", "url": "https://note.com/x/n/nb"},
        {"article_id": "note-a", "url": "https://note.com/x/n/nc"},
    ]
    merged, added = crawl.merge_articles(existing, discovered)
    assert [r["article_id"] for r in added] == ["note-a-2", "note-a-3"]
    assert merged is existing and len(existing) == 3


def test_row_from_note_object_rejects_non_article_keys():
    assert crawl.row_from_note_object({"key": "n0123456789ab", "user": {"urlname": "other"}})["url"] == "https://note.com/other/n/n0123456789ab"
    assert crawl.row_from_note_object({"key": "0123456789abcdef0123456789abcdef"}) is None
    assert crawl.row_from_note_object({"name": "no key"}) is None


def test_parse_json_notes_walks_nested_objects_once_per_url():
    text = '{"data": {"contents": [{"key": "n0123456789ab", "name": "A", "publishAt": "2026-07-31T09:00:00+09:00"},' \
           ' {"key": "n0123456789ab", "name": "A again"}]}}'
    rows = crawl.parse_json_notes(text)
    assert [(r["title"], r["published_at"], r["status"]) for r in rows] == [("A", "2026-07-31", "unparsed")]
    with pytest.raises(crawl.FetchFailed):
        crawl.parse_json_notes("<html>rate limited</html>")


def test_parse_rss_keeps_only_article_links():
    xml = (
        "<rss><channel>"
        "<item><title> ターゲットNo.87 試合結果 </title><link>https://note.com/xyz1090/n/n0123456789ab?x=1</link>"
        "<pubDate>Fri, 31 Jul 2026 09:00:00 +0900</pubDate></item>"
        "<item><title>マガジン</title><link>https://note.com/xyz1090/m/mabc</link></item>"
        "</channel></rss>"
    )
    [row] = crawl.parse_rss(xml)
    assert row["url"] == "https://note.com/xyz1090/n/n0123456789ab"
    assert (row["article_id"], row["title"], row["published_at"]) == ("note-n0123456789ab", "ターゲットNo.87 試合結果", "2026-07-31")
    assert (row["article_type"], row["promotion_id"], row["notes"]) == ("event_result", "target", "Crawled from note RSS.")


# --- notes/html と notes/articles ---

def test_parse_note_metadata_reads_title_canonical_and_description():
    html = ('<html><head><title>T &amp; U｜アラカク通信のーと</title>'
            '<link rel="canonical" href="https://note.com/x/n/n1"><meta name="description" content="a &amp; b"></head></html>')
    assert parse_note_metadata(html) == {
        "title": "T & U｜アラカク通信のーと",
        "webpage_url": "https://note.com/x/n/n1",
        "description": "a & b",
        "published_at": "",
    }


def test_article_row_from_an_archived_note():
    note = {"filename": "note-n1.html", "title": "ターゲットNo.87 試合結果｜アラカク通信のーと", "webpage_url": "https://note.com/x/n/n1",
            "published_at": "2026-01-01", "archived_at": "2026-02-01T00:00:00", "description": ""}
    assert article_row(note) == {
        "article_id": "note-n1",
        "title": "ターゲットNo.87 試合結果",
        "url": "https://note.com/x/n/n1",
        "source_type": "official_note",
        "article_type": "event_result",
        "promotion_id": "target",
        "published_at": "2026-01-01",
        "last_checked_at": "2026-02-01T00:00:00",
        "status": "unparsed",
        "notes": "Crawled from note JSON/API.",
    }
    profile = article_row({"filename": "note-target.html", "title": "ターゲット"})
    assert (profile["article_type"], profile["promotion_id"], profile["notes"]) == ("promotion_profile", "target", "団体設定・ルール・歴代王者")


# --- notes/patterns ---

def test_strip_name_prefix():
    assert strip_name_prefix("🟥○①かぶと") == ("○", "かぶと")
    assert strip_name_prefix("● 3 ザモン") == ("●", "ザモン")
    assert strip_name_prefix("10かぶと") == ("", "10かぶと")


def test_infer_time():
    assert infer_time("1R ２分５秒 KO") == "2分5秒"
    assert infer_time("3R 3:07 TKO") == "3分07秒"
    assert infer_time("判定3-0") == ""
