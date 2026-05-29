# ──────────────────────────────────────────────────────────────────
# Core build pipeline (JSON generation + validation + tests)
# ──────────────────────────────────────────────────────────────────
.PHONY: build build-official validate test check

build:
	OAI_IS_JUPYTER_KERNEL=0 python scripts/build_json.py
	OAI_IS_JUPYTER_KERNEL=0 python scripts/build_numbers_json.py

build-official:
	OAI_IS_JUPYTER_KERNEL=0 python scripts/build_official_json.py
	OAI_IS_JUPYTER_KERNEL=0 python scripts/build_official_pages_json.py

validate:
	OAI_IS_JUPYTER_KERNEL=0 python scripts/validate_json.py
	node scripts/validate_json.js

test:
	OAI_IS_JUPYTER_KERNEL=0 python -m pytest -q

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
.PHONY: cache-note-html cache-youtube-info cache-sources \
        download-official-data \
        archive-metadata build-sources refresh-sources \
        source-mention-result-candidates source-reference-candidates \
        reorder-data

cache-note-html:
	python scripts/cache_note_html.py

cache-youtube-info:
	python scripts/cache_youtube_info.py

download-official-data:
	bash scripts/download_official_data.sh

cache-sources: cache-note-html cache-youtube-info download-official-data

archive-metadata:
	python scripts/archive_metadata.py

build-sources:
	python scripts/build_source_documents.py

reorder-data:
	python scripts/reorder_data.py

refresh-sources: cache-sources archive-metadata build-sources reorder-data check

source-mention-result-candidates:
	python scripts/make_source_mention_result_candidates.py

source-reference-candidates:
	python scripts/make_source_reference_candidates.py

# ──────────────────────────────────────────────────────────────────
# Numbers pipeline (requires data-raw/アラカク選手名鑑.numbers)
# ──────────────────────────────────────────────────────────────────
.PHONY: extract-numbers

extract-numbers:
	python scripts/extract_numbers.py

# ──────────────────────────────────────────────────────────────────
# Reproducibility: regenerate all generated CSVs from local sources,
# then rebuild JSON and run full check.
#
# Prerequisites (must exist locally, not in git):
#   tmp/note-html/       — cached note article HTML files
#   tmp/youtube-info/    — yt-dlp *.info.json files
#   data-raw/アラカク選手名鑑.numbers
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
	python scripts/extract_numbers.py
	python scripts/archive_metadata.py
	python scripts/generate_articles.py
	python scripts/build_source_documents.py
	python scripts/generate_official_csvs.py
	python scripts/reorder_data.py

generate-stage2:
	python scripts/generate_promotions.py
	python scripts/generate_titles.py
	python scripts/generate_aliases.py
	python scripts/generate_video_links.py
	python scripts/generate_article_links.py
	python scripts/generate_official_pages_csv.py

regenerate-csvs: generate-stage1 generate-stage2

rebuild: clean-generated-csvs clean-generated regenerate-csvs check

rebuild-stage2: clean-stage2-csvs clean-generated generate-stage2 check
