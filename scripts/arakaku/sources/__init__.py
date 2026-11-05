# 役割: 出典 (note 記事本文・YouTube 概要欄) をレビュー用の表にする純粋なロジックのパッケージ。
#   documents.py = source_documents.csv の行 (本文・ハッシュ・取得日時の引き継ぎ)
#   mentions.py  = source_mentions.csv の行 (本文の各行を対戦/結果/大会/URL に分類)
#   archives.py  = archives/{youtube,note}.csv の行 (表示・検索用の安定メタデータ)
# アーキ上の位置: scripts/build_source_documents.py と scripts/archive_metadata.py が I/O をして
#   ここの関数に行を渡す。
# 不変条件: mention はキーワード一致の機械抽出であり、勝敗・出場者・タイトル系譜を「確定」させない
#   (AGENTS.md)。アーカイブも表示・検索・レビュー専用。
