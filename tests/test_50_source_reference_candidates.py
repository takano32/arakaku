from __future__ import annotations


def test_build_event_candidates_from_exact_event_mentions(source_reference_candidates_module):
    documents = {
        "note:sample": {
            "source_id": "note:sample",
            "source_type": "note_article",
            "source_ref_id": "note-sample",
            "title": "ターゲットNo.103試合結果",
            "url": "https://example.test/note",
            "content_preview": "ターゲットNo.103",
        }
    }
    events = [{"event_id": "target-103", "name": "ターゲットNo.103"}]
    mentions = [
        {
            "mention_id": "m1",
            "source_id": "note:sample",
            "mention_type": "event",
            "entity_type": "event",
            "entity_hint": "ターゲットNo.103",
            "matched_text": "ターゲットNo.103",
            "context": "ターゲットNo.103試合結果",
            "line_number": "1",
        },
        {
            "mention_id": "m2",
            "source_id": "note:sample",
            "mention_type": "result",
            "entity_type": "bout",
            "entity_hint": "",
            "matched_text": "2R2分16秒KO",
            "context": "ターゲットNo.103試合結果",
            "line_number": "14",
        },
    ]

    rows = source_reference_candidates_module.build_event_candidates(events, mentions, documents)

    assert len(rows) == 1
    assert rows[0]["event_id"] == "target-103"
    assert rows[0]["source_id"] == "note:sample"
    assert rows[0]["confidence"] == "high"
    assert "event:1" in rows[0]["mention_types"]
    assert "result:1" in rows[0]["mention_types"]


def test_build_bout_fighter_names_from_participants(source_reference_candidates_module):
    participants = [
        {"bout_id": "target-103-01", "side": "red", "fighter_name": "わく"},
        {"bout_id": "target-103-01", "side": "blue", "fighter_name": "つくりはら"},
        # corner/result rows, unknown sides, and blank names must be ignored.
        {"bout_id": "target-103-01", "side": "", "fighter_name": "noise"},
        {"bout_id": "target-103-02", "side": "red", "fighter_name": ""},
        # only a red name is known: blue is reported as empty.
        {"bout_id": "target-103-03", "side": "red", "fighter_name": "きんとき"},
    ]

    names = source_reference_candidates_module.build_bout_fighter_names(participants)

    assert names["target-103-01"] == ("わく", "つくりはら")
    assert names["target-103-03"] == ("きんとき", "")
    # A bout with no usable participant names produces no entry.
    assert "target-103-02" not in names


def test_build_bout_source_ids_from_article_links(source_reference_candidates_module):
    documents = {
        "note:note-target-103-result": {"source_id": "note:note-target-103-result"},
    }
    article_links = [
        {"article_id": "note-target-103-result", "entity_type": "bout", "entity_id": "target-103-04"},
        # entity_type other than bout is ignored.
        {"article_id": "note-target-103-result", "entity_type": "event", "entity_id": "target-103"},
        # article without a matching source document is ignored.
        {"article_id": "note-missing", "entity_type": "bout", "entity_id": "target-103-04"},
    ]

    source_ids = source_reference_candidates_module.build_bout_source_ids(article_links, documents)

    assert source_ids["target-103-04"] == {"note:note-target-103-result"}


def test_build_bout_candidates_from_linked_video_description(source_reference_candidates_module):
    documents = {
        "youtube_description:youtube_sample": {
            "source_id": "youtube_description:youtube_sample",
            "source_type": "youtube_description",
            "source_ref_id": "youtube_sample",
            "title": "わく vs つくりはら",
            "url": "https://example.test/video",
            "content_preview": "わく vs つくりはら",
        }
    }
    events = [{"event_id": "target-103", "name": "ターゲットNo.103"}]
    bouts = [{"bout_id": "target-103-01", "event_id": "target-103"}]
    participants = [
        {"bout_id": "target-103-01", "side": "red", "fighter_name": "わく"},
        {"bout_id": "target-103-01", "side": "blue", "fighter_name": "つくりはら"},
    ]
    article_links = []
    mentions = [
        {
            "mention_id": "m1",
            "source_id": "youtube_description:youtube_sample",
            "mention_type": "matchup",
            "entity_type": "bout",
            "entity_hint": "ターゲットNo.103",
            "matched_text": "わく vs つくりはら",
            "context": "わく vs つくりはら",
            "line_number": "1",
        }
    ]
    video_links = [
        {
            "video_id": "youtube_sample",
            "entity_type": "bout",
            "entity_id": "target-103-01",
        }
    ]

    bout_fighter_names = source_reference_candidates_module.build_bout_fighter_names(participants)
    bout_source_ids = source_reference_candidates_module.build_bout_source_ids(article_links, documents)

    rows = source_reference_candidates_module.build_bout_candidates(
        bouts,
        events,
        mentions,
        documents,
        video_links,
        bout_fighter_names,
        bout_source_ids,
    )

    assert len(rows) == 1
    assert rows[0]["bout_id"] == "target-103-01"
    assert rows[0]["matchup"] == "わく vs つくりはら"
    assert rows[0]["fighter_a"] == "わく"
    assert rows[0]["fighter_b"] == "つくりはら"
    assert rows[0]["source_id"] == "youtube_description:youtube_sample"
    assert rows[0]["match_reason"] == "linked_video_description"
    assert rows[0]["confidence"] == "high"


