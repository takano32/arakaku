#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter, defaultdict

from arakaku_utils import DATA_SRC, REVIEW, compact_join, compact_text, read_csv, write_csv

SOURCE_DOCUMENTS_CSV = DATA_SRC / "source_documents.csv"
SOURCE_MENTIONS_CSV = DATA_SRC / "source_mentions.csv"
EVENTS_CSV = DATA_SRC / "events.csv"
BOUTS_CSV = DATA_SRC / "bouts.csv"
VIDEOS_CSV = DATA_SRC / "videos.csv"
VIDEO_LINKS_CSV = DATA_SRC / "video_links.csv"

EVENT_OUT_CSV = REVIEW / "source_event_reference_candidates.csv"
BOUT_OUT_CSV = REVIEW / "source_bout_reference_candidates.csv"
VIDEO_OUT_CSV = REVIEW / "source_video_reference_candidates.csv"


def mention_text(mention: dict[str, str], document: dict[str, str] | None = None) -> str:
    return " ".join(
        value
        for value in [
            mention.get("mention_type", ""),
            mention.get("entity_type", ""),
            mention.get("entity_hint", ""),
            mention.get("matched_text", ""),
            mention.get("context", ""),
            mention.get("source_id", ""),
            mention.get("source_ref_id", ""),
            document.get("title", "") if document else "",
            document.get("content_preview", "") if document else "",
        ]
        if value
    )


def line_number(mention: dict[str, str]) -> int:
    try:
        return int(mention.get("line_number") or 0)
    except ValueError:
        return 0


