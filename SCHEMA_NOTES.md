# Unofficial ARAKAKU Database CSV Schema Notes

## Principle

Protect facts, not accidental structure.

The canonical facts live in `data-src/*.csv`. File names, column names, IDs, generated JSON, frontend code, tests, and documentation may change when a cleaner structure protects the facts better.

Do not invent missing facts. Do not silently drop rows. Missing or contradictory data must be represented explicitly or reported.

## 1. Current CSV Structure

Current canonical source tables:

- `promotions.csv`: promotion entities and rule fields.
- `events.csv`: event entities.
- `bouts.csv`: bout entities and bout-level result fields.
- `bout_participants.csv`: two participant rows per bout.
- `fighters.csv`: fighter entities.
- `numbers_fighters.csv`: fighter profile rows extracted from `data-raw/アラカク選手名鑑.numbers`.
- `numbers_name_matches.csv`: inferred links between Numbers fighter rows and canonical fighter IDs.
- `numbers_fight_records.csv`: personal fight-record rows extracted from the Numbers "個人成績" sheet.
- `fighter_snapshots.csv`: event/article-specific fighter profile facts.
- `titles.csv`: title entities.
- `title_reigns.csv`: title reign lineage rows.
- `articles.csv`: article/source metadata.
- `videos.csv`: video metadata.
- `archives/youtube.csv`: archived metadata extracted from cached YouTube info JSON.
- `archives/note.csv`: archived metadata extracted from cached note HTML.
- `official_players.csv`: player profiles extracted from `tmp/arakaku-site/data/players.json` (official site).
- `official_tournaments.csv`: tournament results extracted from `tmp/arakaku-site/data/tournaments.json`.
- `official_matches.csv`: match records extracted from `tmp/arakaku-site/data/matches.json`.
- `official_history.csv`: flattened history entries from `tmp/arakaku-site/data/history.json`.
- `article_links.csv`: article-to-entity relationships.
- `video_links.csv`: video-to-entity relationships.
- `aliases.csv`: alias-to-canonical entity mappings.
- `source_documents.csv`: cached/extracted source text.
- `source_mentions.csv`: candidate mentions extracted from source text.

Numbers-derived helper tables:

- `numbers_fighters.csv` is generated from the Numbers "全体" sheet.
- `numbers_name_matches.csv` stores exact-name matches and generated candidate IDs separately from the raw profile rows.
- `numbers_fight_records.csv` is generated from the Numbers "個人成績" sheet.

These tables should not force immediate changes to the canonical relational tables. They exist to make client-side comparison, matching, and review easier.

The static viewer now uses these tables for **Rich Data Supplementation**: if a canonical fighter or bout has `unknown` fields, or if human-verified Numbers data exists, the viewer's `DataRepository` automatically merges and prioritizes it. **Apple Numbers data is treated as having absolute precedence** because it is human-verified and manually curated.

Key policies for Rich Data:
- **Client-Side Synthesis**: All merging and supplementation happen at runtime in the browser via `DataRepository`. The static build process (`scripts/build_json.py`) remains strictly factual and does not merge Numbers data into the canonical JSON.
- **Numbers Precedence**: When a conflict exists between canonical CSV data and Numbers data, the Numbers data **unconditionally overwrites** the canonical fields.
- **Fighter Enrichment**: Profiles are supplemented with Numbers-provided stats, achievements (👑 crowns, 🏆 trophies), and exact profile metrics (height, age, gym).
- **Bout Enrichment**: Results (winner, loser, method), divisions, and bout formats are recalculated or overwritten based on Numbers records.
- **Verification Status**: Bouts matched with Numbers data are automatically marked as `numbers_verified` in the viewer.

Archive helper tables:

- `archives/youtube.csv` is generated from `tmp/youtube-info/*.info.json`.
- `archives/note.csv` is generated from `tmp/note-html/*.html`.

Archive rows preserve external metadata that may be useful after cache files are deleted or remote pages change. They are source CSVs for generated JSON, but they are not confirmed fight facts and should not directly set winners, participants, methods, or title lineage.

## 2. Problems In The Previous CSV Design

The previous design mixed canonical facts with accidental rendering helpers:

- `bouts.csv` embedded fighter A/B columns, `matchup`, winner/loser display names, and bout facts in one wide row.
- `titles.csv` represented title reign rows while using `title_id` as if it were the primary key, so the real key was implicit `(title_id, order)`.
- `events.source_video_ids`, `fighters.source_article_ids`, `fighters.inferred_from_video_ids`, `promotions.source_article_ids`, and `videos.source_article_ids` stored many-to-many relationships as comma lists.
- `source_article_id` fields appeared in several entity tables instead of one explicit article relationship table.
- Generated JSON duplicated old shapes because the frontend expected them, making source schema issues harder to validate.

