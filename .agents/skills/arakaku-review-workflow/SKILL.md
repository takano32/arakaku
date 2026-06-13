---
name: arakaku-review-workflow
description: Use this skill when generating, inspecting, or applying review CSVs, especially result candidates, source mention candidates, structured result patches, or inferred bouts/events/fighters.
---

# Unofficial ARAKAKU Database Review Workflow Skill

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
review/note_structured_results.csv
review/structured_result_patch_candidates.csv
review/youtube_description_candidates.csv
review/source_mention_result_candidates.csv
review/source_event_reference_candidates.csv
review/source_bout_reference_candidates.csv
review/source_video_reference_candidates.csv
```

Note: `source_*_reference_candidates.csv` are also direct build inputs for
`docs/data/source_*_references.json`, so regenerate them only via
`make source-reference-candidates` and review the diff before committing.

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
- Numbers personal fight record alone
- vague description
- ambiguous fighter names
- candidate mention without context

Confirmed result data must be supported by source context.

---

## Numbers-derived review

Numbers-derived records come from:

```text
data-src/numbers_fight_records.csv
```

They are comparison inputs, not confirmed canonical results.

Before promoting any Numbers-derived fight record into canonical CSVs:

1. Pair reciprocal personal fight rows when possible.
2. Keep one-sided records flagged for review.
3. Flag contradictory result marks.
4. Verify `numbers_name_matches.csv` identity matches.
5. Match `promotion_id + event_number_normalized` to a canonical event candidate.
6. Apply only reviewed facts to `bouts.csv` and `bout_participants.csv`.

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
- add a bout without adding the two `bout_participants.csv` rows
- commit generated JSON
