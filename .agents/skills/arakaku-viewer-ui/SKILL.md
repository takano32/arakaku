---
name: arakaku-viewer-ui
description: Use this skill when editing the ARAKAKU GitHub Pages viewer, including docs/index.html, docs/assets/js/, docs/assets/app.css, sections (tabs), search, navigation, source document display, or source mention display.
---

# Unofficial ARAKAKU Database Viewer UI Skill

Use this skill when working on the static viewer (rebuilt in T.56).

Viewer files:

```text
docs/index.html                 app skeleton (aside nav + main, search, help dialog, theme bootstrap)
docs/assets/app.css             stylesheet (light/dark tokens on :root, phone layout under 880px)
docs/sw.js                      Service Worker for docs/data/*.json (stale-while-revalidate + DATA_UPDATED)
docs/assets/js/main.js          boot sequence
docs/assets/js/config.js        DATA_FILES, PUBLIC_TABS / ADMIN_TABS, load phases, TAB_DATA_KEYS, REQUIRED_TAB_DATA_KEYS
docs/assets/js/app/state.js     Store (UI state) + URL sync (PARAM_MAP)
docs/assets/js/data/            data rules (parser, loader, repository, enricher, reliability, query, filters, labels)
docs/assets/js/ui/shell.js      renders nav / counts / toolbar / filters / alerts and drives the lists
docs/assets/js/ui/list.js       RecordList (progressive list with open rows and a keyboard cursor)
docs/assets/js/ui/parts.js      shared HTML partials (badges, links, dl, folds, video facade, references, related bouts, profile)
docs/assets/js/ui/sections/     one module per tab + admin.js + index.js (SECTIONS registry)
docs/assets/js/ui/keyboard.js   shortcuts
docs/assets/js/ui/html.js       escapeHtml and formatting helpers
docs/assets/js/ui/markdown.js   official news Markdown → HTML (one-line <iframe>: tiget.net embedded, other hosts as links)
docs/VIEWER_FEATURES.md         feature map (old implementation → new module, verification status)
```

Viewer data is generated JSON under `docs/data/*.json`. Do not edit generated JSON directly.

There are **no runtime dependencies**: no CDN imports, no framework, no web font. Keep it that way unless a dependency is explicitly justified.

---

## Tabs (sections)

PUBLIC_TABS (keyboard shortcuts 1–8, `h`/`l` cycle):

```text
1: 公式   (official)  ← official_pages (collapsed rows) + official_news (Markdown, open rows)
2: 通信   (tsushin)   ← note_article source documents (bodies lazy-loaded)
3: 試合   (bouts)
4: 選手   (fighters)
5: 大会   (events)
6: 団体   (promotions)
7: 王座   (titles)    ← grouped by 団体 / 階級 with header rows
8: 動画   (videos)
```

ADMIN_TABS (the 管理ビュー `<details>` group in the nav; `viewMode` is derived from the tab, so `?tab=sources` opens the admin view directly):

```text
出典本文 (sources)
出典言及 (mentions)          ← mention_type <select>
名鑑選手 (numbersFighters)
名前対応 (numbersNameMatches)
名鑑記録 (numbersFightRecords)
公式選手 (officialPlayers)
公式     (officialMisc)       ← official_tournaments + official_matches + official_history
```

Opening the admin group switches to the last admin tab (default 出典本文); closing it returns to the last public tab (`Shell #prevPublicTab / #prevAdminTab`).

Expected behavior:

- Fighter links (`.link-fighter`) open the fighter section with only that fighter, opened. Event links (`.link-event`) and bout links (`.link-bout`) do the same for events / bouts. The focus is shown as a chip in the toolbar (`選手: ○○ ✕`), the search box is left empty, and typing a query clears the focus.
- Event rows show the event's bouts in bout order; fighter rows show related bouts with event links.
- Source candidates (`source_*_references`) and mentions are candidates, not facts. Keep the 候補 labels.
- Note bodies and YouTube descriptions open inline via 「本文を表示」 / 「概要欄を表示」 folds.

---

## Rendering architecture

### Section descriptors

Each module in `ui/sections/` exports `{ id, label, placeholder, empty, build(ctx) }`. `build(ctx)` receives `{ state, repo, query, parts }` and returns a RecordList descriptor:

```javascript
{
  items,                       // array (already filtered: query + TAB_FILTERS + focus)
  keyOf: (item) => string,     // stable row key (ID); must be unique within the section
  renderHead: (item) => html,  // always visible: .rec-text (title / sub / badges) + optional .rec-aside
  renderBody: (item) => html,  // rendered lazily when the row is opened
  defaultOpen?: (item) => bool,
  rowClass?: (item) => string, // e.g. rec-src-numbers (blue stripe) / rec-src-official (green)
  isHeader?: (item) => bool,   // group heading rows (titles tab); not openable, skipped by the cursor
}
```

`validate_json.js` builds every section on the real data and renders every row's head and body in Node, so sections must not touch `document` / `window` and must never return `undefined` in HTML.

### RecordList (`ui/list.js`)

- `setItems(desc)` on tab change: renders the first 30 rows; an IntersectionObserver sentinel (or the 「さらに表示」 button) appends the next chunk.
- `refresh(desc)` on data / filter changes: keeps the rendered count and cursor; if the rendered keys are unchanged it only replaces heads/bodies whose HTML changed (open `<details>` survive), otherwise it rebuilds.
- Open state is per key (`#openState`), so a row stays open across refreshes and tab switches.
- Cursor: `moveCursor`, `setCursorToEdge`, `toggleCursor`, `getCursorEl`. Clicking a row sets the cursor index without painting the outline.

