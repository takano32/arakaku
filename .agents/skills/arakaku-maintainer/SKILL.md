---
name: arakaku-maintainer
description: Use this skill when working on the takano32/arakaku project. It teaches Codex how to safely maintain the CSV-backed Unofficial ARAKAKU Database, generated JSON, GitHub Pages viewer, source document pipeline, review CSV workflow, and validation commands.
---

# Unofficial ARAKAKU Database Maintainer Skill

This skill is for working on the `takano32/arakaku` repository.

Use this skill whenever the task touches:

- `data-src/*.csv`
- `review/*.csv`
- `scripts/*.py`
- `tests/*.py`
- `docs/index.html`
- `docs/assets/js/**/*.js`
- `docs/assets/app.css`
- `.github/workflows/*.yml`
- `Makefile`

---

## Project model

1. Source CSVs — canonical data in `data-src/*.csv`
2. Generated JSON — build scripts convert CSVs into `docs/data/*.json`
3. GitHub Pages viewer — `docs/index.html`, `docs/assets/js/`, `docs/assets/app.css` (feature map: `docs/VIEWER_FEATURES.md`)

Do not edit generated JSON directly.

---

## Build scripts

Four build scripts, all run by `make build`:

```text
scripts/build_json.py                ← core entities (bouts, fighters, events, etc.)
scripts/build_numbers_json.py        ← numbers_*.csv → numbers_*.json
scripts/build_official_json.py       ← official_players/tournaments/matches/history
scripts/build_official_pages_json.py ← official_news/pages
```

There is no separate `make build-official`. All four run under `make build`.

---

## Official data pipeline

Official site data comes from `kobayashi856/arakaku-site`.

Download:

```bash
make download-official-data   # → tmp/arakaku-site/ (including public/)
```

Stage 1 CSVs (`scripts/generate_official_csvs.py`, from `tmp/arakaku-site/data/*.json`):

```text
data-src/official_players.csv
data-src/official_tournaments.csv
data-src/official_matches.csv
data-src/official_history.csv
```

Stage 2 CSVs (from Astro/Markdown, `scripts/generate_official_pages_csv.py`):

```text
data-src/official_news.csv    ← content/news/*.md
data-src/official_pages.csv   ← pages/about.astro + history.astro
```

Astro syntax stripped: Tailwind classes, frontmatter, JSX `.map()`, `{base}` interpolations. `maxbout.astro` and `index.astro` excluded.

`scripts/build_official_pages_json.py` no longer embeds images (no Base64). Image and link paths starting with `/` are kept as-is, and the viewer rewrites them to the official site at render time.

**Client-side enrichment only.** Never add official data to `scripts/build_json.py`. All enrichment lives in `docs/assets/js/data/enricher.js` (and the synthesis in `docs/assets/js/data/repository.js`).

Fighter summary placeholder `"公式YouTube動画タイトルから抽出した選手。詳細未入力。"` is cleared in `enrichFighter` and replaced with Numbers catchphrase/notes when available.

---

## Critical rules

- Never edit `docs/data/*.json` directly
- Never commit `tmp/note-html/`, `tmp/youtube-api/`, `tmp/arakaku-site/`
- Never add enrichment logic to `build_json.py`
- Never invent confirmed facts (winner, method, round, time, identity, title lineage)
- Keep uncertain data in `review/` before applying to `data-src/`

---

## Standard commands

```bash
make check           # build → validate → pytest
make clean-generated # remove docs/data/*.json
make reorder-data    # normalize CSV sort order
```

`make validate` runs `validate_json.py` (schema/referential), `validate_json.js` (viewer
parser/loader + render-path coverage), `test_filters.mjs` (Node unit test for the viewer's
`itemPassesFilters` filtering engine — built-in `node:test`, no deps), and `test_markdown.mjs`
(Node unit test for the viewer's Markdown renderer).

For source refresh:

```bash
make refresh-sources
```

`refresh-sources` = `cache-sources` (including `discover-note-articles` and
`discover-youtube-videos`) → `archive-metadata` → `generate-articles` → `build-sources` →
`generate-official-csvs` → `generate-stage2` → `reorder-data` → `check`.

After editing canonical CSVs (bouts / fighters / events / bout_participants / videos /
video_bout_links / video_event_links / title_reigns / fighter_snapshots):

```bash
make generate-stage2   # regenerate derived CSVs and review candidates
make check
# after committing, on a clean tree (CI runs this too):
make check-generated
make clean-generated   # optional cleanup
```

---

## Viewer tabs

PUBLIC_TABS (通常ビュー, keyboard 1–8):

```text
1: 公式   (official)  ← official pages + news
2: 通信   (tsushin)   ← アラカク通信のーと note articles
3: 試合   (bouts)
4: 選手   (fighters)
5: 大会   (events)
6: 団体   (promotions)
7: 王座   (titles)
8: 動画   (videos)
```

ADMIN_TABS (管理ビュー):

```text
出典本文 (sources)
出典言及 (mentions)
名鑑選手 (numbersFighters)
名前対応 (numbersNameMatches)
名鑑記録 (numbersFightRecords)
公式選手 (officialPlayers)
公式     (officialMisc)  ← tournaments + matches + history combined
```

See `arakaku-viewer-ui` for rendering architecture, `arakaku-filters` for the
config-driven per-tab 階級/団体/種別 filters, and `arakaku-reliability-layering` for
source-tier enrichment, sorting, and the duplicate-fighter merge.

---

## GitHub Actions

`test.yml` and `pages.yml` both run `make check` (build → validate → test) and then
`make check-generated`; `pages.yml` uploads and deploys `docs/` only if both pass.
Python 3.12 (pip cache keyed on `requirements-ci.txt`, pytest 9.0.2), Node 24 via
`actions/setup-node@v5`, `timeout-minutes: 15`.
Default branch: `master`. See `arakaku-actions-ops` for action versions and deployment.

---

## Numbers-derived CSVs

Built by `scripts/build_numbers_json.py`. Do not promote Numbers fight records into `bouts.csv` without review.

## Sorting policy

CSVs: ascending. Viewer display: descending. See `arakaku-sorting-strategy`.
