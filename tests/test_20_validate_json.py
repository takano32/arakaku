from __future__ import annotations

def test_collect_ids_detects_duplicate_ids(validate_json_module):
    items=[{'fighter_id':'waku'},{'fighter_id':'waku'}]
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    ids=validate_json_module.collect_ids(items,'fighters.json','fighter_id')
    assert ids == {'waku'}
    assert 'duplicate fighter_id: waku' in '\n'.join(validate_json_module.ERRORS)

def test_validate_article_links_rejects_bad_rows(validate_json_module):
    links = [
        {'link_id': 'l1', 'article_id': 'gone', 'entity_type': 'bout', 'entity_id': 'b1', 'relation_type': 'source'},
        {'link_id': 'l2', 'article_id': 'a1', 'entity_type': 'stadium', 'entity_id': 'x'},
        {'link_id': 'l3', 'article_id': 'a1', 'entity_type': 'fighter', 'entity_id': 'nobody', 'relation_type': 'mention'},
    ]
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_article_links(links, {'a1'}, set(), {'b1'}, {'waku'}, set(), set(), set(), set(), set())
    errors = '\n'.join(validate_json_module.ERRORS)
    for expected in ('unknown article reference: gone', 'invalid entity_type: stadium', 'unusual relation_type: mention', 'unknown fighter reference: nobody'):
        assert expected in errors

def test_validate_aliases_rejects_non_objects(validate_json_module):
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_aliases({'fighters': ['あかそ']})
    validate_json_module.validate_aliases(['not', 'an', 'object'])
    errors = '\n'.join(validate_json_module.ERRORS)
    assert 'aliases.json[fighters]: expected object' in errors and 'aliases.json: expected object' in errors

def test_validate_bouts_rejects_unusual_method(validate_json_module):
    bouts=[{'bout_id':'sample-001','event_id':'target-103','promotion_id':'target','fighters':[{'fighter_id':'waku','name':'わく','result':'win'},{'fighter_id':'tsukurihara','name':'つくりはら','result':'loss'}],'winner_id':'waku','winner':'わく','loser_id':'tsukurihara','loser':'つくりはら','result':{'method_normalized':'SPECIAL'},'source_article_id':'note-target-103-result'}]
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_bouts(bouts=bouts,event_ids={'target-103'},promotion_ids={'target'},fighter_ids={'waku','tsukurihara'},article_ids={'note-target-103-result'})
    assert 'unusual method_normalized: SPECIAL' in '\n'.join(validate_json_module.ERRORS)

def test_validate_title_reigns_rejects_vacated_reign_with_lost_at(validate_json_module):
    reigns=[{'reign_id':'mh-middleweight-1','title_id':'mh-middleweight','reign_order':'1','fighter_id':'tail_junk','end_reason':'vacated','lost_at_event_id':'mh-38'},{'reign_id':'mh-middleweight-2','title_id':'mh-middleweight','reign_order':'2','fighter_id':'tail_junk','end_reason':'retired'}]
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_title_reigns(reigns, {'mh-middleweight'}, {'tail_junk'}, {'mh-38'}, set(), set())
    errors='\n'.join(validate_json_module.ERRORS)
    assert 'title_reigns.json[0]: vacated reign must not have lost_at_event_id' in errors
    assert 'title_reigns.json[1]: unknown end_reason: retired' in errors

def test_validate_fighter_snapshots_checks_source_id(validate_json_module):
    snapshots=[{'snapshot_id':'a','fighter_id':'zamon','source_id':'note:note-target-103-card'},{'snapshot_id':'b','fighter_id':'zamon','source_id':'official_news:2026-07-maxbout-16players'},{'snapshot_id':'c','fighter_id':'zamon','source_id':'official_news:missing'},{'snapshot_id':'d','fighter_id':'zamon','source_id':''}]
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_fighter_snapshots(snapshots, {'zamon'}, set(), {'note-target-103-card'}, set(), {'2026-07-maxbout-16players'})
    errors='\n'.join(validate_json_module.ERRORS)
    assert 'fighter_snapshots.json[0]' not in errors and 'fighter_snapshots.json[1]' not in errors
    assert 'fighter_snapshots.json[2]: unknown official news reference in source_id: missing' in errors
    assert 'fighter_snapshots.json[3]: source_id must be note:<article_id> or official_news:<slug>' in errors