## 3. Facts To Preserve

The migration preserved:

- 7 promotion rows.
- 54 event rows.
- 270 bout rows.
- 540 bout participant facts derived from the two participant columns in the old bout rows.
- 146 fighter rows.
- 10 fighter snapshot rows.
- 16 title entities derived from old `title_id` groups.
- 68 title reign rows from old title lineage rows.
- 122 article rows.
- 360 video rows.
- 49 alias rows.
- 244 article relationship rows migrated from old source article fields.
- 1076 video relationship rows, including old `video_links.csv`, old `events.source_video_ids`, and old `fighters.inferred_from_video_ids`.
- 479 source document rows and 1794 source mention rows.

These are the counts at migration time. Tables that are regenerated by the
later pipeline have since changed (e.g. `aliases` grew via Numbers matching,
`article_links` via `generate_article_links.py`); count the live CSVs for
current numbers.

## 4. Accidental Structure That Was Changed

The migration intentionally removed these accidental structures:

- Bout participant fields from `bouts.csv`: `fighter_a_id`, `fighter_a`, `fighter_a_corner`, `fighter_b_id`, `fighter_b`, `fighter_b_corner`.
- Bout rendering/result helper fields from `bouts.csv`: `matchup`, `winner_id`, `winner`, `loser_id`, `loser`.
- Comma-list relationship fields from entity tables.
- Reign rows from `titles.csv`.
- Table-local `source_article_id` fields where an explicit article link is clearer.

Viewer-compatible JSON still exposes convenient derived fields such as bout `matchup`, `fighters`, `winner`, `loser`, and event `source_video_ids`.

## 5. New Ideal CSV Design

The source model is relational-style:

- Entity tables contain one row per entity.
- Relationship tables contain one row per relationship.
- Derived labels are generated, not stored as source facts.
- Unknown results remain explicit via `result_status=unknown` and participant `result=unknown`.
- Automatically extracted mentions remain in `source_mentions.csv` or `review/*.csv` unless confirmed.
- **Sorting Policy**: Canonical CSV files (`data-src/*.csv`) are sorted in **Ascending** order (oldest to newest). The viewer's `DataRepository` dynamically reverses these collections to display them in **Descending** order (newest to oldest) for the user.

Numbers-derived data follows a lighter rule: preserve the source row meaning first, then let the static viewer supplement and merge it with the canonical tables at runtime.
 The build process (`scripts/build_json.py`) remains strictly factual and does not merge Numbers data into the canonical JSON. The viewer's `DataRepository` dynamically discovers Numbers-only (and official-only) entities and uses `DataEnricher.enrichFighter` / `enrichBout` to provide a complete view (including stats, achievements, and results) without requiring manual updates to the canonical CSVs for every small detail.

Recommended Numbers split:

- `numbers_fighters.csv`: one row per fighter from the Numbers "全体" sheet.
- `numbers_name_matches.csv`: one row per Numbers fighter, storing exact matches or generated candidate IDs.
- `numbers_fight_records.csv`: one row per personal fight record from the Numbers "個人成績" sheet.

Avoid directly generating `bouts.csv` or `bout_participants.csv` from the Numbers "個人成績" sheet. That sheet is a personal-record view: the same bout can appear once per fighter, some rows may be one-sided, and contradictory result marks must be surfaced rather than silently resolved.

## 6. Primary Keys And Foreign Keys

Primary keys:

- `promotions.promotion_id`
- `events.event_id`
- `bouts.bout_id`
- `bout_participants.participant_id`
- `fighters.fighter_id`
- `fighter_snapshots.snapshot_id`
- `titles.title_id`
- `title_reigns.reign_id`
- `articles.article_id`
- `videos.video_id`
- `article_links.link_id`
- `source_documents.source_id`
- `source_mentions.mention_id`

Important foreign keys:

