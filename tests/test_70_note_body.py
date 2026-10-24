import pytest

from conftest import load_module


@pytest.fixture
def build_source_documents_module(repo_root):
    return load_module("build_source_documents", repo_root / "scripts" / "build_source_documents.py")


ARTICLE_HTML = """<html><head><title>エンペラーNo.1試合結果｜アラカク通信のーと</title>
<meta name="description" content="ページ説明"></head><body>
<a>ログイン</a><a>会員登録</a>
<h1 class="x">エンペラーNo.1試合結果</h1>
<time dateTime="2024-01-02T03:04:00.000+09:00">2024年1月2日 03:04</time>
<div data-name="body" id="note-body"><p>A選手 🆚 B選手</p><div><p>KO&amp;勝利<br>1R</p></div><img src="x.png"></div>
<p>チップで応援する</p><h2>あなたへのおすすめ</h2><p>エンペラーNo.2対戦カード</p>
</body></html>"""

PROFILE_HTML = """<html><head><meta name="description" content="所属&amp;紹介
アラカク通信"></head><body><h1>アラカク通信のーと</h1><p>記事一覧</p></body></html>"""


def test_note_article_keeps_only_title_date_and_body(build_source_documents_module):
    text = build_source_documents_module.note_content_text(ARTICLE_HTML)

    assert text.splitlines() == [
        "エンペラーNo.1試合結果",
        "2024年1月2日 03:04",
        "A選手 🆚 B選手",
        "KO&勝利",
        "1R",
    ]


def test_note_page_without_body_uses_meta_description(build_source_documents_module):
    text = build_source_documents_module.note_content_text(PROFILE_HTML)

    assert text.splitlines() == ["所属&紹介", "アラカク通信"]


@pytest.mark.parametrize("line", ["（1R1分３２秒 RNC）", "2R KO勝ち", "TKO", "3R 判定3-0"])
def test_result_lines_are_classified_as_result(build_source_documents_module, line):
    assert build_source_documents_module.classify_mention(line)[0] == "result"


@pytest.mark.parametrize("line", ["kobayashi856.github.io/arakaku-site/", "KOC準決勝終わり話しました"])
def test_english_words_containing_result_abbreviations_are_not_results(build_source_documents_module, line):
    assert build_source_documents_module.classify_mention(line)[0] != "result"
