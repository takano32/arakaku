# Unofficial ARAKAKU Database Project Chronicle

This file tracks the evolution of the Unofficial ARAKAKU Database project based on its commit history.

## Project Timeline

### Phase 1: Foundations (2026-05-21)
- **Bootstrap:** Initial setup of the CSV-backed database, GitHub Pages viewer, and build/validation pipeline.
- **Core Navigation:** Added title lineage and core viewer navigation.
- **Video Catalog:** Introduced video metadata and a dedicated videos tab.
- **Data Expansion:** Expanded initial CSV data and added YouTube description candidates for review.

### Phase 2: Extraction & Review Workflows (2026-05-21)
- **Result Candidates:** Added scripts to extract and review note result candidates.
- **Structured Results:** Implemented a workflow for structured note results and result patches.
- **Entity Linking:** Improved links between bouts, fighters, and events in the viewer.
- **Source Documents:** Imported source documents (note articles) and added a source view.
- **CI/CD:** Established GitHub Actions for automated testing and Pages deployment.

### Phase 3: Source Intelligence (2026-05-21)
- **Source Mentions:** Added source mentions data and a corresponding viewer tab.
- **Handoff Documentation:** Created `AGENTS.md`, `HANDOFF.md`, and initial Codex/agent instructions.
- **Contextual Viewer:** Showed related source context and document-grouped candidates in the viewer.
- **Viewer Refactoring:** Split the monolithic viewer app script into modular files (`app-config.js`, `app-core.js`, etc.).
- **Reference Candidates:** Automated the generation of source reference candidates.

### Phase 4: Refinement & UI/UX (2026-05-22)
- **Database Maturation:** Built a comprehensive source document database and cleaned up duplicate bouts.
- **Typography & Aesthetics:** Set consistent viewer typography and added a GitHub ribbon.
- **Card Details:** Enhanced viewer cards to show more detailed metadata and relationships.
- **Detail Toggles:** Implemented folding detail toggles for note articles, YouTube descriptions, and source candidates.
- **Localization:** Adopted `スーパーうんどう` naming and used kana video titles.
- **History Documentation:** Formalized project history and handoff documentation (this file and others).

### Phase 5: Relational Data And Numbers Import (2026-05-25)
- **Relational Schema:** Migrated bouts, participants, titles, reigns, and article/video relationships into clearer relational-style CSVs.
- **Numbers Import:** Added a three-way export for `アラカク選手名鑑.numbers`: `numbers_fighters.csv`, `numbers_name_matches.csv`, and `numbers_fight_records.csv`.
- **Numbers Skills:** Added dedicated agent instructions for maintaining the Numbers pipeline and updated related skills and handoff documents.

### Phase 6: Archive Metadata Stabilization (2026-05-25)
- **Cache Metadata Archives:** Added `data-src/archives/youtube.csv` and `data-src/archives/note.csv` as committed metadata archives generated from local YouTube info JSON and note HTML caches.
- **Deterministic Archive Generation:** Updated `archive_metadata.py` to use stable headers, stable sorting, standard-library HTML parsing, and existing `archived_at` preservation.
- **HTML Entity Decoding:** Refined metadata extraction to decode HTML entities (e.g., `&nbsp;`) for cleaner display and search.
- **Archive JSON Integration:** Generated and validated `youtube_archives.json` and `note_archives.json`.
- **Viewer Enrichment:** Connected archive metadata to viewer video/article labels and global search without treating archive rows as confirmed fight facts.

### Phase 7: Rich Data Supplementation & Runtime Merging (2026-05-25)
- **Automated Data Supplementation:** Updated `DataRepository` to automatically fill missing or `unknown` fighter profiles and bout results using the Numbers dataset.
- **Maximized Numbers Utilization:** Expanded the enrichment to include aggregate fight stats (wins, losses), achievement markers (crowns/trophies), and detailed bout metadata (division, format).
- **Client-Side Runtime Merging:** Refactored the architecture to ensure a "clean build." JSON generation now strictly reflects canonical CSV facts, while the viewer's `DataRepository` dynamically discovers and merges Numbers-only entities and supplements information at runtime.
- **Numbers Data Absolute Precedence:** Established a policy where human-verified Apple Numbers data unconditionally overwrites canonical CSV data (including results, divisions, and profiles) when a match exists, treating it as the ultimate source of truth for the viewer.
- **Numbers Verification Badges:** Added "名鑑確認済み" (Verified by Directory) badges and specialized stats blocks to the viewer to indicate data supplemented or verified by the Apple Numbers dataset.
- **Enriched Caching:** Implemented internal repository caching for rich objects to maintain performance and consistency during client-side processing.

