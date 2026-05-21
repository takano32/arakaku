---
name: arakaku-docs-handoff
description: Use this skill when updating README, AGENTS.md, SKILL.md, handoff notes, next task lists, operations checklists, or other project documentation for human and agent handoff.
---

# ARAKAKU Documentation and Handoff Skill

Use this skill when updating project documentation.

Important documentation files:

```text
README.md
AGENTS.md
.agents/skills/arakaku-maintainer/SKILL.md
HANDOFF.md
NEXT_TASKS.md
OPERATIONS_CHECKLIST.md
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

Current expected data scale:

```text
source_documents.csv: 480 rows
source_mentions.csv: 1801 rows
```

Current source document types:

```text
youtube_description
note_article
```

Current mention types:

```text
event
youtube_url
result
matchup
note_url
```

Current viewer tabs:

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
