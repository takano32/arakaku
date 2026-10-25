#!/usr/bin/env python3
"""Find note results for unknown bouts, and note method details for known bouts (bout first, not note first)."""
from __future__ import annotations

# 役割: result_status=unknown の試合ごとに、その大会の結果 note (article_type=event_result) の
#       本文から両選手の名前を探し、名前の直前の ○/◯ (勝ち)・● (負け) で勝者を決める。
#       結果は review/unknown_bout_note_results.csv に書き、Numbers の勝者と一致した行だけ
#       apply=true にする (T.40 でユーザーが決めた反映条件)。反映は
#       `python3 scripts/apply_structured_result_patches.py review/unknown_bout_note_results.csv`。
#       結果が known の試合は、note の勝者が同じときだけ、空の決着欄を埋める候補を
#       review/known_bout_note_methods.csv に書く (既存値と食い違う行は apply=false)。
# なぜ別スクリプトか: extract_note_structured_results.py は note 側から試合を組み立てるので、
#       合同大会の記事・片側だけの記号・「🟦ザモン」のようなコーナー記号付きの行を取りこぼし、
#       別の試合の記号を混ぜることもあった (T.70)。こちらは試合の 2 人を先に決めて探す。
# 不変条件: 勝者は記号だけで決める (記号が無い・両者に勝ちの記号があるなどの行は勝者なし)。
#       両選手の名前が 3 行以内に無ければ同じ試合とみなさない。決着の文言は名前と同じ行の
#       （…）か、直後 3 行以内で最初に「（」で始まる行から取る。
# 関連スキル: .agents/skills/arakaku-source-pipeline

import collections
import json
import re
import unicodedata

from arakaku.utils import DATA_SRC, DOCS_DATA, REVIEW, read_csv, write_csv

OUTPUT = REVIEW / "unknown_bout_note_results.csv"
# 結果が known なのに決着方法などが空の試合に、同じ note の行から空欄だけを埋める候補 (T.73)。
METHOD_OUTPUT = REVIEW / "known_bout_note_methods.csv"
FIELDS = [
    "apply", "agreement", "bout_id", "event_id", "fighter_a", "fighter_b", "winner", "loser",
    "numbers_winner", "round", "time", "method_raw", "method_normalized", "technique", "decision_score",
    "source_article_id", "source_line_start", "source_line_end", "source_text", "result_text",
]
METHOD_FIELDS = [
    "apply", "bout_id", "event_id", "winner", "loser", "round", "time", "method_raw", "method_normalized",
    "technique", "decision_score", "existing", "clashes", "numbers_detail",
    "source_article_id", "source_line_start", "source_line_end", "source_text", "result_text",
]
WIN_MARKS = "○◯"
MARK_BEFORE_NAME = re.compile(r"([○◯●])[\s🟥🟦①-⑩]*$")
NEAR_LINES = 3
SUB_WORDS = ("チョーク", "RNC", "アームバー", "アームロック", "肩固め", "ギロチン", "三角", "ネックロック", "一本", "腕十字",
             "腕ひしぎ", "十字固め", "ヒールホールド")


def norm(text: str) -> str:
    return unicodedata.normalize("NFKC", text)


def names_by_fighter() -> dict[str, set[str]]:
    names: dict[str, set[str]] = collections.defaultdict(set)
    for f in read_csv(DATA_SRC / "fighters.csv"):
        names[f["fighter_id"]].add(f["display_name"])
    for a in read_csv(DATA_SRC / "aliases.csv"):
        if a["alias_type"] == "fighters":
            names[a["canonical_id"]].add(a["alias"])
    for p in read_csv(DATA_SRC / "bout_participants.csv"):
        if p["fighter_id"] and p["fighter_name"]:
            names[p["fighter_id"]].add(p["fighter_name"])
    return names


def occurrences(lines: list[str], name: str) -> list[tuple[int, str]]:
    """(line index, mark right before the name or '') for every occurrence of name."""
    found = []
    target = norm(name)
    for i, line in enumerate(lines):
        text = norm(line)
        start = text.find(target)
        while start >= 0:
            m = MARK_BEFORE_NAME.search(text[:start])
            found.append((i, m.group(1) if m else ""))
            start = text.find(target, start + 1)
    return found


