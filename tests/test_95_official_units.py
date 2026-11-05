from __future__ import annotations

# arakaku/official (公式サイトのソース -> official_*.csv の行) の単体テスト (T.112.6.22)。
# 実データの CSV は make build と validate が通すので、ここでは写し方の規則だけを小さな入力で見る。

from arakaku.official.csvs import history_rows, match_rows, player_rows, tournament_rows
from arakaku.official.pages import extract_astro_body, news_row, page_row, parse_frontmatter


# --- official/csvs ---

def test_player_rows_map_camel_case_keys_and_stringify_numbers():
    [row] = player_rows([{"id": "p1", "name": "わく", "nameKana": "ワク", "weightClass": "ライト級", "age": 30, "wins": 11, "losses": 0}])
    assert (row["id"], row["name_kana"], row["weight_class"], row["age"], row["wins"], row["losses"]) == ("p1", "ワク", "ライト級", "30", "11", "0")
    assert (row["height"], row["draws"], row["bio"]) == ("", "", "")


def test_json_null_becomes_an_empty_cell_not_none():
    # 以前は str(None) で "None" と書いていた (T.112.6.22)。
    [row] = player_rows([{"id": "p1", "age": None, "height": None, "wins": None, "losses": None, "draws": None}])
    assert [row[k] for k in ("age", "height", "wins", "losses", "draws")] == ["", "", "", "", ""]
    [entry] = history_rows([{"year": None, "era": "黎明期", "events": [{"title": "旗揚げ"}]}])
    assert entry["year"] == ""


def test_tournament_and_match_rows_map_keys():
    [t] = tournament_rows([{"id": "t1", "name": "GP", "videoId": "abc", "runnerUp": "ビル"}])
    assert t == {"id": "t1", "name": "GP", "date": "", "video_id": "abc", "champion": "", "runner_up": "ビル"}
    [m] = match_rows([{"id": "m1", "weightClass": "ライト級", "youtubeId": "xyz", "round": 2}])
    assert (m["weight_class"], m["youtube_id"], m["round"], m["notes"]) == ("ライト級", "xyz", 2, "")


def test_history_rows_open_one_row_per_event():
    rows = history_rows([
        {"year": 1996, "era": "黎明期", "events": [{"month": "春", "title": "旗揚げ"}, {"title": "初興行", "description": "d"}]},
        {"year": 1997, "era": "黎明期"},  # 出来事の無い年は行にならない
    ])
    assert rows == [
        {"year": "1996", "era": "黎明期", "month": "春", "title": "旗揚げ", "description": ""},
        {"year": "1996", "era": "黎明期", "month": "", "title": "初興行", "description": "d"},
    ]


# --- official/pages ---

def test_parse_frontmatter_splits_meta_and_body():
    meta, body = parse_frontmatter('---\ntitle: "大会のお知らせ"\ndate: 2026-01-01\n---\n本文です\n')
    assert meta == {"title": "大会のお知らせ", "date": "2026-01-01"}
    assert body == "本文です\n"
    assert parse_frontmatter("見出しなし") == ({}, "見出しなし")


def test_news_row_strips_the_body():
    row = news_row("2026-01-01-news", '---\ntitle: "T"\ncategory: event\n---\n\n本文\n\n')
    assert row == {"slug": "2026-01-01-news", "title": "T", "date": "", "category": "event", "summary": "", "body_md": "本文"}


def test_extract_astro_body_removes_astro_syntax():
    source = (
        "---\nimport BaseLayout from '../layouts/BaseLayout.astro';\nconst base = import.meta.env.BASE_URL;\n---\n"
        '<BaseLayout title="About"\n  description="x">\n'
        "<!-- comment -->\n"
        '<section class="hero" style="color: red">\n'
        "{['ターゲット', 'エンペラー'].map(name => (<li>{name}</li>))}\n"
        '<a href={`${base}/news`}>news</a> <a href={base}>top</a> <img src={`${base}/logo.png`} alt={alt}>\n'
        "</section>\n\n\n\n</BaseLayout>\n"
    )
    assert extract_astro_body(source) == (
        "<section>\n"
        "<li>ターゲット</li><li>エンペラー</li>\n"
        '<a href="/news">news</a> <a href="/">top</a> <img src="/logo.png">\n'
        "</section>"
    )


def test_page_row_keeps_the_fixed_title_and_description():
    row = page_row("about", "アラカクとは", "説明", "<p>本文</p>")
    assert row == {"slug": "about", "title": "アラカクとは", "description": "説明", "body_html": "<p>本文</p>"}
