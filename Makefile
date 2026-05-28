# ──────────────────────────────────────────────────────────────────
# Core build pipeline (JSON generation + validation + tests)
# ──────────────────────────────────────────────────────────────────
.PHONY: build validate test check

build:
	OAI_IS_JUPYTER_KERNEL=0 python scripts/build_json.py

validate:
	OAI_IS_JUPYTER_KERNEL=0 python scripts/validate_json.py
	node scripts/validate_json.js

test:
	OAI_IS_JUPYTER_KERNEL=0 python -m pytest -q

check: build validate test

# ──────────────────────────────────────────────────────────────────
# Clean targets
#
# clean-generated      : remove generated docs/data/*.json only
# clean-generated-csvs : remove CSVs that are produced by scripts
#                        (archives, source_documents, source_mentions,
#                         numbers_*). Canonical/handcrafted CSVs are
#                         NOT touched — they are the source of truth.
# ──────────────────────────────────────────────────────────────────
.PHONY: clean-generated clean-generated-csvs

clean-generated:
	rm -f docs/data/*.json
	touch docs/data/.gitkeep

clean-generated-csvs:
	rm -f data-src/archives/youtube.csv
	rm -f data-src/archives/note.csv
	rm -f data-src/source_documents.csv
	rm -f data-src/source_mentions.csv
	rm -f data-src/numbers_fighters.csv
	rm -f data-src/numbers_name_matches.csv
	rm -f data-src/numbers_fight_records.csv
	rm -f data-src/video_links.csv
	rm -f data-src/aliases.csv
	rm -f data-src/articles.csv

# ──────────────────────────────────────────────────────────────────
# Source crawl pipeline (requires network / local cache in tmp/)
# ──────────────────────────────────────────────────────────────────
.PHONY: cache-note-html cache-youtube-info cache-sources \
        archive-metadata build-sources refresh-sources \
        source-mention-result-candidates source-reference-candidates \
        reorder-data

cache-note-html:
	python scripts/cache_note_html.py

cache-youtube-info:
	python scripts/cache_youtube_info.py

cache-sources: cache-note-html cache-youtube-info

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
# ──────────────────────────────────────────────────────────────────
.PHONY: generate-derived-csvs regenerate-csvs rebuild

generate-derived-csvs:
	python scripts/generate_articles.py
	python scripts/generate_aliases.py
	python scripts/generate_video_links.py

regenerate-csvs: extract-numbers archive-metadata build-sources reorder-data generate-derived-csvs

rebuild: clean-generated-csvs clean-generated regenerate-csvs check
