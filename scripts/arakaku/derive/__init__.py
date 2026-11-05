# 役割: generate-stage2 の派生 CSV (stage1 の CSV と正規 CSV -> 導出表) を作る純粋なロジックのパッケージ。
#   article_links.py = article_links.csv (記事 -> 団体・王座・時点情報・大会・試合・選手)
#   aliases.csv と video_links.csv は、今は scripts/generate_aliases.py・generate_video_links.py が直接作る。
# アーキ上の位置: scripts/generate_article_links.py が CSV を読んでここに渡し、write_csv する。
# 不変条件: 行のリストを受け取り行のリストを返す。I/O はしない。
