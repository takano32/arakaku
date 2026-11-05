from __future__ import annotations

from arakaku.validation.common import collect_ids
from arakaku.validation.entities import (
    validate_articles,
    validate_bouts,
    validate_fighter_snapshots,
    validate_title_reigns,
)
from arakaku.validation.links import validate_aliases, validate_article_links
from arakaku.validation.locate import locate_error
from arakaku.validation.official import validate_official_pages
from arakaku.validation.report import Report
from arakaku.validation.rules import (
    round_time_problems,
    validate_bout_titles,
    validate_cross_tables,
    validate_dates,
    validate_enums,
)
from arakaku.validation.sources import validate_source_documents


def test_collect_ids_detects_duplicate_ids(report: Report):
    items=[{'fighter_id':'waku'},{'fighter_id':'waku'}]
    ids=collect_ids(report, items,'fighters.json','fighter_id')
    assert ids == {'waku'}
    assert 'duplicate fighter_id: waku' in '\n'.join(report.errors)

def test_validate_article_links_rejects_bad_rows(report: Report):
    links = [
        {'link_id': 'l1', 'article_id': 'gone', 'entity_type': 'bout', 'entity_id': 'b1', 'relation_type': 'source'},
        {'link_id': 'l2', 'article_id': 'a1', 'entity_type': 'stadium', 'entity_id': 'x'},
        {'link_id': 'l3', 'article_id': 'a1', 'entity_type': 'fighter', 'entity_id': 'nobody', 'relation_type': 'mention'},
    ]
    validate_article_links(report, links, {'a1'}, set(), {'b1'}, {'waku'}, set(), set(), set(), set(), set())
    errors = '\n'.join(report.errors)
    for expected in ('unknown article reference: gone', 'invalid entity_type: stadium', 'unusual relation_type: mention', 'unknown fighter reference: nobody'):
        assert expected in errors

def test_validate_aliases_rejects_non_objects(report: Report):
    validate_aliases(report, {'fighters': ['あかそ']})
    validate_aliases(report, ['not', 'an', 'object'])
    errors = '\n'.join(report.errors)
    assert 'aliases.json[fighters]: expected object' in errors and 'aliases.json: expected object' in errors

def test_validate_bouts_rejects_unusual_method(report: Report):
    bouts=[{'bout_id':'sample-001','event_id':'target-103','promotion_id':'target','fighters':[{'fighter_id':'waku','name':'わく','result':'win'},{'fighter_id':'tsukurihara','name':'つくりはら','result':'loss'}],'winner_id':'waku','winner':'わく','loser_id':'tsukurihara','loser':'つくりはら','result':{'method_normalized':'SPECIAL'},'source_article_id':'note-target-103-result'}]
    validate_bouts(report, bouts=bouts,event_ids={'target-103'},promotion_ids={'target'},fighter_ids={'waku','tsukurihara'},article_ids={'note-target-103-result'})
    assert 'unusual method_normalized: SPECIAL' in '\n'.join(report.errors)

def test_validate_title_reigns_rejects_vacated_reign_with_lost_at(report: Report):
    reigns=[{'reign_id':'mh-middleweight-1','title_id':'mh-middleweight','reign_order':'1','fighter_id':'tail_junk','end_reason':'vacated','lost_at_event_id':'mh-38'},{'reign_id':'mh-middleweight-2','title_id':'mh-middleweight','reign_order':'2','fighter_id':'tail_junk','end_reason':'retired'}]
    validate_title_reigns(report, reigns, {'mh-middleweight'}, {'tail_junk'}, {'mh-38'}, set(), set())
    errors='\n'.join(report.errors)
    assert 'title_reigns.json[0]: vacated reign must not have lost_at_event_id' in errors
    assert 'title_reigns.json[1]: unknown end_reason: retired' in errors

def test_validate_fighter_snapshots_checks_source_id(report: Report):
    snapshots=[{'snapshot_id':'a','fighter_id':'zamon','source_id':'note:note-target-103-card'},{'snapshot_id':'b','fighter_id':'zamon','source_id':'official_news:2026-07-maxbout-16players'},{'snapshot_id':'c','fighter_id':'zamon','source_id':'official_news:missing'},{'snapshot_id':'d','fighter_id':'zamon','source_id':''}]
    validate_fighter_snapshots(report, snapshots, {'zamon'}, set(), {'note-target-103-card'}, set(), {'2026-07-maxbout-16players'})
    errors='\n'.join(report.errors)
    assert 'fighter_snapshots.json[0]' not in errors and 'fighter_snapshots.json[1]' not in errors
    assert 'fighter_snapshots.json[2]: unknown official news reference in source_id: missing' in errors
    assert 'fighter_snapshots.json[3]: source_id must be note:<article_id> or official_news:<slug>' in errors

def test_validate_official_pages_rejects_unsafe_html(report: Report):
    pages=[
        {'slug':'ok','title':'ok','body_html':'<p>a</p><img src="/logos/a.jpeg"><iframe src="https://www.youtube.com/embed/x"></iframe>'},
        {'slug':'bad','title':'bad','body_html':'<p onclick="x">a</p><a href="javascript:alert(1)">b</a><iframe src="https://evil.example/"></iframe><script>1</script>'},
    ]
    validate_official_pages(report, pages)
    errors='\n'.join(report.errors)
    assert '(ok)' not in errors
    for problem in ('contains <script>','event handler attribute','script URL','unexpected host (evil.example)'):
        assert problem in errors

