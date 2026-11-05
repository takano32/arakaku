from __future__ import annotations

# 入口スクリプトの main を、入出力先を tmp_path に差し替えて通す (T112.6.22・T112.6.24)。
# 規則そのものは arakaku/ の単体テストが見るので、ここでは読み書きのつなぎ方と、入力が欠けたときに
# 何も書かずに止まることを見る。

import csv
import json

import pytest


def write_rows(path, rows):
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def read_rows(path):
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


# --- apply_structured_result_patches.py ---

BOUT = {"bout_id": "b1", "event_id": "e1", "result_status": "unknown", "round": "", "time": "", "method_raw": "",
        "method_normalized": "", "technique": "", "decision_score": "", "notes": "", "extra": "keep"}
PARTICIPANTS = [
    {"participant_id": "b1-red", "bout_id": "b1", "side": "red", "fighter_id": "bill", "fighter_name": "ビル", "result": ""},
    {"participant_id": "b1-blue", "bout_id": "b1", "side": "blue", "fighter_id": "waku", "fighter_name": "わく", "result": ""},
]
PATCH = {"apply": "true", "bout_id": "b1", "winner": "わく", "loser": "ビル", "round": "2R", "time": "1分05秒",
         "method_raw": "KO", "method_normalized": "KO", "technique": "", "decision_score": "",
         "source_article_id": "note-x", "source_line_start": "3", "source_line_end": "5"}


@pytest.fixture
def patch_script(load_script, monkeypatch, tmp_path):
    module = load_script("apply_structured_result_patches")
    monkeypatch.setattr(module, "BOUTS_CSV", tmp_path / "bouts.csv")
    monkeypatch.setattr(module, "PARTICIPANTS_CSV", tmp_path / "bout_participants.csv")
    write_rows(module.BOUTS_CSV, [BOUT])
    write_rows(module.PARTICIPANTS_CSV, PARTICIPANTS)
    return module


def test_apply_patches_main_writes_back_the_result(patch_script, monkeypatch, tmp_path):
    write_rows(tmp_path / "patch.csv", [PATCH, {**PATCH, "apply": "false", "bout_id": "b9"}])
    monkeypatch.setattr("sys.argv", ["apply_structured_result_patches.py", str(tmp_path / "patch.csv")])
    assert patch_script.main() == 0
    [bout] = read_rows(patch_script.BOUTS_CSV)
    assert list(bout) == list(BOUT)  # 列の構成はそのまま
    assert (bout["result_status"], bout["round"], bout["time"], bout["method_normalized"], bout["extra"]) == ("known", "2R", "1分05秒", "KO", "keep")
    assert bout["notes"] == "Structured result from note-x lines 3-5."
    assert [p["result"] for p in read_rows(patch_script.PARTICIPANTS_CSV)] == ["loss", "win"]
    # 再実行しても注記を二重に書かない。
    assert patch_script.main() == 0
    assert read_rows(patch_script.BOUTS_CSV)[0]["notes"] == "Structured result from note-x lines 3-5."


def test_apply_patches_main_skips_rows_whose_names_do_not_match(patch_script, monkeypatch, tmp_path, capsys):
    write_rows(tmp_path / "patch.csv", [{**PATCH, "winner": "だれか"}])
    monkeypatch.setattr("sys.argv", ["apply_structured_result_patches.py", str(tmp_path / "patch.csv")])
    assert patch_script.main() == 0
    assert "[warn] winner/loser do not match the participants' names: b1" in capsys.readouterr().out
    assert read_rows(patch_script.BOUTS_CSV) == [BOUT]


# --- generate_official_csvs.py ---

OFFICIAL_INPUTS = {
    "players.json": [{"id": "p1", "name": "わく", "age": None}],
    "tournaments.json": [{"id": "t1", "name": "GP"}],
    "matches.json": [{"id": "m1", "event": "No.1"}],
    "history.json": [{"year": 1996, "era": "黎明期", "events": [{"title": "旗揚げ"}]}],
}


@pytest.fixture
def official_script(load_script, monkeypatch, tmp_path):
    module = load_script("generate_official_csvs")
    monkeypatch.setattr(module, "SRC", tmp_path / "data")
    monkeypatch.setattr(module, "DATA_SRC", tmp_path / "out")
    module.SRC.mkdir()
    for name, data in OFFICIAL_INPUTS.items():
        (module.SRC / name).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return module


def test_generate_official_csvs_writes_the_four_csvs(official_script):
    official_script.main()
    out = official_script.DATA_SRC
    assert sorted(p.name for p in out.iterdir()) == ["official_history.csv", "official_matches.csv", "official_players.csv", "official_tournaments.csv"]
    assert read_rows(out / "official_players.csv")[0]["age"] == ""
    assert read_rows(out / "official_history.csv")[0]["year"] == "1996"


def test_generate_official_csvs_writes_nothing_when_an_input_is_missing(official_script):
    # 以前は 1 つ読んでは 1 つ書いたので、matches.json が無いと players・tournaments だけが書き換わった (T112.6.24)。
    (official_script.SRC / "matches.json").unlink()
    with pytest.raises(SystemExit, match="matches.json not found"):
        official_script.main()
    assert not official_script.DATA_SRC.exists()


# --- generate_official_pages_csv.py ---

