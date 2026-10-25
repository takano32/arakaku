---
name: arakaku-filters
description: The config-driven per-tab filter system of the arakaku viewer. Use when adding, changing, or debugging the 階級/団体/種別/区分 button filters on any tab (public or admin); when a record lands in the wrong filter bucket (including その他/最小登録); when wiring a new filter into app-state, URL params, or the render/click/fingerprint plumbing; or when the URL filter token needs to stay English while the button label stays Japanese. Complements arakaku-viewer-ui (rendering/loading) and arakaku-reliability-layering (forceOther / 最小登録).
---

# ARAKAKU viewer filter system

`docs/assets/js/data/filters.js` is the **single source of truth** for every tab's
button filters: the option lists, the matching logic, and which tabs get which
filters. The HTML, the click handling, and the re-render fingerprint are all
derived from `TAB_FILTERS`. Do not scatter filter logic into the renderers.

## Data model

`TAB_FILTERS` is keyed by tab id; each value is an array of filter **groups**:

```js
{
  type:       "division",        // data-filter-type / グループ識別子 (tab 内で一意)
  label:      "階級",            // 行ラベル (日本語)
  stateKey:   "fighterDivision", // AppState 上の選択値フィールド名
  field:      "main_division",   // 照合するレコードのフィールド名
  otherLabel: "その他",          // 任意。設定すると「その他」ボタンを末尾に追加
  options:    DIVISION_OPTIONS,  // 選択肢
  forceOther: isMinimalFighter,  // 任意。真を返す項目は実値に関わらず「その他」扱い
}
```

Each **option**:

```js
{ value: "lightweight", label: "ライト", match: "ライト級" }
```

- `value` — **English token** stored in state and the URL (e.g. `lightweight`,
  `target`, `other`). Keep it English; the user does not want Japanese in URLs.
- `label` — Japanese button text.
- `match` — the actual value found in the data. Optional; when omitted the data
  value equals `value`. Resolved by `matchOf = (o) => o.match ?? o.value`.

`OTHER_VALUE = "other"` is the reserved token for the その他 bucket.

Shared option lists in `filters.js`: `DIVISION_OPTIONS` (ライト/ミドル/ヘビー級),
`PROMOTION_OPTIONS` (target/emperor/mh/max_bout), `EVENT_TYPE_OPTIONS`,
`PROMOTION_CATEGORY_OPTIONS`, `SOURCE_TYPE_OPTIONS`.

## Matching: `itemPassesFilters(item, groups, state)`

For each group with a non-empty selection:

- The field value may be **single or an array**. `tsushin.divisions` is an array
  (one note article spans several divisions); an array passes if **any** element
  matches.
- `selected === OTHER_VALUE` → pass when `forceOther(item)` is true **or** no
  field value matches any known option's `match`.
- otherwise → pass when the field values include the selected option's `match`
  **and** `forceOther(item)` is false.

`forceOther` lets a record be forced into その他 regardless of its raw field — the
fighters tab uses `isMinimalFighter` so history-only registrations land in その他
(see arakaku-reliability-layering). A fighter with YouTube/名鑑/公式 data is **not**
minimal and stays in its real bucket.

## Which tabs have filters

```text
public:  fighters, bouts, titles, events, promotions, videos, tsushin
admin:   sources, numbersFighters, numbersFightRecords, officialPlayers
```

A tab without an entry in `TAB_FILTERS` simply shows no filter bar.

Some tabs filter on **derived** fields the JSON doesn't carry directly. Compute
them in the section's `build()` (`docs/assets/js/ui/sections/*.js`) before `itemPassesFilters`, not in `filters.js`:

- `videos` → `promotion_id`/`division` derived in `enrichVideo` from `video_links`
  → bout/event.
- `tsushin` → `withFilterFields(doc)` in `ui/sections/tsushin.js` adds `promotion_id` (from the article)
  and `divisions[]` (from `article_links` → bout).
- `officialPlayers` → `ui/sections/admin.js` maps `organization` → `promotion_id` via
  `repo.promotionIdByName(...)` before filtering.

## Rendering & interaction (do not duplicate)

- **Render** — `Shell #renderFilters()` (`docs/assets/js/ui/shell.js`) writes
  `TAB_FILTERS[state.tab]` into `#filters` (hidden when the tab has no groups).
  Markup per group: `.filter-row` > `.filter-label` + `.chips` > `.chip`
  (`.is-active` + `aria-pressed` on the selected one), each with
  `data-filter-type` and `data-filter-val`. Buttons come from
  `filterButtons(group)` (options + その他). The mentions tab adds the
  `#mention-type` `<select>` to the same container.
- **Click** — `Shell.bind()` delegates from `#filters`: it finds the group by
  `data-filter-type`, toggles (`selected === val ? "" : val`) and patches state.
  Clicking the active chip clears it.
- **Re-render trigger** — `Shell #fingerprint()` is generic:
  `FILTER_STATE_KEYS.map(k => state[k])` joined with query/focus/mention.
  **Because it iterates every group's `stateKey` automatically, you do NOT edit
  the fingerprint when adding a filter** — just make sure the new group is in
  `TAB_FILTERS`. `Store` (`app/state.js`) initializes every `FILTER_STATE_KEYS`
  entry to `""` for the same reason.

## Adding a filter to a tab — checklist

1. `data/filters.js`: reuse or add an option list, then add/extend the tab's
   `TAB_FILTERS` group (`type`, `label`, `stateKey`, `field`, `options`,
   optional `otherLabel`/`forceOther`/`match`). The state field is created
   automatically from `FILTER_STATE_KEYS`.
2. `app/state.js`: add a short **English** param ↔ `stateKey` to `PARAM_MAP`
   (e.g. `fighter_div: "fighterDivision"`).
3. Ensure the `field` exists on each item; if not, derive it in the section's
   `build()` (see the derived-field examples above).
4. Confirm the section calls `itemPassesFilters(item, TAB_FILTERS.<tab>, state)`.

No change to `#renderFilters`, the click handler, or the fingerprint is needed —
they are all data-driven from `TAB_FILTERS`.

## CSS

`.filters` (container, `#filters`), `.filter-row`, `.filter-label`, `.chips`,
`.chip` / `.chip.is-active`, `.select` in `docs/assets/app.css`. Keep the generic
class names — there are no per-tab filter classes.

## Checks

```bash
make build && make validate && make test
make clean-generated
```

Verify in a browser (or headless `--dump-dom`) that `#tab-filters` renders the
expected `data-filter-type` rows and that selecting a button narrows the list and
updates the URL with the English token.
