---
name: arakaku-source-pipeline
description: Use this skill when working on note HTML caching, YouTube Data API caching, source_documents.csv, source_mentions.csv, source document extraction, or source text ingestion.
---

# Unofficial ARAKAKU Database Source Pipeline Skill

Use this skill when working with note bodies, YouTube descriptions, source documents, or extracted mentions.

---

## Pipeline overview

Input sources:

```text
data-src/articles.csv
data-src/videos.csv
```

Local caches:

```text
tmp/note-html/*.html
tmp/youtube-api/*.json
```

Archived cache metadata:

```text
data-src/archives/note.csv
data-src/archives/youtube.csv
```

Generated canonical CSVs:

```text
data-src/source_documents.csv
data-src/source_mentions.csv
```

Generated viewer JSON:

```text
docs/data/source_documents.json
docs/data/source_mentions.json
docs/data/note_archives.json
docs/data/youtube_archives.json
```

Do not commit cache files or generated JSON.

---

## Main commands

Cache note and YouTube sources:

```bash
make cache-sources
```

Build source document CSVs:

```bash
make build-sources
```

Archive cache metadata:

```bash
make archive-metadata
```

Full source refresh (the standard flow):

```bash
make refresh-sources
```

`refresh-sources` = `cache-sources` (including `discover-note-articles` and
`discover-youtube-videos`) → `archive-metadata` → `generate-articles` → `build-sources` →
`generate-official-csvs` → `generate-stage2` → `reorder-data` → `check`. After committing,
`make check-generated` must pass on a clean tree (CI runs it); `make clean-generated` is
optional cleanup.

---

## Discovery

Both discovery steps are append-only: they add rows for sources that are not registered yet
and never change or delete existing rows. They run automatically as the first step of
`cache-note-html` / `cache-youtube-api` (and so of `cache-sources` / `refresh-sources`).

### crawl_note_articles.py

Target: `make discover-note-articles` (runs `crawl_note_articles.py --use-api`).

Lists every article of the official note creator and appends rows for URLs missing from
`data-src/articles.csv` (`status=unparsed`), so `cache_note_html.py` fetches them.

### discover_youtube_videos.py

Target: `make discover-youtube-videos`.

Lists every upload of the official channel through the YouTube Data API and appends rows for
non-Shorts videos missing from `data-src/videos.csv` (matched by `platform_video_id`). It does
not link videos to bouts, events, or fighters. Requires `YOUTUBE_API_KEY`.

---

## Scripts

### cache_note_html.py

Reads `data-src/articles.csv`.

Writes HTML cache to:

```text
tmp/note-html/
```

404, deleted, or private note articles should not stop the whole pipeline.

Cache filenames come from `note_cache_name()` in `scripts/arakaku/utils.py` —
the same function `build_source_documents.py` uses to look the files up.
Never reimplement this naming locally; diverging copies silently break cache
lookups.

### cache_youtube_api.py

Reads `data-src/videos.csv`.

Uses the YouTube Data API v3 `videos.list` (50 IDs per request). Requires `YOUTUBE_API_KEY` in the environment; the key is sent as a header, never in the URL.

Writes each returned video resource unchanged as `<platform_video_id>.json` to:

```text
tmp/youtube-api/
```

Do not download video bodies.

Videos the API does not return (deleted, private) are printed as `[missing]` and make the script exit 1.

Read the cache only through `scripts/arakaku/youtube.py` (`iter_cached_videos`), which maps API fields to the flat metadata the downstream scripts use.

### build_source_documents.py

Reads caches and writes:

```text
data-src/source_documents.csv
data-src/source_mentions.csv
```

For note articles, the body is only the article title (`h1`), the post time (`time`), and `#note-body`; page chrome and the "あなたへのおすすめ" list are excluded. A page without `#note-body` (the creator top page) uses its meta description.

`fetched_at` is carried over from the previous `source_documents.csv` when `content_hash` is unchanged, so a rerun without content changes produces no diff.

### generate_articles.py

Target: `make generate-articles`. Runs after `archive_metadata.py` and before
`build_source_documents.py`.

Generates `data-src/articles.csv` from `data-src/archives/note.csv` and classifies each article
(`article_type`: `promotion_profile` / `event_card` / `event_result` / `note_article` /
`youtube_description_source`). `published_at` comes from `archives/note.csv` (JSON-LD
`datePublished`). Stage1 generated: hand edits are lost.

### archive_metadata.py

Reads caches and writes:

```text
data-src/archives/note.csv
data-src/archives/youtube.csv
```

Archive CSVs preserve external metadata for display and review. They are generated from local caches, but are committed as source CSVs because cache files are not committed.

Rows whose cache file is missing (deleted, private, or not fetched) are kept unchanged and reported as `[kept]`, so an empty or partial cache never shrinks an archive.

`archives/youtube.csv` `thumbnail_sizes` lists the keys of the API's `snippet.thumbnails` (ordered `default medium high standard maxres`, space-separated). `build_json.py` copies it into `videos.json` so the viewer's YouTube facade (`docs/assets/js/ui/parts.js` `videoFacade`) can pick a thumbnail file that exists (`maxresdefault` → `sddefault` → `hqdefault`) instead of logging a 404.

