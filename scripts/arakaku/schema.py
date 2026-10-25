# 役割: data-src/*.csv の列の定義 (ヘッダの正本)。arakaku.utils.read_csv が読み込み時に照合し、
#   tests/test_05_csv_schema.py も同じ表を使う。列を足す・消す・改名するときはここも変える。
# 不変条件: キーは DATA_SRC からの相対パス、値は CSV の 1 行目と同じ並びの列名。

CSV_HEADERS: dict[str, list[str]] = {
    "aliases.csv": ["alias_type", "alias", "canonical_id"],
    "archives/note.csv": ["filename", "webpage_url", "title", "description", "published_at", "archived_at"],
    "archives/youtube.csv": ["display_id", "webpage_url", "fulltitle", "uploader", "upload_date", "duration_string", "view_count", "like_count", "description", "thumbnail_sizes", "archived_at"],
    "article_links.csv": ["link_id", "article_id", "entity_type", "entity_id", "relation_type", "notes"],
    "articles.csv": ["article_id", "title", "url", "source_type", "article_type", "promotion_id", "published_at", "last_checked_at", "status", "notes"],
    "bout_participants.csv": ["participant_id", "bout_id", "side", "fighter_id", "fighter_name", "corner", "result"],
    "bouts.csv": ["bout_id", "event_id", "promotion_id", "bout_order", "division", "weight_class_id", "bout_type", "result_status", "round", "time", "method_raw", "method_normalized", "technique", "decision_score", "is_title_bout", "title_id", "title_result", "title_note", "notes", "inferred_from_video_id", "inferred_from_video_title", "inferred_confidence"],
    "events.csv": ["event_id", "name", "promotion_id", "event_number", "numbers_event_number", "event_type", "event_date", "published_at", "summary", "inferred_from", "inferred_confidence"],
    "fighter_snapshots.csv": ["snapshot_id", "fighter_id", "event_id", "age", "height", "gym", "record_text", "main_promotion_id", "titles_text", "catchphrase", "source_id"],
    "fighters.csv": ["fighter_id", "display_name", "main_division", "main_promotion_id", "height", "age", "gym", "summary", "inferred_confidence"],
    "numbers_fight_records.csv": ["record_id", "source_sheet", "source_row", "numbers_fighter_id", "fighter_name", "matched_fighter_id", "candidate_fighter_id", "division", "promotion_raw", "promotion_id", "event_number_raw", "event_number_normalized", "bout_format", "opponent_name", "opponent_numbers_fighter_id", "opponent_matched_fighter_id", "opponent_candidate_fighter_id", "result_mark", "result", "detail_raw"],
    "numbers_fighters.csv": ["numbers_fighter_id", "source_sheet", "source_row", "display_name", "main_division", "main_promotion_raw", "main_promotion_id", "age", "height", "gym", "fight_count", "wins", "losses", "win_rate", "white_glove_count", "tournament_win_marker", "tournament_entry_raw", "belt_marker", "catchphrase", "notes", "source_confidence"],
    "numbers_name_matches.csv": ["numbers_fighter_id", "numbers_name", "matched_fighter_id", "matched_display_name", "candidate_fighter_id", "match_method", "match_confidence", "notes"],
    "official_history.csv": ["year", "era", "month", "title", "description"],
    "official_matches.csv": ["id", "event", "date", "fighter1", "fighter2", "result", "method", "round", "weight_class", "youtube_id", "notes"],
    "official_news.csv": ["slug", "title", "date", "category", "summary", "body_md"],
    "official_pages.csv": ["slug", "title", "description", "body_html"],
    "official_players.csv": ["id", "name", "name_kana", "nickname", "organization", "weight_class", "age", "height", "wins", "losses", "draws", "debut", "nationality", "gym", "bio", "slug"],
    "official_tournaments.csv": ["id", "name", "date", "video_id", "champion", "runner_up"],
    "promotions.csv": ["promotion_id", "name", "name_en", "category", "country_scope", "summary", "rule_venue", "rule_rounds", "rule_judging", "rule_glove", "rule_elbows", "rule_soccer_kicks", "rule_stomps", "rule_four_point_head_kicks", "rule_four_point_head_knees"],
    "source_documents.csv": ["source_id", "source_type", "source_ref_id", "title", "url", "published_at", "fetched_at", "content_format", "content_hash", "content_text", "content_preview", "notes"],
    "source_mentions.csv": ["mention_id", "source_id", "source_type", "source_ref_id", "line_number", "mention_type", "entity_type", "entity_hint", "matched_text", "context", "confidence", "notes"],
    "title_reigns.csv": ["reign_id", "title_id", "reign_order", "fighter_id", "fighter_name", "reign_label", "won_at_event_id", "lost_at_event_id", "end_reason", "source_article_id", "source_video_id"],
    "titles.csv": ["title_id", "promotion_id", "division"],
    "video_bout_links.csv": ["video_id", "bout_id", "notes"],
    "video_event_links.csv": ["video_id", "event_id", "notes"],
    "video_links.csv": ["video_id", "entity_type", "entity_id", "relation_type", "start_time", "end_time", "notes"],
    "videos.csv": ["video_id", "platform", "platform_video_id", "url", "title", "original_title", "official_status", "video_type", "duplicate_group_id", "duplicate_note", "notes"],
}
