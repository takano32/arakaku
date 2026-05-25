# AGENTS.md

## Prime directive

The factual data is the source of truth.

`data-src/*.csv` currently contains the authoritative facts, but the current CSV schema, file split, column names, ID conventions, generated JSON, frontend structure, tests, scripts, and documentation may all be redesigned if doing so improves consistency, maintainability, validation, or rendering as a static GitHub Pages site.

Protect facts, not accidental structure.

CSV schema migrations are allowed.

## What must be preserved

Preserve the factual information currently represented in the project data.

Unless explicitly instructed otherwise:

- Do not invent fighters, events, bouts, titles, promotions, articles, videos, URLs, dates, IDs, or historical facts.
- Do not silently drop source rows.
- Do not silently merge distinct entities.
- Do not silently rewrite factual fields.
- Do not hide malformed or inconsistent data by weakening validation.
- Do not replace real data behavior with mock-only behavior.
- Keep the project publishable as a static GitHub Pages site.
- Report ambiguous or inconsistent records instead of guessing.

The goal is to protect real facts, not to preserve old file shapes.

## What may be redesigned

The following may be changed destructively when a cleaner design is better:

- `data-src/*.csv` schemas
- CSV file split and naming
- CSV column names
- ID conventions
- `scripts/`
- `tests/`
- `docs/data/`
- Generated JSON schemas
- `docs/assets/js/`
- `docs/assets/`
- `docs/index.html`
- README and documentation
- Build commands
- Test commands
- Validation architecture
- Frontend rendering architecture
- Obsolete files
- Fragile compatibility layers

Do not preserve broken architecture merely because it already exists.

Prefer a coherent rebuild over patchwork compatibility.

## CSV schema migration policy

CSV schema migrations are allowed when the current structure is inconsistent, redundant, hard to validate, hard to extend, or hard to render.

When migrating CSV schemas:

- Preserve factual data.
- Do not invent missing facts.
- Do not silently drop rows.
- Do not silently merge distinct entities.
- Make primary keys explicit.
- Make foreign keys explicit.
- Prefer consistent ID naming.
- Prefer explicit relationship tables for many-to-many relationships.
- Preserve old IDs when they are meaningful and already referenced.
- If old IDs are bad, create and document a clear migration rule.
- Report ambiguous records instead of guessing.
- Update scripts, tests, generated JSON, frontend, and README together.
- Explain the old-to-new mapping.

The goal is not to preserve the old CSV shape.

The goal is to produce a coherent source-data model.

## Desired data model

Aim for a clear relational-style CSV model.

Prefer explicit entities such as:

- fighters
- aliases
- promotions
- events
- bouts
- titles
- title reigns
- articles
- videos
- archive metadata
- relationship/link tables

Use relationship tables when one record can relate to many other records.

Examples:

- video-to-fighter links
- video-to-event links
- video-to-bout links
- article-to-fighter links
- article-to-event links
- title-to-fighter reign history

A future maintainer should be able to answer:

- What is the primary key of this table?
- What does this row represent?
- Which columns are foreign keys?
- Which fields are required?
- Which fields are optional?
- Which generated JSON files depend on this CSV?
- Which frontend view consumes this data?

## Desired pipeline

Aim for a simple pipeline:

1. Read real CSV files from `data-src/`.
2. Normalize and validate the data explicitly.
3. Generate deterministic JSON under `docs/data/`.
4. Render the site from those JSON files.
5. Test the real data pipeline and generated output.
6. Publish as static GitHub Pages content.

Source cache metadata follows the same principle:

1. Fetch external note HTML and YouTube info JSON into `tmp/`.
2. Do not commit cache files.
3. Archive stable metadata into `data-src/archives/*.csv`.
4. Generate `youtube_archives.json` and `note_archives.json`.
5. Use archive metadata for display, search, and review only.

Archive metadata does not confirm bout winners, participants, methods, fighter identities, or title lineage.

The project should be understandable from the file structure.

## Data rules

When handling source data:

- Treat existing CSV rows as real project data.
- Preserve source facts.
- Preserve source row meaning.
- Do not silently delete rows.
- Do not silently rewrite factual fields.
- Do not fabricate missing data.
- If data is malformed, report it clearly.
- If normalization is needed, make the rule explicit.
- If IDs are inconsistent, report the inconsistency instead of hiding it.
- If a schema migration is needed, explain it.
- Prefer explicit validation errors over hidden cleanup.

