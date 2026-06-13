#!/usr/bin/env python3
"""Generate video_links.csv from bouts.csv, bout_participants.csv, videos.csv, fighters.csv."""
from __future__ import annotations

from arakaku.utils import DATA_SRC, read_csv, write_csv

OUTPUT = DATA_SRC / "video_links.csv"
FIELDS = ["video_id", "entity_type", "entity_id", "relation_type", "start_time", "end_time", "notes"]


def relation_type_from_video_type(vtype: str) -> str:
    if vtype in ("full_fight", "stream_archive", "preview", "interview"):
        return vtype
    return "reference"


def fighter_note(confidence: str) -> str:
    base = "Migrated from fighters.inferred_from_video_ids."
    if confidence == "medium":
        return base + " inferred_confidence=medium."
    return base


def main() -> None:
    video_types: dict[str, str] = {}
    for row in read_csv(DATA_SRC / "videos.csv"):
        video_types[row["video_id"]] = row.get("video_type", "reference")

    fighter_confidence: dict[str, str] = {}
    for row in read_csv(DATA_SRC / "fighters.csv"):
        fighter_confidence[row["fighter_id"]] = row.get("inferred_confidence", "")

    bout_fighters: dict[str, list[str]] = {}
    for row in read_csv(DATA_SRC / "bout_participants.csv"):
        bid = row["bout_id"]
        fid = row.get("fighter_id", "")
        if fid:
            bout_fighters.setdefault(bid, []).append(fid)

    rows: list[dict[str, str]] = []
    seen_event_links: set[tuple[str, str]] = set()

    for bout in read_csv(DATA_SRC / "bouts.csv"):
        vid = bout.get("inferred_from_video_id", "")
        if not vid:
            continue

        vtype = video_types.get(vid, "reference")
        rel = relation_type_from_video_type(vtype)
        event_id = bout["event_id"]
        bout_id = bout["bout_id"]

        rows.append({"video_id": vid, "entity_type": "bout", "entity_id": bout_id,
                     "relation_type": rel, "start_time": "", "end_time": "",
                     "notes": "公式YouTube動画タイトルから推定。"})

        event_key = (vid, event_id)
        if event_key not in seen_event_links:
            seen_event_links.add(event_key)
            rows.append({"video_id": vid, "entity_type": "event", "entity_id": event_id,
                         "relation_type": "reference", "start_time": "", "end_time": "",
                         "notes": "Migrated from events.source_video_ids."})

        for fid in bout_fighters.get(bout_id, []):
            conf = fighter_confidence.get(fid, "")
            rows.append({"video_id": vid, "entity_type": "fighter", "entity_id": fid,
                         "relation_type": "reference", "start_time": "", "end_time": "",
                         "notes": fighter_note(conf)})

    write_csv(OUTPUT, FIELDS, rows)
    print(f"[done] {len(rows)} video link rows written")


if __name__ == "__main__":
    main()
