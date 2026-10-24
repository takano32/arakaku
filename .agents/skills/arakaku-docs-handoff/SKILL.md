---
name: arakaku-docs-handoff
description: Use this skill when updating README, AGENTS.md, SKILL.md, handoff notes, next task lists, operations checklists, or other project documentation for human and agent handoff.
---

# Unofficial ARAKAKU Database Documentation and Handoff Skill

Use this skill when updating project documentation.

Important documentation files:

```text
README.md
AGENTS.md
.agents/skills/arakaku-maintainer/SKILL.md
.agents/skills/arakaku-numbers-pipeline/SKILL.md
.agents/skills/arakaku-source-pipeline/SKILL.md
.agents/skills/arakaku-viewer-ui/SKILL.md
.agents/skills/arakaku-sorting-strategy/SKILL.md
.agents/skills/arakaku-data-curator/SKILL.md
.agents/skills/arakaku-review-workflow/SKILL.md
.agents/skills/arakaku-actions-ops/SKILL.md
.agents/skills/arakaku-docs-handoff/SKILL.md
.agents/skills/arakaku-filters/SKILL.md
.agents/skills/arakaku-reliability-layering/SKILL.md
HANDOFF.md
TASKS.md
OPERATIONS_CHECKLIST.md
CODEX.md
CHRONICLE.md
SCHEMA_NOTES.md
```

---

## Audience split

Recommended roles:

```text
README.md
  Human-readable project overview and basic usage.

AGENTS.md
  Strict working rules for agents and automation.

.agents/skills/arakaku-maintainer/SKILL.md
  Codex-specific operational instructions.

.agents/skills/arakaku-numbers-pipeline/SKILL.md
  Codex-specific instructions for Numbers import, matching, and client-side comparison.

.agents/skills/arakaku-source-pipeline/SKILL.md
  Codex-specific instructions for note/YouTube cache refresh, archive CSV generation, and source document extraction.

.agents/skills/arakaku-viewer-ui/SKILL.md
  Codex-specific instructions for static viewer tabs, source rendering, archive metadata display, and search behavior.

.agents/skills/arakaku-sorting-strategy/SKILL.md
  CSV-ascending / viewer-descending sort policy.

.agents/skills/arakaku-data-curator/SKILL.md
  Canonical CSV editing, data integrity, Numbers/official integration.

.agents/skills/arakaku-review-workflow/SKILL.md
  review/*.csv candidate extraction, review, and apply scripts.

.agents/skills/arakaku-actions-ops/SKILL.md
  GitHub Actions (test.yml / pages.yml) and CI config.

.agents/skills/arakaku-docs-handoff/SKILL.md
  This skill: which docs/skills to keep in sync.

.agents/skills/arakaku-filters/SKILL.md
  Config-driven per-tab filters (TAB_FILTERS / itemPassesFilters).

.agents/skills/arakaku-reliability-layering/SKILL.md
  Source-tier enrichment, sorting, and provenance.

HANDOFF.md
  Current project state and recent work summary.

TASKS.md
  Work ledger. Every task is numbered T.N / T.N.M / T.N.M.K; completed parent tasks move to tasks/T.N.md.

OPERATIONS_CHECKLIST.md
  Routine checks, sync steps, and troubleshooting.
```

---

## Documentation rules

When editing docs:

- Keep commands copyable.
- Prefer Markdown files over chat-only text.
- Avoid placing generated JSON in docs.
- Keep branch name as `master`.
- Mention `make check` and `make clean-generated`.
- Mention that `docs/data/*.json` is generated.
- Mention that `tmp/` caches are not committed.
- Warn not to infer unknown results.

---

## Current stable facts to include

Data scale:

行数スナップショットはドキュメントに固定値で書かないでください（更新のたびに陳腐化します）。README と同じく、現在の規模はその場で確認します。

```bash
wc -l data-src/*.csv data-src/archives/*.csv
```

各 CSV はヘッダ 1 行を含むため、レコード数は行数から 1 を引いた値です（本文に改行を含む CSV は `wc -l` がレコード数と一致しない点に注意）。

Current source document types:

```text
youtube_description
note_article
```

Current viewer PUBLIC_TABS (通常ビュー):

```text
公式 (official)    ← official pages + news
通信 (tsushin)     ← アラカク通信のーと note articles
試合 (bouts)
選手 (fighters)
大会 (events)
団体 (promotions)
王座 (titles)
動画 (videos)
```

Current viewer ADMIN_TABS (管理ビュー):

```text
出典本文 (sources)
出典言及 (mentions)
名鑑選手 / 名前対応 / 名鑑記録 (numbers data)
公式選手 / 公式 (official data)
```

Current viewer rendering architecture:

```text
ui/sections/<tab>.js build(ctx) → { items, keyOf, renderHead, renderBody, defaultOpen?, rowClass?, isHeader? }
ui/shell.js → one ui/list.js RecordList per tab (chunked rendering, lazy row bodies, diffed refresh, cursor)
data/loader.js load() → Phase 0 loadKeys(INITIAL_TAB_DATA_KEYS = officialPages, officialNews)
                      → Phase 1 PRIMARY_DATA_KEYS fetched in parallel, each file applied as it arrives
                      → Phase 2 ENRICHMENT_DATA_KEYS + PUBLIC_REFERENCE_DATA_KEYS in one parallel pool
per-key failure isolation: fallback value + dataLoadErrors[key] + loadedDataKeys (never rejects load())
loadForTab(tabId) → TAB_DATA_KEYS keys fetched on demand (e.g. sourceMentions on the mentions tab)
no CDN / framework / web font; the feature map lives in docs/VIEWER_FEATURES.md
```

Build scripts (all run by `make build`):

```text
scripts/build_json.py
scripts/build_numbers_json.py
scripts/build_official_json.py
scripts/build_official_pages_json.py
```

Current actions:

```text
actions/checkout@v5
actions/setup-python@v6
actions/configure-pages@v6
actions/upload-pages-artifact@v5
actions/deploy-pages@v5
```

---

## Handoff quality checklist

A good handoff includes:

- current stable state
- what was recently changed
- commands that pass
- known risks
- next recommended tasks
- files changed
- validation status
- Pages status
- warning about not confirming unknown results by inference

---

## Required check after doc-only changes

Even doc-only changes should usually run:

```bash
make check
make clean-generated
```

This catches accidental file or formatting issues in repository context.