@pytest.fixture
def pages_script(load_script, monkeypatch, tmp_path):
    module = load_script("generate_official_pages_csv")
    monkeypatch.setattr(module, "NEWS_DIR", tmp_path / "content" / "news")
    monkeypatch.setattr(module, "PAGES_DIR", tmp_path / "pages")
    monkeypatch.setattr(module, "DATA_SRC", tmp_path / "out")
    module.NEWS_DIR.mkdir(parents=True)
    module.PAGES_DIR.mkdir()
    (module.NEWS_DIR / "b.md").write_text('---\ntitle: "B"\n---\nbody b\n', encoding="utf-8")
    (module.NEWS_DIR / "a.md").write_text('---\ntitle: "A"\n---\nbody a\n', encoding="utf-8")
    for slug, _, _ in module.ASTRO_PAGES:
        (module.PAGES_DIR / f"{slug}.astro").write_text(f"<p>{slug}</p>", encoding="utf-8")
    return module


def test_generate_official_pages_csv_writes_news_and_pages(pages_script):
    pages_script.main()
    out = pages_script.DATA_SRC
    assert [(r["slug"], r["title"], r["body_md"]) for r in read_rows(out / "official_news.csv")] == [("a", "A", "body a"), ("b", "B", "body b")]
    assert [(r["slug"], r["body_html"]) for r in read_rows(out / "official_pages.csv")] == [(s, f"<p>{s}</p>") for s, _, _ in pages_script.ASTRO_PAGES]


def test_generate_official_pages_csv_writes_nothing_when_a_page_is_missing(pages_script):
    slug = pages_script.ASTRO_PAGES[-1][0]
    (pages_script.PAGES_DIR / f"{slug}.astro").unlink()
    with pytest.raises(SystemExit, match=f"{slug}.astro not found"):
        pages_script.main()
    assert not pages_script.DATA_SRC.exists()


# --- archive_metadata.py ---

YOUTUBE_ITEM = {
    "id": "YT1",
    "snippet": {"title": "Full Fight", "channelTitle": "アラカク通信", "publishedAt": "2026-07-01T00:00:00Z",
                "description": "d", "thumbnails": {"high": {}, "default": {}}},
    "contentDetails": {"duration": "PT1M5S"},
    "statistics": {"viewCount": "10", "likeCount": "2"},
}
NOTE_HTML = (
    '<html><head><title>ターゲットNo.1試合結果｜アラカク</title>'
    '<link rel="canonical" href="https://note.com/xyz1090/n/n0123456789ab">'
    '<meta name="description" content="説明"></head>'
    '<script>{"datePublished": "2026-07-02T09:00:00.000+09:00"}</script></html>'
)


@pytest.fixture
def archive_script(load_script, monkeypatch, tmp_path):
    module = load_script("archive_metadata")
    monkeypatch.setattr(module, "YOUTUBE_CACHE_DIR", tmp_path / "youtube-api")
    monkeypatch.setattr(module, "NOTE_HTML_DIR", tmp_path / "note-html")
    monkeypatch.setattr(module, "YT_ARCHIVE", tmp_path / "archives" / "youtube.csv")
    monkeypatch.setattr(module, "NOTE_ARCHIVE", tmp_path / "archives" / "note.csv")
    monkeypatch.setattr(module, "current_archive_time", lambda: "2026-11-05T00:00:00+00:00")
    module.YOUTUBE_CACHE_DIR.mkdir()
    module.NOTE_HTML_DIR.mkdir()
    (module.YOUTUBE_CACHE_DIR / "YT1.json").write_text(json.dumps(YOUTUBE_ITEM), encoding="utf-8")
    (module.NOTE_HTML_DIR / "note-n0123456789ab.html").write_text(NOTE_HTML, encoding="utf-8")
    return module


def test_archive_metadata_main_archives_both_caches(archive_script):
    archive_script.main()
    [video] = read_rows(archive_script.YT_ARCHIVE)
    assert (video["display_id"], video["uploader"], video["upload_date"], video["duration_string"], video["thumbnail_sizes"], video["archived_at"]) == (
        "YT1", "アラカク通信", "20260701", "1:05", "default high", "2026-11-05T00:00:00+00:00")
    [note] = read_rows(archive_script.NOTE_ARCHIVE)
    assert note == {"filename": "note-n0123456789ab.html", "webpage_url": "https://note.com/xyz1090/n/n0123456789ab",
                    "title": "ターゲットNo.1試合結果｜アラカク", "description": "説明", "published_at": "2026-07-02",
                    "archived_at": "2026-11-05T00:00:00+00:00"}


def test_archive_metadata_main_keeps_archived_at_and_uncached_rows(archive_script, monkeypatch):
    archive_script.main()
    # 2 回目: archived_at は前の値を引き継ぎ、キャッシュから消えた動画の行も残す。
    monkeypatch.setattr(archive_script, "current_archive_time", lambda: "2027-01-01T00:00:00+00:00")
    rows = read_rows(archive_script.YT_ARCHIVE)
    write_rows(archive_script.YT_ARCHIVE, rows + [{**rows[0], "display_id": "GONE"}])
    archive_script.main()
    assert [(r["display_id"], r["archived_at"]) for r in read_rows(archive_script.YT_ARCHIVE)] == [
        ("GONE", "2026-11-05T00:00:00+00:00"), ("YT1", "2026-11-05T00:00:00+00:00")]
    assert read_rows(archive_script.NOTE_ARCHIVE)[0]["archived_at"] == "2026-11-05T00:00:00+00:00"
