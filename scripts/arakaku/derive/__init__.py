# 役割: 派生 CSV (stage1 の CSV と正規 CSV -> 導出表) と行の並びを作る純粋なロジックのパッケージ。
#   article_links.py = article_links.csv (記事 -> 団体・王座・時点情報・大会・試合・選手)
#   video_links.py   = video_links.csv (動画 -> 試合・大会・選手)
#   ordering.py      = data-src の主要な CSV の並べ替えキー (reorder_data.py)
#   aliases.csv は、今は scripts/generate_aliases.py が直接作る。
# アーキ上の位置: scripts/generate_article_links.py・generate_video_links.py・reorder_data.py が CSV を読んで
#   ここに渡し、write_csv する。
# 不変条件: 行のリストを受け取り行のリストを返す。I/O はしない。