def result_text(lines: list[str], first: int, last: int) -> str:
    inline = re.search(r"\(([^)]*)\)", norm(lines[last])) if first == last else None  # NFKC で（）は () になる
    if inline:
        return inline.group(1).strip()
    for k in range(last + 1, min(last + 1 + NEAR_LINES, len(lines))):
        line = lines[k].strip()
        if line.startswith(("（", "(")):
            return norm(line).strip("()（） ").split(")")[0].strip()
    return ""


def parse_result(text: str) -> dict[str, str]:
    """Round, time and method fields from note text such as '1R1分50秒KO 左ボディブロー' or '3R終了 判定3-0'."""
    out = {"round": "", "time": "", "method_raw": "", "method_normalized": "", "technique": "", "decision_score": ""}
    if not text:
        return out
    m = re.match(r"\s*(\d)R\s*(?:(終了)|(\d{1,2})分(\d{1,2})秒)?\s*", text)
    rest = text
    if m:
        out["round"] = f"{m.group(1)}R"
        out["time"] = "終了" if m.group(2) else (f"{int(m.group(3))}分{int(m.group(4)):02d}秒" if m.group(3) else "")
        rest = text[m.end():]
    rest = rest.strip()
    out["method_raw"] = rest
    if "判定" in rest:
        out["method_normalized"] = "DEC"
        score = re.search(r"(\d-\d)", rest)
        out["decision_score"] = score.group(1) if score else ""
    elif re.search(r"TKO|コーナーストップ|タオル", rest):
        out["method_normalized"] = "TKO"
        out["technique"] = re.sub(r"^TKO\s*", "", rest)
    elif re.match(r"KO", rest):
        out["method_normalized"] = "KO"
        out["technique"] = re.sub(r"^KO\s*", "", rest)
    elif any(w in rest for w in SUB_WORDS):
        out["method_normalized"] = "SUB"
        out["technique"] = rest
    return out


def numbers_winners() -> dict[frozenset[str], set[str]]:
    winners: dict[frozenset[str], set[str]] = collections.defaultdict(set)
    for r in json.loads((DOCS_DATA / "numbers_fight_records.json").read_text(encoding="utf-8")):
        a = r.get("matched_fighter_id") or r.get("candidate_fighter_id")
        o = r.get("opponent_matched_fighter_id") or r.get("opponent_candidate_fighter_id")
        if a and o and r.get("result") in ("win", "loss"):
            winners[frozenset((a, o))].add(a if r["result"] == "win" else o)
    return winners


def same_value(value: str) -> str:
    """Compare 3分4秒 and 3分04秒 as the same time."""
    m = re.fullmatch(r"(\d{1,2})分(\d{1,2})秒", norm(value).strip())
    return f"{int(m.group(1))}:{int(m.group(2)):02d}" if m else norm(value).strip()


def numbers_detail_by_pair() -> dict[frozenset[str], set[str]]:
    details: dict[frozenset[str], set[str]] = collections.defaultdict(set)
    for r in json.loads((DOCS_DATA / "numbers_fight_records.json").read_text(encoding="utf-8")):
        a = r.get("matched_fighter_id") or r.get("candidate_fighter_id")
        o = r.get("opponent_matched_fighter_id") or r.get("opponent_candidate_fighter_id")
        if a and o and r.get("detail_raw"):
            details[frozenset((a, o))].add(r["detail_raw"].strip())
    return details


