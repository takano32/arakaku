"""arakaku/derive/ (article_links・video_links・aliases・ordering) の単体テスト。小さい手書きの行で確かめる。"""
from __future__ import annotations

from arakaku.derive.aliases import alias_rows
from arakaku.derive.article_links import ArticleLinkSources, article_link_rows, make_link_id
from arakaku.derive.ordering import bout_sort_key, event_sort_date, reign_sort_key, sort_key_date
from arakaku.derive.video_links import video_link_rows


def article(article_id, article_type, published_at="", promotion_id=""):
    return {"article_id": article_id, "article_type": article_type, "published_at": published_at, "promotion_id": promotion_id}


def note_doc(article_id, title, content):
    return {"source_ref_id": article_id, "title": title, "content_text": content}


def link_keys(rows):
    return [(r["article_id"], r["entity_type"], r["entity_id"]) for r in rows]


def card_sources(**overrides):
    base = dict(
        articles=[article("note-b", "event_card", "2026-02-01"), article("note-a", "event_result", "2026-03-01")],
        events=[{"event_id": "target-101"}],
        fighters=[{"fighter_id": "kabuto", "display_name": "かぶと"}, {"fighter_id": "iberuto", "display_name": "イベルト"},
                  {"fighter_id": "zamon", "display_name": "ザモン"}],
        aliases=[{"alias_type": "fighters", "alias": "カブト", "canonical_id": "kabuto"}],
        bouts=[{"bout_id": "b1", "event_id": "target-101"}, {"bout_id": "b2", "event_id": "target-101"}],
        bout_participants=[{"bout_id": "b1", "fighter_id": "kabuto"}, {"bout_id": "b1", "fighter_id": "iberuto"},
                           {"bout_id": "b2", "fighter_id": "kabuto"}, {"bout_id": "b2", "fighter_id": "zamon"}],
        source_documents=[note_doc("note-a", "ターゲットNo.101 試合結果", "○カブト🆚●イベルト\nザモン🆚かぶと"),
                          note_doc("note-b", "ターゲットNo.101 対戦カード", "かぶと🆚イベルト\nかぶと🆚イベルト")],
    )
    base.update(overrides)
    return ArticleLinkSources(**base)


def test_article_links_are_deduplicated_and_ordered_by_published_at_then_id():
    rows = article_link_rows(card_sources())
    assert link_keys(rows) == [
        ("note-b", "event", "target-101"),
        ("note-b", "fighter", "kabuto"),
        ("note-b", "fighter", "iberuto"),
        ("note-b", "bout", "b1"),
        ("note-a", "event", "target-101"),
        ("note-a", "fighter", "kabuto"),
        ("note-a", "fighter", "iberuto"),
        ("note-a", "bout", "b1"),
        ("note-a", "fighter", "zamon"),
        ("note-a", "bout", "b2"),
    ]
    assert rows[0] == {"link_id": make_link_id("note-b", "event", "target-101"), "article_id": "note-b", "entity_type": "event",
                       "entity_id": "target-101", "relation_type": "source", "notes": ""}
    assert rows[0]["link_id"] == "article-note-b-event-target-101-source"


def test_bout_link_needs_the_pair_among_the_bout_participants():
    sources = card_sources(
        bout_participants=[{"bout_id": "b1", "fighter_id": "kabuto"}, {"bout_id": "b1", "fighter_id": "zamon"}],
        source_documents=[note_doc("note-a", "ターゲットNo.101 試合結果", "かぶと🆚イベルト")],
    )
    assert ("note-a", "bout", "b1") not in link_keys(article_link_rows(sources))


def test_unknown_events_and_empty_bodies_give_no_event_links():
    sources = card_sources(source_documents=[note_doc("note-a", "ターゲットNo.999 試合結果", "かぶと🆚イベルト"),
                                             note_doc("note-b", "ターゲットNo.101 対戦カード", "")])
    assert article_link_rows(sources) == []


def test_snapshot_links_only_for_note_sources_and_reign_and_promotion_links():
    sources = ArticleLinkSources(
        articles=[article("note-target", "promotion_profile", promotion_id="target")],
        title_reigns=[{"reign_id": "r1", "source_article_id": "note-x"}, {"reign_id": "r2", "source_article_id": ""}],
        fighter_snapshots=[{"snapshot_id": "s1", "source_id": "note:note-y"}, {"snapshot_id": "s2", "source_id": "official_news:abc"},
                           {"snapshot_id": "s3", "source_id": "note:"}],
    )
    assert link_keys(article_link_rows(sources)) == [
        ("note-target", "promotion", "target"),
        ("note-x", "title_reign", "r1"),
        ("note-y", "fighter_snapshot", "s1"),
    ]


def test_promotion_profile_links_its_champions():
    sources = ArticleLinkSources(
        articles=[article("note-target", "promotion_profile", promotion_id="target")],
        fighters=[{"fighter_id": "kabuto", "display_name": "かぶと"}],
        source_documents=[note_doc("note-target", "ターゲット", "ライト級王者\n初代王者 かぶと\n2代目 だれか")],
    )
    assert link_keys(article_link_rows(sources)) == [("note-target", "promotion", "target"), ("note-target", "fighter", "kabuto")]


