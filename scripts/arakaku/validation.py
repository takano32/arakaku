# 役割: 列挙値 (試合の決着方法・動画種別・リンク状態など) の許可セットを一元定義する。
# アーキ上の位置: scripts/validate_json.py が import し、生成済み JSON 内の該当フィールドが
#   これらの集合に収まっているか検証する (収まらなければ validation error)。
#   このモジュール自体は副作用なしの純粋な定数置き場。
# 不変条件: ここの語彙は実 CSV の値域と完全に一致させること。新しい有効値が出たら、
#   勝手に validate を緩めるのではなく、まず実データを確認した上でここへ追加する。
# 関連スキル: .agents/skills/arakaku-maintainer (検証コマンドの取り扱い)。
VALID_METHODS = {'KO', 'TKO', 'SUB', 'DEC', 'DQ', 'NC'}
VALID_VIDEO_TYPES = {
    'full_fight', 'highlight', 'short', 'stream_archive', 'preview', 'interview', 'commentary', 'reference'
}
VALID_VIDEO_LINK_STATUSES = {'linked', 'partially_linked', 'unlinked', 'needs_review'}
# video_links.relation_type は videos.video_type と同じ語彙を使う (異なる値域が必要になったら分離する)。
VALID_VIDEO_RELATION_TYPES = VALID_VIDEO_TYPES
VALID_VIDEO_ENTITY_TYPES = {'event', 'bout', 'fighter', 'promotion', 'title'}
VALID_ARTICLE_ENTITY_TYPES = {
    'event', 'bout', 'fighter', 'fighter_snapshot', 'promotion', 'title', 'title_reign', 'video'
}
VALID_ARTICLE_RELATION_TYPES = {'source', 'reference'}
# 以下は T.69 で追加 (当時の実データの値域そのもの)。
VALID_BOUT_TYPES = {
    'one_match', 'title_match', 'tournament_bout', 'special_one_match', 'video_catalog_bout', 'preview_card'
}
VALID_EVENT_TYPES = {'numbered_event', 'tournament', 'special_event', 'video_catalog'}
VALID_SIDES = {'red', 'blue'}
VALID_INFERRED_CONFIDENCES = {'high', 'medium', 'low'}
VALID_MENTION_TYPES = {'event', 'matchup', 'result', 'note_url', 'youtube_url'}
VALID_NAME_MATCH_METHODS = {'exact_display_name', 'normalized_display_name', 'generated_candidate'}
VALID_ARTICLE_STATUSES = {'unparsed'}
