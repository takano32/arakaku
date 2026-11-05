#!/usr/bin/env python3
from __future__ import annotations

# 役割: 既存の event / bout / video エンティティと source_documents・source_mentions を突き合わせ、
#   参照候補を 3 本の review CSV (source_event/bout/video_reference_candidates.csv) に書く入口。
#   候補の作り方は arakaku/review/reference_candidates.py。
# アーキ上の位置: `make source-reference-candidates` / `make check-generated` から起動。出力は review/ の
#   人間レビュー専用候補で確定リンクではない。
# 不変条件: ここにはロジックを置かない。
# 関連 skill: .agents/skills/arakaku-source-pipeline (Review candidate pipeline)。

from arakaku.io import read_csv, write_csv
from arakaku.paths import DATA_SRC, REVIEW
from arakaku.review.reference_candidates import (
    BOUT_FIELDS,
    EVENT_FIELDS,
    VIDEO_FIELDS,
    build_bout_candidates,
    build_bout_fighter_names,
    build_bout_source_ids,
    build_event_candidates,
    build_video_candidates,
    source_doc_map,
)

EVENT_OUT_CSV = REVIEW / "source_event_reference_candidates.csv"
BOUT_OUT_CSV = REVIEW / "source_bout_reference_candidates.csv"
VIDEO_OUT_CSV = REVIEW / "source_video_reference_candidates.csv"


def write_candidate_csv(path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    write_csv(path, fieldnames, rows)
    print(f"[rows] {len(rows)}")


def main() -> int:
    documents = source_doc_map(read_csv(DATA_SRC / "source_documents.csv"))
    mentions = read_csv(DATA_SRC / "source_mentions.csv")
    events = read_csv(DATA_SRC / "events.csv")
    bouts = read_csv(DATA_SRC / "bouts.csv")
    participants = read_csv(DATA_SRC / "bout_participants.csv")
    article_links = read_csv(DATA_SRC / "article_links.csv")
    videos = read_csv(DATA_SRC / "videos.csv")
    video_links = read_csv(DATA_SRC / "video_links.csv")

    event_rows = build_event_candidates(events, mentions, documents)
    bout_rows = build_bout_candidates(
        bouts,
        events,
        mentions,
        documents,
        video_links,
        build_bout_fighter_names(participants),
        build_bout_source_ids(article_links, documents),
    )
    video_rows = build_video_candidates(videos, mentions, documents)

    write_candidate_csv(EVENT_OUT_CSV, event_rows, EVENT_FIELDS)
    write_candidate_csv(BOUT_OUT_CSV, bout_rows, BOUT_FIELDS)
    write_candidate_csv(VIDEO_OUT_CSV, video_rows, VIDEO_FIELDS)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
