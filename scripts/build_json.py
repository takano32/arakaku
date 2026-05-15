#!/usr/bin/env python3
from __future__ import annotations
import csv, json
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any
ROOT = Path(__file__).resolve().parents[1]
DATA_SRC = ROOT / "data-src"
DOCS_DATA = ROOT / "docs" / "data"
JST = timezone(timedelta(hours=9))
def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        print(f"[skip] {path} not found"); return []
    with path.open("r", encoding="utf-8-sig", newline="") as f: return list(csv.DictReader(f))
def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2); f.write("\n")
    print(f"[write] {path}")
def none_if_empty(value: str | None) -> str | None:
    if value is None: return None
    value = value.strip(); return value if value else None
def bool_from_text(value: str | None) -> bool | None:
    value = none_if_empty(value)
    if value is None: return None
    normalized = value.lower()
    if normalized in {"true", "yes", "1", "あり", "有", "○"}: return True
    if normalized in {"false", "no", "0", "なし", "無", "×"}: return False
    return None
def split_list(value: str | None) -> list[str]:
    value = none_if_empty(value)
    if value is None: return []
    for sep in ["、", "/", "／"]: value = value.replace(sep, ",")
    return [item.strip() for item in value.split(",") if item.strip()]
def build_metadata() -> dict[str, Any]:
    return {"project_name":"arakaku-database","display_name":"アラカク非公式データベース","description":"アラカク通信のーと等をもとに、団体・大会・試合結果・選手情報を整理するデータベース。","generated_at":datetime.now(JST).isoformat(timespec="seconds"),"data_version":"0.1.0","source_note":"公式表記を尊重しつつ、検索・集計用に一部正規化しています。"}
def build_articles() -> list[dict[str, Any]]:
    return [{"article_id":r["article_id"],"title":r["title"],"url":r["url"],"source_type":none_if_empty(r.get("source_type")) or "official_note","article_type":none_if_empty(r.get("article_type")),"promotion_id":none_if_empty(r.get("promotion_id")),"published_at":none_if_empty(r.get("published_at")),"last_checked_at":none_if_empty(r.get("last_checked_at")),"status":none_if_empty(r.get("status")) or "parsed","notes":none_if_empty(r.get("notes")) or ""} for r in read_csv(DATA_SRC/"articles.csv")]
def build_promotions() -> list[dict[str, Any]]:
    return [{"promotion_id":r["promotion_id"],"name":r["name"],"name_en":none_if_empty(r.get("name_en")),"category":none_if_empty(r.get("category")),"country_scope":none_if_empty(r.get("country_scope")),"summary":none_if_empty(r.get("summary")) or "","rules":{"venue":none_if_empty(r.get("rule_venue")),"rounds":none_if_empty(r.get("rule_rounds")),"judging":none_if_empty(r.get("rule_judging")),"glove":none_if_empty(r.get("rule_glove")),"elbows":bool_from_text(r.get("rule_elbows")),"soccer_kicks":bool_from_text(r.get("rule_soccer_kicks")),"stomps":bool_from_text(r.get("rule_stomps")),"four_point_head_kicks":bool_from_text(r.get("rule_four_point_head_kicks")),"four_point_head_knees":bool_from_text(r.get("rule_four_point_head_knees"))},"source_article_ids":split_list(r.get("source_article_ids"))} for r in read_csv(DATA_SRC/"promotions.csv")]
def build_events() -> list[dict[str, Any]]:
    out=[]
    for r in read_csv(DATA_SRC/"events.csv"):
        t=none_if_empty(r.get("event_number"))
        try: n=int(t) if t else None
        except ValueError: n=t
        out.append({"event_id":r["event_id"],"name":r["name"],"promotion_id":r["promotion_id"],"event_number":n,"event_type":none_if_empty(r.get("event_type")),"event_date":none_if_empty(r.get("event_date")),"published_at":none_if_empty(r.get("published_at")),"source_article_id":none_if_empty(r.get("source_article_id")),"summary":none_if_empty(r.get("summary")) or ""})
    return out
def build_bouts() -> list[dict[str, Any]]:
    out=[]
    for r in read_csv(DATA_SRC/"bouts.csv"):
        rt=none_if_empty(r.get("round"))
        try: rv=int(rt.replace("R","")) if rt else None
        except ValueError: rv=rt
        fa=none_if_empty(r.get("fighter_a_id")); fb=none_if_empty(r.get("fighter_b_id")); wi=none_if_empty(r.get("winner_id")); li=none_if_empty(r.get("loser_id"))
        out.append({"bout_id":r["bout_id"],"event_id":r["event_id"],"promotion_id":r["promotion_id"],"bout_order":int(r["bout_order"]) if none_if_empty(r.get("bout_order")) else None,"division":none_if_empty(r.get("division")),"weight_class_id":none_if_empty(r.get("weight_class_id")),"bout_type":none_if_empty(r.get("bout_type")),"fighters":[{"fighter_id":fa,"name":r["fighter_a"],"corner":none_if_empty(r.get("fighter_a_corner")),"result":"win" if wi==fa or r["winner"]==r["fighter_a"] else "loss"},{"fighter_id":fb,"name":r["fighter_b"],"corner":none_if_empty(r.get("fighter_b_corner")),"result":"win" if wi==fb or r["winner"]==r["fighter_b"] else "loss"}],"winner_id":wi,"winner":r["winner"],"loser_id":li,"loser":r["loser"],"result":{"round":rv,"time":none_if_empty(r.get("time")),"method_raw":none_if_empty(r.get("method_raw")),"method_normalized":none_if_empty(r.get("method_normalized")),"technique":none_if_empty(r.get("technique")),"decision_score":none_if_empty(r.get("decision_score"))},"title":{"is_title_bout":bool_from_text(r.get("is_title_bout")) or False,"title_id":none_if_empty(r.get("title_id")),"title_result":none_if_empty(r.get("title_result")),"note":none_if_empty(r.get("title_note")) or ""},"source_article_id":none_if_empty(r.get("source_article_id")),"notes":none_if_empty(r.get("notes")) or ""})
    return out
