# 役割: 生成済み docs/data/*.json の構造・主キー一意性・参照整合性を検証するパッケージ。
#   report.py   = Report (検証結果の入れ物。グローバル状態を持たない)
#   vocab.py    = 列挙値の許可セット
#   common.py   = collect_ids / require_field / is_http_url
#   entities.py = articles … videos の各エンティティ
#   links.py    = video_links / article_links / aliases
#   rules.py    = ラウンド/タイム・列挙値・表をまたぐ矛盾・タイトル戦・日付
#   sources.py  = source_documents / bodies / mentions / references
#   numbers.py  = numbers_*.json、archives.py = *_archives.json、official.py = official_*.json
#   locate.py   = エラーに CSV の行番号を補う、runner.py = 全体の実行順と表示
# アーキ上の位置: scripts/validate_json.py の main() が run() を呼ぶ。テストは Report() を作って
#   個々の検証関数 (各サブモジュールから import する) に渡す。ここが再公開するのは入口の 4 つだけ。
#   viewer 側の整合は scripts/validate_json.js が別途検証する。
# 不変条件: 検証関数は第 1 引数に Report を取り、error に積む。import 時に I/O をしない。
# 関連スキル: .agents/skills/arakaku-maintainer (make validate)。
from .locate import locate_error
from .report import Report
from .runner import run, validate_docs_data

__all__ = ["Report", "locate_error", "run", "validate_docs_data"]
