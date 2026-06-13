# ARAKAKU Scripting Instructions

Python scripts in this directory handle data processing, validation, and extraction.

## Development Standards

### 1. Robustness
- Scripts should handle missing or malformed data gracefully.
- Log errors and warnings clearly; do not fail silently.

### 2. No Side Effects on Canonical Data (mostly)
- Most scripts should read from `data-src/` and output to `docs/data/` or `review/`.
- Only explicitly named "apply" scripts (e.g., `apply_structured_result_patches.py`) should modify `data-src/*.csv`.
- `extract_numbers.py` is an explicit source import script: it reads `data-raw/アラカク選手名鑑.numbers` and regenerates the Numbers-derived CSVs in `data-src/`.
- Numbers-derived CSVs are comparison/review inputs. Do not use import scripts to confirm winners, bouts, or participant results without a separate review step. The static viewer uses these for automated supplementation of unknown fields.
- `archive_metadata.py` is an explicit cache-to-source archiving script: it reads local cache files and regenerates `data-src/archives/youtube.csv` and `data-src/archives/note.csv`.
- Archive CSVs preserve external metadata for review/display. Do not use archive rows to confirm bout results or fighter identities without a separate review step.
- `download_official_data.sh` downloads the full `src/` tree from `kobayashi856/arakaku-site` into `tmp/arakaku-site/`. Run via `make download-official-data` (included in `make cache-sources`).
- `generate_official_csvs.py` reads `tmp/arakaku-site/data/*.json` and writes `data-src/official_*.csv`. This is a stage-1 script (raw ingestion from `tmp/`). Do not derive values from other CSVs here.
- `build_official_json.py` reads `data-src/official_*.csv` and writes `docs/data/official_players.json`, `official_tournaments.json`, `official_matches.json`, and `official_history.json` (`build_official_pages_json.py` writes `official_news.json` / `official_pages.json`). Run via `make build`. **IMPORTANT: never add official data enrichment to `build_json.py`** — all enrichment happens client-side in `data-enricher.js`.

### 3. Verification
- All scripts contributing to the build should be compatible with `make check`.
- Add unit tests in `../tests/` for complex logic.

## Key Scripts

- `arakaku/`: Shared package — `utils.py` (CSV/JSON I/O, field transforms, `EntityMapper`), `textparse.py` (text-parsing patterns/functions shared verbatim across scripts; vocabulary-divergent patterns stay local to each script), `mapping.py` (entity schema builders), `validation.py` (enum constants).
- `build_json.py`: The core build script. Rebuilds all JSON artifacts. **Do not add enrichment logic here.**
- `build_official_json.py`: Builds `official_players.json`, `official_tournaments.json`, `official_matches.json`, and `official_history.json` from `data-src/official_*.csv`. Run via `make build`.
- `validate_json.py`: Ensures structural integrity and referential correctness.
- `extract_numbers.py`: Exports `numbers_fighters.csv`, `numbers_name_matches.csv`, and `numbers_fight_records.csv` from the Numbers file.
- `download_official_data.sh`: Downloads `src/` tree from official site repo into `tmp/arakaku-site/`.
- `generate_official_csvs.py`: Converts `tmp/arakaku-site/data/*.json` to `data-src/official_*.csv`.
- `cache_*.py`: Fetch external data and cache it in `../tmp/`.
- `archive_metadata.py`: Extracts critical metadata from cached data into `data-src/archives/` for permanent storage.
- `make_*_candidates.py`: Analyze data and generate review candidates.

## Workflow for Script Changes
1. Modify the script.
2. Run `make check`.
3. Verify that the generated JSON or review CSVs are correct.
4. Run `make clean-generated` if appropriate.
