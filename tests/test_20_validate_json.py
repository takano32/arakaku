from __future__ import annotations

def test_collect_ids_detects_duplicate_ids(validate_json_module):
    items=[{'fighter_id':'waku'},{'fighter_id':'waku'}]
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    ids=validate_json_module.collect_ids(items,'fighters.json','fighter_id')
    assert ids == {'waku'}
    assert 'duplicate fighter_id: waku' in '\n'.join(validate_json_module.ERRORS)

def test_validate_real_article_references(validate_json_module, docs_data, json_file):
    articles=json_file(docs_data/'articles.json'); promotions=json_file(docs_data/'promotions.json'); events=json_file(docs_data/'events.json'); fighters=json_file(docs_data/'fighters.json'); bouts=json_file(docs_data/'bouts.json'); bout_participants=json_file(docs_data/'bout_participants.json'); titles=json_file(docs_data/'titles.json'); title_reigns=json_file(docs_data/'title_reigns.json'); snapshots=json_file(docs_data/'fighter_snapshots.json'); videos=json_file(docs_data/'videos.json'); article_links=json_file(docs_data/'article_links.json')
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    article_ids=validate_json_module.validate_articles(articles)
    promotion_ids=validate_json_module.validate_promotions(promotions, article_ids)
    event_ids=validate_json_module.validate_events(events, promotion_ids, article_ids)
    fighter_ids=validate_json_module.validate_fighters(fighters, promotion_ids, article_ids)
    video_ids=validate_json_module.validate_videos(videos, article_ids)
    bout_ids=validate_json_module.validate_bouts(bouts, event_ids, promotion_ids, fighter_ids, article_ids)
    validate_json_module.validate_bout_participants(bout_participants, bout_ids, fighter_ids)
    title_ids=validate_json_module.collect_ids(titles, 'titles.json', 'title_id')
    snapshot_ids=validate_json_module.collect_ids(snapshots, 'fighter_snapshots.json', 'snapshot_id')
    reign_ids=validate_json_module.validate_title_reigns(title_reigns, title_ids, fighter_ids, event_ids, article_ids, video_ids)
    validate_json_module.validate_titles(titles, promotion_ids, fighter_ids, article_ids, video_ids)
    validate_json_module.validate_fighter_snapshots(snapshots, fighter_ids, event_ids, article_ids, promotion_ids)
    validate_json_module.validate_article_links(article_links, article_ids, event_ids, bout_ids, fighter_ids, snapshot_ids, promotion_ids, title_ids, reign_ids, video_ids)
    assert validate_json_module.ERRORS == []

def test_validate_real_aliases_shape(validate_json_module, docs_data, json_file):
    aliases=json_file(docs_data/'aliases.json')
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_aliases(aliases)
    assert validate_json_module.ERRORS == []
    assert set(aliases) >= {'fighters','promotions','methods'}

def test_validate_bouts_warns_on_unusual_method(validate_json_module):
    bouts=[{'bout_id':'sample-001','event_id':'target-103','promotion_id':'target','fighters':[{'fighter_id':'waku','name':'わく','result':'win'},{'fighter_id':'tsukurihara','name':'つくりはら','result':'loss'}],'winner_id':'waku','winner':'わく','loser_id':'tsukurihara','loser':'つくりはら','result':{'method_normalized':'SPECIAL'},'source_article_id':'note-target-103-result'}]
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_bouts(bouts=bouts,event_ids={'target-103'},promotion_ids={'target'},fighter_ids={'waku','tsukurihara'},article_ids={'note-target-103-result'})
    assert validate_json_module.ERRORS == []
    assert 'unusual method_normalized: SPECIAL' in '\n'.join(validate_json_module.WARNINGS)
