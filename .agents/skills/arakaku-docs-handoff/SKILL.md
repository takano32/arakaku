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
HANDOFF.md
NEXT_TASKS.md
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

HANDOFF.md
  Current project state and recent work summary.

NEXT_TASKS.md
  Prioritized next tasks.

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
TabRenderers → { items, renderItem, estimateSize? } descriptor
TabRendererRegistry.renderTo(container, tabId) → VirtualList per tab
VirtualList → @tanstack/virtual-core@3 (CDN), #loading flag for empty-state
DataLoader.load() → Phase 1 streaming (PRIMARY_DATA_KEYS, @streamparser/json CDN)
               → Phase 2 streaming (ENRICHMENT_DATA_KEYS, same #streamKey mechanism)
               → PUBLIC_REFERENCE_DATA_KEYS also streamed via #streamKey
loadForTab(tabId) → TAB_DATA_KEYS keys streamed via #streamKey on demand
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