def test_build_bout_candidates_match_reasons_from_note_sources(source_reference_candidates_module):
    documents = {
        "note:note-target-103-card": {
            "source_id": "note:note-target-103-card",
            "source_type": "note_article",
            "source_ref_id": "note-target-103-card",
            "title": "ターゲットNo.103対戦カード",
            "url": "https://example.test/card",
            "content_preview": "ターゲットNo.103 わく つくりはら",
        },
        "note:note-target-103-result": {
            "source_id": "note:note-target-103-result",
            "source_type": "note_article",
            "source_ref_id": "note-target-103-result",
            "title": "ターゲットNo.103試合結果",
            "url": "https://example.test/result",
            "content_preview": "ターゲットNo.103 結果",
        },
    }
    events = [{"event_id": "target-103", "name": "ターゲットNo.103"}]
    bouts = [{"bout_id": "target-103-01", "event_id": "target-103"}]
    participants = [
        {"bout_id": "target-103-01", "side": "red", "fighter_name": "わく"},
        {"bout_id": "target-103-01", "side": "blue", "fighter_name": "つくりはら"},
    ]
    article_links = [
        {"article_id": "note-target-103-card", "entity_type": "bout", "entity_id": "target-103-01"},
        {"article_id": "note-target-103-result", "entity_type": "bout", "entity_id": "target-103-01"},
    ]
    mentions = [
        # Card source mentions the event name and both fighter names -> fighter_pair.
        {
            "mention_id": "m1",
            "source_id": "note:note-target-103-card",
            "mention_type": "matchup",
            "entity_type": "bout",
            "matched_text": "ターゲットNo.103 わく つくりはら",
            "context": "ターゲットNo.103 わく つくりはら",
            "line_number": "1",
        },
        # Result source mentions only the event name -> falls back to existing_source_article.
        {
            "mention_id": "m2",
            "source_id": "note:note-target-103-result",
            "mention_type": "result",
            "entity_type": "bout",
            "matched_text": "ターゲットNo.103 結果",
            "context": "ターゲットNo.103 結果",
            "line_number": "5",
        },
    ]
    video_links = []

    bout_fighter_names = source_reference_candidates_module.build_bout_fighter_names(participants)
    bout_source_ids = source_reference_candidates_module.build_bout_source_ids(article_links, documents)

    rows = source_reference_candidates_module.build_bout_candidates(
        bouts,
        events,
        mentions,
        documents,
        video_links,
        bout_fighter_names,
        bout_source_ids,
    )

    by_source = {row["source_id"]: row for row in rows}
    assert by_source["note:note-target-103-card"]["match_reason"] == "fighter_pair"
    assert by_source["note:note-target-103-result"]["match_reason"] == "existing_source_article"


def test_build_video_candidates_from_youtube_description(source_reference_candidates_module):
    documents = {
        "youtube_description:youtube_sample": {
            "source_id": "youtube_description:youtube_sample",
            "source_type": "youtube_description",
            "source_ref_id": "youtube_sample",
            "title": "サンプル動画",
            "url": "https://example.test/video",
            "content_preview": "概要欄本文",
        }
    }
    videos = [{"video_id": "youtube_sample", "title": "サンプル動画"}]
    mentions = [
        {
            "mention_id": "m1",
            "source_id": "youtube_description:youtube_sample",
            "mention_type": "note_url",
            "matched_text": "https://note.com/example",
        }
    ]

    rows = source_reference_candidates_module.build_video_candidates(videos, mentions, documents)

    assert len(rows) == 1
    assert rows[0]["video_id"] == "youtube_sample"
    assert "note_url:1" in rows[0]["mention_types"]
    assert rows[0]["content_preview"] == "概要欄本文"