def test_validate_official_pages_rejects_unsafe_html(validate_json_module):
    pages=[
        {'slug':'ok','title':'ok','body_html':'<p>a</p><img src="/logos/a.jpeg"><iframe src="https://www.youtube.com/embed/x"></iframe>'},
        {'slug':'bad','title':'bad','body_html':'<p onclick="x">a</p><a href="javascript:alert(1)">b</a><iframe src="https://evil.example/"></iframe><script>1</script>'},
    ]
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_official_pages(pages)
    errors='\n'.join(validate_json_module.ERRORS)
    assert '(ok)' not in errors
    for problem in ('contains <script>','event handler attribute','script URL','unexpected host (evil.example)'):
        assert problem in errors

def test_round_time_problems(validate_json_module):
    ok=validate_json_module.round_time_problems
    assert ok(3,'終了') == [] and ok(1,'3分04秒') == [] and ok(None,None) == [] and ok(2,'5分0秒') == []
    assert ok('3終了','') and ok(6,'') and ok(3,'07分51秒') and ok(None,'1分00秒') and ok(1,'1分60秒')

def test_validate_enums_rejects_unknown_values(validate_json_module):
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_enums({
        'bouts': [{'bout_id': 'b1', 'bout_type': 'one_matc'}, {'bout_id': 'b2', 'bout_type': 'one_match', 'inferred_confidence': None}],
        'events': [], 'fighters': [], 'bout_participants': [{'participant_id': 'p1', 'side': 'green'}],
        'source_mentions': [], 'numbers_name_matches': [], 'articles': [],
    })
    errors = '\n'.join(validate_json_module.ERRORS)
    assert 'unknown bout_type: one_matc' in errors and 'unknown side: green' in errors
    assert '(b2)' not in errors

def test_validate_cross_tables(validate_json_module):
    validate_json_module.ERRORS.clear(); validate_json_module.WARNINGS.clear()
    validate_json_module.validate_cross_tables(
        bouts=[{'bout_id': 'b1', 'event_id': 'e1', 'promotion_id': 'emperor'}],
        events=[{'event_id': 'e1', 'promotion_id': 'target'}],
        aliases={'fighters': {'x': 'nobody'}, 'promotions': {'ターゲット': 'target'}, 'methods': {'KO': 'KO', 'まいった': 'GIVEUP'}},
        fighter_ids={'waku'}, promotion_ids={'target'},
        title_reigns=[{'title_id': 't', 'reign_order': '1', 'lost_at_event_id': 'e2'}, {'title_id': 't', 'reign_order': '2', 'won_at_event_id': 'e3'}],
        source_mentions=[{'mention_id': 'm1', 'source_id': 'gone'}],
        source_documents=[{'source_id': 'kept'}],
    )
    errors = '\n'.join(validate_json_module.ERRORS)
    for expected in ('differs from its event e1', 'unknown canonical_id: nobody', 'known method: GIVEUP', 'unknown source_id: gone', 'reign 1 ended at e2 but reign 2 began at e3'):
        assert expected in errors
    assert 'ターゲット' not in errors and "[KO]" not in errors

def test_locate_error_names_the_csv_row(validate_json_module, docs_data, json_file):
    bouts = json_file(docs_data/'bouts.json')
    located = validate_json_module.locate_error('bouts.json[0]: something is wrong')
    assert located.endswith(f"[data-src/bouts.csv:2, bout_id={bouts[0]['bout_id']}]")
    assert validate_json_module.locate_error('aliases.json[fighters]: x') == 'aliases.json[fighters]: x'
