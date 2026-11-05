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
#   個々の検証関数に渡す。viewer 側の整合は scripts/validate_json.js が別途検証する。
# 不変条件: 検証関数は第 1 引数に Report を取り、error に積む。import 時に I/O をしない。
# 関連スキル: .agents/skills/arakaku-maintainer (make validate)。
from .archives import validate_archive_data
from .common import collect_ids, require_field
from .entities import (
    validate_articles,
    validate_bout_participants,
    validate_bouts,
    validate_events,
    validate_fighter_snapshots,
    validate_fighters,
    validate_promotions,
    validate_title_reigns,
    validate_titles,
    validate_videos,
)
from .links import validate_aliases, validate_article_links, validate_video_links
from .locate import locate_error
from .numbers import validate_numbers_data
from .official import (
    unsafe_official_html,
    validate_official_history,
    validate_official_matches,
    validate_official_news,
    validate_official_pages,
    validate_official_players,
    validate_official_tournaments,
)
from .report import Report
from .rules import round_time_problems, validate_bout_titles, validate_cross_tables, validate_dates, validate_enums
from .runner import ALL_JSON_FILES, REQUIRED_JSON_FILES, run, validate_docs_data
from .sources import (
    validate_source_document_bodies,
    validate_source_documents,
    validate_source_mentions,
    validate_source_references,
)

__all__ = [
    "ALL_JSON_FILES",
    "REQUIRED_JSON_FILES",
    "Report",
    "collect_ids",
    "locate_error",
    "require_field",
    "round_time_problems",
    "run",
    "unsafe_official_html",
    "validate_aliases",
    "validate_archive_data",
    "validate_article_links",
    "validate_articles",
    "validate_bout_participants",
    "validate_bout_titles",
    "validate_bouts",
    "validate_cross_tables",
    "validate_dates",
    "validate_docs_data",
    "validate_enums",
    "validate_events",
    "validate_fighter_snapshots",
    "validate_fighters",
    "validate_numbers_data",
    "validate_official_history",
    "validate_official_matches",
    "validate_official_news",
    "validate_official_pages",
    "validate_official_players",
    "validate_official_tournaments",
    "validate_promotions",
    "validate_source_document_bodies",
    "validate_source_documents",
    "validate_source_mentions",
    "validate_source_references",
    "validate_title_reigns",
    "validate_titles",
    "validate_video_links",
    "validate_videos",
]
