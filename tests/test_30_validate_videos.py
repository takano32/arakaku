from __future__ import annotations

# make validate がすでに実データで validate_videos / validate_video_links を通しているので、
# ここでは壊れた入力が確実にエラーになることだけを確かめる (T.85)。


def test_validate_videos_rejects_bad_rows(validate_json_module):
    videos = [
        {"video_id": "v1", "platform": "youtube", "platform_video_id": "A", "url": "ftp://x", "title": "t", "video_type": "fullfight"},
        {"video_id": "v2", "platform": "youtube", "platform_video_id": "A", "url": "https://x", "title": "t", "source_article_ids": ["gone"]},
        {"video_id": "v2", "platform": "youtube", "platform_video_id": "B", "url": "https://y"},
    ]
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_videos(videos, article_ids={"kept"})
    errors = "\n".join(validate_json_module.ERRORS)
    for expected in ("invalid url: ftp://x", "unusual video_type: fullfight", "duplicate platform/platform_video_id: youtube/A",
                     "unknown article reference: gone", "duplicate video_id: v2", "missing required field: title"):
        assert expected in errors


def test_validate_video_links_rejects_bad_rows(validate_json_module):
    links = [
        {"video_id": "v1", "entity_type": "bout", "entity_id": "b1", "relation_type": "full_fight"},
        {"video_id": "v1", "entity_type": "bout", "entity_id": "b1", "relation_type": "full_fight"},
        {"video_id": "gone", "entity_type": "event", "entity_id": "nowhere", "relation_type": "teaser"},
        {"video_id": "v1", "entity_type": "venue", "entity_id": "x"},
    ]
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_video_links(links, {"v1"}, {"e1"}, {"b1"}, set(), set(), set())
    errors = "\n".join(validate_json_module.ERRORS)
    for expected in ("duplicate video link", "unknown video reference: gone", "unusual relation_type: teaser",
                     "unknown event reference: nowhere", "invalid entity_type: venue"):
        assert expected in errors
