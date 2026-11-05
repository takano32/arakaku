# 役割: 公式サイトのニュース Markdown と Astro ページを official_news.csv / official_pages.csv の行にする。
#   news は YAML frontmatter を抜き、pages は Astro/JSX を素の HTML へ正規表現で還元する（軽量な“脱 Astro”処理）。
# アーキ上の位置: scripts/generate_official_pages_csv.py がファイルを読んで文字列をここに渡し、write_csv する。
#   I/O はしない。出力 CSV は build_official_pages_json.py (arakaku/build/official.py) が読む。
# 不変条件: ASTRO_PAGES は変換対象スラッグ・表示タイトル・説明文の固定リスト。
#   extract_astro_body の正規表現は順序依存（frontmatter→レイアウトタグ→コメント→
#   map 展開→base パス→残り式属性→class/style の順で剥がす）。
# 関連スキル: .agents/skills/arakaku-data-curator。
from __future__ import annotations

import re

NEWS_FIELDS = ["slug", "title", "date", "category", "summary", "body_md"]
PAGE_FIELDS = ["slug", "title", "description", "body_html"]

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


def news_row(slug: str, text: str) -> dict[str, str]:
    meta, body = parse_frontmatter(text)
    return {
        "slug":     slug,
        "title":    meta.get("title", ""),
        "date":     meta.get("date", ""),
        "category": meta.get("category", ""),
        "summary":  meta.get("summary", ""),
        "body_md":  body.strip(),
    }


def page_row(slug: str, title: str, description: str, text: str) -> dict[str, str]:
    return {
        "slug":        slug,
        "title":       title,
        "description": description,
        "body_html":   extract_astro_body(text),
    }