### Phase 8: Virtual Scrolling & Streaming Data Loading (2026-05-28)
- **Virtual Scrolling:** Replaced full-DOM tab rendering with window-scroll virtual lists using `@tanstack/virtual-core@3` (CDN). Off-screen rows are unmounted, allowing large datasets to render smoothly without memory pressure.
- **SAX Streaming JSON Parse:** Introduced `@streamparser/json` (CDN) for Phase 1 parallel streaming. Each of the 13 PRIMARY data files streams in independently; batches of 30 items (or every 50ms) trigger incremental UI updates so data appears progressively as it downloads.
- **Two-Phase Data Loading:** Separated data keys into `PRIMARY_DATA_KEYS` (13 display-critical files, streamed) and `ENRICHMENT_DATA_KEYS` (8 enrichment files, loaded normally). Phase 1 gives users immediately usable data; Phase 2 enriches it silently in the background.
- **Tab Descriptor Pattern:** Refactored `TabRenderers` to return `{ items, renderItem, estimateSize }` descriptors instead of HTML strings, decoupling list data from rendering infrastructure.
- **Smart Re-render Detection:** `TabRendererRegistry` skips re-renders when `DataRepository` reference and filter fingerprint are both unchanged, preventing redundant paints during streaming.
- **Bug Fixes — extendItems Safety:** Discovered that `extendItems` (which reuses cached row DOM by index) is unsafe for `.reverse()` arrays because each streaming batch reshuffles every existing index. Also fixed a case where clearing a search filter (increasing item count) would incorrectly take the `extendItems` path. Fixed by removing `extendItems` from `TabRendererRegistry` entirely — all updates now go through `refreshItems`.
- **Bug Fixes — loadedDataKeys Consistency:** Fixed `#streamKey` fetch/HTTP error paths that left keys absent from `loadedDataKeys` indefinitely. Fixed `load()` not awaiting `#loadEnrichment()`, which caused the CI validator to fail on `metadata`.

### Phase 9: Client-Side Caching, CDN Libraries & Data Quality (2026-05-28)
- **Service Worker + Stale-While-Revalidate:** Added `docs/sw.js` intercepting all `/data/*.json` fetches. Cached responses are served immediately on repeat visits; background revalidation uses `ETag`/`If-None-Match` conditional GET. When new data is detected, all open windows receive a `DATA_UPDATED` message and a fixed reload banner (`update-banner`) is shown once.
- **Lazy YouTube Embedding:** Replaced `<iframe>` embeds with `lite-youtube-embed` web component (CDN, Paul Irish, v0.3.4, Nov 2025). Shows thumbnail + play button with zero YouTube JavaScript until the user clicks. CSS inlined into `style.css` to avoid an extra network round-trip.
- **CDN Library Policy Formalized:** Each CDN dependency must have a recent release (within ~12 months) and address a genuinely complex problem. Current set: `@tanstack/virtual-core@3` (virtual scrolling), `@streamparser/json` (SAX streaming), `lite-youtube-embed` (video facade). Surveyed alternatives for all three; none were superior.
- **source_documents Split:** Split `source_documents.json` into a lightweight index (preview + metadata) and a separate `source_document_bodies.json` (full text, lazy-loaded only when the 出典本文 tab is opened). Reduces initial payload for the common case.
- **Note Article Structured Result Extraction:** Rewrote `extract_note_structured_results.py` to parse ○●🆚 result notation from cached note article text. Fixed `make_structured_result_patch_candidates.py` to join with `bout_participants.csv` for correct name matching. Fixed `apply_structured_result_patches.py` to use side-based matching. Applied 88 high-confidence patches, reducing `result_status=unknown` from 265 to 177.
- **Bug Fixes:**
  - Virtual-list ghost element on first tab open: `refreshItems()` cleared `#rowEls` map but not DOM. Fixed by adding `this.#el.innerHTML = ""`.
  - `record-details dd` values rendering in muted gray: global `dd { color: var(--muted) }` bleeding in. Fixed with explicit `color: var(--ink)` on `.record-details dd`.
  - Bout result 決まり手 text in fighter cards too faint: `renderBoutResultMeta` was incorrectly using `<p class="meta">`. Fixed by removing the class.

## Key Architectural Decisions
- **Static First:** Chose a static site architecture (CSV -> JSON -> GitHub Pages) for low maintenance and high availability.
- **Human-in-the-loop:** Decided to use `review/` CSVs for all automated extractions to ensure high data quality.
- **Context-Rich Viewer:** Focused on showing source context directly in the viewer to aid data verification.
- **Clean Build, Rich Client:** Decided to keep the build process (CSV to JSON) strictly factual and perform all data supplementation, cross-referencing, and Numbers-data merging on the client side at runtime.
- **Numbers Data as Absolute Truth:** Decided to treat human-curated Apple Numbers data as the absolute source of truth for the viewer, allowing it to unconditionally overwrite canonical CSV data when matches are confirmed.
- **Archives as External Metadata:** Treats archive CSVs as committed source metadata for display and review. Archive rows can enrich labels/search but do not confirm winners, fighter identities, methods, or title lineage.
- **Service Worker as Transparent Cache Layer:** GitHub Pages does not support custom `Cache-Control` headers, so a Service Worker was chosen to implement stale-while-revalidate for JSON data files. Clients always get a fast cached response; the SW revalidates in the background and notifies clients when data changes without blocking the page.
- **CDN Libraries with Quality Gate:** CDN dependencies are adopted only when actively maintained (recent release within ~12 months) and addressing a genuinely complex problem. Preference for high-star-count, widely-used libraries. Rejected mark.js (unmaintained since 2022). Surveyed and confirmed no better alternatives for the three adopted libraries.
