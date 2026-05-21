#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path
from typing import Any
ROOT=Path(__file__).resolve().parents[1]; DOCS_DATA=ROOT/'docs'/'data'
ERRORS: list[str]=[]; WARNINGS: list[str]=[]; REQUIRED_JSON_FILES={'metadata.json','articles.json','promotions.json','events.json','bouts.json','fighters.json'}; VALID_METHODS={'KO','TKO','SUB','DEC','DQ','NC'}
VALID_VIDEO_TYPES={'full_fight','highlight','short','stream_archive','preview','interview','commentary','reference'}
VALID_VIDEO_LINK_STATUSES={'linked','partially_linked','unlinked','needs_review'}
VALID_VIDEO_RELATION_TYPES={'full_fight','highlight','short','stream_archive','preview','interview','commentary','reference'}
VALID_VIDEO_ENTITY_TYPES={'event','bout','fighter','promotion','title'}
def add_error(m:str)->None: ERRORS.append(m)
def add_warning(m:str)->None: WARNINGS.append(m)
def load_json(filename:str, default:Any)->Any:
    p=DOCS_DATA/filename
    if not p.exists():
        (add_error if filename in REQUIRED_JSON_FILES else add_warning)(f"{'missing required json file' if filename in REQUIRED_JSON_FILES else 'optional json file not found'}: {filename}"); return default
    try: return json.loads(p.read_text(encoding='utf-8'))
    except json.JSONDecodeError as e: add_error(f"{filename}: invalid json: {e}"); return default
def collect_ids(items:list[Any], filename:str, id_field:str)->set[str]:
    ids=set(); seen=set()
    for i,item in enumerate(items):
        if not isinstance(item,dict): add_error(f"{filename}[{i}]: expected object"); continue
        v=item.get(id_field)
        if not isinstance(v,str) or not v.strip(): add_error(f"{filename}[{i}]: missing required id field: {id_field}"); continue
        if v in seen: add_error(f"{filename}[{i}]: duplicate {id_field}: {v}")
        seen.add(v); ids.add(v)
    return ids
def require_field(obj:dict[str,Any], filename:str, index:int, field:str)->Any:
    v=obj.get(field)
    if v is None or v=='': add_error(f"{filename}[{index}]: missing required field: {field}")
    return v
def validate_articles(articles:list[Any])->set[str]:
    ids=collect_ids(articles,'articles.json','article_id')
    for i,x in enumerate(articles):
        if isinstance(x,dict): require_field(x,'articles.json',i,'title'); require_field(x,'articles.json',i,'url')
    return ids
def validate_promotions(promotions:list[Any], article_ids:set[str])->set[str]:
    ids=collect_ids(promotions,'promotions.json','promotion_id')
    for i,x in enumerate(promotions):
        if not isinstance(x,dict): continue
        require_field(x,'promotions.json',i,'name')
        for aid in x.get('source_article_ids') or []:
            if aid not in article_ids: add_error(f"promotions.json[{i}]: unknown article reference: {aid}")
    return ids
def validate_events(events:list[Any], promotion_ids:set[str], article_ids:set[str])->set[str]:
    ids=collect_ids(events,'events.json','event_id')
    for i,x in enumerate(events):
        if not isinstance(x,dict): continue
        require_field(x,'events.json',i,'name'); pid=require_field(x,'events.json',i,'promotion_id')
        if pid and pid not in promotion_ids: add_error(f"events.json[{i}]: unknown promotion reference: {pid}")
        aid=x.get('source_article_id')
        if aid and aid not in article_ids: add_error(f"events.json[{i}]: unknown article reference: {aid}")
    return ids
def validate_fighters(fighters:list[Any], promotion_ids:set[str], article_ids:set[str])->set[str]:
    ids=collect_ids(fighters,'fighters.json','fighter_id')
    for i,x in enumerate(fighters):
        if not isinstance(x,dict): continue
        require_field(x,'fighters.json',i,'display_name'); pid=x.get('main_promotion_id')
        if pid and pid not in promotion_ids: add_error(f"fighters.json[{i}]: unknown promotion reference: {pid}")
        for aid in x.get('source_article_ids') or []:
            if aid not in article_ids: add_error(f"fighters.json[{i}]: unknown article reference: {aid}")
    return ids