If a value cannot be migrated safely, preserve it in a notes field or report it as an unresolved migration issue.

## Generated JSON rules

Generated JSON under `docs/data/` may be redesigned freely.

When redesigning JSON:

- Prefer coherent structures over preserving accidental old shapes.
- Keep output deterministic.
- Sort output when useful for stable diffs.
- Make relationships explicit.
- Avoid duplicating derived data unless useful for the frontend.
- Update frontend and tests to match the new schema.
- Remove obsolete generated files if they are no longer used.
- Make JSON easy for a static frontend to consume.

## Script rules

Scripts may be rewritten.

Prefer:

- Clear Python standard-library code
- Explicit CSV reading
- Explicit validation
- Deterministic JSON writing
- Small helper functions with obvious names
- Helpful error messages
- File name, row number, field name, and ID in validation errors when practical

Avoid:

- Hidden magic
- Mock data
- Silent cleanup
- Broad exception swallowing
- Half-supported legacy code
- Insertion-point hacks when a clean rewrite is better
- Generated output that changes order unpredictably

## Test rules

Tests should validate the intended system.

Tests may be rewritten or replaced.

Prefer tests that verify:

- Real CSV files can be read.
- Required columns exist.
- Primary keys are unique.
- Foreign keys point to existing records.
- Relationship tables are valid.
- JSON generation succeeds.
- Generated JSON has the expected top-level shape.
- Frontend-required JSON files exist.
- No generated file contains obviously broken records.
- Known inconsistent data is reported clearly.

Do not keep tests that only protect broken legacy behavior.

Do not skip important checks just to make CI green.

Do not weaken validation without explaining why.

## Frontend rules

The frontend may be rewritten.

Requirements:

- Must remain compatible with static GitHub Pages hosting.
- Must load data from `docs/data/`.
- Must not require a server-side backend.
- Must avoid heavy frameworks unless explicitly requested.
- Must be easy to debug in the browser.
- Browser console errors should be treated as real failures.

Prefer:

- Simple data loading
- Simple rendering functions
- Clear tab, search, and filter state
- Clickable filters where useful
- Defensive rendering for missing optional fields
- Explicit error display if JSON loading fails
- Plain JavaScript unless a dependency is explicitly justified

Obsolete frontend code may be deleted.

## Documentation rules

README and docs may be rewritten.

Documentation should reflect the actual project, not old intent.

Prefer practical sections:

- What this project is
- Data model
- CSV source files
- Generated JSON files
- How to build JSON
- How to run checks
- How to preview GitHub Pages locally
- Important files
- Data editing rules
- Migration notes

Do not invent features or commands.

Do not document behavior that the files do not implement.

## Working style

For each task:

1. Inspect the current repository.
2. Identify factual data, accidental structure, generated files, and obsolete files.
3. Decide what should be preserved, migrated, destroyed, or rebuilt.
4. Explain the rebuild or migration plan.
5. Make the changes.
6. Regenerate outputs.
7. Run relevant tests or checks.
8. Report what changed, what was removed, what was migrated, and what remains broken.

Large rewrites are acceptable.

CSV schema migrations are acceptable.

Partial patching is not required when a rewrite is cleaner.

## Migration reporting

When performing a CSV schema migration, report:

- Old CSV files read
- New CSV files written
- Old-to-new table mapping
- Old-to-new column mapping
- Primary keys chosen
- Foreign keys introduced
- Rows preserved
- Rows requiring manual review
- Data inconsistencies found
- Generated JSON files updated
- Frontend changes required
- Tests updated

If any source row cannot be migrated safely, do not discard it.

Preserve it, flag it, or stop and report it.

## Final safety check

Before finishing, answer these internally:

- Were all factual source records preserved?
- Were any facts invented?
- Were any rows silently lost?
- Were distinct entities accidentally merged?
- Are primary keys and foreign keys explicit?
- Are generated JSON files deterministic?
- Does the frontend still target static GitHub Pages?
- Are tests validating the intended new behavior?
- Are docs consistent with real files?
- Are remaining failures honestly reported?

If any answer is bad, stop and explain the problem.
