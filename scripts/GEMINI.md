# ARAKAKU Scripting Instructions

Python scripts in this directory handle data processing, validation, and extraction.

## Development Standards

### 1. Robustness
- Scripts should handle missing or malformed data gracefully.
- Use `tqdm` for long-running processes to provide feedback.
- Log errors and warnings clearly; do not fail silently.

### 2. No Side Effects on Canonical Data (mostly)
- Most scripts should read from `data-src/` and output to `docs/data/` or `review/`.
- Only explicitly named "apply" scripts (e.g., `apply_structured_result_patches.py`) should modify `data-src/*.csv`.
- `extract_numbers.py` is an explicit source import script: it reads `data-raw/アラカク選手名鑑.numbers` and regenerates the Numbers-derived CSVs in `data-src/`.
- Numbers-derived CSVs are comparison/review inputs. Do not use import scripts to confirm winners, bouts, or participant results without a separate review step.

### 3. Verification
- All scripts contributing to the build should be compatible with `make check`.
- Add unit tests in `../tests/` for complex logic.

## Key Scripts

- `build_json.py`: The core build script. Rebuilds all JSON artifacts.
- `validate_json.py`: Ensures structural integrity and referential correctness.
- `extract_numbers.py`: Exports `numbers_fighters.csv`, `numbers_name_matches.csv`, and `numbers_fight_records.csv` from the Numbers file.
- `cache_*.py`: Fetch external data and cache it in `../tmp/`.
- `make_*_candidates.py`: Analyze data and generate review candidates.

## Workflow for Script Changes
1. Modify the script.
2. Run `make check`.
3. Verify that the generated JSON or review CSVs are correct.
4. Run `make clean-generated` if appropriate.
