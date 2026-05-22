# ARAKAKU Project Instructions

This file provides core instructions and context for `gemini-cli` and other AI agents working on the ARAKAKU project.

## Project Overview

ARAKAKU is a CSV-backed static database and GitHub Pages viewer for organizing MMA promotions, events, bouts, fighters, titles, videos, and source documents.

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

### 4. Naming Conventions
- Prefer `スーパーうんどう` for project-specific terminology.
- Preserve original spellings when quoting or extracting from sources.

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
2. `make build-sources` (Generates `source_documents.csv` and `source_mentions.csv`)
3. `make check`
4. `make clean-generated`

### Viewer Development
1. Modify `docs/index.html`, `docs/assets/*.js`, or `docs/assets/style.css`.
2. Run `make check`.
3. Verify changes locally if possible, or push to `master` and check GitHub Pages.
