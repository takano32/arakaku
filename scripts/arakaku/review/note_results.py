# 役割: result_status=unknown の試合ごとに、その大会の結果 note (article_type=event_result) の本文から
#   両選手の名前を探して勝者を決め (arakaku/notes/results.py)、Numbers の勝者と比べて
#   review/unknown_bout_note_results.csv の行を作る。Numbers と一致した行だけ apply=true
#   (T.40 でユーザーが決めた反映条件)。結果が known の試合は、note の勝者が同じときだけ、空の決着欄を
#   埋める候補を review/known_bout_note_methods.csv の行にする (既存値と食い違う行は apply=false)。
# アーキ上の位置: scripts/match_unknown_bouts_to_note_results.py が CSV / JSON を読んで
#   NoteMatchContext に詰め、match_bouts を呼んで write_csv する。
#   反映は `python3 scripts/apply_structured_result_patches.py review/unknown_bout_note_results.csv`。
# 不変条件:
#   - 再戦があるので、同じ 2 人の Numbers 記録は大会ごとに分けて比べる (T.86)。同じ大会の Numbers
#     記録が無く、別の大会の記録とだけ一致するものは agree_other_event で反映しない (T.93)。
#   - 勝者が 2 人以上の記事にまたがって食い違えば候補にしない (locate_winner は 1 人のときだけ返す)。
# 関連スキル: .agents/skills/arakaku-source-pipeline
from __future__ import annotations

import collections
import re
from dataclasses import dataclass, field

from arakaku.io import CsvRow
from arakaku.notes.results import pair_verdicts, parse_result, result_text
from arakaku.text import nfkc

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

NumbersTable = dict[tuple, set[str]]


@dataclass(frozen=True)
class NoteMatchContext:
    participants: dict[str, list[CsvRow]] = field(default_factory=dict)  # bout_id -> 出場者 2 行
    events: dict[str, CsvRow] = field(default_factory=dict)  # event_id -> events.csv の行
    result_notes: dict[str, set[str]] = field(default_factory=dict)  # event_id -> 結果 note の article_id
    bodies: dict[str, str] = field(default_factory=dict)  # article_id -> 本文
    names: dict[str, set[str]] = field(default_factory=dict)  # fighter_id -> 名前の表記
    numbers_winners: NumbersTable = field(default_factory=dict)
    numbers_details: NumbersTable = field(default_factory=dict)


def names_by_fighter(fighters: list[CsvRow], aliases: list[CsvRow], participants: list[CsvRow]) -> dict[str, set[str]]:
    names: dict[str, set[str]] = collections.defaultdict(set)
    for f in fighters:
        names[f["fighter_id"]].add(f["display_name"])
    for a in aliases:
        if a["alias_type"] == "fighters":
            names[a["canonical_id"]].add(a["alias"])
    for p in participants:
        if p["fighter_id"] and p["fighter_name"]:
            names[p["fighter_id"]].add(p["fighter_name"])
    return names


def participant_pairs_by_bout(participants: list[CsvRow]) -> dict[str, list[CsvRow]]:
    """bout_participants.csv のファイルの順のまま (並べ替えない)。この順が fighter_a・fighter_b の列を決める。
    赤・青の順に並べる build/relations.participants_by_bout とは別物。"""
    by_bout: dict[str, list[CsvRow]] = collections.defaultdict(list)
    for p in participants:
        by_bout[p["bout_id"]].append(p)
    return by_bout


def result_notes_by_event(article_links: list[CsvRow], articles: list[CsvRow]) -> dict[str, set[str]]:
    by_id = {a["article_id"]: a for a in articles}
    result_notes: dict[str, set[str]] = collections.defaultdict(set)
    for link in article_links:
        if link["entity_type"] == "event" and by_id.get(link["article_id"], {}).get("article_type") == "event_result":
            result_notes[link["entity_id"]].add(link["article_id"])
    return result_notes


def note_bodies(source_document_bodies: list[dict]) -> dict[str, str]:
    """source_document_bodies.json の note 行を article_id -> 本文 にする。"""
    return {
        d["source_id"].split(":", 1)[1]: d["content_text"]
        for d in source_document_bodies
        if d["source_id"].startswith("note:")
    }


def numbers_key(r: dict) -> tuple[frozenset[str], str, str] | None:
    a = r.get("matched_fighter_id") or r.get("candidate_fighter_id")
    o = r.get("opponent_matched_fighter_id") or r.get("opponent_candidate_fighter_id")
    if not (a and o):
        return None
    return frozenset((a, o)), r.get("promotion_id") or "", str(r.get("event_number_normalized") or "")