def test_video_links_from_bouts_extra_bout_links_and_event_links():
    rows = video_link_rows(
        videos=[{"video_id": "v1", "video_type": "full_fight"}, {"video_id": "v2", "video_type": "highlight"},
                {"video_id": "v3", "video_type": "stream_archive"}],
        fighters=[{"fighter_id": "kabuto", "inferred_confidence": "medium"}, {"fighter_id": "zamon", "inferred_confidence": ""}],
        bouts=[{"bout_id": "b1", "event_id": "e1", "inferred_from_video_id": "v1"},
               {"bout_id": "b2", "event_id": "e1", "inferred_from_video_id": ""}],
        bout_participants=[{"bout_id": "b1", "fighter_id": "kabuto"}, {"bout_id": "b1", "fighter_id": ""},
                           {"bout_id": "b2", "fighter_id": "zamon"}],
        video_bout_links=[{"video_id": "v2", "bout_id": "b2"}],
        video_event_links=[{"video_id": "v1", "event_id": "e1", "notes": "dup"}, {"video_id": "v3", "event_id": "e1", "notes": "live"}],
    )
    assert [(r["video_id"], r["entity_type"], r["entity_id"], r["relation_type"]) for r in rows] == [
        ("v1", "bout", "b1", "full_fight"),
        ("v1", "event", "e1", "reference"),
        ("v1", "fighter", "kabuto", "reference"),
        ("v2", "bout", "b2", "reference"),
        ("v2", "event", "e1", "reference"),
        ("v2", "fighter", "zamon", "reference"),
        ("v3", "event", "e1", "stream_archive"),
    ]
    assert rows[2]["notes"] == "Migrated from fighters.inferred_from_video_ids. inferred_confidence=medium."
    assert rows[5]["notes"] == "Migrated from fighters.inferred_from_video_ids."
    assert rows[6]["notes"] == "live"


def test_alias_rows_from_numbers_matches_display_names_and_static_tables():
    matches = [
        {"match_confidence": "high", "matched_fighter_id": "kabuto", "numbers_name": " カブト "},
        {"match_confidence": "medium", "matched_fighter_id": "zamon", "numbers_name": "ザモン"},
        {"match_confidence": "high", "matched_fighter_id": "", "numbers_name": "だれか"},
    ]
    fighters = [
        {"fighter_id": "kabuto", "display_name": "かぶと"},  # Numbers で別名が出たので display_name は足さない
        {"fighter_id": "zamon", "display_name": "ザモン"},
        {"fighter_id": "fighter_0123abcd", "display_name": "動画の名前"},
        {"fighter_id": "medium_one", "display_name": "中くらい", "inferred_confidence": "medium"},
        {"fighter_id": "rolling_jr", "display_name": "ローリングJr."},
    ]
    rows = alias_rows(matches, fighters)
    fighter_rows = [(r["alias"], r["canonical_id"]) for r in rows if r["alias_type"] == "fighters"]
    assert fighter_rows == [("カブト", "kabuto"), ("ザモン", "zamon"), ("ローリングJr.", "rolling_jr"), ("ローリングjr", "rolling_jr")]
    # モジュール自身の定数と比べると常に真なので、行をそのまま書く (T112.6.7)。
    assert [(r["alias"], r["canonical_id"]) for r in rows if r["alias_type"] == "promotions"] == [
        ("ターゲット", "target"), ("エンペラー", "emperor"), ("マウンテン・ヒーローズ", "mh"), ("M・H", "mh"), ("MAXバウト", "max_bout")]
    assert [(r["alias"], r["canonical_id"]) for r in rows if r["alias_type"] == "methods"] == [
        ("KO", "KO"), ("TKO", "TKO"), ("判定", "DEC"), ("アナコンダチョーク", "SUB_ANACONDA_CHOKE")]


def test_ordering_keys():
    assert sort_key_date({"published_at": ""}, "published_at") == "0000-00-00"
    assert sort_key_date({}, "published_at") == "0000-00-00"
    event = {"event_id": "e1", "published_at": "2020-01-01"}
    assert event_sort_date(event, {"e1": "2021-01-01"}, {"e1": "2020-06-01"}) == "2021-01-01"
    assert event_sort_date(event, {}, {"e1": "2020-06-01"}) == "2020-06-01"
    assert event_sort_date(event, {}, {}) == "2020-01-01"
    assert bout_sort_key({"event_id": "e1", "bout_order": "10"}, {"e1": "2021-01-01"}) == ("2021-01-01", "e1", 10)
    assert bout_sort_key({"event_id": "e9", "bout_order": "x"}, {}) == ("0000-00-00", "e9", 0)
    reigns = [{"title_id": "t", "reign_order": o} for o in ("x", "10", "2", "")]
    # 数字でない値は build/titles.py の lineage と同じく末尾 (T112.6.12)。
    assert [r["reign_order"] for r in sorted(reigns, key=reign_sort_key)] == ["", "2", "10", "x"]
