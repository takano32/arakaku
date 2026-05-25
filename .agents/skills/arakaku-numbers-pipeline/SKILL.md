---
name: arakaku-numbers-pipeline
description: Use this skill when working with data-raw/アラカク選手名鑑.numbers, scripts/extract_numbers.py, numbers_fighters.csv, numbers_name_matches.csv, numbers_fight_records.csv, generated Numbers JSON, or client-side comparison of Numbers-derived data.
---

# ARAKAKU Numbers Pipeline Skill

Use this skill when importing, validating, documenting, or rendering data from:

```text
data-raw/アラカク選手名鑑.numbers
```

This Numbers file is a source dataset, but it is not a direct replacement for the canonical relational CSVs.

---

## Core principle

Preserve the Numbers rows as comparison data first.

Do not directly convert Numbers-derived records into confirmed canonical facts such as:

- `data-src/bouts.csv`
- `data-src/bout_participants.csv`
- `data-src/fighters.csv`
- `data-src/fighter_snapshots.csv`
- `data-src/title_reigns.csv`

The project should expose Numbers-derived data to the static viewer so browser-side JavaScript can compare, match, pair, and flag issues before any canonical data is changed.

---

## Current split

Numbers data is exported into exactly three CSVs:

```text
data-src/numbers_fighters.csv
data-src/numbers_name_matches.csv
data-src/numbers_fight_records.csv
```

This split is intentional:

- keep raw-ish profile rows separate from inferred identity matches
- keep personal fight records as one row per Numbers row
- avoid over-splitting until the viewer comparison UI proves a need

The old `data-src/fighters_from_numbers.csv` should not be reintroduced.

---

## Source sheets

### 全体

Export to:

```text
data-src/numbers_fighters.csv
```

Meaning:

- one row per fighter in the Numbers "全体" sheet
- source row identity is preserved with `numbers_fighter_id`, `source_sheet`, and `source_row`
- profile, aggregate stats, achievement markers, catchphrase, and notes stay together

Important fields:

```text
numbers_fighter_id
source_row
display_name
main_division
main_promotion_raw
main_promotion_id
age
height
gym
fight_count
wins
losses
win_rate
white_glove_count
tournament_win_marker
tournament_entry_raw
belt_marker
catchphrase
notes
source_confidence
```

Treat `age`, `height`, and `gym` as Numbers-file-time profile data, not timeless facts.

### 個人成績

Export to:

```text
data-src/numbers_fight_records.csv
```

Meaning:

- one row is one fighter's view of one fight
- the same fight can appear once for each fighter
- some fights may appear only from one side
- result marks may contradict each other and must be surfaced

Important fields:

```text
record_id
source_row
numbers_fighter_id
fighter_name
matched_fighter_id
promotion_raw
promotion_id
event_number_raw
event_number_normalized
bout_format
opponent_name
opponent_numbers_fighter_id
opponent_matched_fighter_id
result_mark
result
detail_raw
```

Do not pair records or deduplicate them in the CSV export. Pairing belongs in JavaScript or a review tool.

---

## Name matching

Export inferred name matching to:

```text
data-src/numbers_name_matches.csv
```

Meaning:

- one row per `numbers_fighter_id`
- exact display-name matches point to existing `fighters.fighter_id`
- non-matches get a generated `candidate_fighter_id`
- matching method and confidence must stay explicit

Important fields:

```text
numbers_fighter_id
numbers_name
matched_fighter_id
matched_display_name
candidate_fighter_id
match_method
match_confidence
notes
```

Only `match_method=exact_display_name` with a known `matched_fighter_id` should be treated as a strong existing-fighter link. Generated candidates are review aids, not confirmed identities.

---

## Workflow

After changing the Numbers extraction logic:

```bash
python scripts/extract_numbers.py
make check
make clean-generated
```

`scripts/extract_numbers.py` is allowed to write the three Numbers-derived CSVs under `data-src/`.

Do not edit generated JSON directly. `scripts/build_json.py` generates:

```text
docs/data/numbers_fighters.json
docs/data/numbers_name_matches.json
docs/data/numbers_fight_records.json
```

These JSON files are generated artifacts and should be removed with `make clean-generated` before finishing.

---

## Viewer expectations

The static viewer loads Numbers JSON files for **Rich Data Supplementation**:

- `DataRepository.getRichFighterInfo` fills `unknown` canonical profiles from Numbers rows.
- `DataRepository.getRichBoutInfo` fills `unknown` canonical results from Numbers records.
- UI displays "名鑑確認済み" (Verified by Directory) badges for supplemented records.

Client-side JavaScript should also handle:

- Numbers name vs canonical fighter matching
- profile difference display
- personal fight record pairing
- one-sided fight record warnings
- contradictory win/loss marks
- `promotion_id + event_number_normalized` event matching candidates

The viewer must not silently write canonical CSVs or hide conflicts.

---

## Validation expectations

Keep validation focused on structural safety:

- required columns exist
- primary IDs are unique
- `numbers_name_matches.numbers_fighter_id` points to `numbers_fighters.csv`
- `matched_fighter_id` values point to existing `fighters.csv` when present
- `numbers_fight_records` references known Numbers fighter IDs when present
- `result` values are expected values such as `win` or `loss`

Do not validate away messy historical data by weakening checks or deleting rows.

---

## When applying to canonical data

If a future task promotes Numbers-derived data into canonical CSVs:

1. Keep the Numbers CSV rows intact.
2. Generate a review or comparison surface first.
3. Identify ambiguous names, one-sided records, and contradictory results.
4. Only apply reviewed facts.
5. Preserve source row references in notes or source fields when useful.
6. Run `make check`.
7. Run `make clean-generated`.

Never confirm winners, methods, rounds, times, title lineage, or fighter identity from a generated candidate alone.
