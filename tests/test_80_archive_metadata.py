from pathlib import Path

import pytest

from conftest import load_module


@pytest.fixture
def archive_metadata_module(repo_root):
    return load_module("archive_metadata", repo_root / "scripts" / "archive_metadata.py")


def test_keep_uncached_rows_keeps_archived_rows_missing_from_cache(archive_metadata_module):
    rows = [{"display_id": "a", "fulltitle": "new"}]
    existing = {
        "a": {"display_id": "a", "fulltitle": "old"},
        "gone": {"display_id": "gone", "fulltitle": "deleted video"},
    }

    archive_metadata_module.keep_uncached_rows(rows, existing, "display_id", Path("youtube.csv"))

    assert rows == [
        {"display_id": "a", "fulltitle": "new"},
        {"display_id": "gone", "fulltitle": "deleted video"},
    ]