### Shell (`ui/shell.js`)

- `state.subscribe(() => shell.render())` is the only re-render path. `render()` is idempotent: nav updates `aria-current`, filters re-render only when their fingerprint changes, the list rebuilds only when tab / `repo.revision` / fingerprint / gate changed.
- Render gate: `REQUIRED_TAB_DATA_KEYS[tab]` missing → 「読み込み待ち…」/「読み込み中…」 status; the fighters tab additionally waits for `numbersFighters` + `numbersNameMatches` so the 名鑑 order is final before the first paint.
- Counts (`#counts()`): 試合/動画 use raw lengths (+ numbers-only rows once `numbersFightRecords` is loaded); 選手 uses `richFighters.length` only after fighters/numbersFighters/numbersNameMatches/officialPlayers are loaded; 出典 / 出典候補 show `…` until loaded.
- Deep links: when `state.hasFocus` and the section yields exactly one item, the row is opened and the page scrolled to top — once per focus key, after the data has arrived.

---

## Data loading (`data/loader.js`)

Phases (see `config.js`):

```text
Phase 0  loadKeys(INITIAL_TAB_DATA_KEYS)              officialPages, officialNews (~16KB) → first paint
Phase 1  PRIMARY_DATA_KEYS in parallel                 each file applied + repository.invalidate() + rAF-coalesced patch
Phase 2  ENRICHMENT_DATA_KEYS + PUBLIC_REFERENCE_DATA_KEYS in one parallel pool
on demand loadForTab(tab) → TAB_DATA_KEYS[tab]         sourceDocumentBodies (tsushin/sources), sourceMentions (mentions)
```

- Failure semantics are per key: fallback value (`data/parser.js` `fallbackForDataKey`) + `dataLoadErrors[key]` + `loadedDataKeys.add(key)`; `load()` never rejects because of one file. `Shell #renderAlerts` shows the failed file names (`role="alert"`).
- `loadingDataKeys` tracks every in-flight key (toolbar shows 読み込み中 n/31).
- `CORE_DATA_KEYS = INITIAL + PRIMARY + ENRICHMENT` is what `validate_json.js` asserts after `load()`.
- Object-shaped JSON (`aliases`, `metadata`) is listed in `DATA_FILES` but not in any phase (nothing reads it); array keys that parse to a non-array are treated as broken files.
- `DataLoader` constructor injection `{ dataFiles, fetchText }` is used by `scripts/validate_json.js`; keep `fetchText(path, fallback)`.

### DataRepository lifecycle

One `DataRepository` per page (`state.repository`), created by `ensureStateData()`. Every data change calls `repository.invalidate()`, which resets the rich caches / indexes / enricher and advances the module-level `revision`. `Shell` and `QueryMatcher` detect updates by `revision`, never by object identity.

---

## Filters, search, URL

- Filters: `data/filters.js` `TAB_FILTERS` (see the **arakaku-filters** skill). `Shell #renderFilters` draws chips (`.chip`, `data-filter-type` / `data-filter-val`), clicks toggle `state[group.stateKey]`.
- Search: `data/query.js` `QueryMatcher(state, () => repo)`; each section calls the matching `*Matches` method. The cache is keyed by `repo.revision`.
- URL: `app/state.js` `PARAM_MAP` (unchanged short names plus `bout`). `writeToURL` uses `replaceState`, omits defaults, skips identical URLs.

---

## Styling (`docs/assets/app.css`)

- Color tokens on `:root`, dark values under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])` and again under `:root[data-theme="dark"]`. The theme button writes `html[data-theme]` and `localStorage["arakaku-theme"]`; `index.html` applies it before paint.
- Provenance: `.badge-numbers` (blue) / `.badge-official` (green) / `.badge-note` (purple) / `.badge-gold` (achievements, 王座戦); admin rows use `.rec-src-numbers` / `.rec-src-official` / `.rec-src-note` stripes.
- Layout: `.app` grid (264px aside + main) above 880px; below, the aside stacks on top with horizontally scrolling `.nav-list` / `.stats` (`grid-template-columns: minmax(0, 1fr)` keeps the page from overflowing).
- Rows: `.rec` → `.rec-head` (`.rec-main` → `.rec-text` + `.rec-aside`, `.rec-toggle`) + `.rec-body`; open rows get `.rec-open` (card look). Never name a row class `rec-title` (that is the title line class).

---

## Adding a tab

1. Add `[id, label]` to `PUBLIC_TABS` or `ADMIN_TABS` in `config.js` (public order = shortcut numbers).
2. Create `ui/sections/<id>.js` exporting a section object and register it in `ui/sections/index.js`.
3. If it needs on-demand data, add the keys to `TAB_DATA_KEYS` (and `REQUIRED_TAB_DATA_KEYS` if the list cannot render without them).
4. Filters: add a `TAB_FILTERS[id]` group (state keys are created automatically from `FILTER_STATE_KEYS`; add the URL param to `PARAM_MAP`).
5. Run `make check` (validate_json.js renders every row of the new section) and update `docs/VIEWER_FEATURES.md`.

---

## Required checks

```bash
make check
make clean-generated
```

Preview locally with `python3 -m http.server 8000 --directory docs` after `make build` (ES modules and `sw.js` do not work from `file://`). Check the browser console: the viewer must produce zero errors and zero warnings, including no 404 (the favicon is an inline SVG). Verify phone width (no horizontal scroll) and the deep links `?tab=events&event=…`, `?tab=fighters&fighter=…`, `?tab=titles&title_promo=…`.