def validate_bouts(bouts:list[Any], event_ids:set[str], promotion_ids:set[str], fighter_ids:set[str], article_ids:set[str])->set[str]:
    ids=collect_ids(bouts,'bouts.json','bout_id')
    for i,x in enumerate(bouts):
        if not isinstance(x,dict): continue
        eid=require_field(x,'bouts.json',i,'event_id'); pid=require_field(x,'bouts.json',i,'promotion_id')
        if eid and eid not in event_ids: add_error(f"bouts.json[{i}]: unknown event reference: {eid}")
        if pid and pid not in promotion_ids: add_error(f"bouts.json[{i}]: unknown promotion reference: {pid}")
        fs=x.get('fighters')
        if not isinstance(fs,list) or len(fs)!=2: add_error(f"bouts.json[{i}]: fighters must be a list of two fighters")
        else:
            names=set(); results=[]
            for j,f in enumerate(fs):
                fid=f.get('fighter_id'); name=f.get('name'); results.append(f.get('result')); names.add(name)
                if fid and fid not in fighter_ids: add_error(f"bouts.json[{i}].fighters[{j}]: unknown fighter reference: {fid}")
                if not name: add_error(f"bouts.json[{i}].fighters[{j}]: missing name")
            if len(names)!=2: add_error(f"bouts.json[{i}]: fighter names must be distinct")
            result_status=x.get('result_status') or ('known' if x.get('winner_id') or x.get('winner') else 'unknown')
            if result_status=='known' and sorted(results)!=['loss','win']: add_error(f"bouts.json[{i}]: known-result fighters must have exactly one win and one loss")
            if result_status=='unknown' and any(r not in ('unknown', None, '') for r in results): add_error(f"bouts.json[{i}]: unknown-result fighters must not have win/loss results")
        for key in ['winner_id','loser_id']:
            fid=x.get(key)
            if fid and fid not in fighter_ids: add_error(f"bouts.json[{i}]: unknown fighter reference in {key}: {fid}")
        result_status=x.get('result_status') or ('known' if x.get('winner_id') or x.get('winner') else 'unknown')
        if result_status not in {'known','unknown'}: add_warning(f"bouts.json[{i}]: unusual result_status: {result_status}")
        if result_status=='known' and not (x.get('winner_id') or x.get('winner')): add_error(f"bouts.json[{i}]: known-result bout is missing winner")
        if x.get('winner') and x.get('winner')==x.get('loser'): add_error(f"bouts.json[{i}]: winner and loser are the same: {x.get('winner')}")
        result=x.get('result') or {}; method=result.get('method_normalized') if isinstance(result,dict) else None
        if method and method not in VALID_METHODS: add_warning(f"bouts.json[{i}]: unusual method_normalized: {method}")
        aid=x.get('source_article_id')
        if aid and aid not in article_ids: add_error(f"bouts.json[{i}]: unknown article reference: {aid}")
    return ids
def validate_titles(titles:list[Any], promotion_ids:set[str], fighter_ids:set[str], article_ids:set[str])->None:
    collect_ids(titles,'titles.json','title_id')
    for i,x in enumerate(titles):
        if not isinstance(x,dict): continue
        pid=x.get('promotion_id')
        if pid and pid not in promotion_ids: add_error(f"titles.json[{i}]: unknown promotion reference: {pid}")
        for j,r in enumerate(x.get('lineage') or []):
            fid=r.get('fighter_id'); aid=r.get('source_article_id')
            if fid and fid not in fighter_ids: add_error(f"titles.json[{i}].lineage[{j}]: unknown fighter reference: {fid}")
            if aid and aid not in article_ids: add_error(f"titles.json[{i}].lineage[{j}]: unknown article reference: {aid}")
