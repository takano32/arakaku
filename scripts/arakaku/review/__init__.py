# 役割: review/ 配下の人手レビュー用候補 CSV を作る規則と、レビュー済み候補の反映規則のパッケージ。
#   note_results.py              = 結果 note と Numbers から unknown 試合の勝者候補・known 試合の決着候補
#   reference_candidates.py      = source 文書がどの大会・試合・動画に言及しているかの参照候補
#   mention_result_candidates.py = result 種別の言及から決着方法/ラウンド/タイムの手掛かり
#   apply=true の行の bouts.csv / bout_participants.csv への反映は、今は
#   scripts/apply_structured_result_patches.py が直接行う。
# アーキ上の位置: scripts/make_*.py・match_unknown_bouts_to_note_results.py が I/O をしてここに渡す。
# 不変条件: 候補はあくまで候補で、確定データではない。反映は人がレビューした apply 行だけ。
