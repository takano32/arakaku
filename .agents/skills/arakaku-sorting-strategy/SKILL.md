---
name: arakaku-sorting-strategy
description: Use this skill when maintaining the data sort order policy. It ensures that canonical CSVs remain ascending (oldest first) while the viewer displays data in descending order (newest first).
---

# Unofficial ARAKAKU Database Sorting Strategy Skill

This skill governs the temporal organization of data in the `takano32/arakaku` project.

## Core Policy: CSV Ascending, Viewer Descending

To ensure both maintainability and a modern user experience, the project follows a dual-sorting policy:

1.  **Canonical CSVs (`data-src/*.csv`)**: Must be sorted in **Ascending** order (oldest to newest). This makes the source files easier to append to and review chronologically.
2.  **Viewer Display**: Must be in **Descending** order (newest to oldest). This ensures users always see the latest information first.

## Maintenance Workflow

### 1. Re-sorting CSV Files

Whenever new rows are added or existing dates are corrected, the CSV files must be re-sorted. Use the provided automation:

```bash
make reorder-data
```

This runs `scripts/reorder_data.py`, which sorts the following files:
- `events.csv`: Primary sort by `published_at` or `event_date`.
- `bouts.csv`: Primary sort by event date, then by `bout_order`.
- `articles.csv`: Primary sort by `published_at`.
- `videos.csv`: Primary sort by `published_at`.
- `source_documents.csv`: Primary sort by `published_at`.
- `title_reigns.csv`: Primary sort by `title_id`, then by `reign_order`.

### 2. Client-Side Reversal

The reversal of order happens in the browser via `docs/assets/js/core/data-repository.js`.

- **Global Collections**: Getters like `events`, `richBouts`, `richVideos`, and `richArticles` should return the array in reversed order (`[...data].reverse()`).
- **Logical Groupings**: Sub-collections that represent a sequence (e.g., `boutsForEvent`) should **NOT** be reversed; they should remain in ascending order (Bout 1 -> Main Event) for a coherent narrative.

## Implementation Rules

- **Pure Build**: The build script (`scripts/build_json.py`) must NOT perform any sorting or reversal. It should strictly map the CSV rows as they appear in the source.
- **Lazy Enriched Getters**: Use the `rich*` getters in `DataRepository` to provide the reversed, supplemented collections to the UI.
- **Validation**: Always run `make check` after re-sorting to ensure that IDs and relationships remain intact and that the viewer's logic handles the reversed arrays correctly.

## VirtualList and Reversed Arrays

The viewer uses `VirtualList` with a cache of rendered DOM rows keyed by index. **`VirtualList.extendItems()` is NOT safe for reversed arrays.**

Because each streaming batch appends to the underlying array before `.reverse()` is applied, every index 0..N-1 points to a different item after each new batch arrives. `extendItems` preserves cached rows by index without re-rendering them — stale DOM from the previous batch would be shown at those positions.

**Rule:** Never call `extendItems` for `richBouts`, `richVideos`, `events`, `richArticles`, or any collection that is reversed or reordered after construction. `TabRendererRegistry` always uses `refreshItems` for non-tab-change updates precisely because of this invariant. If you add a new reversed getter, verify that no rendering path calls `extendItems` for it.

## Documenting Changes

When adding new temporal data or adjusting sorting logic:
- Update `SCHEMA_NOTES.md` if the policy itself changes.
- Update `CHRONICLE.md` if a significant re-sorting milestone occurs.
- Ensure the `arakaku-maintainer` and `arakaku-data-curator` skills are aligned with this strategy.
