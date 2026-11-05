# 役割: note 記事の本文・タイトルから article_links に必要なものを読む。
#   extract_matchups                  = 対戦カード/結果記事の 🆚 や vs から (選手名, 選手名) の組
#   extract_promotion_profile_fighters = 団体紹介記事の歴代王者リストから選手名
#   title_to_event_ids                 = 記事タイトルから events.csv の event_id (合同大会は複数)
# アーキ上の位置: arakaku/derive/article_links.py が使う。絵文字マーカー (🆚 や 🟥🟦●○) 解析という
#   ヒューリスティックなので、結果は validate と人のレビューで確かめる。
# 不変条件:
#   - title_to_event_ids が組み立てる event_id 文字列は events.csv の event_id 命名規則そのもの。
#     呼び出し側は known_events に無いものを採用しない。命名を変えるなら両方同期すること。
#   - 「ターゲットNo.90　エンペラーNo.111合同大会試合結果」のような合同大会はタイトルに出る大会を
#     すべて返す (T70: 以前は最初の 1 つだけで、エンペラー側に出典が付かなかった)。
# 関連スキル: .agents/skills/arakaku-source-pipeline
from __future__ import annotations

import re

from arakaku.notes.patterns import RESULT_MARKS, strip_name_prefix
from arakaku.text import nfkc

# 選手名の行の先頭に付くコーナー・勝敗記号 (◯・〇 を含む。T93)。
FIGHTER_NAME_STARTERS = ("🟥", "🟦", *RESULT_MARKS)


def clean_fighter_name(raw: str) -> str:
    """Strip win/loss markers, records, role suffixes from a fighter name line."""
    _, s = strip_name_prefix(raw.strip())
    s = s.strip()
    s = re.sub(r"【[^】]*】", "", s).strip()   # strip win-loss records
    s = re.sub(r"[（(][^）)]*[）)]", "", s).strip()   # strip role suffixes (全角・半角の括弧。T112.6.11)
    return s


def extract_matchups(content_text: str) -> list[tuple[str, str]]:
    """Extract (fighter1_name, fighter2_name) pairs from article content."""
    lines = [ln.strip() for ln in content_text.split("\n") if ln.strip()]
    matchups: list[tuple[str, str]] = []

    for i, line in enumerate(lines):
        inline_vs = line.startswith(FIGHTER_NAME_STARTERS) and re.search(r"(?i)vs", line) and "🆚" not in line
        if ("🆚" in line and line != "🆚") or inline_vs:
            # Inline: "●FighterA🆚○FighterB", "FighterA🆚FighterB" or "○FighterAvs●FighterB" (T93)
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
        # NFKC で全角の括弧「（）」は半角の「()」になるので、下の正規表現は半角で書く。以前は全角で
        # 書いていたため、役割の注記が取れず、MAXバウトの形式も一致しなかった (T112.4.23)。
        t = nfkc(line)
        # "初代王者 Fighter" or "X代目 Fighter"
        m = re.match(r"(?:初代王者|[0-9]+代目)\s+(.+)", t)
        if m:
            name = re.sub(r"\([^)]*\)", "", m.group(1)).strip()
            if name:
                names.append(name)
        # "【Fighter】" tournament winners (skip section headers like 【MAXバウトの歴代王者】)
        m = re.match(r"【([^】の]+)】$", t)
        if m:
            name = m.group(1).strip()
            if name and "王者" not in name and "優勝" not in name:
                names.append(name)
        # "第X回Fighter（promotion）" (MAXバウト champion format)
        m = re.match(r"第[0-9]+回(.+?)\(", t)
        if m:
            name = m.group(1).strip()
            if name:
                names.append(name)
    return list(dict.fromkeys(names))


def title_to_event_ids(title: str, known_events: set[str]) -> list[str]:
    """Derive event_ids from an article title (a joint event names several)."""
    t = nfkc(title)
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
