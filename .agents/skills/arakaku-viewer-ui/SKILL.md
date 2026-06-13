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

PUBLIC_TABS (通常ビュー, keyboard shortcuts 1–8):

```text
1: 公式   (official)  ← official_pages (about/history, collapsed <details>) + official_news (Markdown)
2: 通信   (tsushin)   ← note_article source documents (120 articles)
3: 試合   (bouts)
4: 選手   (fighters)
5: 大会   (events)
6: 団体   (promotions)
7: 王座   (titles)
8: 動画   (videos)
```

ADMIN_TABS (管理ビュー, toggled via 管理ビュー button):

```text
出典本文 (sources)
出典言及 (mentions)
名鑑選手 (numbersFighters)
名前対応 (numbersNameMatches)
名鑑記録 (numbersFightRecords)
公式選手 (officialPlayers)
公式     (officialMisc)  ← official_tournaments + official_matches + official_history, type-badged
```

The view-mode switch remembers the last active tab in each view (`#prevPublicTab`, `#prevAdminTab` in `EventController`), and restores it when switching back.

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
- Detects changes via `#prevRepoRefs` (which stores the per-tab `repo.revision`
  stamp, NOT a reference — the repository is a singleton) and `#filterFingerprint()`.
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

### Phased loading

`DataLoader.load()` runs three phases:

**Phase 0 — initial tab (INITIAL_TAB_DATA_KEYS):**

The default tab is `official`, so its data loads first, alone, before anything
else competes for bandwidth:

```javascript
export const INITIAL_TAB_DATA_KEYS = ["officialPages", "officialNews"];
```

These two files total ~16KB, so Phase 0 uses plain `loadKeys()` (fetch +
`JSON.parse`) instead of streaming — it must not wait for the
`@streamparser/json` CDN import. `load()` fires `getJSONParser().catch(() => {})`
without awaiting it at the start of Phase 0 so the CDN import warms up in
parallel (the `.catch` prevents an unhandled rejection during the Phase 0
window). When Phase 0 resolves, the official tab renders; Phase 1 then starts.

`loadKeys()` failure semantics match `#streamKey`: a per-key fetch/HTTP error
records `dataLoadErrors[key]` (shown in the 「データ読み込み失敗」 card), assigns
the fallback value, and still marks the key loaded. `fetchJsonText` throws on
non-OK responses — never silently swallow an HTTP error into fallback data.

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

Each streaming flush calls `repository.invalidate()` then `state.patch({})`, triggering incremental renders. The first flush of each key is immediate; subsequent flushes are throttled to roughly `FLUSH_MS` (200ms). When Phase 1 completes, a final `repository.invalidate()` + `state.patch({})` is issued.

**Phase 2 — enrichment (ENRICHMENT_DATA_KEYS):**

All enrichment files also stream via `#streamKey()` in parallel (same mechanism as Phase 1):

```javascript
export const ENRICHMENT_DATA_KEYS = [
  "metadata",
  "numbersFighters", "numbersNameMatches", "numbersFightRecords",
  "youtubeArchives", "noteArchives",
  "sourceDocuments", "sourceMentions",
  "officialPlayers", "officialTournaments", "officialMatches", "officialHistory",
];
```

Phase 2 (`#loadEnrichment`) streams all enrichment keys in parallel via `#streamKey()`. Each batch calls `repository.invalidate()` then schedules a coalesced patch. `PUBLIC_REFERENCE_DATA_KEYS` (`sourceEventReferences`, `sourceBoutReferences`, `sourceVideoReferences`) also stream via `#streamKey()` (in `loadPublicReferences()`) after Phase 2.

`CORE_DATA_KEYS = [...INITIAL_TAB_DATA_KEYS, ...PRIMARY_DATA_KEYS, ...ENRICHMENT_DATA_KEYS]` — all keys that `load()` guarantees are in `loadedDataKeys` after it resolves.

