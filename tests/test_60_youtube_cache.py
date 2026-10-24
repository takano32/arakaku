import importlib
import json
import sys

import pytest


@pytest.fixture
def youtube_module(repo_root):
    # arakaku.youtube は arakaku.utils を絶対 import するので scripts/ をパスに載せて package として読む。
    if str(repo_root / "scripts") not in sys.path:
        sys.path.insert(0, str(repo_root / "scripts"))
    return importlib.import_module("arakaku.youtube")


@pytest.mark.parametrize(
    ("iso_duration", "expected"),
    [("PT1M6S", "1:06"), ("PT45S", "45"), ("PT1H2M3S", "1:02:03"), ("PT2H", "2:00:00"), ("P1DT1M", "24:01:00"), ("", "")],
)
def test_duration_string(youtube_module, iso_duration, expected):
    assert youtube_module.duration_string(iso_duration) == expected


def test_iter_cached_videos_flattens_api_item(youtube_module, tmp_path):
    item = {
        "id": "abc123",
        "snippet": {
            "title": "タイトル",
            "channelTitle": "アラカク通信",
            "publishedAt": "2025-05-01T10:00:00Z",
            "description": "line1\nline2",
            "thumbnails": {"high": {}, "default": {}, "medium": {}},
        },
        "contentDetails": {"duration": "PT1M6S"},
        "statistics": {"viewCount": "1234"},
    }
    (tmp_path / "abc123.json").write_text(json.dumps(item, ensure_ascii=False), encoding="utf-8")

    [(path, video)] = list(youtube_module.iter_cached_videos(tmp_path))

    assert path.name == "abc123.json"
    assert video == {
        "platform_video_id": "abc123",
        "url": "https://www.youtube.com/watch?v=abc123",
        "title": "タイトル",
        "channel": "アラカク通信",
        "upload_date": "20250501",
        "duration_string": "1:06",
        "view_count": "1234",
        "like_count": "",
        "description": "line1\nline2",
        "thumbnail_sizes": "default medium high",
    }


def test_thumbnail_sizes_orders_known_sizes_and_keeps_unknown(youtube_module):
    thumbnails = {"maxres": {}, "zzz": {}, "standard": {}, "default": {}}

    assert youtube_module.thumbnail_sizes(thumbnails) == "default standard maxres zzz"
