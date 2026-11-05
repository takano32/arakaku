from __future__ import annotations

# arakaku/build の単体テスト。実データは make build + validate が通すので、ここでは小さな行から
# 派生規則 (大会の日付・出場者の並び・勝者の逆引き・動画の紐づけ状態) が意図どおりかだけを見る。

from arakaku.build import aliases, articles, bouts, canonical, events, fighters, numbers, official, titles, videos
from arakaku.build.relations import (
    Relations,
    Tables,
    fighter_aliases,
    index_link_ids,
    linked_video_ids,
    participants_by_bout,
)
from arakaku.event_dates import event_note_dates


ARTICLES = [
    {"article_id": "card", "article_type": "event_card", "published_at": "2026-07-01"},
    {"article_id": "result", "article_type": "event_result", "published_at": "2026-07-05"},
    {"article_id": "result-late", "article_type": "event_result", "published_at": "2026-07-09"},
    {"article_id": "undated", "article_type": "event_result", "published_at": ""},
]
ARTICLE_LINKS = [
    {"article_id": "card", "entity_type": "event", "entity_id": "e1"},
    {"article_id": "result-late", "entity_type": "event", "entity_id": "e1"},
    {"article_id": "result", "entity_type": "event", "entity_id": "e1"},
    {"article_id": "undated", "entity_type": "event", "entity_id": "e2"},
    {"article_id": "result", "entity_type": "bout", "entity_id": "e1-01"},
]


# --- event_dates と build/relations ---

def test_event_note_dates_take_the_earliest_note_of_each_kind():
    result, first = event_note_dates(ARTICLES, ARTICLE_LINKS)
    assert result == {"e1": "2026-07-05"}  # the earliest event_result note; the card does not count
    assert first == {"e1": "2026-07-01"}  # any note of the event; undated notes and bout links are ignored


def test_index_link_ids_groups_by_entity_in_csv_order():
    index = index_link_ids(ARTICLE_LINKS, "article_id")
    assert index[("event", "e1")] == ["card", "result-late", "result"]
    assert index[("bout", "e1-01")] == ["result"]


def test_fighter_aliases_keep_only_fighter_rows():
    rows = [
        {"alias_type": "fighters", "alias": "ワク", "canonical_id": "waku"},
        {"alias_type": "promotions", "alias": "ターゲット", "canonical_id": "target"},
        {"alias_type": "fighters", "alias": "わく選手", "canonical_id": "waku"},
    ]
    assert fighter_aliases(rows) == {"waku": ["ワク", "わく選手"]}


def test_participants_by_bout_puts_red_first_then_blue_then_unknown_sides():
    rows = [
        {"bout_id": "b1", "side": "", "fighter_name": "謎"},
        {"bout_id": "b1", "side": "blue", "fighter_name": "青"},
        {"bout_id": "b1", "side": "red", "fighter_name": "赤"},
    ]
    assert [p["fighter_name"] for p in participants_by_bout(rows)["b1"]] == ["赤", "青", "謎"]


def test_linked_video_ids_union_of_the_three_link_sources():
    bouts = [{"inferred_from_video_id": "v1"}, {"inferred_from_video_id": ""}]
    assert linked_video_ids(bouts, [{"video_id": "v2"}], [{"video_id": "v3"}]) == {"v1", "v2", "v3"}


def _relations() -> Relations:
    tables = Tables(
        articles=ARTICLES,
        article_links=ARTICLE_LINKS,
        bouts=[{"bout_id": "e1-01", "inferred_from_video_id": "v-full"}],
        bout_participants=[
            {"bout_id": "e1-01", "side": "blue", "fighter_id": "b", "fighter_name": "青木", "corner": "", "result": "loss"},
            {"bout_id": "e1-01", "side": "red", "fighter_id": "", "fighter_name": "赤井", "corner": "赤", "result": "win"},
            {"bout_id": "e1-02", "side": "red", "fighter_id": "c", "fighter_name": "C", "corner": "", "result": ""},
            {"bout_id": "e1-02", "side": "blue", "fighter_id": "d", "fighter_name": "D", "corner": "", "result": ""},
        ],
        video_links=[{"video_id": "v-event", "entity_type": "event", "entity_id": "e1"}],
        aliases=[{"alias_type": "fighters", "alias": "ワク", "canonical_id": "waku"}],
        youtube_archives=[{"display_id": "YT1", "uploader": "アラカク通信", "upload_date": "20260701", "thumbnail_sizes": "default high"}],
    )
    return Relations.from_tables(tables)


