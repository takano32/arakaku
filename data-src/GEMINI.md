# ARAKAKU Data Instructions

Canonical data for ARAKAKU is stored in this directory as CSV files.

## CSV Maintenance Rules

### 1. IDs are Immutable
Once assigned, `event_id`, `fighter_id`, `bout_id`, etc., should not be changed without a very strong reason, as they are used for cross-referencing.

### 2. Mandatory Fields
Ensure all mandatory fields (as defined in `scripts/validate_json.py`) are present.
- `event_id` is required for bouts and video links.
- `fighter_a` and `fighter_b` are required for bouts.

### 3. Data Entry Conservatism
- If a result is not explicitly confirmed by a source, set `result_status=unknown`.
- Do not swap `fighter_a` and `fighter_b` based on who won; use the `winner` and `loser` columns.

## Key Files

- `promotions.csv`: Organizations and their meta-data.
- `events.csv`: Tournament and event details. `event_id` is the primary key.
- `bouts.csv`: Individual matches. Reference fighters by name/ID.
- `fighters.csv`: Fighter profiles and IDs.
- `videos.csv`: Metadata for YouTube and other video sources.
- `source_documents.csv`: Full text database for verification.
- `source_mentions.csv`: Extracted entity mentions for review.

## Workflow for New Data
1. Check `../review/` for existing candidates.
2. Add new rows to the relevant CSV.
3. Run `make check` from the project root to validate.