def validate_fighter_snapshots(snapshots:list[Any], fighter_ids:set[str], event_ids:set[str], article_ids:set[str], promotion_ids:set[str])->None:
    collect_ids(snapshots,'fighter_snapshots.json','snapshot_id')
    for i,x in enumerate(snapshots):
        if not isinstance(x,dict): continue
        for key,ids,name in [('fighter_id',fighter_ids,'fighter'),('event_id',event_ids,'event'),('source_article_id',article_ids,'article'),('main_promotion_id',promotion_ids,'promotion')]:
            v=x.get(key)
            if v and v not in ids: add_error(f"fighter_snapshots.json[{i}]: unknown {name} reference: {v}")
def validate_videos(videos:list[Any], article_ids:set[str])->set[str]:
    ids=collect_ids(videos,'videos.json','video_id')
    seen_platform_ids=set()
    for i,x in enumerate(videos):
        if not isinstance(x,dict): continue
        platform=require_field(x,'videos.json',i,'platform'); platform_video_id=x.get('platform_video_id'); url=require_field(x,'videos.json',i,'url')
        require_field(x,'videos.json',i,'title')
        if url and not str(url).startswith(('http://','https://')): add_error(f"videos.json[{i}]: invalid url: {url}")
        if platform and platform_video_id:
            key=(platform,platform_video_id)
            if key in seen_platform_ids: add_error(f"videos.json[{i}]: duplicate platform/platform_video_id: {platform}/{platform_video_id}")
            seen_platform_ids.add(key)
        video_type=x.get('video_type')
        if video_type and video_type not in VALID_VIDEO_TYPES: add_warning(f"videos.json[{i}]: unusual video_type: {video_type}")
        link_status=x.get('link_status')
        if link_status and link_status not in VALID_VIDEO_LINK_STATUSES: add_warning(f"videos.json[{i}]: unusual link_status: {link_status}")
        for aid in x.get('source_article_ids') or []:
            if aid not in article_ids: add_error(f"videos.json[{i}]: unknown article reference: {aid}")
    return ids

def validate_video_links(video_links:list[Any], video_ids:set[str], event_ids:set[str], bout_ids:set[str], fighter_ids:set[str], promotion_ids:set[str], title_ids:set[str])->None:
    seen=set(); entity_sets={'event':event_ids,'bout':bout_ids,'fighter':fighter_ids,'promotion':promotion_ids,'title':title_ids}
    for i,x in enumerate(video_links):
        if not isinstance(x,dict): add_error(f"video_links.json[{i}]: expected object"); continue
        video_id=require_field(x,'video_links.json',i,'video_id'); entity_type=require_field(x,'video_links.json',i,'entity_type'); entity_id=require_field(x,'video_links.json',i,'entity_id'); relation_type=x.get('relation_type') or 'reference'
        marker=(video_id,entity_type,entity_id,relation_type)
        if marker in seen: add_error(f"video_links.json[{i}]: duplicate video link: {marker}")
        seen.add(marker)
        if video_id and video_id not in video_ids: add_error(f"video_links.json[{i}]: unknown video reference: {video_id}")
        if entity_type and entity_type not in VALID_VIDEO_ENTITY_TYPES:
            add_error(f"video_links.json[{i}]: invalid entity_type: {entity_type}"); continue
        if relation_type and relation_type not in VALID_VIDEO_RELATION_TYPES: add_warning(f"video_links.json[{i}]: unusual relation_type: {relation_type}")
        if entity_id and entity_type in entity_sets and entity_id not in entity_sets[entity_type]: add_error(f"video_links.json[{i}]: unknown {entity_type} reference: {entity_id}")
def validate_aliases(aliases:Any)->None:
    if not isinstance(aliases,dict): add_error('aliases.json: expected object'); return
    for k,v in aliases.items():
        if not isinstance(v,dict): add_error(f"aliases.json[{k}]: expected object")