# --- build/events ---

def test_build_events_joins_dates_sources_and_videos():
    [event] = events.build_events([{"event_id": "e1", "name": "E1", "promotion_id": "target", "event_number": "1", "published_at": ""}], _relations())
    assert event["result_published_at"] == "2026-07-05"
    assert event["note_published_at"] == "2026-07-01"
    assert event["source_article_id"] == "card"  # the first linked article in CSV order
    assert event["source_video_ids"] == ["v-event"]
    assert event["event_number"] == 1
    assert event["published_at"] is None and event["summary"] == ""


# --- build/bouts ---

def test_build_bouts_derives_matchup_winner_and_loser_from_participants():
    rows = [
        {"bout_id": "e1-01", "event_id": "e1", "promotion_id": "target", "bout_order": "1", "round": "2R", "time": "", "result_status": "", "is_title_bout": "", "title_note": "", "notes": ""},
        {"bout_id": "e1-02", "event_id": "e1", "promotion_id": "target", "bout_order": "2", "round": "", "result_status": "unknown", "is_title_bout": "あり", "title_id": "t", "title_note": " x "},
    ]
    decided, unknown = bouts.build_bouts(rows, _relations())
    assert decided["matchup"] == "赤井 vs 青木"  # red first even though blue comes first in the CSV
    assert [f["side"] for f in decided["fighters"]] == ["red", "blue"]
    assert decided["fighters"][0]["fighter_id"] is None and decided["fighters"][0]["corner"] == "赤"
    assert (decided["winner"], decided["winner_id"], decided["loser"], decided["loser_id"]) == ("赤井", None, "青木", "b")
    assert decided["result_status"] == "unknown"  # 空の result_status は build/bouts.py が "unknown" にする (T112.6.23)
    assert decided["result"]["round"] == 2 and decided["result"]["time"] is None  # 空は null (T112.4.8)
    assert decided["source_article_id"] == "result"
    assert unknown["winner"] is None and unknown["loser_id"] is None
    assert unknown["fighters"][0]["result"] == "unknown"
    assert unknown["title"] == {"is_title_bout": True, "title_id": "t", "title_result": None, "note": "x"}


# --- build/fighters ---

def test_build_fighters_attaches_aliases_and_profile():
    [fighter] = fighters.build_fighters([{"fighter_id": "waku", "display_name": "わく", "height": " 170cm ", "age": "", "gym": "G"}], _relations())
    assert fighter["aliases"] == ["ワク"]
    assert fighter["profile"] == {"height": "170cm", "age": None, "gym": "G"}


# --- build/titles ---

def test_build_titles_sorts_lineage_numerically():
    reigns = [
        {"reign_id": "t-10", "title_id": "t", "reign_order": "10", "fighter_name": "十", "fighter_id": "ten"},
        {"reign_id": "t-2", "title_id": "t", "reign_order": "2", "fighter_name": "二", "fighter_id": ""},
        {"reign_id": "other", "title_id": "u", "reign_order": "1", "fighter_name": "他"},
    ]
    [title] = titles.build_titles([{"title_id": "t", "promotion_id": "target", "division": "ライト級"}], reigns)
    assert [r["order"] for r in title["lineage"]] == [2, 10]
    assert title["lineage"][0]["fighter_id"] is None and title["lineage"][1]["fighter_id"] == "ten"


# --- build/videos ---

def test_build_videos_takes_archive_metadata_and_link_status():
    rows = [
        {"video_id": "v-full", "platform": "", "platform_video_id": "YT1", "url": "https://youtu.be/YT1", "title": "t"},
        {"video_id": "v-none", "platform": "youtube", "platform_video_id": "YT9", "url": "https://youtu.be/YT9", "title": "t"},
        {"video_id": "v-other", "platform": "vimeo", "platform_video_id": "YT1", "url": "https://vimeo.com/1", "title": "t"},
    ]
    full, none, other = videos.build_videos(rows, _relations())
    assert (full["platform"], full["channel_name"], full["published_at"], full["thumbnail_sizes"]) == ("youtube", "アラカク通信", "20260701", "default high")
    assert full["link_status"] == "linked" and none["link_status"] == "unlinked"
    assert none["channel_name"] is None and none["thumbnail_sizes"] == ""
    assert other["thumbnail_sizes"] == ""  # only YouTube videos have archive thumbnails
    # チャンネル名と公開日も、同じ ID の YouTube のアーカイブから写さない (T112.6.22)。
    assert (other["channel_name"], other["published_at"]) == (None, None)


