---
name: arakaku-actions-ops
description: Use this skill when maintaining ARAKAKU GitHub Actions, Pages deployment, CI workflow files, Makefile validation commands, or Node.js action deprecation updates.
---

# ARAKAKU Actions and Operations Skill

Use this skill when editing workflows or operational checks.

Workflow files:

```text
.github/workflows/test.yml
.github/workflows/pages.yml
```

---

## Current preferred actions

Expected current action versions:

```text
actions/checkout@v5
actions/setup-python@v6
actions/configure-pages@v6
actions/upload-pages-artifact@v5
actions/deploy-pages@v5
```

Check with:

```bash
grep -RIn "uses: actions/" .github/workflows
```

---

## Required local checks

After workflow or Makefile changes:

```bash
make check
make clean-generated
```

---

## Pages deployment

Pages should build generated JSON, upload artifact, and deploy.

Generated JSON is not committed. It is produced during workflow build.

Expected generated files include:

```text
docs/data/metadata.json
docs/data/articles.json
docs/data/promotions.json
docs/data/events.json
docs/data/bouts.json
docs/data/fighters.json
docs/data/titles.json
docs/data/fighter_snapshots.json
docs/data/videos.json
docs/data/video_links.json
docs/data/aliases.json
docs/data/source_documents.json
docs/data/source_mentions.json
docs/data/numbers_fighters.json
docs/data/numbers_name_matches.json
docs/data/numbers_fight_records.json
docs/data/youtube_archives.json
docs/data/note_archives.json
```

---

## Branch

Default branch:

```text
master
```

Do not assume `main`.

---

## Node.js deprecation

If GitHub warns that Node.js 20 actions are deprecated:

1. First update actions to the latest stable major versions.
2. Prefer Pages artifact actions compatible with current GitHub requirements.
3. Do not downgrade Pages artifact actions without a reason.
4. Re-run workflows and inspect logs.

Current expected Pages artifact action:

```text
actions/upload-pages-artifact@v5
```

---

## Workflow update checklist

After changes:

```bash
grep -RIn "uses: actions/" .github/workflows
make check
make clean-generated
git diff .github/workflows Makefile
```

After push:

- inspect Test workflow
- inspect Deploy Pages workflow
- confirm Pages viewer loads

Pages URL:

```text
https://takano32.github.io/arakaku/
```

---

## Do not commit

Do not commit generated JSON or local caches:

```text
docs/data/*.json
tmp/note-html/*.html
tmp/youtube-info/*.info.json
```
