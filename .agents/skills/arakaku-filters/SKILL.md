---
name: arakaku-filters
description: The config-driven per-tab filter system of the arakaku viewer. Use when adding, changing, or debugging the 階級/団体/種別/区分 button filters on any tab (public or admin); when a record lands in the wrong filter bucket (including その他/最小登録); when wiring a new filter into app-state, URL params, or the render/click/fingerprint plumbing; or when the URL filter token needs to stay English while the button label stays Japanese. Complements arakaku-viewer-ui (rendering/loading) and arakaku-reliability-layering (forceOther / 最小登録).
---

# ARAKAKU viewer filter system

`docs/assets/js/filters.js` is the **single source of truth** for every tab's
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
them in the tab method before `itemPassesFilters`, not in `filters.js`:

- `videos` → `promotion_id`/`division` derived in `enrichVideo` from `video_links`
  → bout/event.
- `tsushin` → `#withNoteFilterFields(doc)` adds `promotion_id` (from the article)
  and `divisions[]` (from `article_links` → bout).
- `officialPlayers` → `tab-renderers` maps `organization` → `promotion_id` via
  `repo.promotionIdByName(...)` before filtering.

## Rendering & interaction (do not duplicate)

- **Render** — `ViewController.renderTabFilters()` writes `TAB_FILTERS[state.tab]`
  into `#tab-filters` (hidden when the tab has no groups). Markup per group:
  `.filter-row` > `.filter-label` + `.filter-button-group` > `.filter-button`
  (`.active` on the selected one), each with `data-filter-type` and
  `data-filter-val`. Buttons come from `filterButtons(group)` (options + その他).
- **Click** — `EventController` delegates from `#tab-filters`: it finds the group
  by `data-filter-type`, toggles (`selected === val ? "" : val`), patches state,
  and re-renders. Clicking the active button clears it.
- **Re-render trigger** — `TabRendererRegistry.#filterFingerprint()` is generic:
  `Object.values(TAB_FILTERS).flat().map(g => state[g.stateKey])` joined with
  query/focus/mention. **Because it iterates every group's `stateKey`
  automatically, you do NOT edit the fingerprint when adding a filter** — just
  make sure the new group is in `TAB_FILTERS`.

## Adding a filter to a tab — checklist

1. `filters.js`: reuse or add an option list, then add/extend the tab's
   `TAB_FILTERS` group (`type`, `label`, `stateKey`, `field`, `options`,
   optional `otherLabel`/`forceOther`/`match`).
2. `core/app-state.js`: add the `stateKey` field (init `""`).
3. `core/url-sync.js`: add a short **English** param ↔ `stateKey` to `PARAM_MAP`
   (e.g. `fighter_div: "fighterDivision"`).
4. Ensure the `field` exists on each item; if not, derive it in the tab method
   (see the derived-field examples above).
5. Confirm the tab method calls `itemPassesFilters(item, TAB_FILTERS.<tab>, state)`.

No change to `renderTabFilters`, the click handler, or the fingerprint is needed —
they are all data-driven from `TAB_FILTERS`.

## CSS

`.tab-filters` (container, in `#tab-filters`), `.filter-row`, `.filter-label`,
`.filter-button-group`, `.filter-button` / `.filter-button.active` in
`docs/assets/style.css`. Keep the generic class names — there are no per-tab
filter classes anymore (the old `.fighter-filters` / `.title-filters` were
removed).

## Checks

```bash
make build && make validate && make test
make clean-generated
```

Verify in a browser (or headless `--dump-dom`) that `#tab-filters` renders the
expected `data-filter-type` rows and that selecting a button narrows the list and
updates the URL with the English token.
