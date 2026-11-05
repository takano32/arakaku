# 役割: generate-stage2 の派生 CSV (stage1 の CSV と正規 CSV -> 導出表) を作る純粋なロジックのパッケージ。
#   aliases.py       = aliases.csv (別名 -> 正規 ID)
#   video_links.py   = video_links.csv (動画 -> 試合・大会・選手)
#   article_links.py = article_links.csv (記事 -> 団体・王座・時点情報・大会・試合・選手)
# アーキ上の位置: scripts/generate_*.py が CSV を読んでここに渡し、write_csv する。
# 不変条件: 行のリストを受け取り行のリストを返す。I/O はしない。
