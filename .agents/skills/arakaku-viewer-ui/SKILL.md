---
name: arakaku-viewer-ui
description: Use this skill when editing the ARAKAKU GitHub Pages viewer, including docs/index.html, docs/assets/js/, docs/assets/style.css, tabs, search, navigation, source document display, or source mention display.
---

# Unofficial ARAKAKU Database Viewer UI Skill

Use this skill when working on the static viewer.

Viewer files:

```text
docs/index.html
docs/assets/js/main.js
docs/assets/js/config.js
docs/assets/js/core/
docs/assets/js/ui/
docs/assets/js/services/
docs/assets/js/tabs/
docs/assets/style.css
```

Viewer data is generated JSON under:

```text
docs/data/*.json
```

Do not edit generated JSON directly.

---

## Current viewer tabs

```text
試合
選手
大会
団体
王座
動画
出典本文
出典言及
```

Expected behavior:

- Fighter links open the fighter view and focus that fighter.
- Event links open the event view and focus that event.
- Event cards show related bout cards.
- Fighter cards show related bouts.
- Source document view shows note bodies and YouTube descriptions.
- Source mention view shows extracted candidates.
- Bout, event, and video cards show related source candidates where available.
- Note article links and video links can expose inline `▶ 詳細` / `▼ 詳細` disclosure controls for source text.

---

## Rendering architecture

### Tab descriptor pattern

`TabRenderers` methods return a descriptor object, not HTML strings:

```javascript
// Each tab method returns:
{
  items: [...],               // array of items to render
  renderItem: (item) => html, // function returning HTML string
  estimateSize: (i) => px,   // optional: estimated height per item (default 500px)
}
```

`TabRendererRegistry.renderTo(container, tabId)` owns the rendering lifecycle:

- Creates and manages one `VirtualList` per tab ID.
- Calls `list.setItems()` on tab change or first render.
- Calls `list.refreshItems()` on repo change or filter change.
- Detects changes via `#prevRepoRefs` (DataRepository reference equality) and `#filterFingerprint()`.
- Short-circuits with `return` when nothing changed.

Old `tabRegistry.render(tabId)` no longer exists — do not use it.

### VirtualList

`docs/assets/js/ui/virtual-list.js` uses `@tanstack/virtual-core@3` from the CDN:

```javascript
import { Virtualizer, windowScroll } from "https://esm.sh/@tanstack/virtual-core@3";
```

API:

| Method | When to use |
|--------|-------------|
| `setItems(items, renderItem, estimateSize)` | Tab change or first render. Resets scroll to top, clears row cache. |
| `refreshItems(items)` | Data or filter update. Clears row cache, re-renders visible window. Does NOT reset scroll. |
| `extendItems(items)` | Append-only item array growth only. Preserves existing cached rows. **Only safe when items at indices 0..N-1 are identical.** |

**Important:** `extendItems` is NOT safe for arrays that go through `.reverse()` (e.g., `richBouts`, `richVideos`, `events`, `richArticles`). Each streaming batch changes every index in a reversed array. `TabRendererRegistry` never calls `extendItems` — it always uses `refreshItems` for updates. Keep it that way.

Window-based scroll: the Virtualizer uses `window` as the scroll element. `scrollMargin = el.getBoundingClientRect().top + window.scrollY` tells it where the list starts on the page.

The `#painting` re-entry guard prevents recursive `onChange → #paint → measureElement → onChange` loops. `measureElement` is deferred to `requestAnimationFrame` after each paint.

---

## Data loading architecture

### Two-phase loading

`DataLoader.load()` runs two phases:

**Phase 1 — streaming (PRIMARY_DATA_KEYS):**

13 files stream in parallel via SAX parsing:

```javascript
export const PRIMARY_DATA_KEYS = [
  "bouts", "boutParticipants", "fighters", "events", "promotions",
  "videos", "titles", "titleReigns", "videoLinks", "aliases",
  "fighterSnapshots", "articles", "articleLinks",
];
```

Each file streams with `@streamparser/json` from the CDN:

```javascript
import("https://esm.sh/@streamparser/json").then((m) => m.JSONParser)
```

Intermediate batches (every 30 items or 50ms) call `state.patch({})`, triggering incremental renders. When Phase 1 completes, a final `state.patch({})` is issued.

**Phase 2 — enrichment (ENRICHMENT_DATA_KEYS):**

8 files load normally (not streaming) and then all applied at once:

```javascript
export const ENRICHMENT_DATA_KEYS = [
  "metadata",
  "numbersFighters", "numbersNameMatches", "numbersFightRecords",
  "youtubeArchives", "noteArchives",
  "sourceDocuments", "sourceMentions",
];
```

Phase 2 is `await`ed inside `load()`. When done, a new `DataRepository` is created and `state.patch({})` is called, triggering re-render with enriched data.

`CORE_DATA_KEYS = [...PRIMARY_DATA_KEYS, ...ENRICHMENT_DATA_KEYS]` — all keys that `load()` guarantees are in `loadedDataKeys` after it resolves.

### DataRepository creation

A new `DataRepository(state.data)` is created:
- After each SAX batch flush (mid-streaming)
- After Phase 1 completes
- After Phase 2 completes

`TabRendererRegistry` detects the new instance via reference inequality (`repoRef !== prevRepoRef`) and calls `refreshItems`.

### Error handling

If `fetch()` throws or returns a non-OK status, `#streamKey` sets `fallbackForDataKey(key)` and marks the key in both `loadedDataKeys` and `dataLoadErrors`. A failed key is settled (not stuck in pending state).

If enrichment parse fails entirely (`parseDataFileEntries` throws), `#loadEnrichment` logs the error and returns without adding enrichment keys to `loadedDataKeys`.

---

## Filter fingerprint