# --- build/articles ---

def test_build_articles_keeps_the_status_cell():
    # 空の status を、検証の vocab に無い "parsed" に書き換えない (T112.6.10)。
    rows = articles.build_articles([{"article_id": "a", "status": "unparsed"}, {"article_id": "b", "status": ""}])
    assert [row["status"] for row in rows] == ["unparsed", None]


def test_source_documents_are_split_from_their_bodies():
    docs = [{"source_id": "note:a", "title": "A", "content_text": "本文"}]
    assert articles.source_documents_without_bodies(docs) == [{"source_id": "note:a", "title": "A"}]
    assert articles.source_document_bodies(docs) == [{"source_id": "note:a", "content_text": "本文"}]


# --- build/aliases と build/canonical ---

def test_build_aliases_has_every_alias_type_even_without_rows():
    assert aliases.build_aliases([]) == {"fighters": {}, "promotions": {}, "methods": {}}


def test_json_builders_keep_the_output_file_order():
    assert list(canonical.json_builders(Tables())) == [
        "metadata.json", "articles.json", "article_links.json", "promotions.json", "events.json", "bouts.json",
        "bout_participants.json", "fighters.json", "titles.json", "title_reigns.json", "fighter_snapshots.json",
        "videos.json", "video_links.json", "aliases.json", "source_documents.json", "source_document_bodies.json",
        "source_mentions.json", "youtube_archives.json", "note_archives.json", "source_event_references.json",
        "source_bout_references.json", "source_video_references.json",
    ]


# --- build/numbers と build/official ---

def test_numbers_and_official_builders_parse_integers():
    [fighter] = numbers.build_numbers_fighters([{"numbers_fighter_id": "n1", "source_row": "3", "fight_count": "5", "wins": "3", "losses": "x", "notes": ""}])
    assert fighter["source_row"] == 3 and fighter["stats"] == {"fight_count": 5, "wins": 3, "losses": "x", "win_rate": None}
    [entry] = official.build_official_history([{"year": "1996", "era": "黎明期", "month": "", "title": "旗揚げ", "description": ""}])
    assert entry == {"year": 1996, "era": "黎明期", "month": None, "title": "旗揚げ", "description": None}
    assert list(official.json_builders([], [], [], [])) == ["official_players.json", "official_tournaments.json", "official_matches.json", "official_history.json"]
    assert list(official.pages_json_builders([], [])) == ["official_news.json", "official_pages.json"]
    assert list(numbers.json_builders([], [], [])) == ["numbers_fighters.json", "numbers_name_matches.json", "numbers_fight_records.json"]



def test_build_titles_does_not_crash_on_a_non_numeric_reign_order():
    # 以前は int と str を比べて TypeError で build ごと止まった。数字の順のあとに文字列の順で並べる (T112.4.6)。
    reigns = [{"reign_id": f"r{order}", "title_id": "t", "reign_order": order} for order in ("x", "10", "2", "")]
    [title] = titles.build_titles([{"title_id": "t", "promotion_id": "target", "division": "ライト級"}], reigns)
    assert [r["reign_id"] for r in title["lineage"]] == ["r", "r2", "r10", "rx"]


def test_empty_bout_result_and_title_cells_become_null():
    # 以前は time・method_*・technique・decision_score・title_id・title_result だけ空を "" で出していた (T112.4.8)。
    from arakaku.build.bouts import _bout_result, _bout_title
    row = {"round": "", "time": "", "method_raw": "", "method_normalized": "", "technique": "", "decision_score": "",
           "is_title_bout": "", "title_id": "", "title_result": "", "title_note": ""}
    assert set(_bout_result(row).values()) == {None}
    title = _bout_title(row)
    assert (title["title_id"], title["title_result"], title["note"]) == (None, None, None)  # note は T112.6.15