Only viewer-consumed tables belong in the streamed key lists, and only **array** JSON streams correctly. `#streamKey`'s SAX handler pushes array elements (`typeof k === "number"`); an **object** JSON (`aliases`, `metadata` — see `OBJECT_DATA_KEYS` in `data-parser.js`) streamed through it silently becomes `[]`. So object-typed keys must NOT be in `PRIMARY_DATA_KEYS`/`ENRICHMENT_DATA_KEYS` (they load correctly only via the `loadKeys()` plain-parse path). `aliases`/`titleReigns` were removed from PRIMARY because nothing reads them (fighter aliases are baked into `fighters.json` records; title lineage is baked into `titles.json`).

### Streaming render-cost discipline

Every `#streamKey` flush invalidates the repository (cheap, ~0.5µs) and schedules a render. With 13 keys streaming in parallel that is dozens of renders, so **render work must stay cheap and rare during streaming**:

- **Patch coalescing** (`data-loader.js` `#schedulePatch()`): flushes schedule at most one `state.patch({})` per `requestAnimationFrame`. `invalidate()` stays per-flush (correctness); only the render notification is batched. Node/tests (no `requestAnimationFrame`) fall back to immediate patch. Per-phase confirm patches stay direct, guaranteeing a settled final render.
- **`renderSummary()` must not build rich collections during streaming.** 試合/動画 counts use the plain `d.bouts.length`/`d.videos.length` (rich is reverse + `lowReliabilityLast` partition only, so the count is identical). 選手 reads `repo.richFighters.length` only once `fighters`+`numbersFighters`+`numbersNameMatches`+`officialPlayers` are loaded (richFighters' real deps), else the plain `fighters.length`. Mirror the existing `sourceDocuments`/`sourceReferences` `loadedDataKeys` gates.
- Per-render DOM rebuilds get change-guards: `renderViewModeSwitch` skips its innerHTML rewrite when `viewMode` is unchanged; `renderTabs` toggles classes when tab structure is unchanged; the official tab skips content re-render via `itemsSource`.

### DataRepository lifecycle (singleton + invalidate)

The repository is a **singleton**. `DataLoader.ensureStateData()` creates
`state.repository = new DataRepository(state.data)` exactly once, then reuses it.
`state.data` keeps the same object identity throughout; only its array values are
replaced as data streams in.

Instead of re-creating the repository, the loader calls `repository.invalidate()`:
- After each SAX batch flush (mid-streaming, inside `#streamKey`'s `flush`)
- After Phase 1 completes
- After Phase 2 + public references complete
- In `loadKeys` / `loadForTab` after on-demand fetches

`invalidate()` resets every rich cache (`#richFighters`, `#richBouts`, …), the
`#fighterAliasIndex`, the `#sourceDocLookup`, `this.indexes`, and the
`DataEnricher` cache, then advances a **module-level monotonic `revision`** counter
(`this.revision = nextRevision++`). The counter is module-scoped so even a
freshly-constructed repository never reuses a stamp.

`TabRendererRegistry` detects updates by comparing `repo.revision` against the
per-tab stamp in `#prevRepoRefs` (NOT object identity — identity never changes for
a singleton) and calls `refreshItems`. `QueryMatcher` likewise clears its search-text
cache whenever `repo.revision` changes. Comparing repository identity instead of
`revision` is the exact bug this design fixed (frozen tabs / stale search cache).

### Error handling

If `fetch()` throws or returns a non-OK status, `#streamKey` sets `fallbackForDataKey(key)` and marks the key in both `loadedDataKeys` and `dataLoadErrors`. A failed key is settled (not stuck in pending state). A mid-stream reader error falls back the same way (fallback value, key still settled). A `JSONParser` construction failure (e.g. CDN import failed) instead falls back to `response.text()` + `JSON.parse()`, only using `fallbackForDataKey(key)` if that also fails, then settles the key. Every key handles its own error, so one bad enrichment file does not abort the others.

All parallel streaming calls go through `#streamKeySafe(key)`, which wraps `#streamKey` in a per-key `.catch` (fallback + `dataLoadErrors` + `loadedDataKeys.add`). This contains even a *thrown* rejection (e.g. an OK response with a null body, where `getReader()` is outside `#streamKey`'s try) so it cannot reject the phase's `Promise.all` and abort `load()`. Use `#streamKeySafe`, not a bare `#streamKey`, for every Phase 1 / Phase 2 / public-reference / tab-data fan-out.

`ViewController.renderDataLoadErrors()` reads `state.dataLoadErrors` and renders an `<article class="card data-load-error-card" role="alert">` warning card into the `#data-load-errors` section in `index.html` (the section stays `hidden` when there are no errors); it lists the failed file name and message per key.

---

## Filter fingerprint

`TabRendererRegistry.#filterFingerprint()` detects filter changes via query/focus
plus **every** filter group's `stateKey`, read generically from `TAB_FILTERS`:

```javascript
const tabFilters = Object.values(TAB_FILTERS).flat().map((g) => s[g.stateKey]);
[s.query, s.focusFighterId, s.focusEventId, s.mentionType, ...tabFilters].join("\0")
```

Because it iterates `TAB_FILTERS` automatically, adding a tab filter needs **no**
fingerprint edit — just add the group in `filters.js`. The per-tab 階級/団体/種別/区分
button filters (public + admin) are a config-driven subsystem; see the
**arakaku-filters** skill for the data model and the add-a-filter checklist.

---

## Key viewer JS concepts

Important state fields:

```text
state.tab
state.query
state.focusFighterId
state.focusEventId
state.mentionType
state.<tab>Division / <tab>Promotion / eventType / promotionCategory / sourceType ...
                          ← one per filter group stateKey in TAB_FILTERS (filters.js)
state.data
state.repository          ← DataRepository singleton (created once; data updates call repository.invalidate())
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

When adding a new JSON data file, update `DATA_FILES` in `config.js` and add the key to `PRIMARY_DATA_KEYS`, `ENRICHMENT_DATA_KEYS`, or (only for data the initial tab needs) `INITIAL_TAB_DATA_KEYS`.

When adding a new tab:

1. Add it to `PUBLIC_TABS` or `ADMIN_TABS` in `docs/assets/js/config.js`.
2. Add a method on `TabRenderers` in `docs/assets/js/tabs/tab-renderers.js` returning `{ items, renderItem, estimateSize?, itemsSource? }`. `itemsSource` (optional) is the array of raw source arrays the items derive from; when provided and reference-identical to the previous render, `TabRendererRegistry` skips the refresh (used by the official tab to stay interaction-stable — open `<details>` would otherwise collapse on every streaming flush).
3. Register it in `TabRendererRegistry` (`docs/assets/js/tabs/tab-registry.js`).
4. If data is needed on-demand (not in ENRICHMENT_DATA_KEYS), add to `TAB_DATA_KEYS` in `data-loader.js`.
5. If data should auto-load before tab click, add key to `ENRICHMENT_DATA_KEYS` in `config.js`.
6. Confirm search behavior and keyboard shortcut numbering.

---

## CDN dependencies

The viewer loads three external libraries at runtime from `https://esm.sh/`:

| Library | Import | Used in |
|---------|--------|---------|
| `@tanstack/virtual-core@3` | `Virtualizer`, `windowScroll` | `ui/virtual-list.js` |
| `@streamparser/json` | `JSONParser` | `data-loader.js` (all streaming) |
| `lite-youtube-embed` | un-awaited dynamic import | `main.js` (YouTube facade) |

`@streamparser/json` is used for ALL `#streamKey()` calls (both Phase 1 and Phase 2). `getJSONParser()` guards with `typeof window !== "undefined"` for Node.js compatibility. If the CDN import fails or the parser throws, `#streamKey` falls back to `response.text() + JSON.parse()` (`await getJSONParser().catch(() => null)` — a CDN outage must never reject `load()`).

`lite-youtube-embed` is loaded via an un-awaited dynamic `import(...).catch(() => {})` in `main.js` — a blocking static CDN import would gate the entire boot (including Phase 0) on esm.sh. Custom elements upgrade automatically when the definition arrives late.

`marked` CDN was removed. Markdown rendering uses the self-contained `mdToHtml()` in `docs/assets/js/ui/markdown.js` (imported by `tab-renderers.js`).

## VirtualList loading state

`VirtualList` has a `#loading` flag (set via `setLoading(bool)`). When `items.length === 0`:
- `#loading === true` → shows "読み込み中..."
- `#loading === false` → shows blank (no message)

`TabRendererRegistry.renderTo()` calls `list.setLoading(loadingDataKeys.size > 0)` on every render.

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

## Rich integration (Numbers + official)

`DataRepository` builds `richFighters` / `richBouts` / `richEvents` / `richVideos`
at runtime via `DataEnricher.enrich*` (`core/data-enricher.js`). The reliability
ordering and the layering/merge rules live in the **arakaku-reliability-layering**
skill; this section is just the viewer-facing behavior.

Numbers-derived data (`numbersFighters` / `numbersNameMatches` /
`numbersFightRecords`) and official-site data (`officialPlayers` etc.) are merged
into fighters/bouts at runtime:

- Discover fighters that exist only in Numbers matches **or** only in official-site
  data, so they still appear on the 選手 tab.
- Fill missing fighter profile fields (height, age, gym, summary) from 公式 then 名鑑
  (higher tier wins).
- Resolve unknown bout results/divisions/formats from Numbers personal fight
  records; such bouts get `result_status = "numbers_verified"`.
- Collapse duplicate fighters whose names differ only by 中黒/空白/ピリオド into one
  survivor (kept-away names become `aliases`; `merged_fighter_ids` + the repo alias
  index keep related bouts/snapshots attached). CSV rows are not modified.

### Source-provenance display

Cards show **where each fact came from** using the badge colors:

- Top-of-card badges: `名鑑` (`.video-badge`, blue) and `公式`
  (`.video-badge.official-badge`, green).
- Grouped data blocks reuse those colors: `renderNumbersBlock` →
  `.source-block.source-numbers` (blue, "名鑑データ"), `renderOfficialBlock` →
  `.source-block.source-official` (green, "公式データ"). The official block holds the
  公式 record (wins/losses) and `renderOfficialBio` (`.official-bio`, 「／」-split
  title/tournament history), which **filters out segments already in the summary**
  so 名鑑 notes (which usually echo the bio) don't duplicate it.
- Admin single-source cards carry a colored left border (青=名鑑系, 緑=公式系).
- Numbers stats block: total fights/wins/losses plus achievement markers
  (👑 belts, 🏆 tournament wins).

When rendering source comparison UI: show raw Numbers/official values distinctly,
surface unmatched names and generated candidate IDs clearly, flag contradictory
win/loss marks, and never present Numbers-/archive-derived bout records as
confirmed canonical CSV bouts.

---

## CSS rules

Prefer small, reusable classes.

Existing important classes include:

```text
card
video-badge                 ← 名鑑 badge (blue); + .official-badge = 公式 (green)
source-card
source-body
source-mention-card
related-bout-grid
related-bout-card
link-button
virtual-list                ← position: relative; required for absolute-positioned rows

# 出所ボックス (= バッジ色)  ── see Source-provenance display above
source-block / source-numbers (青) / source-official (緑) / source-block-label
official-bio                ← 公式 bio リスト
fighter-summary

# タブ絞り込み (config-driven, see arakaku-filters skill)
tab-filters / filter-row / filter-label / filter-button-group
filter-button / filter-button.active
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
