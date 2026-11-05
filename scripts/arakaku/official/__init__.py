# 役割: 公式サイト (takano32/arakaku-site) のソースを data-src/official_*.csv の行に写す純粋なロジックのパッケージ。
#   csvs.py  = data/*.json (players・tournaments・matches・history) -> official_*.csv の行
#   pages.py = content/news/*.md と pages/*.astro -> official_news.csv・official_pages.csv の行
# アーキ上の位置: scripts/generate_official_csvs.py・generate_official_pages_csv.py が tmp/arakaku-site を
#   読んでここに渡し、write_csv する。
#   CSV から docs/data/official_*.json を組み立てるのは arakaku/build/official.py。
# 不変条件: 公式データを事実として写すだけで、正規 CSV とは混ぜない。I/O はしない。
