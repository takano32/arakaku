# 役割: docs/data/*.json を組み立てるビルダ群のパッケージ。
#   canonical.py = 正規 CSV (data-src) と review/ の候補 CSV -> viewer 用 JSON の入口 (json_builders が出力の順を決める)
#   articles.py・promotions.py・events.py・bouts.py・fighters.py・titles.py・videos.py・aliases.py
#                = canonical.py が呼ぶエンティティごとのビルダ
#   relations.py = canonical の入力 (Tables) と関係テーブルの索引 (Relations)
#   numbers.py   = Apple Numbers 由来の numbers_*.csv -> numbers_*.json
#   official.py  = 公式サイト由来の official_*.csv -> official_*.json
# アーキ上の位置: scripts/build_*.py が CSV を読み、ここのビルダに行を渡し、arakaku.io.build_json_files で書く。
# 不変条件: ここのモジュールは import 時に CSV を読まない (副作用なし)。ビルダは行のリストを受け取る純粋関数。