def numbers_winners(records: list[dict]) -> NumbersTable:
    """Winners per (pair, promotion, event number) and per pair alone (key with two empty strings)."""
    winners: NumbersTable = collections.defaultdict(set)
    for r in records:
        key = numbers_key(r)
        if key and r.get("result") in ("win", "loss"):
            a = r.get("matched_fighter_id") or r.get("candidate_fighter_id")
            o = r.get("opponent_matched_fighter_id") or r.get("opponent_candidate_fighter_id")
            winner = a if r["result"] == "win" else o
            winners[key].add(winner)
            winners[(key[0], "", "")].add(winner)
    return winners


def numbers_detail_by_pair(records: list[dict]) -> NumbersTable:
    details: NumbersTable = collections.defaultdict(set)
    for r in records:
        key = numbers_key(r)
        if key and r.get("detail_raw"):
            details[key].add(r["detail_raw"].strip())
            details[(key[0], "", "")].add(r["detail_raw"].strip())
    return details


def same_value(value: str) -> str:
    """Compare 3分4秒 and 3分04秒 as the same time."""
    m = re.fullmatch(r"(\d{1,2})分(\d{1,2})秒", nfkc(value).strip())
    return f"{int(m.group(1))}:{int(m.group(2)):02d}" if m else nfkc(value).strip()


def for_event_exact(table: NumbersTable, pair: frozenset[str], event: CsvRow) -> tuple[set[str], bool]:
    """(values, True) from the event's own Numbers records, or (values of every event of the pair, False)."""
    number = event.get("numbers_event_number") or event.get("event_number") or ""
    own = table.get((pair, event.get("promotion_id", ""), number))
    return (own, True) if own else (table.get((pair, "", ""), set()), False)


def for_event(table: NumbersTable, pair: frozenset[str], event: CsvRow) -> set[str]:
    """The event's own Numbers records when they exist, otherwise every record of the pair."""
    return for_event_exact(table, pair, event)[0]


def locate_winner(a: CsvRow, b: CsvRow, event_id: str, ctx: NoteMatchContext) -> tuple[str, str, int, int] | None:
    """(winner fighter_id, article_id, first line, last line) when the marks name exactly one winner."""
    verdicts: dict[str, tuple[str, int, int]] = {}
    for article_id in sorted(ctx.result_notes.get(event_id, ())):
        lines = ctx.bodies.get(article_id, "").split("\n")
        for a_wins, first, last in pair_verdicts(lines, ctx.names[a["fighter_id"]], ctx.names[b["fighter_id"]]):
            winner = a if a_wins else b
            verdicts.setdefault(winner["fighter_id"], (article_id, first, last))
    if len(verdicts) != 1:
        return None
    winner_id, (article_id, first, last) = next(iter(verdicts.items()))
    return winner_id, article_id, first, last


def source_fields(bodies: dict[str, str], article_id: str, first: int, last: int) -> dict[str, str]:
    lines = bodies[article_id].split("\n")
    return {
        "source_article_id": article_id,
        "source_line_start": str(first + 1),
        "source_line_end": str(last + 1),
        "source_text": " / ".join(line.strip() for line in lines[first:last + 1]),
        "result_text": result_text(lines, first, last),
    }


def match_bouts(bouts: list[CsvRow], ctx: NoteMatchContext) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """(unknown 試合の勝者候補の行, known 試合の決着候補の行)。"""
    rows = []
    method_rows = []
    for bout in bouts:
        pair = ctx.participants.get(bout["bout_id"], [])
        if len(pair) != 2 or not all(p["fighter_id"] for p in pair):
            continue
        a, b = pair
        found = locate_winner(a, b, bout["event_id"], ctx)
        if not found:
            continue
        winner_id, article_id, first, last = found
        source = source_fields(ctx.bodies, article_id, first, last)
        parsed = parse_result(source["result_text"])
        fighter_ids = frozenset((a["fighter_id"], b["fighter_id"]))
        event = ctx.events.get(bout["event_id"], {})
        if bout["result_status"] == "unknown":
            winner = a if a["fighter_id"] == winner_id else b
            loser = b if winner is a else a
            number_winners, same_event = for_event_exact(ctx.numbers_winners, fighter_ids, event)
            agreement = ("agree" if same_event else "agree_other_event") if number_winners == {winner_id} else (
                "note_only" if not number_winners else "conflict")
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
            "numbers_detail": " / ".join(sorted(for_event(ctx.numbers_details, fighter_ids, event))),
            **source,
        })
    return rows, method_rows