def source_doc_map(documents: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    return {document["source_id"]: document for document in documents}


def group_mentions_by_source(mentions: list[dict[str, str]]) -> dict[str, list[dict[str, str]]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for mention in mentions:
        grouped[mention.get("source_id", "")].append(mention)
    return grouped


def source_meta(source_id: str, documents: dict[str, dict[str, str]]) -> dict[str, str]:
    document = documents.get(source_id, {})
    return {
        "source_id": source_id,
        "source_type": document.get("source_type", ""),
        "source_ref_id": document.get("source_ref_id", ""),
        "source_title": document.get("title", ""),
        "source_url": document.get("url", ""),
    }


def confidence_for_exact(count: int, has_exact_hint: bool) -> str:
    if has_exact_hint and count >= 2:
        return "high"
    if has_exact_hint or count >= 2:
        return "medium"
    return "low"


def build_event_candidates(
    events: list[dict[str, str]],
    mentions: list[dict[str, str]],
    documents: dict[str, dict[str, str]],
) -> list[dict[str, str]]:
    rows = []

    for event in events:
        event_name = event.get("name", "")
        if not event_name:
            continue

        matches_by_source: dict[str, list[dict[str, str]]] = defaultdict(list)
        exact_hint_by_source: set[str] = set()

        for mention in mentions:
            document = documents.get(mention.get("source_id", ""))
            text = mention_text(mention, document)
            if event_name not in text:
                continue

            source_id = mention.get("source_id", "")
            matches_by_source[source_id].append(mention)
            if mention.get("entity_hint") == event_name:
                exact_hint_by_source.add(source_id)

        for source_id, source_mentions in sorted(matches_by_source.items()):
            counts = Counter(mention.get("mention_type", "") for mention in source_mentions)
            meta = source_meta(source_id, documents)
            rows.append(
                {
                    "candidate_id": f"event-source-{len(rows) + 1:04d}",
                    "event_id": event.get("event_id", ""),
                    "event_name": event_name,
                    **meta,
                    "line_numbers": compact_join([mention.get("line_number", "") for mention in source_mentions], 10),
                    "mention_types": compact_join([f"{key}:{counts[key]}" for key in sorted(counts)]),
                    "matched_texts": compact_text(compact_join([mention.get("matched_text", "") for mention in source_mentions])),
                    "confidence": confidence_for_exact(len(source_mentions), source_id in exact_hint_by_source),
                    "notes": "Review-only source reference candidate for event.",
                }
            )

    return rows


def bout_names(bout: dict[str, str]) -> list[str]:
    return [
        bout.get("fighter_a", ""),
        bout.get("fighter_b", ""),
    ]


def build_bout_candidates(
    bouts: list[dict[str, str]],
    events: list[dict[str, str]],
    mentions: list[dict[str, str]],
    documents: dict[str, dict[str, str]],
    video_links: list[dict[str, str]],
) -> list[dict[str, str]]:
    event_names = {event["event_id"]: event["name"] for event in events}
    source_mentions = group_mentions_by_source(mentions)
    video_source_ids_by_bout: dict[str, set[str]] = defaultdict(set)

    for link in video_links:
        if link.get("entity_type") != "bout":
            continue
        video_id = link.get("video_id", "")
        source_id = f"youtube_description:{video_id}"
        if source_id in documents:
            video_source_ids_by_bout[link.get("entity_id", "")].add(source_id)

    rows = []

    for bout in bouts:
        names = [name for name in bout_names(bout) if name]
        matchup = bout.get("matchup", "")
        event_name = event_names.get(bout.get("event_id", ""), "")
        matched_by_source: dict[str, tuple[str, list[dict[str, str]]]] = {}

        for source_id, grouped_mentions in source_mentions.items():
            document = documents.get(source_id)
            texts = [mention_text(mention, document) for mention in grouped_mentions]
            joined_text = " ".join(texts)
            reason = ""

            if matchup and matchup in joined_text:
                reason = "matchup_text"
            elif event_name and event_name in joined_text and len(names) >= 2 and all(name in joined_text for name in names):
                reason = "fighter_pair"
            elif (
                event_name
                and event_name in joined_text
                and bout.get("source_article_id")
                and bout.get("source_article_id") in source_id
            ):
                reason = "existing_source_article"

            if reason:
                matched_by_source[source_id] = (reason, grouped_mentions)

        for source_id in video_source_ids_by_bout.get(bout.get("bout_id", ""), set()):
            matched_by_source[source_id] = (
                "linked_video_description",
                source_mentions.get(source_id, []),
            )

        for source_id, (reason, source_rows) in sorted(matched_by_source.items()):
            counts = Counter(mention.get("mention_type", "") for mention in source_rows)
            meta = source_meta(source_id, documents)
            rows.append(
                {
                    "candidate_id": f"bout-source-{len(rows) + 1:04d}",
                    "bout_id": bout.get("bout_id", ""),
                    "event_id": bout.get("event_id", ""),
                    "event_name": event_name,
                    "matchup": matchup,
                    "fighter_a": bout.get("fighter_a", ""),
                    "fighter_b": bout.get("fighter_b", ""),
                    **meta,
                    "match_reason": reason,
                    "line_numbers": compact_join([mention.get("line_number", "") for mention in source_rows], 10),
                    "mention_types": compact_join([f"{key}:{counts[key]}" for key in sorted(counts)]),
                    "matched_texts": compact_text(compact_join([mention.get("matched_text", "") for mention in source_rows])),
                    "confidence": "high" if reason in {"matchup_text", "linked_video_description"} else "medium",
                    "notes": "Review-only source reference candidate for bout; not confirmed result data.",
                }
            )

    return rows


def build_video_candidates(
    videos: list[dict[str, str]],
    mentions: list[dict[str, str]],
    documents: dict[str, dict[str, str]],
) -> list[dict[str, str]]:
    mentions_by_source = group_mentions_by_source(mentions)
    rows = []

    for video in videos:
        source_id = f"youtube_description:{video.get('video_id', '')}"
        document = documents.get(source_id)
        if not document:
            continue

        source_mentions = mentions_by_source.get(source_id, [])
        counts = Counter(mention.get("mention_type", "") for mention in source_mentions)
        rows.append(
            {
                "candidate_id": f"video-source-{len(rows) + 1:04d}",
                "video_id": video.get("video_id", ""),
                "video_title": video.get("title", ""),
                **source_meta(source_id, documents),
                "mention_types": compact_join([f"{key}:{counts[key]}" for key in sorted(counts)]),
                "matched_texts": compact_text(compact_join([mention.get("matched_text", "") for mention in source_mentions])),
                "content_preview": compact_text(document.get("content_preview", "")),
                "confidence": "high",
                "notes": "YouTube description source document is available for this video.",
            }
        )

    return rows


def main() -> int:
    documents = source_doc_map(read_csv(SOURCE_DOCUMENTS_CSV))
    mentions = read_csv(SOURCE_MENTIONS_CSV)
    events = read_csv(EVENTS_CSV)
    bouts = read_csv(BOUTS_CSV)
    videos = read_csv(VIDEOS_CSV)
    video_links = read_csv(VIDEO_LINKS_CSV)

    event_rows = build_event_candidates(events, mentions, documents)
    bout_rows = build_bout_candidates(bouts, events, mentions, documents, video_links)
    video_rows = build_video_candidates(videos, mentions, documents)

    write_candidate_csv(
        EVENT_OUT_CSV,
        event_rows,
        [
            "candidate_id",
            "event_id",
            "event_name",
            "source_id",
            "source_type",
            "source_ref_id",
            "source_title",
            "source_url",
            "line_numbers",
            "mention_types",
            "matched_texts",
            "confidence",
            "notes",
        ],
    )
    write_candidate_csv(
        BOUT_OUT_CSV,
        bout_rows,
        [
            "candidate_id",
            "bout_id",
            "event_id",
            "event_name",
            "matchup",
            "fighter_a",
            "fighter_b",
            "source_id",
            "source_type",
            "source_ref_id",
            "source_title",
            "source_url",
            "match_reason",
            "line_numbers",
            "mention_types",
            "matched_texts",
            "confidence",
            "notes",
        ],
    )
    write_candidate_csv(
        VIDEO_OUT_CSV,
        video_rows,
        [
            "candidate_id",
            "video_id",
            "video_title",
            "source_id",
            "source_type",
            "source_ref_id",
            "source_title",
            "source_url",
            "mention_types",
            "matched_texts",
            "content_preview",
            "confidence",
            "notes",
        ],
    )

    return 0


def write_candidate_csv(path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    write_csv(path, fieldnames, rows)
    print(f"[rows] {len(rows)}")


if __name__ == "__main__":
    raise SystemExit(main())