def validate_source_documents(data):
    seen = set()

    for index, row in enumerate(data):
        source_id = row.get("source_id")

        if not source_id:
            add_error(f"source_documents.json[{index}]: missing source_id")
            continue

        if source_id in seen:
            add_error(f"source_documents.json[{index}]: duplicate source_id: {source_id}")

        seen.add(source_id)

        if not row.get("source_type"):
            add_error(f"source_documents.json[{index}]: missing source_type")

        if not row.get("source_ref_id"):
            add_error(f"source_documents.json[{index}]: missing source_ref_id")

        if not row.get("content_hash"):
            add_error(f"source_documents.json[{index}]: missing content_hash")


def validate_source_mentions(data):
    seen = set()

    for index, row in enumerate(data):
        mention_id = row.get("mention_id")

        if not mention_id:
            add_error(f"source_mentions.json[{index}]: missing mention_id")
            continue

        if mention_id in seen:
            add_error(f"source_mentions.json[{index}]: duplicate mention_id: {mention_id}")

        seen.add(mention_id)

        if not row.get("source_id"):
            add_error(f"source_mentions.json[{index}]: missing source_id")

        if not row.get("mention_type"):
            add_error(f"source_mentions.json[{index}]: missing mention_type")


def validate_source_references(data, filename, id_field, known_ids):
    ids = collect_ids(data, filename, "candidate_id")

    for index, row in enumerate(data):
        if not isinstance(row, dict):
            continue

        entity_id = row.get(id_field)
        if not entity_id:
            add_error(f"{filename}[{index}]: missing {id_field}")
        elif entity_id not in known_ids:
            add_error(f"{filename}[{index}]: unknown {id_field}: {entity_id}")

        for field in ["source_id", "source_type", "source_ref_id", "confidence"]:
            if not row.get(field):
                add_error(f"{filename}[{index}]: missing {field}")

    return ids


def main()->int:
    ERRORS.clear(); WARNINGS.clear()
    articles=load_json('articles.json',[]); promotions=load_json('promotions.json',[]); events=load_json('events.json',[]); bouts=load_json('bouts.json',[]); fighters=load_json('fighters.json',[]); titles=load_json('titles.json',[]); snapshots=load_json('fighter_snapshots.json',[]); videos=load_json('videos.json',[]); video_links=load_json('video_links.json',[]); aliases=load_json('aliases.json',{}); load_json('metadata.json',{})
    article_ids=validate_articles(articles); promotion_ids=validate_promotions(promotions,article_ids); event_ids=validate_events(events,promotion_ids,article_ids); fighter_ids=validate_fighters(fighters,promotion_ids,article_ids)
    bout_ids=validate_bouts(bouts,event_ids,promotion_ids,fighter_ids,article_ids); title_ids=collect_ids(titles,'titles.json','title_id'); validate_titles(titles,promotion_ids,fighter_ids,article_ids); validate_fighter_snapshots(snapshots,fighter_ids,event_ids,article_ids,promotion_ids); video_ids=validate_videos(videos,article_ids); validate_video_links(video_links,video_ids,event_ids,bout_ids,fighter_ids,promotion_ids,title_ids); validate_source_documents(load_json('source_documents.json',[])); validate_source_mentions(load_json('source_mentions.json',[])); validate_source_references(load_json('source_event_references.json',[]),'source_event_references.json','event_id',event_ids); validate_source_references(load_json('source_bout_references.json',[]),'source_bout_references.json','bout_id',bout_ids); validate_source_references(load_json('source_video_references.json',[]),'source_video_references.json','video_id',video_ids); validate_aliases(aliases)
    for w in WARNINGS: print(f"WARNING: {w}", file=sys.stderr)
    for e in ERRORS: print(f"ERROR: {e}", file=sys.stderr)
    if ERRORS: print(f"json validation failed: {len(ERRORS)} error(s), {len(WARNINGS)} warning(s)", file=sys.stderr); return 1
    print(f"json validation passed: {len(WARNINGS)} warning(s)"); return 0
if __name__=='__main__': raise SystemExit(main())