`TabRendererRegistry` detects filter changes via:

```javascript
[s.query, s.focusFighterId, s.focusEventId, s.titlePromotion, s.titleDivision, s.mentionType].join("\0")
```

Any change in these fields triggers `refreshItems` on the current tab. New filter state fields must be added here.

---

## Key viewer JS concepts

Important state fields:

```text
state.tab
state.query
state.focusFighterId
state.focusEventId
state.titlePromotion
state.titleDivision
state.mentionType
state.data
state.repository          ← DataRepository instance (replaced on each load batch)
state.loadedDataKeys      ← Set<string> of settled keys (loaded or failed)
state.loadingDataKeys     ← Set<string> of in-flight keys (via loadKeys only)
state.dataLoadErrors      ← {[key]: errorMessage} for failed keys
```

Important data keys:

```text
sourceDocuments
sourceMentions
youtubeArchives
noteArchives
numbersFighters
numbersNameMatches
numbersFightRecords
videos
videoLinks
bouts
boutParticipants
fighters
events
titles
titleReigns
fighterSnapshots
aliases
articles
articleLinks
metadata
```

When adding a new JSON data file, update `DATA_FILES` in `config.js` and add the key to either `PRIMARY_DATA_KEYS` or `ENRICHMENT_DATA_KEYS`.

When adding a new tab:

1. Add it to `docs/assets/js/config.js` (`TABS`).
2. Add a method on `TabRenderers` in `docs/assets/js/tabs/tab-renderers.js` that returns `{ items, renderItem, estimateSize? }`.
3. Register it in `TabRendererRegistry` (`docs/assets/js/tabs/tab-registry.js`).
4. Add required data keys to `TAB_DATA_KEYS` in `data-loader.js` if the tab needs keys outside of CORE.
5. Confirm search behavior.
6. Confirm tab click behavior.

---

## CDN dependencies

The viewer loads two external libraries at runtime from `https://esm.sh/`:

| Library | Import | Used in |
|---------|--------|---------|
| `@tanstack/virtual-core@3` | `Virtualizer`, `windowScroll` | `ui/virtual-list.js` |
| `@streamparser/json` | `JSONParser` | `data-loader.js` (Phase 1 streaming) |

Both imports are cached after first load (module import cache and `jsonParserImportPromise` respectively).

If `@streamparser/json` fails to load (e.g., offline, CDN unreachable), `#streamKey` throws, the outer `.catch()` in `load()` sets fallback data, and the tab renders empty arrays. Phase 2 enrichment is unaffected (it uses `fetchText`, not streaming).

---

## Search behavior

Global search uses `state.query`.

When the user types in search:

- clear `focusFighterId`
- clear `focusEventId`
- re-render content

Do not leave stale focus state active after manual search.

---

## Navigation behavior

Fighter links should:

- set `state.tab = "fighters"`
- set `state.focusFighterId`
- clear `state.focusEventId`
- update search box with fighter name
- re-render

Event links should:

- set `state.tab = "events"`
- set `state.focusEventId`
- clear `state.focusFighterId`
- update search box with event name
- re-render

---

## Source views

`出典本文` uses:

```text
sourceDocuments
```

`出典言及` uses:

```text
sourceMentions
```

Remember:

- `source_mentions` are candidates, not confirmed facts.
- Labels should say candidate or mention when appropriate.
- Do not present extracted result mentions as confirmed bout results.
- Inline detail disclosures can show note本文 or YouTube概要欄, but they do not make a candidate result confirmed.

---

## Archive metadata

Archive metadata uses:

```text
youtubeArchives
noteArchives
```

These JSON files are generated from:

```text
data-src/archives/youtube.csv
data-src/archives/note.csv
```

Viewer code may use archive rows to enrich labels, dates, descriptions, and search text for videos and articles. Archive rows are external metadata only; do not present them as confirmation of bout results, fighter identity, or title lineage.

---

## Numbers Rich Integration

Numbers-derived data uses:

```text
numbersFighters
numbersNameMatches
numbersFightRecords
```

The viewer's `DataRepository` automatically merges these into `fighters` and `bouts` objects via `getRichFighterInfo` and `getRichBoutInfo` at runtime:

- Discover fighters that only exist in Numbers matches.
- Fill `unknown` fighter profiles (height, age, gym, summary) from Numbers.
- Display a **Numbers Stats Block** in fighter cards: total fights, wins, losses, and win rate.
- Display **Achievement Markers**: crowns (👑) for belts and trophies (🏆) for tournament wins.
- Resolve `unknown` bout results, divisions, and formats by matching Numbers personal fight records.
- Display "名鑑確認済み" (Verified by Directory) badges when supplementation or verification occurs.

When rendering Numbers-specific comparison UI (if any):

- show raw Numbers values separately from canonical values
- surface unmatched names and generated candidate IDs clearly
- flag contradictory win/loss marks
- do not present Numbers-derived bout records as confirmed canonical bouts in the CSV sources

---

## CSS rules

Prefer small, reusable classes.

Existing important classes include:

```text
card
video-badge
source-card
source-body
source-mention-card
related-bout-grid
related-bout-card
link-button
virtual-list        ← position: relative; required for absolute-positioned rows
```

The `.virtual-list` container must have `position: relative` for the absolute-positioned row divs inside it to work correctly. Its `height` is set dynamically by `VirtualList` to match the Virtualizer's `getTotalSize()`.

Avoid huge layout rewrites unless requested.

---

## Required checks

After viewer changes:

```bash
make check
make clean-generated
```

After push, verify Pages:

```text
https://takano32.github.io/arakaku/
```

Check browser console for viewer JS errors. Errors in `VirtualList.#paint` are caught and rendered as visible error cards, but CDN import failures may appear in the console.
