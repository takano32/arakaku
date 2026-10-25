#!/usr/bin/env python3
"""Generate article_links.csv from structured data and crawl content.

Generates:
- promotion links (promotion_profile articles → their promotion)
- title_reign links (title_reigns.source_article_id → reign)
- fighter_snapshot links (fighter_snapshots.csv → event card article)
- event links (event_card/event_result articles → event, derived from title)
- bout links (event articles → bouts, derived from 🆚 matchup parsing)
- fighter links (event articles + promotion profiles → fighters, from content)

Does NOT generate video links — YouTube video IDs are not embedded in
the cached note HTML so they cannot be derived from crawl data.
"""
from __future__ import annotations

import re
import unicodedata
from collections import defaultdict

from arakaku.textparse import RESULT_MARKS, strip_name_prefix
from arakaku.utils import DATA_SRC, read_csv, write_csv

# 役割: 記事→各エンティティ（promotion / title_reign / fighter_snapshot / event / bout /
#       fighter）の関係表 article_links.csv を生成する。一部は構造化データから決定的に、
#       一部はキャッシュ記事本文の絵文字マーカー（🆚 や 🟥🟦●○）解析というヒューリスティック
#       で導出する。
# アーキ上の位置: generate-stage2 の終盤、aliases / video_links 等の後に実行（Makefile）。
#       入力は articles / events / fighters / aliases / bouts / bout_participants /
#       title_reigns / fighter_snapshots / source_documents（本文）。出力はビューアの
#       出典リンク表示が消費する。
# 不変条件:
#   - title_to_event_ids が組み立てる event_id 文字列は events.csv の実 ID と完全一致が前提
#     （known_events に無ければ採用しない）。命名規則はそちらと必ず同期。
#   - article_type の値（event_card/event_result/promotion_profile）は generate_articles の
#     分類と同期していること。
#   - 動画リンクはここで作らない（note HTML に YouTube ID が無いため）。それは
#     generate_video_links.py の担当。
# 関連スキル: .agents/skills/arakaku-source-pipeline
OUTPUT = DATA_SRC / "article_links.csv"
FIELDS = ["link_id", "article_id", "entity_type", "entity_id", "relation_type", "notes"]

# 選手名の行の先頭に付くコーナー・勝敗記号 (◯・〇 を含む。T.93)。
FIGHTER_NAME_STARTERS = ("🟥", "🟦", *RESULT_MARKS)


def make_link_id(article_id: str, entity_type: str, entity_id: str) -> str:
    return f"article-{article_id}-{entity_type}-{entity_id}-source"


def norm(s: str) -> str:
    """NFKC normalize (converts full-width digits to ASCII, etc.)."""
    return unicodedata.normalize("NFKC", s)


def clean_fighter_name(raw: str) -> str:
    """Strip win/loss markers, records, role suffixes from a fighter name line."""
    _, s = strip_name_prefix(raw.strip())
    s = s.strip()
    s = re.sub(r"【[^】]*】", "", s).strip()   # strip win-loss records
    s = re.sub(r"（[^）]*）", "", s).strip()   # strip role suffixes
    return s


def extract_matchups(content_text: str) -> list[tuple[str, str]]:
    """Extract (fighter1_name, fighter2_name) pairs from article content."""
    lines = [ln.strip() for ln in content_text.split("\n") if ln.strip()]
    matchups: list[tuple[str, str]] = []

    for i, line in enumerate(lines):
        inline_vs = line.startswith(FIGHTER_NAME_STARTERS) and re.search(r"(?i)vs", line) and "🆚" not in line
        if ("🆚" in line and line != "🆚") or inline_vs:
            # Inline: "●FighterA🆚○FighterB", "FighterA🆚FighterB" or "○FighterAvs●FighterB" (T.93)
            parts = line.split("🆚", 1) if "🆚" in line else re.split(r"(?i)vs", line, maxsplit=1)
            f1 = clean_fighter_name(parts[0])
            f2 = clean_fighter_name(parts[1])
            if f1 and f2:
                matchups.append((f1, f2))
        elif line == "🆚":
            # Standalone 🆚 line: look for nearest fighter-marker line before/after
            f1 = None
            for j in range(i - 1, max(-1, i - 10), -1):
                ln = lines[j]
                if "☆" in ln:
                    break
                if any(ln.startswith(p) for p in FIGHTER_NAME_STARTERS):
                    f1 = clean_fighter_name(ln)
                    break
            f2 = None
            for j in range(i + 1, min(len(lines), i + 10)):
                ln = lines[j]
                if "☆" in ln:
                    break
                if any(ln.startswith(p) for p in FIGHTER_NAME_STARTERS):
                    f2 = clean_fighter_name(ln)
                    break
            if f1 and f2:
                matchups.append((f1, f2))

    return matchups


