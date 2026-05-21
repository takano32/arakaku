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