def build_fighters() -> list[dict[str, Any]]:
    return [{"fighter_id":r["fighter_id"],"display_name":r["display_name"],"aliases":split_list(r.get("aliases")),"main_division":none_if_empty(r.get("main_division")),"main_promotion_id":none_if_empty(r.get("main_promotion_id")),"profile":{"height":none_if_empty(r.get("height")),"age":none_if_empty(r.get("age")),"gym":none_if_empty(r.get("gym"))},"summary":none_if_empty(r.get("summary")) or "","source_article_ids":split_list(r.get("source_article_ids"))} for r in read_csv(DATA_SRC/"fighters.csv")]
def build_titles() -> list[dict[str, Any]]:
    g={}
    for r in read_csv(DATA_SRC/"titles.csv"):
        tid=r["title_id"]
        g.setdefault(tid,{"title_id":tid,"promotion_id":r["promotion_id"],"division":r["division"],"lineage":[]})["lineage"].append({"order":int(r["order"]) if none_if_empty(r.get("order")) else None,"fighter_id":none_if_empty(r.get("fighter_id")),"fighter_name":r["fighter_name"],"reign_label":none_if_empty(r.get("reign_label")),"won_at_event_id":none_if_empty(r.get("won_at_event_id")),"lost_at_event_id":none_if_empty(r.get("lost_at_event_id")),"source_article_id":none_if_empty(r.get("source_article_id"))})
    return list(g.values())
def build_fighter_snapshots() -> list[dict[str, Any]]:
    return [{"snapshot_id":r["snapshot_id"],"fighter_id":r["fighter_id"],"event_id":none_if_empty(r.get("event_id")),"source_article_id":none_if_empty(r.get("source_article_id")),"age":none_if_empty(r.get("age")),"height":none_if_empty(r.get("height")),"gym":none_if_empty(r.get("gym")),"record_text":none_if_empty(r.get("record_text")),"main_promotion_id":none_if_empty(r.get("main_promotion_id")),"titles_text":none_if_empty(r.get("titles_text")),"catchphrase":none_if_empty(r.get("catchphrase"))} for r in read_csv(DATA_SRC/"fighter_snapshots.csv")]
def build_videos() -> list[dict[str, Any]]:
    rows = read_csv(DATA_SRC / "videos.csv")

    return [
        {
            "video_id": row["video_id"],
            "platform": none_if_empty(row.get("platform")) or "youtube",
            "platform_video_id": none_if_empty(row.get("platform_video_id")),
            "url": row["url"],
            "title": row["title"],
            "channel_name": none_if_empty(row.get("channel_name")),
            "published_at": none_if_empty(row.get("published_at")),
            "official_status": none_if_empty(row.get("official_status")) or "unknown",
            "video_type": none_if_empty(row.get("video_type")) or "reference",
            "link_status": none_if_empty(row.get("link_status")) or "unlinked",
            "duplicate_group_id": none_if_empty(row.get("duplicate_group_id")),
            "duplicate_note": none_if_empty(row.get("duplicate_note")),
            "notes": none_if_empty(row.get("notes")) or "",
            "source_article_ids": split_list(row.get("source_article_ids")),
        }
        for row in rows
    ]


def build_video_links() -> list[dict[str, Any]]:
    rows = read_csv(DATA_SRC / "video_links.csv")

    return [
        {
            "video_id": row["video_id"],
            "entity_type": row["entity_type"],
            "entity_id": row["entity_id"],
            "relation_type": none_if_empty(row.get("relation_type")) or "reference",
            "start_time": none_if_empty(row.get("start_time")),
            "end_time": none_if_empty(row.get("end_time")),
            "notes": none_if_empty(row.get("notes")) or "",
        }
        for row in rows
    ]


def build_aliases() -> dict[str, Any]:
    a={"fighters":{},"promotions":{},"methods":{}}
    for r in read_csv(DATA_SRC/"aliases.csv"):
        a.setdefault(r["alias_type"],{})[r["alias"]]=r["canonical_id"]
    return a
def main() -> None:
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    for fn,b in {"metadata.json":build_metadata,"articles.json":build_articles,"promotions.json":build_promotions,"events.json":build_events,"bouts.json":build_bouts,"fighters.json":build_fighters,"titles.json":build_titles,"fighter_snapshots.json":build_fighter_snapshots,"videos.json":build_videos,"video_links.json":build_video_links,"aliases.json":build_aliases}.items(): write_json(DOCS_DATA/fn,b())
    print("[done] JSON build completed")
if __name__ == "__main__": main()
