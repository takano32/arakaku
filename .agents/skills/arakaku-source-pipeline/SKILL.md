---
name: arakaku-source-pipeline
description: Use this skill when working on note HTML caching, YouTube info JSON caching, source_documents.csv, source_mentions.csv, source document extraction, or source text ingestion.
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
tmp/youtube-info/*.info.json
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

Full source refresh:

```bash
make refresh-sources
```

Safe full flow:

```bash
make cache-sources
make archive-metadata
make build-sources
make check
make clean-generated
```

---

## Scripts

### cache_note_html.py

Reads `data-src/articles.csv`.

Writes HTML cache to:

```text
tmp/note-html/
```

404, deleted, or private note articles should not stop the whole pipeline.

### cache_youtube_info.py

Reads `data-src/videos.csv`.

Uses `yt-dlp`.

Writes `.info.json` cache to:

```text
tmp/youtube-info/
```

Do not download video bodies.

### build_source_documents.py

Reads caches and writes:

```text
data-src/source_documents.csv
data-src/source_mentions.csv
```

### archive_metadata.py

Reads caches and writes:

```text
data-src/archives/note.csv
data-src/archives/youtube.csv
```

Archive CSVs preserve external metadata for display and review. They are generated from local caches, but are committed as source CSVs because cache files are not committed.

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
content_hash
content_text
content_preview
```

---

## source_mentions.csv

This is extracted candidate storage.

Common `mention_type`:

```text
event
matchup
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

## Cache policy

Do not commit:

```text
tmp/note-html/*.html
tmp/youtube-info/*.info.json
```

Commit only:

```text
tmp/.gitkeep
tmp/note-html/.gitkeep
tmp/youtube-info/.gitkeep
```

---

## Warning handling

note 404:

- log it
- continue
- do not fail the entire pipeline

yt-dlp warnings:

- not always fatal
- if `.info.json` exists and description is present, continue

---

## Required checks

After changing source pipeline scripts:

```bash
make cache-sources
make archive-metadata
make build-sources
make check
make clean-generated
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