def extract_promotion_profile_fighters(content_text: str) -> list[str]:
    """Extract fighter names from promotion profile champion list content, in order of appearance."""
    names: list[str] = []
    lines = [ln.strip() for ln in content_text.split("\n") if ln.strip()]
    for line in lines:
        t = norm(line)
        # "初代王者 Fighter" or "X代目 Fighter"
        m = re.match(r"(?:初代王者|[0-9]+代目)\s+(.+)", t)
        if m:
            name = re.sub(r"（[^）]*）", "", m.group(1)).strip()
            if name:
                names.append(name)
        # "【Fighter】" tournament winners (skip section headers like 【MAXバウトの歴代王者】)
        m = re.match(r"【([^】の]+)】$", t)
        if m:
            name = m.group(1).strip()
            if name and "王者" not in name and "優勝" not in name:
                names.append(name)
        # "第X回Fighter（promotion）" (MAXバウト champion format)
        m = re.match(r"第[0-9]+回(.+?)（", t)
        if m:
            name = m.group(1).strip()
            if name:
                names.append(name)
    return list(dict.fromkeys(names))


def title_to_event_ids(title: str, known_events: set[str]) -> list[str]:
    """Derive event_ids from an article title (a joint event names several)."""
    # ここで組む ID 文字列は events.csv の event_id 命名規則そのもの。両者が一致して
    # いないとイベントリンクが一切張られなくなるので、命名を変えるなら両方同期すること。
    # 「ターゲットNo.90　エンペラーNo.111合同大会試合結果」のような合同大会はタイトルに出る
    # 大会をすべて返す (T.70: 以前は最初の 1 つだけで、エンペラー側に出典が付かなかった)。
    t = norm(title)
    numbered = [
        *(f"target-{n}" for n in re.findall(r"ターゲットNo\.?\s*(\d+)", t)),
        *(f"emperor-{n}" for n in re.findall(r"エンペラー(?:No?\.?\s*)?(\d+)", t)),
        *(f"mh-{n}" for n in re.findall(r"(?:マウンテン・ヒーローズ|M・H)\s*No?\.?\s*(\d+)", t)),
    ]
    if numbered:
        return numbered
    event_id = max_bout_event_id(t, known_events)
    return [event_id] if event_id else []


def max_bout_event_id(t: str, known_events: set[str]) -> str | None:
    # max_bout GP (check before tournament for specificity)
    m = re.search(r"第(\d+)回.*?MAXバウト.*?(ライト|ミドル|ヘビー).*?GP", t)
    if m:
        weight = "lightweight" if "ライト" in m.group(2) else "middleweight" if "ミドル" in m.group(2) else "heavyweight"
        eid = f"max-bout-{m.group(1)}-{weight}-gp"
        return eid if eid in known_events else f"max-bout-{m.group(1)}-{weight}-tournament"
    # max_bout tournament
    m = re.search(r"第(\d+)回.*?MAXバウト.*?(ライト|ミドル|ヘビー).*?トーナメント", t)
    if m:
        weight = "lightweight" if "ライト" in m.group(2) else "middleweight" if "ミドル" in m.group(2) else "heavyweight"
        eid = f"max-bout-{m.group(1)}-{weight}-tournament"
        gp = f"max-bout-{m.group(1)}-{weight}-gp"
        return gp if eid not in known_events and gp in known_events else eid
    # max_bout special one-match (note 記事は「…大会」と「…大会No.2」の 2 大会)
    if "MAXバウト" in t and "ワンマッチ" in t:
        return "max-bout-special-2" if re.search(r"No\.?\s*2", t) else "max-bout-special-1"
    return None