---

## source_documents.csv

This is full-text source storage.

Common `source_type`:

```text
note_article
youtube_description
```

Important fields:

```text
source_id
source_type
source_ref_id
title
url
published_at
fetched_at
content_format
content_hash
content_text
content_preview
notes
```

---

## source_mentions.csv

This is extracted candidate storage.

Common `mention_type`:

```text
event
matchup
match_result
result
note_url
youtube_url
```

Important fields:

```text
mention_id
source_id
source_type
source_ref_id
line_number
mention_type
entity_type
entity_hint
matched_text
context
confidence
notes
```

Mentions are candidates. They are not automatically confirmed data.

---

## Review candidate pipeline

Three scripts write review candidates: `make_source_mention_result_candidates.py`
and `make_source_reference_candidates.py` (both read `source_mentions.csv` /
`source_documents.csv` and run in `make generate-stage2`), and
`match_unknown_bouts_to_note_results.py` (reads result-note bodies; run by
`make check-generated`). Their outputs land in `review/` and are **review-only**:
they never confirm bout winners, participants, methods, fighter identities, or
title lineage on their own.

Text-parsing helpers shared verbatim across the source-pipeline scripts (URL
regexes, `VS_RE`, `normalize_digits`, `find_method`, `infer_time`) live in
`scripts/arakaku/textparse.py`. Patterns whose vocabulary intentionally differs
per script (`METHOD_PATTERNS`, `ROUND_RE`, `EVENT_RE`, `RESULT_RE`) stay local
to each script — do not merge them into the shared module.

### make_source_mention_result_candidates.py

Target:

```bash
make source-mention-result-candidates
```

Reads `data-src/source_mentions.csv` and writes:

```text
review/source_mention_result_candidates.csv
```

It scans mention text for result-method patterns (KO, TKO, SUB, DEC, DQ, NC,
etc.) to surface possible result mentions for human review.

### make_source_reference_candidates.py

Target:

```bash
make source-reference-candidates
```

Reads `data-src/source_documents.csv`, `data-src/source_mentions.csv`,
`data-src/events.csv`, `data-src/bouts.csv`,
`data-src/bout_participants.csv`, `data-src/article_links.csv`,
`data-src/videos.csv`, and `data-src/video_links.csv`, and writes:

```text
review/source_event_reference_candidates.csv
review/source_bout_reference_candidates.csv
review/source_video_reference_candidates.csv
```

Bout matching does not read fighter names or article links off `bouts.csv`.
Red/blue fighter names come from `bout_participants.csv` (via `side` +
`fighter_name`), and note source links come from `article_links.csv` rows where
`entity_type == "bout"` (mapped to `note:<article_id>` source ids). This makes
the script safe to re-run after schema changes to `bouts.csv`.

### match_unknown_bouts_to_note_results.py

Run directly (after `make build`, since it reads `docs/data/numbers_fight_records.json`):

```bash
python3 scripts/match_unknown_bouts_to_note_results.py
```

Searches from the bout side: for each bout, it looks in its event's result note
(`article_type=event_result`) for both fighters' names and decides the winner only from
the ○/◯/● mark before a name. Writes:

```text
review/unknown_bout_note_results.csv   ← result_status=unknown bouts; apply=true only when the Numbers winner agrees
review/known_bout_note_methods.csv     ← empty method/round/time of known bouts (clashing rows stay apply=false)
```

Rows with `apply=true` are written back to `bouts.csv` / `bout_participants.csv` by:

```bash
python3 scripts/apply_structured_result_patches.py [csv]   # default: review/unknown_bout_note_results.csv
```

### review/ directory

The review directory holds exactly six generated candidate CSVs:

```text
review/unknown_bout_note_results.csv
review/known_bout_note_methods.csv
review/source_mention_result_candidates.csv
review/source_event_reference_candidates.csv
review/source_bout_reference_candidates.csv
review/source_video_reference_candidates.csv
```

These are human-review staging files, not canonical data.

---

## Cache policy

Do not commit:

```text
tmp/note-html/*.html
tmp/youtube-api/*.json
```

Commit only:

```text
tmp/.gitkeep
tmp/note-html/.gitkeep
tmp/youtube-api/.gitkeep
```

---

## Warning handling

note 404:

- log it
- continue
- do not fail the entire pipeline

YouTube API `[missing]` videos:

- not always fatal
- check whether the video was deleted or made private before editing `videos.csv`

---

## Required checks

After changing source pipeline scripts:

```bash
make refresh-sources
# after committing, on a clean tree:
make check-generated
make clean-generated   # optional cleanup
```

For quick validation of counts:

```bash
python - <<'PY'
import csv

for path in [
    "data-src/source_documents.csv",
    "data-src/source_mentions.csv",
    "data-src/archives/youtube.csv",
    "data-src/archives/note.csv",
]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        print(path, len(list(csv.DictReader(f))), "rows")
PY
```

Do not use `wc -l` for `source_documents.csv`; source text fields can contain embedded newlines.
