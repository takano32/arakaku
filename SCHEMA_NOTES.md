# ARAKAKU maximum CSV notes

This bundle prioritizes maximum coverage for events, bouts, and fighters.

`data-src/bouts.csv` includes inferred matchups extracted from official YouTube titles.
Many inferred rows have:

- `result_status=unknown`
- empty `winner_id`, `winner`, `loser_id`, `loser`
- empty method/round/time fields

This is intentional. The video title often identifies the card but not the result.
Do not fill winners or methods unless they are confirmed from reliable result sources.

Before replacing the repository's current `data-src/` with this maximum version,
update `build_json.py` and `validate_json.py` to accept unknown-result bouts.