def main() -> int:
    bouts = read_csv(DATA_SRC / "bouts.csv")
    participants: dict[str, list[dict[str, str]]] = collections.defaultdict(list)
    for p in read_csv(DATA_SRC / "bout_participants.csv"):
        participants[p["bout_id"]].append(p)
    articles = {a["article_id"]: a for a in read_csv(DATA_SRC / "articles.csv")}
    result_notes: dict[str, set[str]] = collections.defaultdict(set)
    for link in read_csv(DATA_SRC / "article_links.csv"):
        if link["entity_type"] == "event" and articles.get(link["article_id"], {}).get("article_type") == "event_result":
            result_notes[link["entity_id"]].add(link["article_id"])
    bodies = {
        d["source_id"].split(":", 1)[1]: d["content_text"]
        for d in json.loads((DOCS_DATA / "source_document_bodies.json").read_text(encoding="utf-8"))
        if d["source_id"].startswith("note:")
    }
    names = names_by_fighter()
    numbers = numbers_winners()
    numbers_details = numbers_detail_by_pair()

    def locate(a: dict[str, str], b: dict[str, str], event_id: str) -> tuple[str, str, int, int] | None:
        """(winner fighter_id, article_id, first line, last line) when the marks name exactly one winner."""
        verdicts: dict[str, tuple[str, int, int]] = {}
        for article_id in sorted(result_notes.get(event_id, ())):
            lines = bodies.get(article_id, "").split("\n")
            occ_a = [o for name in names[a["fighter_id"]] for o in occurrences(lines, name)]
            occ_b = [o for name in names[b["fighter_id"]] for o in occurrences(lines, name)]
            for line_a, mark_a in occ_a:
                for line_b, mark_b in occ_b:
                    if abs(line_a - line_b) > NEAR_LINES:
                        continue
                    a_wins = mark_a in WIN_MARKS and mark_a or mark_b == "●"
                    b_wins = mark_b in WIN_MARKS and mark_b or mark_a == "●"
                    if bool(a_wins) == bool(b_wins):
                        continue
                    winner = a if a_wins else b
                    verdicts.setdefault(winner["fighter_id"], (article_id, min(line_a, line_b), max(line_a, line_b)))
        if len(verdicts) != 1:
            return None
        winner_id, (article_id, first, last) = next(iter(verdicts.items()))
        return winner_id, article_id, first, last

    def source_fields(article_id: str, first: int, last: int) -> dict[str, str]:
        lines = bodies[article_id].split("\n")
        return {
            "source_article_id": article_id,
            "source_line_start": str(first + 1),
            "source_line_end": str(last + 1),
            "source_text": " / ".join(line.strip() for line in lines[first:last + 1]),
            "result_text": result_text(lines, first, last),
        }

    rows = []
    method_rows = []
    for bout in bouts:
        pair = participants[bout["bout_id"]]
        if len(pair) != 2 or not all(p["fighter_id"] for p in pair):
            continue
        a, b = pair
        found = locate(a, b, bout["event_id"])
        if not found:
            continue
        winner_id, article_id, first, last = found
        source = source_fields(article_id, first, last)
        parsed = parse_result(source["result_text"])
        key = frozenset((a["fighter_id"], b["fighter_id"]))
        if bout["result_status"] == "unknown":
            winner = a if a["fighter_id"] == winner_id else b
            loser = b if winner is a else a
            number_winners = numbers.get(key, set())
            agreement = "agree" if number_winners == {winner_id} else ("note_only" if not number_winners else "conflict")
            rows.append({
                "apply": "true" if agreement == "agree" else "false",
                "agreement": agreement,
                "bout_id": bout["bout_id"],
                "event_id": bout["event_id"],
                "fighter_a": a["fighter_name"],
                "fighter_b": b["fighter_name"],
                "winner": winner["fighter_name"],
                "loser": loser["fighter_name"],
                "numbers_winner": " / ".join(sorted(number_winners)),
                **parsed,
                **source,
            })
            continue
        # Known bout: fill only empty method fields, and only when the note names the same winner.
        winner_side = next(p for p in pair if p["result"] == "win") if any(p["result"] == "win" for p in pair) else None
        if not winner_side or winner_side["fighter_id"] != winner_id or not source["result_text"]:
            continue
        fills = {k: v for k, v in parsed.items() if v and not bout.get(k)}
        clashes = [f"{k}: {bout[k]} / {v}" for k, v in parsed.items()
                   if v and bout.get(k) and k in ("round", "time", "method_normalized") and same_value(bout[k]) != same_value(v)]
        if not fills:
            continue
        method_rows.append({
            "apply": "false" if clashes else "true",
            "bout_id": bout["bout_id"],
            "event_id": bout["event_id"],
            "winner": "",
            "loser": "",
            **{k: fills.get(k, "") for k in parsed},
            "existing": " / ".join(f"{k}={bout[k]}" for k in parsed if bout.get(k)),
            "clashes": " / ".join(clashes),
            "numbers_detail": " / ".join(sorted(numbers_details.get(key, set()))),
            **source,
        })
    write_csv(OUTPUT, FIELDS, rows)
    counts = collections.Counter(r["agreement"] for r in rows)
    print(f"[rows] {len(rows)}  " + "  ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    write_csv(METHOD_OUTPUT, METHOD_FIELDS, method_rows)
    print(f"[method rows] {len(method_rows)}  apply={sum(r['apply'] == 'true' for r in method_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