- `events.promotion_id -> promotions.promotion_id`
- `bouts.event_id -> events.event_id`
- `bouts.promotion_id -> promotions.promotion_id`
- `bouts.title_id -> titles.title_id`
- `bout_participants.bout_id -> bouts.bout_id`
- `bout_participants.fighter_id -> fighters.fighter_id`
- `fighters.main_promotion_id -> promotions.promotion_id`
- `fighter_snapshots.fighter_id -> fighters.fighter_id`
- `fighter_snapshots.event_id -> events.event_id`
- `title_reigns.title_id -> titles.title_id`
- `title_reigns.fighter_id -> fighters.fighter_id`
- `title_reigns.won_at_event_id/lost_at_event_id -> events.event_id`
- `title_reigns.source_article_id -> articles.article_id`
- `title_reigns.source_video_id -> videos.video_id`
- `article_links.article_id -> articles.article_id`
- `video_links.video_id -> videos.video_id`
- `source_mentions.source_id -> source_documents.source_id`

`article_links.entity_type/entity_id` and `video_links.entity_type/entity_id` are polymorphic relationships validated against allowed entity tables.

Numbers-derived tables may contain inferred or best-effort references such as `matched_fighter_id` and `candidate_fighter_id`, but those references are review aids rather than canonical confirmation. `numbers_name_matches.csv` must keep the matching method and confidence explicit.

## 7. Old To New Migration

Old-to-new table mapping:

- `bouts.csv` remained bout-level facts.
- Old bout fighter columns became `bout_participants.csv`.
- Old bout `winner_*` and `loser_*` became participant `result`.
- Old bout `matchup` became generated JSON only.
- Old `titles.csv` became `titles.csv` plus `title_reigns.csv`.
- Old source article columns and lists became `article_links.csv`.
- Old `events.source_video_ids` and `fighters.inferred_from_video_ids` became `video_links.csv` rows.

Migration was performed by `scripts/migrate_csv_schema.py` (a one-shot script, since removed; see git history).

Rows requiring manual review: none from the structural migration. The migration did not confirm new winners, methods, dates, fighters, events, titles, articles, or videos.

Known caveat: `source_documents.csv` contains embedded newlines in `content_text`, so shell `wc -l` is not a row count for that table.

## 8. Generated JSON Structure

Generated JSON is deterministic. `make build` runs four build scripts:
`build_json.py` (core/relational tables), `build_numbers_json.py` (the
`numbers_*` tables), `build_official_json.py` (the `official_players/
tournaments/matches/history` tables), and `build_official_pages_json.py`
(`official_news` / `official_pages`, with images embedded as base64).
JSON is emitted per table only; the all-in-one `database.json` snapshot was retired because the viewer never fetched it.

Viewer-compatible generated files:

- `metadata.json`
- `articles.json`
- `article_links.json`
- `promotions.json`
- `events.json`
- `bouts.json`
- `bout_participants.json`
- `fighters.json`
- `titles.json`
- `title_reigns.json`
- `fighter_snapshots.json`
- `videos.json`
- `video_links.json`
- `aliases.json`
- `source_documents.json`
- `source_document_bodies.json`
- `source_mentions.json`
- `numbers_fighters.json`
- `numbers_name_matches.json`
- `numbers_fight_records.json`
- `youtube_archives.json`
- `note_archives.json`
- `official_players.json`
- `official_tournaments.json`
- `official_matches.json`
- `official_history.json`
- `official_pages.json`
- `official_news.json`
- source reference candidate JSON from `review/*.csv`

The `DataRepository` in the viewer automatically merges `numbers_fighters.json` and `numbers_fight_records.json` into the objects returned by the `fighters` and `bouts` accessors at runtime. This ensures that canonical JSON files stay lean and strictly factual while the viewer provides a rich, supplemented experience.

The frontend loads the smaller per-view JSON files; consumers who need the full dataset should read the per-table JSON files (or the CSVs in `data-src/`) directly.

## 9. Frontend Structure

The viewer remains a static GitHub Pages app under `docs/`.

Current structure:

- `docs/index.html`
- `docs/assets/js/config.js`
- `docs/assets/js/data-loader.js`
- `docs/assets/js/core/`
- `docs/assets/js/services/`
- `docs/assets/js/tabs/`
- `docs/assets/js/ui/`
- `docs/assets/style.css`

`config.js` now includes the normalized JSON files. Existing tabs continue to render derived per-view data so the UI remains stable while the source model improves.

## 10. Recommended Implementation Order

For future schema changes:

1. Inspect `data-src/*.csv` and count source rows with CSV parsing, not line counts.
2. Identify facts vs generated/display helpers.
3. Add or update a migration script.
4. Run the migration.
5. Update `scripts/build_json.py`.
6. Update `scripts/validate_json.py` and `scripts/validate_json.js`.
7. Update frontend loaders/renderers only as needed.
8. Update tests and README/schema notes.
9. Run `make check`.
10. Run `make clean-generated` before finishing unless generated JSON is intentionally being inspected locally.
