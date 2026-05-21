from __future__ import annotations


def test_validate_videos_accepts_real_video_data(
    validate_json_module,
    docs_data,
    json_file,
):
    articles = json_file(docs_data / "articles.json")
    videos = json_file(docs_data / "videos.json")

    validate_json_module.ERRORS.clear()
    validate_json_module.WARNINGS.clear()

    article_ids = validate_json_module.validate_articles(articles)
    video_ids = validate_json_module.validate_videos(videos, article_ids)

    assert video_ids
    assert validate_json_module.ERRORS == []


def test_validate_video_links_accepts_real_links(
    validate_json_module,
    docs_data,
    json_file,
):
    videos = json_file(docs_data / "videos.json")
    events = json_file(docs_data / "events.json")
    bouts = json_file(docs_data / "bouts.json")
    fighters = json_file(docs_data / "fighters.json")
    promotions = json_file(docs_data / "promotions.json")
    titles = json_file(docs_data / "titles.json")
    video_links = json_file(docs_data / "video_links.json")

    validate_json_module.ERRORS.clear()
    validate_json_module.WARNINGS.clear()

    video_ids = validate_json_module.collect_ids(videos, "videos.json", "video_id")
    event_ids = validate_json_module.collect_ids(events, "events.json", "event_id")
    bout_ids = validate_json_module.collect_ids(bouts, "bouts.json", "bout_id")
    fighter_ids = validate_json_module.collect_ids(fighters, "fighters.json", "fighter_id")
    promotion_ids = validate_json_module.collect_ids(
        promotions,
        "promotions.json",
        "promotion_id",
    )
    title_ids = validate_json_module.collect_ids(titles, "titles.json", "title_id")

    validate_json_module.validate_video_links(
        video_links,
        video_ids,
        event_ids,
        bout_ids,
        fighter_ids,
        promotion_ids,
        title_ids,
    )

    assert validate_json_module.ERRORS == []


def test_validate_video_links_detects_unknown_video(validate_json_module):
    validate_json_module.ERRORS.clear()
    validate_json_module.WARNINGS.clear()

    validate_json_module.validate_video_links(
        [
            {
                "video_id": "missing-video",
                "entity_type": "bout",
                "entity_id": "target-103-02",
                "relation_type": "full_fight",
            }
        ],
        video_ids={"known-video"},
        event_ids={"target-103"},
        bout_ids={"target-103-02"},
        fighter_ids=set(),
        promotion_ids=set(),
        title_ids=set(),
    )

    assert "unknown video reference: missing-video" in "\n".join(
        validate_json_module.ERRORS
    )
