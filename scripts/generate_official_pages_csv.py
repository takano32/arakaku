#!/usr/bin/env python3
"""Generate official_news.csv and official_pages.csv from tmp/arakaku-site."""
from __future__ import annotations

import re

# 役割: 公式サイトのニュース Markdown と Astro ページを official_news.csv /
#       official_pages.csv に変換する。news は YAML frontmatter を抜き、pages は Astro/JSX を
#       素の HTML へ正規表現で還元する（軽量な“脱 Astro”処理）。
# アーキ上の位置: generate-stage2 の最後に実行（generate_official_csvs と同じく公式比較データ
#       系統）。入力 tmp/arakaku-site/ は git 管理外。NEWS_DIR が無ければ generate_news は
#       早期 return して official_news.csv を温存するが、generate_pages は全 slug を skip
#       しても末尾で write_csv を呼ぶため official_pages.csv は空で上書きされる点に注意。
#       出力は build_official_pages_json.py が消費する。
# 不変条件: ASTRO_PAGES は変換対象スラッグ・表示タイトル・説明文の固定リスト。
#       extract_astro_body の正規表現は順序依存（frontmatter→レイアウトタグ→コメント→
#       map 展開→base パス→残り式属性→class/style の順で剥がす）。
# 関連スキル: .agents/skills/arakaku-data-curator
from arakaku.utils import DATA_SRC, ROOT, write_csv

# 公式サイトのソースツリー置き場（git 管理外、要事前取得）。
SRC = ROOT / "tmp" / "arakaku-site"
NEWS_DIR = SRC / "content" / "news"
PAGES_DIR = SRC / "pages"

ASTRO_PAGES = [
    ("about",   "アラカクとは",   "アラカクの世界観・ルール・三大団体について"),
    ("history", "歴史の流れ",     "アラカク1996年から現在までの歴史年表"),
]


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Split YAML frontmatter from body. Returns (meta, body)."""
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        kv = re.match(r'^(\w+):\s*"?([^"]*)"?\s*$', line)
        if kv:
            meta[kv.group(1)] = kv.group(2).strip()
    return meta, text[m.end():]


def extract_astro_body(text: str) -> str:
    """Extract clean HTML from an Astro page."""
    # Remove frontmatter block
    text = re.sub(r"^---.*?^---\s*\n", "", text, flags=re.DOTALL | re.MULTILINE)

    # Remove outer layout component open/close tags (may span multiple lines)
    text = re.sub(r"<(ArticleLayout|BaseLayout)\b[^>]*(?:>|(?:\n[^>]*)*>)", "", text)
    text = re.sub(r"</(ArticleLayout|BaseLayout)>", "", text)

    # Remove HTML comments
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)

    # Expand JSX array.map() expressions:
    # {['a', 'b'].map(varname => (<tag ...>{varname}</tag>))}
    # 後段の「残り式属性除去」で消える前に、ここで静的配列を実 HTML へ展開しておく必要がある。
    def expand_map(m: re.Match) -> str:
        items_raw = m.group(1)
        var = m.group(2)
        template = m.group(3).strip()
        items = re.findall(r"'([^']+)'", items_raw)
        results = []
        for item in items:
            results.append(re.sub(r"\{" + re.escape(var) + r"\}", item, template))
        return "".join(results)

    text = re.sub(
        r"\{\s*\[([^\]]+)\]\s*\.map\(\s*(\w+)\s*=>\s*\(\s*(.*?)\s*\)\s*\)\s*\}",
        expand_map,
        text,
        flags=re.DOTALL,
    )

    # Replace {`${base}/path`} → /path, {base} → /
    text = re.sub(r'href=\{`\$\{base\}/([^`]*)`\}', r'href="/\1"', text)
    text = re.sub(r'href=\{base\}', 'href="/"', text)
    text = re.sub(r'src=\{`\$\{base\}/([^`]*)`\}', r'src="/\1"', text)

    # Remove remaining Astro expression attributes: attr={...}
    text = re.sub(r'\s+[\w:-]+=\{[^}]*\}', "", text)

    # Remove class and style attributes
    text = re.sub(r'\s+class="[^"]*"', "", text)
    text = re.sub(r'\s+style="[^"]*"', "", text)

    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def generate_news() -> None:
    if not NEWS_DIR.exists():
        print(f"[skip] {NEWS_DIR} not found")
        return
    fields = ["slug", "title", "date", "category", "summary", "body_md"]
    rows = []
    for path in sorted(NEWS_DIR.glob("*.md")):
        meta, body = parse_frontmatter(path.read_text(encoding="utf-8"))
        rows.append({
            "slug":     path.stem,
            "title":    meta.get("title", ""),
            "date":     meta.get("date", ""),
            "category": meta.get("category", ""),
            "summary":  meta.get("summary", ""),
            "body_md":  body.strip(),
        })
    write_csv(DATA_SRC / "official_news.csv", fields, rows)
    print(f"[done] {len(rows)} news rows written")


def generate_pages() -> None:
    fields = ["slug", "title", "description", "body_html"]
    rows = []
    for slug, title, description in ASTRO_PAGES:
        path = PAGES_DIR / f"{slug}.astro"
        if not path.exists():
            print(f"[skip] {path} not found")
            continue
        body_html = extract_astro_body(path.read_text(encoding="utf-8"))
        rows.append({
            "slug":        slug,
            "title":       title,
            "description": description,
            "body_html":   body_html,
        })
    write_csv(DATA_SRC / "official_pages.csv", fields, rows)
    print(f"[done] {len(rows)} page rows written")


if __name__ == "__main__":
    generate_news()
    generate_pages()
