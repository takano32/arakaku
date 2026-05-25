---
name: arakaku-viewer-ui
description: Use this skill when editing the ARAKAKU GitHub Pages viewer, including docs/index.html, docs/assets/js/, docs/assets/style.css, tabs, search, navigation, source document display, or source mention display.
---

# ARAKAKU Viewer UI Skill

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

The viewer currently supports:

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

## Key viewer JS concepts

Important state fields:

```text
state.tab
state.query
state.focusFighterId
state.focusEventId
state.titlePromotion
state.titleDivision
state.data
```

Important data keys:

```text
sourceDocuments
sourceMentions
numbersFighters
numbersNameMatches
numbersFightRecords
videos
videoLinks
bouts
fighters
events
titles
```

When adding a new JSON data file, update `DATA_FILES`.

When adding a new tab:

1. Add it to `docs/assets/js/config.js` (`TABS`).
2. Add a method on `TabRenderers` in `docs/assets/js/tabs/tab-renderers.js`.
3. Register it in `TabRendererRegistry` (`docs/assets/js/tabs/tab-registry.js`).
4. Confirm search behavior.
5. Confirm tab click behavior.

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

## Numbers comparison data

Numbers-derived data uses:

```text
numbersFighters
numbersNameMatches
numbersFightRecords
```

These are comparison inputs from `data-raw/アラカク選手名鑑.numbers`.

When rendering Numbers comparison UI:

- show raw Numbers values separately from canonical values
- surface unmatched names and generated candidate IDs clearly
- pair personal fight records in JavaScript, not in the CSV export
- flag one-sided records and contradictory win/loss marks
- do not present Numbers-derived bout records as confirmed canonical bouts

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
```

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

Check browser console for viewer JS errors.
