# ──────────────────────────────────────────────────────────────────
# Core build pipeline (JSON generation + validation + tests)
# ──────────────────────────────────────────────────────────────────
.PHONY: build validate test check

build:
	python3 scripts/build_json.py
	python3 scripts/build_numbers_json.py
	python3 scripts/build_official_json.py
	python3 scripts/build_official_pages_json.py

# validate and test read docs/data, so they build first (make runs build once per invocation,
# so `make check` still builds only once; a fresh clone can run `make test` directly).
validate: build
	python3 scripts/validate_json.py
	node scripts/validate_json.js
	node scripts/test_filters.mjs
	node scripts/test_markdown.mjs

test: build
	python3 -m pytest -q

check: build validate test

# ──────────────────────────────────────────────────────────────────
# Clean targets
#
# clean-generated        : remove generated docs/data/*.json only
# clean-stage1-csvs      : remove stage1 outputs (numbers, archives,
#                          source_documents, source_mentions, articles)
# clean-stage2-csvs      : remove stage2 outputs (promotions, titles,
#                          aliases, video_links, article_links)
# clean-generated-csvs   : clean-stage1-csvs + clean-stage2-csvs
# ──────────────────────────────────────────────────────────────────
.PHONY: clean-generated clean-stage1-csvs clean-stage2-csvs clean-generated-csvs

clean-generated:
	rm -f docs/data/*.json
	touch docs/data/.gitkeep

clean-stage1-csvs:
	rm -f data-src/archives/youtube.csv
	rm -f data-src/archives/note.csv
	rm -f data-src/source_documents.csv
	rm -f data-src/source_mentions.csv
	rm -f data-src/numbers_fighters.csv
	rm -f data-src/numbers_name_matches.csv
	rm -f data-src/numbers_fight_records.csv
	rm -f data-src/articles.csv

clean-stage2-csvs:
	rm -f data-src/promotions.csv
	rm -f data-src/titles.csv
	rm -f data-src/aliases.csv
	rm -f data-src/video_links.csv
	rm -f data-src/article_links.csv

clean-generated-csvs: clean-stage1-csvs clean-stage2-csvs

# ──────────────────────────────────────────────────────────────────
# Source crawl pipeline (requires network / local cache in tmp/)
# ──────────────────────────────────────────────────────────────────
.PHONY: cache-note-html cache-youtube-api cache-sources \
        download-official-data \
        archive-metadata build-sources refresh-sources \
        source-mention-result-candidates source-reference-candidates \
        reorder-data

cache-note-html:
	python3 scripts/cache_note_html.py

cache-youtube-api:
	python3 scripts/cache_youtube_api.py

download-official-data:
	bash scripts/download_official_data.sh

cache-sources: cache-note-html cache-youtube-api download-official-data

archive-metadata:
	python3 scripts/archive_metadata.py

build-sources:
	python3 scripts/build_source_documents.py

reorder-data:
	python3 scripts/reorder_data.py

refresh-sources: cache-sources archive-metadata build-sources reorder-data check

source-mention-result-candidates:
	python3 scripts/make_source_mention_result_candidates.py

source-reference-candidates:
	python3 scripts/make_source_reference_candidates.py

# ──────────────────────────────────────────────────────────────────
# Numbers pipeline (requires data-raw/アラカク選手名鑑.numbers)
# ──────────────────────────────────────────────────────────────────
.PHONY: extract-numbers

extract-numbers:
	python3 scripts/extract_numbers.py

# ──────────────────────────────────────────────────────────────────
# Reproducibility: regenerate all generated CSVs from local sources,
# then rebuild JSON and run full check.
#
# Prerequisites:
#   tmp/note-html/       — cached note article HTML files (local only, not in git)
#   tmp/youtube-api/     — YouTube Data API video JSON files (local only; needs YOUTUBE_API_KEY)
#   data-raw/アラカク選手名鑑.numbers (tracked in git; updated by hand)
#
# Canonical CSVs (fighters, events, bouts, …) are restored from git.
#
# generate-stage1: raw data ingestion (Numbers + crawl cache → base CSVs)
#   extract_numbers   → numbers_*.csv
#   archive_metadata  → archives/youtube.csv, archives/note.csv
#   generate_articles → articles.csv  (must precede build_source_documents)
#   build_source_documents → source_documents.csv, source_mentions.csv
#   reorder_data      → stable row order for all CSVs
#
# generate-stage2: derivation (stage1 CSVs → derived CSVs)
#   generate_promotions   → promotions.csv
#   generate_titles       → titles.csv
#   generate_aliases      → aliases.csv
#   generate_video_links  → video_links.csv
#   generate_article_links → article_links.csv
# ──────────────────────────────────────────────────────────────────
.PHONY: generate-stage1 generate-stage2 regenerate-csvs rebuild rebuild-stage2

generate-stage1:
	python3 scripts/extract_numbers.py
	python3 scripts/archive_metadata.py
	python3 scripts/generate_articles.py
	python3 scripts/build_source_documents.py
	python3 scripts/generate_official_csvs.py
	python3 scripts/reorder_data.py

generate-stage2:
	python3 scripts/generate_promotions.py
	python3 scripts/generate_titles.py
	python3 scripts/generate_aliases.py
	python3 scripts/generate_video_links.py
	python3 scripts/generate_article_links.py
	python3 scripts/generate_official_pages_csv.py

regenerate-csvs: generate-stage1 generate-stage2

# check-generated: rerun the offline derivations (no tmp/ or data-raw/ needed) and fail if
# the committed CSVs differ, e.g. bouts.csv was edited without `make generate-stage2`.
# Run it on a clean working tree: it compares against git.
# generate_official_pages_csv.py is left out because it reads tmp/arakaku-site.
.PHONY: check-generated
check-generated:
	python3 scripts/generate_promotions.py
	python3 scripts/generate_titles.py
	python3 scripts/generate_aliases.py
	python3 scripts/generate_video_links.py
	python3 scripts/generate_article_links.py
	python3 scripts/reorder_data.py
	python3 scripts/make_source_mention_result_candidates.py
	python3 scripts/make_source_reference_candidates.py
	git diff --exit-code --stat -- data-src review

# Inputs that are not in git. Check them before the clean-* targets delete committed CSVs,
# so a missing cache stops the rebuild instead of leaving data-src half deleted.
STAGE1_INPUTS = tmp/note-html tmp/youtube-api data-raw/アラカク選手名鑑.numbers tmp/arakaku-site
STAGE2_INPUTS = tmp/arakaku-site/content/news tmp/arakaku-site/pages

.PHONY: check-stage1-inputs check-stage2-inputs
check-stage1-inputs:
	@for p in $(STAGE1_INPUTS); do [ -e "$$p" ] || { echo "missing input: $$p (nothing was deleted)"; exit 1; }; done

check-stage2-inputs:
	@for p in $(STAGE2_INPUTS); do [ -e "$$p" ] || { echo "missing input: $$p (nothing was deleted)"; exit 1; }; done

rebuild: check-stage1-inputs check-stage2-inputs clean-generated-csvs clean-generated regenerate-csvs check

rebuild-stage2: check-stage2-inputs clean-stage2-csvs clean-generated generate-stage2 check
