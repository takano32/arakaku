# Unofficial ARAKAKU Database Project Instructions

This file provides core instructions and context for `gemini-cli` and other AI agents working on the ARAKAKU project.

## Project Overview

Unofficial ARAKAKU Database is a CSV-backed static database and GitHub Pages viewer for organizing MMA promotions, events, bouts, fighters, titles, videos, source documents, and Numbers-derived comparison data.

- **Source Code & Data:** CSV files in `data-src/`
- **Output:** JSON files in `docs/data/` (generated)
- **Viewer:** HTML/JS in `docs/`
- **Public URL:** [https://takano32.github.io/arakaku/](https://takano32.github.io/arakaku/)

## Core Mandates

### 1. Canonical Source of Truth
The **only** canonical data source is `data-src/*.csv`.
- **NEVER** edit `docs/data/*.json` directly.
- **NEVER** commit `docs/data/*.json` or `tmp/` cache files.

### 2. Validation First
Always run validation after any data or script change.
```bash
make check
make clean-generated
```
`make check` performs building, JSON validation, and pytest.

### 3. Data Integrity & Conservatism
- Do **not** invent or infer confirmed facts (winners, methods, etc.).
- Use `unknown` or `needs_review` for uncertain data.
- New extractions must go through `review/*.csv` before being applied to `data-src/`.

### 4. Metadata Archival
To mitigate risks from external site structure changes or data deletion, critical metadata must be archived.
- Cache external data in `tmp/` (do not commit).
- Run `make archive-metadata` to extract and commit lightweight metadata to `data-src/archives/`.
- `data-src/archives/youtube.csv` and `data-src/archives/note.csv` are source CSVs generated from local caches and converted to `youtube_archives.json` / `note_archives.json`.
- Archive metadata may enrich viewer labels and search, but it does not confirm winners, participants, methods, or fighter identities.

## Documentation Index

- [./AGENTS.md](./AGENTS.md): Detailed agent rules and safety rails.
- [./HANDOFF.md](./HANDOFF.md): Current status and handoff notes.
- [./SCHEMA_NOTES.md](./SCHEMA_NOTES.md): Database schema details.
- [./CHRONICLE.md](./CHRONICLE.md): Project evolution and commit history summary.
- [./data-src/GEMINI.md](./data-src/GEMINI.md): Instructions for data management.
- [./scripts/GEMINI.md](./scripts/GEMINI.md): Instructions for script development.

## Common Workflows

### Data Update
1. Modify `data-src/*.csv`.
2. Run `make check`.
3. If successful, run `make clean-generated`.

### Source Document Processing
1. `make cache-sources` (Fetches note HTML and YouTube info)
2. `make archive-metadata` (Regenerates `data-src/archives/*.csv`)
3. `make build-sources` (Generates `source_documents.csv` and `source_mentions.csv`)
4. `make check`
5. `make clean-generated`

### Numbers Import
1. `python scripts/extract_numbers.py` (Generates `numbers_fighters.csv`, `numbers_name_matches.csv`, and `numbers_fight_records.csv`)
2. `make check`
3. `make clean-generated`

Numbers-derived fight records are comparison data. Do not directly promote them into confirmed bouts or participant results.

### Viewer Development
1. Modify `docs/index.html`, `docs/assets/*.js`, or `docs/assets/style.css`.
2. Run `make check`.
3. Verify changes locally if possible, or push to `master` and check GitHub Pages.