def test_round_time_problems():
    ok=round_time_problems
    assert ok(3,'終了') == [] and ok(1,'3分04秒') == [] and ok(None,None) == [] and ok(2,'5分00秒') == []
    assert ok('3終了','') and ok(6,'') and ok(3,'07分51秒') and ok(None,'1分00秒') and ok(1,'1分60秒') and ok(1,'3分4秒')

def test_validate_enums_rejects_unknown_values(report: Report):
    validate_enums(report, {
        'bouts': [{'bout_id': 'b1', 'bout_type': 'one_matc'}, {'bout_id': 'b2', 'bout_type': 'one_match', 'inferred_confidence': None}],
        'events': [], 'fighters': [], 'bout_participants': [{'participant_id': 'p1', 'side': 'green'}],
        'source_mentions': [], 'numbers_name_matches': [], 'articles': [],
    })
    errors = '\n'.join(report.errors)
    assert 'unknown bout_type: one_matc' in errors and 'unknown side: green' in errors
    assert '(b2)' not in errors

def test_validate_cross_tables(report: Report):
    validate_cross_tables(
        report,
        bouts=[{'bout_id': 'b1', 'event_id': 'e1', 'promotion_id': 'emperor'}],
        events=[{'event_id': 'e1', 'promotion_id': 'target'}],
        aliases={'fighters': {'x': 'nobody'}, 'promotions': {'ターゲット': 'target'}, 'methods': {'KO': 'KO', 'まいった': 'GIVEUP'}},
        fighter_ids={'waku'}, promotion_ids={'target'},
        title_reigns=[{'title_id': 't', 'reign_order': '1', 'lost_at_event_id': 'e2'}, {'title_id': 't', 'reign_order': '2', 'won_at_event_id': 'e3'}],
        source_mentions=[{'mention_id': 'm1', 'source_id': 'gone'}],
        source_documents=[{'source_id': 'kept'}],
    )
    errors = '\n'.join(report.errors)
    for expected in ('differs from its event e1', 'unknown canonical_id: nobody', 'known method: GIVEUP', 'unknown source_id: gone', 'reign 1 ended at e2 but reign 2 began at e3'):
        assert expected in errors
    assert 'ターゲット' not in errors and "[KO]" not in errors

def test_locate_error_names_the_csv_row(docs_data, json_file):
    bouts = json_file(docs_data/'bouts.json')
    located = locate_error('bouts.json[0]: something is wrong')
    assert located.endswith(f"[data-src/bouts.csv:2, bout_id={bouts[0]['bout_id']}]")
    assert locate_error('aliases.json[fighters]: x') == 'aliases.json[fighters]: x'

def test_validate_bout_titles(report: Report):
    titles = [{'title_id': 'target-middleweight', 'promotion_id': 'target', 'division': 'ミドル級'}]
    bouts = [
        {'bout_id': 'ok', 'promotion_id': 'target', 'division': 'ミドル級', 'title': {'is_title_bout': True, 'title_id': 'target-middleweight'}},
        {'bout_id': 'missing', 'promotion_id': 'target', 'division': 'ミドル級', 'title': {'is_title_bout': True, 'title_id': ''}},
        {'bout_id': 'unknown', 'promotion_id': 'target', 'division': 'ミドル級', 'title': {'is_title_bout': True, 'title_id': 'nope'}},
        {'bout_id': 'mismatch', 'promotion_id': 'emperor', 'division': 'ミドル級', 'title': {'is_title_bout': True, 'title_id': 'target-middleweight'}},
    ]
    validate_bout_titles(report, bouts, titles)
    errors = '\n'.join(report.errors)
    assert '(ok)' not in errors
    assert '(missing): title bout has no title_id' in errors and '(unknown): unknown title_id: nope' in errors and '(mismatch)' in errors

def test_validate_dates(report: Report):
    validate_dates(
        report,
        [{'article_id': 'a1', 'published_at': '2026-07-31'}, {'article_id': 'a2', 'published_at': '20260731'}],
        [{'event_id': 'e1', 'result_published_at': '2026/07/31'}],
        [{'source_id': 'y1', 'source_type': 'youtube_description', 'published_at': '20260731'},
         {'source_id': 'n1', 'source_type': 'note_article', 'published_at': '20260731'}],
    )
    errors = '\n'.join(report.errors)
    assert '(a2)' in errors and '(e1)' in errors and '(n1)' in errors
    assert '(a1)' not in errors and '(y1)' not in errors

def test_article_and_source_document_urls_must_be_http(report: Report):
    validate_articles(report, [{'article_id': 'a1', 'title': 't', 'url': 'javascript:alert(1)'}])
    validate_source_documents(report, [{'source_id': 's1', 'source_type': 'note_article', 'source_ref_id': 'a1', 'content_hash': 'h', 'url': 'data:text/html,x'}])
    errors = '\n'.join(report.errors)
    assert 'articles.json[0]: invalid url' in errors and 'source_documents.json[0]: invalid url' in errors
