# 役割: リポジトリ内の入出力先パスの正本。data-src / review / docs/data と、コミットしない
#   tmp/ のキャッシュ置き場、Numbers ファイルの場所、note キャッシュのファイル名規約をここで一元管理する。
# アーキ上の位置: arakaku パッケージの最下層 (text.py にだけ依存)。io.py を含むほぼ全モジュールと
#   各 scripts/*.py の main() が既定パスとして import する。ロジック側の関数はパスを引数で受け取り、
#   ここの定数は入口 (main) だけが参照するのが望ましい。
# 不変条件:
#   - ROOT は scripts/arakaku/paths.py から 2 つ上 (リポジトリ直下)。ここを変えると全スクリプトの入出力先が変わる。
#   - note_cache_name は tmp/note-html/ のファイル名契約。writer (cache_note_html.py) と
#     reader (build_source_documents.py) で必ず同じ名前になるようここに一元化する。
# 関連スキル: .agents/skills/arakaku-maintainer、.agents/skills/arakaku-source-pipeline。
from __future__ import annotations

from pathlib import Path

from arakaku.text import safe_slug

ROOT = Path(__file__).resolve().parents[2]
DATA_SRC = ROOT / "data-src"
REVIEW = ROOT / "review"
DOCS_DATA = ROOT / "docs" / "data"

# ローカルキャッシュ (git 管理外)。
TMP = ROOT / "tmp"
NOTE_HTML_DIR = TMP / "note-html"
YOUTUBE_CACHE_DIR = TMP / "youtube-api"
OFFICIAL_SITE_DIR = TMP / "arakaku-site"

# Apple Numbers の選手名鑑 (git 管理、手で更新)。
NUMBERS_PATH = ROOT / "data-raw" / "アラカク選手名鑑.numbers"


def note_cache_name(article_id: str, url: str) -> str:
    raw = article_id or url
    return f"{safe_slug(raw)}.html"
