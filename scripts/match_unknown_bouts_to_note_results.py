#!/usr/bin/env python3
"""Find note results for unknown bouts, and note method details for known bouts (bout first, not note first)."""
from __future__ import annotations

# 役割: result_status=unknown の試合の勝者候補 (review/unknown_bout_note_results.csv) と、known の試合の
#       空の決着欄を埋める候補 (review/known_bout_note_methods.csv) を結果 note から作る入口。
#       勝者と決着の読み取りは arakaku/notes/results.py、Numbers との照合と行の組み立ては
#       arakaku/review/note_results.py。反映は apply_structured_result_patches.py。
# アーキ上の位置: `make check-generated` の最後に走る (docs/data の JSON を読むのでビルド後)。
# 不変条件: ここにはロジックを置かない。
# 関連スキル: .agents/skills/arakaku-source-pipeline

import collections

from arakaku.io import read_csv, read_json, write_csv
from arakaku.paths import DATA_SRC, DOCS_DATA, REVIEW
from arakaku.review.note_results import (
    FIELDS,
    METHOD_FIELDS,
    NoteMatchContext,
    match_bouts,
    names_by_fighter,
    note_bodies,
    numbers_detail_by_pair,
    numbers_winners,
    participants_by_bout,
    result_notes_by_event,
)

OUTPUT = REVIEW / "unknown_bout_note_results.csv"
METHOD_OUTPUT = REVIEW / "known_bout_note_methods.csv"


def main() -> int:
    fighters = read_csv(DATA_SRC / "fighters.csv")
    aliases = read_csv(DATA_SRC / "aliases.csv")
    participants = read_csv(DATA_SRC / "bout_participants.csv")
    records = read_json(DOCS_DATA / "numbers_fight_records.json")
    ctx = NoteMatchContext(
        participants=participants_by_bout(participants),
        events={e["event_id"]: e for e in read_csv(DATA_SRC / "events.csv")},
        result_notes=result_notes_by_event(read_csv(DATA_SRC / "article_links.csv"), read_csv(DATA_SRC / "articles.csv")),
        bodies=note_bodies(read_json(DOCS_DATA / "source_document_bodies.json")),
        names=names_by_fighter(fighters, aliases, participants),
        numbers_winners=numbers_winners(records),
        numbers_details=numbers_detail_by_pair(records),
    )
    rows, method_rows = match_bouts(read_csv(DATA_SRC / "bouts.csv"), ctx)

    write_csv(OUTPUT, FIELDS, rows)
    counts = collections.Counter(r["agreement"] for r in rows)
    print(f"[rows] {len(rows)}  " + "  ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    write_csv(METHOD_OUTPUT, METHOD_FIELDS, method_rows)
    print(f"[method rows] {len(method_rows)}  apply={sum(r['apply'] == 'true' for r in method_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
