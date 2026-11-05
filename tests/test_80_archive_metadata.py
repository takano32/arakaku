from pathlib import Path

from arakaku.sources.archives import keep_uncached_rows


def test_keep_uncached_rows_keeps_archived_rows_missing_from_cache():
    rows = [{"display_id": "a", "fulltitle": "new"}]
    existing = {
        "a": {"display_id": "a", "fulltitle": "old"},
        "gone": {"display_id": "gone", "fulltitle": "deleted video"},
    }

    keep_uncached_rows(rows, existing, "display_id", Path("youtube.csv"))

    assert rows == [
        {"display_id": "a", "fulltitle": "new"},
        {"display_id": "gone", "fulltitle": "deleted video"},
    ]
