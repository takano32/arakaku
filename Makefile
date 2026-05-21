.PHONY: build validate test check clean-generated

build:
	OAI_IS_JUPYTER_KERNEL=0 python scripts/build_json.py

validate:
	OAI_IS_JUPYTER_KERNEL=0 python scripts/validate_json.py

test:
	OAI_IS_JUPYTER_KERNEL=0 python -m pytest -q

check: build validate test

clean-generated:
	rm -f docs/data/*.json
	touch docs/data/.gitkeep

.PHONY: cache-note-html cache-youtube-info cache-sources build-sources refresh-sources

cache-note-html:
	python scripts/cache_note_html.py

cache-youtube-info:
	python scripts/cache_youtube_info.py

cache-sources: cache-note-html cache-youtube-info

build-sources:
	python scripts/build_source_documents.py

refresh-sources: cache-sources build-sources check