def main() -> None:
    # ── Load reference data ──────────────────────────────────────────────────
    articles = {r["article_id"]: r for r in read_csv(DATA_SRC / "articles.csv")}
    known_events = {r["event_id"] for r in read_csv(DATA_SRC / "events.csv")}

    # Name → fighter_id lookup (display names + aliases)
    fighters_map = {r["fighter_id"]: r["display_name"] for r in read_csv(DATA_SRC / "fighters.csv")}
    name_to_fid: dict[str, str] = {}
    for fid, name in fighters_map.items():
        if name:
            name_to_fid[name] = fid
    for r in read_csv(DATA_SRC / "aliases.csv"):
        if r["alias_type"] == "fighters":
            name_to_fid[r["alias"]] = r["canonical_id"]

    # Event → bout_ids index
    bouts_by_event: dict[str, list[str]] = defaultdict(list)
    for r in read_csv(DATA_SRC / "bouts.csv"):
        bouts_by_event[r["event_id"]].append(r["bout_id"])

    # Bout → fighter_ids index
    bout_fighters: dict[str, set[str]] = defaultdict(set)
    for r in read_csv(DATA_SRC / "bout_participants.csv"):
        bout_fighters[r["bout_id"]].add(r["fighter_id"])

    # Source documents: article_id → content_text, title
    source_docs: dict[str, dict] = {}
    for r in read_csv(DATA_SRC / "source_documents.csv"):
        source_docs[r["source_ref_id"]] = r

    rows: list[dict[str, str]] = []
    # 同一 (記事, エンティティ種別, エンティティID) の重複リンクを 1 本に畳むための集合。
    seen: set[tuple[str, str, str]] = set()  # (article_id, entity_type, entity_id)

    def add_link(article_id: str, entity_type: str, entity_id: str, relation_type: str = "source") -> None:
        key = (article_id, entity_type, entity_id)
        if key in seen:
            return
        seen.add(key)
        rows.append({
            "link_id": make_link_id(article_id, entity_type, entity_id),
            "article_id": article_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "relation_type": relation_type,
            "notes": "",
        })

    # ── 1. Promotion links ───────────────────────────────────────────────────
    for art in articles.values():
        if art.get("article_type") != "promotion_profile":
            continue
        promo_id = art.get("promotion_id", "")
        if promo_id:
            add_link(art["article_id"], "promotion", promo_id)

    # ── 2. Title reign links ─────────────────────────────────────────────────
    for reign in read_csv(DATA_SRC / "title_reigns.csv"):
        article_id = reign.get("source_article_id", "")
        if article_id:
            add_link(article_id, "title_reign", reign["reign_id"])

    # ── 3. Fighter snapshot links ────────────────────────────────────────────
    # 出典が note 記事の時点情報だけ結ぶ（公式ニュースは articles.csv に無い）
    for snapshot in read_csv(DATA_SRC / "fighter_snapshots.csv"):
        source_type, _, source_ref = snapshot.get("source_id", "").partition(":")
        if source_type == "note" and source_ref:
            add_link(source_ref, "fighter_snapshot", snapshot["snapshot_id"])

    # ── 4. Event + bout + fighter links (from event article content) ─────────
    for art in articles.values():
        article_id = art["article_id"]
        atype = art.get("article_type", "")
        if atype not in ("event_card", "event_result"):
            continue

        doc = source_docs.get(article_id, {})
        title = doc.get("title", "")
        content = doc.get("content_text", "")
        if not content:
            continue

        event_ids = [e for e in title_to_event_ids(title, known_events) if e in known_events]
        if not event_ids:
            continue

        # 4a. Event link
        for event_id in event_ids:
            add_link(article_id, "event", event_id)

        # 4b. Parse matchup pairs → bout links + fighter links
        # 両選手が解決でき、かつその2人が同一イベント内のある bout 参加者集合に含まれる
        # （pair <= 参加者）ときだけ bout を結ぶ。名前→fighter_id 解決は display_name と
        # aliases 由来の name_to_fid に依存する。
        matchups = extract_matchups(content)
        for name1, name2 in matchups:
            fid1 = name_to_fid.get(name1)
            fid2 = name_to_fid.get(name2)
            if fid1:
                add_link(article_id, "fighter", fid1)
            if fid2:
                add_link(article_id, "fighter", fid2)
            if fid1 and fid2:
                pair = {fid1, fid2}
                for event_id in event_ids:
                    for bout_id in bouts_by_event.get(event_id, []):
                        if pair <= bout_fighters.get(bout_id, set()):
                            add_link(article_id, "bout", bout_id)

    # ── 5. Fighter links from promotion profile content ───────────────────────
    for art in articles.values():
        if art.get("article_type") != "promotion_profile":
            continue
        article_id = art["article_id"]
        doc = source_docs.get(article_id, {})
        content = doc.get("content_text", "")
        if not content:
            continue
        for name in extract_promotion_profile_fighters(content):
            fid = name_to_fid.get(name)
            if fid:
                add_link(article_id, "fighter", fid)

    write_csv(OUTPUT, FIELDS, rows)
    print(f"[done] {len(rows)} article link rows written")


if __name__ == "__main__":
    main()
