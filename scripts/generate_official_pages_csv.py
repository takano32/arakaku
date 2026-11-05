#!/usr/bin/env python3
"""Generate official_news.csv and official_pages.csv from tmp/arakaku-site."""
from __future__ import annotations

# 役割: 公式サイトのニュース Markdown と Astro ページを official_news.csv /
#       official_pages.csv に変換する入口。frontmatter の解析と脱 Astro の規則は
#       arakaku/official/pages.py にあり、ここはファイルの読み書きと入力の欠けの検査だけをする。
# アーキ上の位置: generate-stage2 の最後に実行（generate_official_csvs と同じく公式比較データ
#       系統）。入力 tmp/arakaku-site/ は git 管理外。入力が欠けていれば CSV を書かずに
#       エラーで止まる（以前は official_pages.csv を空で上書きしていた。T.69）。
#       出力は build_official_pages_json.py が消費する。
# 不変条件: 変換するページは arakaku.official.pages.ASTRO_PAGES の固定リスト。
# 関連スキル: .agents/skills/arakaku-data-curator
from arakaku.io import write_csv
from arakaku.official.pages import ASTRO_PAGES, NEWS_FIELDS, PAGE_FIELDS, news_row, page_row
from arakaku.paths import DATA_SRC, OFFICIAL_SITE_DIR

# 公式サイトのソースツリー置き場（git 管理外、要事前取得）。
SRC = OFFICIAL_SITE_DIR
NEWS_DIR = SRC / "content" / "news"
PAGES_DIR = SRC / "pages"


def missing_input(path) -> SystemExit:
    return SystemExit(f"[error] {path} not found; fetch it with `make download-official-data` (no CSV was written)")


def generate_news() -> None:
    if not NEWS_DIR.exists():
        raise missing_input(NEWS_DIR)
    rows = [news_row(path.stem, path.read_text(encoding="utf-8")) for path in sorted(NEWS_DIR.glob("*.md"))]
    write_csv(DATA_SRC / "official_news.csv", NEWS_FIELDS, rows)
    print(f"[done] {len(rows)} news rows written")


def generate_pages() -> None:
    rows = []
    for slug, title, description in ASTRO_PAGES:
        path = PAGES_DIR / f"{slug}.astro"
        if not path.exists():
            raise missing_input(path)
        rows.append(page_row(slug, title, description, path.read_text(encoding="utf-8")))
    write_csv(DATA_SRC / "official_pages.csv", PAGE_FIELDS, rows)
    print(f"[done] {len(rows)} page rows written")


if __name__ == "__main__":
    generate_news()
    generate_pages()
