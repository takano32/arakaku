---
name: arakaku-review-workflow
description: Use this skill when generating, inspecting, or applying review CSVs, especially result candidates, source mention candidates, structured result patches, or inferred bouts/events/fighters.
---

# ARAKAKU Review Workflow Skill

Use this skill when the task involves candidate extraction, review CSVs, or applying reviewed changes.

---

## Review principle

Candidate data must go to:

```text
review/
```

Canonical data goes to:

```text
data-src/
```

Do not bulk-apply extracted candidates directly to canonical CSVs without review.

---

## Common review files

```text
review/note_result_candidates.csv
review/note_structured_results.csv
review/structured_result_patch_candidates.csv
review/youtube_description_candidates.csv
review/inferred_bouts_from_video_titles.csv
review/inferred_events_from_video_titles.csv
review/inferred_fighters_from_video_titles.csv
review/parse_skips.csv
```

Future useful file:

```text
review/source_mention_result_candidates.csv
```

---

## Safe workflow

1. Extract candidates to `review/`.
2. Count rows and confidence.
3. Inspect low/medium/high confidence distribution.
4. Verify event IDs.
5. Verify fighter IDs.
6. Verify source context.
7. Apply only reviewed candidates.
8. Run checks.

Commands:

```bash
make check
make clean-generated
```

---

## Result candidate caution

Never confirm a result from:

- matchup text alone
- video title alone
- vague description
- ambiguous fighter names
- candidate mention without context

Confirmed result data must be supported by source context.

---

## Suggested candidate columns

For source mention result candidates:

```text
candidate_id
mention_id
source_id
source_type
source_ref_id
line_number
matched_text
context
event_hint
matchup_hint
winner_hint
loser_hint
method_hint
round_hint
time_hint
confidence
notes
```

---

## Applying patches

Before using any apply script:

1. Open the candidate CSV.
2. Confirm the row count.
3. Inspect sample rows.
4. Confirm no unexpected high-risk changes.
5. Ensure ambiguous rows remain unapplied.

After applying:

```bash
make check
make clean-generated
git diff data-src review scripts
```

---

## Common mistakes to avoid

Do not:

- treat `mention_type=result` as confirmed
- overwrite known results with weaker candidates
- create duplicate bouts
- create duplicate fighters
- convert unknown to known without source support
- forget to update `matchup` when adding fighter A/B
- commit generated JSON
