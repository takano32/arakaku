---
name: arakaku-reliability-layering
description: How arakaku ranks data by source reliability and uses it for enrichment, sorting, and filtering. Use when touching docs/assets/js/core/reliability.js, data-enricher.js, or filters.js; when changing how fighters/bouts/events/videos are merged, sorted, or filtered; when adding a source tier; or when a record shows the wrong division/promotion, lands in the wrong sort position, or appears under the wrong filter bucket (e.g. 最小登録 / その他). Complements arakaku-sorting-strategy (temporal order) and arakaku-viewer-ui.
---

# Data reliability layering

The single organizing principle for synthesizing arakaku data.

## Reliability hierarchy (most → least trustworthy)

名鑑 (Apple Numbers, human-verified) > 公式 (official site) > 通信ノート (note.com articles) > YouTube (video data) > 未登録/最小登録 (history-only stub / nothing)

Encoded as `RELIABILITY` in `docs/assets/js/core/reliability.js`:
`numbers:5 > official:4 > note:3 > youtube:2 > none:1`.

Two independent uses of this ranking:

1. **Display (enricher)** — build a record from the lowest-reliability source, then overwrite with each higher source. Higher reliability always wins the final value.
2. **Sort** — keep each tab's existing primary sort, but push low-reliability records (`<= youtube`, `LOW_MAX`) to the end via `lowReliabilityLast`.

## Enricher pattern (build low → high, overwrite)

`DataEnricher` (`docs/assets/js/core/data-enricher.js`) layers sources in **ascending** reliability so the most reliable value lands last:

- `enrichFighter`: base CSV (通信/YouTube) → **公式** (`#applyOfficialPlayer` + `weight_class`→`main_division`, `organization`→`main_promotion_id` via `repo.promotionIdByName`, height/age/gym) → **名鑑** (`numbers_data` overwrites). Official players are matched by `display_name` (exact, then `normalizeFighterName` fallback that ignores 中黒/空白/ピリオド差, e.g. `ローリングJr`↔`ローリングJr.`). `richFighters` also synthesizes fighters that only exist in official-site data (in addition to Numbers-only matches). Summary is 名鑑(catchphrase/notes) > base(通信/YouTube); 公式 `bio` is **not** folded into summary — the fighter card renders it in a dedicated `.official-bio` block (`renderOfficialBio`), filtering out segments already present in summary so 名鑑 notes (which usually echo the bio) don't duplicate it.
- `enrichBout`: base → **名鑑** (`numbers_records` overwrite result/division/winner; sets `result_status="numbers_verified"`).
- `enrichEvent` / `enrichVideo`: attach official/archive data; no higher-tier field overwrite is available in current data.

When adding a source, apply it in the correct ascending position so it overwrites lower tiers and is overwritten by higher ones. Never let a lower tier overwrite a higher one.

`promotionIdByName(name)` maps a Japanese promotion name → id with 中黒/空白-insensitive matching (官 `マウンテンヒーローズ` ↔ promotions `マウンテン・ヒーローズ`).

## Duplicate-fighter merge (runtime)

`richFighters` collapses fighters whose names differ only by 中黒/空白/ピリオド (same `normalizeFighterName`) into one survivor (`#mergeDuplicateFighters`). This is a **viewer-side merge only** — `data-src/fighters.csv` rows are untouched (some genuine duplicate rows exist there, e.g. `パット・バミューダ`/`パットバミューダ`). Rules:

- A group is merged only when its members do **not** have conflicting `main_promotion_id` (guards against merging two distinct people who happen to normalize alike).
- Survivor = canonical row (in `fighters.csv`) with the most relations (videos+articles), then 名鑑-bearing. It keeps its `fighter_id`/`display_name`; merged-away `display_name`s become `aliases`.
- Survivor absorbs `numbers_data`/`official_data`, unions `inferred_from_video_ids`/`source_article_ids`, and fills missing `profile`/summary/division/promotion.
- `merged_fighter_ids` lists every member id. `#fighterAliasIndex` maps **every** member id → survivor, so `findRichFighter(aliasId)` resolves to the survivor and `relatedBoutsForFighter`/`fighterSnapshotsForFighter` query across all member ids (bouts/snapshots referencing a merged-away id still attach).

## Per-entity reliability signals

In `reliability.js`, each `*Reliability(entity)` returns the entity's best available tier:

- **fighter**: `numbers_data`→numbers; `official_data`→official; `isMinimalFighter`→none; `source_article_ids`→note; `inferred_from_video_ids`→youtube; else none.
- **bout**: `result_status==="numbers_verified"` / `numbers_records`→numbers; `source_article_id`→note; `inferred_from_video_id`→youtube; else none.
- **event**: `official_data`→official; `source_article_id`→note; `inferred_from==="official_youtube_title"` / `source_video_ids`→youtube; else none.
- **video**: `official_status==="official"`→official; `source_article_ids`→note; else youtube.

`source_article_ids` is only a **mention** in a note article, not fighter profile data — it must not lift a stub fighter out of "minimal" (see below).

## Minimal fighters (`isMinimalFighter`)

A fighter is minimal (history-only registration) — ranked `none`, sorted to the end, and bucketed into the **その他** filter — when ALL of:

- no `numbers_data` and no `official_data`, AND
- no YouTube data: **`inferred_from_video_ids` present means NOT minimal** (it is YouTube-tier data), AND
- it is not a note-only record: if it has `source_article_ids` but no `最小登録` summary marker, it is `note` tier (not minimal).

Two authored summary markers exist; only `最小登録` ("王座・トーナメント履歴のための最小登録。") marks minimal. The `詳細未入力` YouTube-extracted fighters (`inferred_confidence==="medium"`) have video data, so they are **YouTube tier, not minimal**.

## Sorting

`DataRepository` rich getters (`richFighters/richBouts/richEvents/richVideos`) pass their list through `lowReliabilityLast(items, rank)` after enrichment, preserving order within the reliable and the low groups. Reliability is data-derived, so it is not part of the render fingerprint.

This composes on top of the temporal order from `arakaku-sorting-strategy`: the getter reverses to newest-first (or fighters sort by 名鑑 order) **first**, then `lowReliabilityLast` partitions low-reliability to the tail. Because the result is reordered, the `extendItems` invariant from `arakaku-sorting-strategy` applies — render only via `refreshItems`, never `extendItems`.

## Filtering (`docs/assets/js/filters.js`)

`TAB_FILTERS` defines per-tab division/promotion filters. Options carry `value` (English URL/state token), `label` (Japanese button text), and `match` (data value, defaults to `value`). A group's optional `forceOther(item)` routes an item to **その他** regardless of its field value — fighters use `isMinimalFighter` here; bouts do not. URL tokens are always English (`fighter_div=lightweight`, `bout_promo=max_bout`).

## Known data limits (do NOT fabricate)

- Bouts cannot link to 公式: `official_matches` has 4 rows with empty `youtube_id` and no bout FK. Do not name-match to invent links.
- 公式 events: `official_tournaments` rarely/never matches an event at runtime; its date is year-only and must not overwrite a precise YouTube date.

## Verifying a change

Generated JSON is not committed. To test reliability/enrichment/filter logic against real data:

```
make build   # regenerate docs/data/*.json (build_json + numbers + official)
# load DATA_FILES JSON into a DataRepository in a node --input-type=module script,
# then assert *Reliability tiers, lowReliabilityLast tail, and itemPassesFilters counts
make validate && make test
make clean-generated   # generated JSON must not be committed
```
