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
    bouts = [
        {
            "bout_id": "target-103-01",
            "event_id": "target-103",
            "matchup": "わく vs つくりはら",
            "fighter_a": "わく",
            "fighter_b": "つくりはら",
            "source_article_id": "",
        }
    ]
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

    rows = source_reference_candidates_module.build_bout_candidates(
        bouts,
        events,
        mentions,
        documents,
        video_links,
    )

    assert len(rows) == 1
    assert rows[0]["bout_id"] == "target-103-01"
    assert rows[0]["source_id"] == "youtube_description:youtube_sample"
    assert rows[0]["match_reason"] == "linked_video_description"
    assert rows[0]["confidence"] == "high"


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
