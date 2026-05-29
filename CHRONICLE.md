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

### Phase 11: Admin View Expansion, Official Docs Tab & Safari Bug Fix (2026-05-29)
- **Admin View — 5 New Tabs:** Added five tabs to the admin view: 名鑑選手 (numbers fighter profiles), 名前対応 (name-matching table with confidence), 名鑑記録 (fight records + bout correspondence), 公式選手 (official player data), and 公式 / `officialMisc` (official tournaments + matches + history combined with type badges). The `officialMisc` ID was chosen to avoid a future naming collision when a `official` tab is added to the public view.
- **Safari replaceState Rate-Limit Fix:** `url-sync.js` was calling `history.replaceState()` on every `state.patch()` including streaming data-load batches (every 30 items / 50ms). Safari enforces a 100-call-per-10-second limit, causing a console error on iOS. Fixed by caching the last-written search string (`_lastSearch`) and skipping `replaceState` when the URL would be identical — data-load patches never change URL-relevant state.
- **Official Document CSV/JSON Pipeline:** Added `scripts/generate_official_pages_csv.py` (stage-2) to convert `content/news/*.md` → `official_news.csv` and `pages/about.astro` + `pages/history.astro` → `official_pages.csv` (Astro-specific syntax stripped: Tailwind classes, frontmatter, JSX `.map()` expressions expanded to static HTML, `{base}` interpolations replaced). Added `scripts/build_official_pages_json.py` (`make build-official`) to produce `official_news.json` and `official_pages.json`, with images from `public/` embedded as base64 data URIs. Extended `download_official_data.sh` to also fetch the `public/` directory.
- **Public View — 公式 Tab:** Added `["official", "公式"]` as the leftmost tab in `PUBLIC_TABS`. Content is `official_pages` (about/history, clean HTML) and `official_news` (Markdown articles) loaded on demand via `TAB_DATA_KEYS`. Markdown rendering uses `marked` (esm.sh CDN) via module-level dynamic import with `.catch(() => {})` so the module remains importable in Node.js (used by `validate_json.js`). Keyboard shortcut hint updated from `1〜6` to `1〜7`. Decision to defer splitting into 「公式ページ」/「公式ニュース」tabs recorded in `NEXT_TASKS.md`.

## Key Architectural Decisions
- **Static First:** Chose a static site architecture (CSV -> JSON -> GitHub Pages) for low maintenance and high availability.
- **Human-in-the-loop:** Decided to use `review/` CSVs for all automated extractions to ensure high data quality.
- **Context-Rich Viewer:** Focused on showing source context directly in the viewer to aid data verification.
- **Clean Build, Rich Client:** Decided to keep the build process (CSV to JSON) strictly factual and perform all data supplementation, cross-referencing, and Numbers-data merging on the client side at runtime.
- **Numbers Data as Absolute Truth:** Decided to treat human-curated Apple Numbers data as the absolute source of truth for the viewer, allowing it to unconditionally overwrite canonical CSV data when matches are confirmed.
- **Archives as External Metadata:** Treats archive CSVs as committed source metadata for display and review. Archive rows can enrich labels/search but do not confirm winners, fighter identities, methods, or title lineage.
- **Service Worker as Transparent Cache Layer:** GitHub Pages does not support custom `Cache-Control` headers, so a Service Worker was chosen to implement stale-while-revalidate for JSON data files. Clients always get a fast cached response; the SW revalidates in the background and notifies clients when data changes without blocking the page.
- **CDN Libraries with Quality Gate:** CDN dependencies are adopted only when actively maintained (recent release within ~12 months) and addressing a genuinely complex problem. Preference for high-star-count, widely-used libraries. Rejected mark.js (unmaintained since 2022). Surveyed and confirmed no better alternatives for the three adopted libraries.
- **Official Data Enrichment is Client-Side Only:** Official site data from `kobayashi856/arakaku-site` is integrated as a second enrichment layer (alongside Numbers data) entirely in `data-enricher.js`. `build_json.py` is never modified for enrichment — it outputs canonical CSV facts only. This keeps the Python build pipeline decoupled from the client data model.
- **Keyboard Navigation as Core Feature:** Added vim-style keyboard navigation (j/k cursor, h/l tabs, Enter activate, etc.) with a virtual list cursor and a `?` help dialog. URL permalink sync (`url-sync.js`) allows state sharing and deep linking without server-side routing.

### Phase 10: Official Data Integration & UI Polish (2026-05-29)
- **Official Data Pipeline:** Added `scripts/download_official_data.sh` to fetch the full `src/` tree from `kobayashi856/arakaku-site` into `tmp/arakaku-site/`. `scripts/generate_official_csvs.py` converts `tmp/arakaku-site/data/*.json` into `data-src/official_players.csv`, `official_tournaments.csv`, `official_matches.csv`, `official_history.csv` as stage-1 outputs. `scripts/build_official_json.py` produces `docs/data/official_players.json` and `docs/data/official_tournaments.json` via `make build-official`.
- **Client-Side Official Enrichment:** Extended `data-enricher.js` to merge official player data (nickname, nationality, wins/losses/draws, bio) and official tournament data (champion, runner_up) into `richFighter`, `richFighterSnapshot`, `richBoutParticipant`, `richEvent`. Matching is by `display_name` (71/77 players matched). Enrichment is strictly client-side; `build_json.py` is unchanged.
- **Official & Numbers Badges:** Unified badge labels to "名鑑" (Numbers-verified) and "公式" (official site data). Added official stats block to fighter and event cards.
- **Banner Header Restored:** Restored `header.webp` banner image adapted for the light theme. Title/subtitle enlarged and separated to two lines with transparent background.
- **Compact Summary Cards:** Replaced large summary grid with inline pill-style cards.
- **Scroll Bug Fixes:** Fixed three independent scroll-to-top bugs involving `renderTabs()` DOM preservation, `VirtualList.setItems()` auto-scroll removal, and `scrollTo` placement relative to `state.patch()`.
- **Search Clear Button:** Styled `✕` button inside search input (visible when text present). Clears on Escape too.
- **URL Permalink Sync:** `docs/assets/js/core/url-sync.js` reflects app state in URL query params via `history.replaceState`. Page load restores state from URL.
- **Keyboard Navigation:** `docs/assets/js/ui/keyboard-nav.js` with vim-style shortcuts. `VirtualList` cursor management with `align: "start"`. Help dialog via native `<dialog>` element.
