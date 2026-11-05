# 役割: scripts/*.py が共有するロジックのパッケージ。このファイル自体はマーカーで、中身は意図的に空。
#   paths.py (入出力先) / io.py (CSV・JSON の読み書き) / schema.py (CSV の見出し) / text.py・textparse.py
#   (文字列の整形・note の解析パターン) / csvmap.py (行から JSON への写像) / event_dates.py / youtube.py、
#   build/ (docs/data の JSON の組み立て) / validation/ (JSON の検証) / notes/ (note の解析・分類・照合) /
#   sources/ (本文 DB・言及・アーカイブ) / derive/ (派生 CSV) / review/ (レビュー用の候補 CSV) /
#   official/ (公式サイトのソース -> official_*.csv の行) / numbers/ (Numbers の選手名鑑 -> numbers_*.csv の行)。
# アーキ上の位置: 各 scripts/*.py が `from arakaku.io import read_csv` のように import する。各 build スクリプトは `python scripts/xxx.py` でリポジトリ直下から
#   起動され、sys.path[0] に scripts/ が入るため `arakaku` パッケージが解決できる
#   (PYTHONPATH の明示設定は無い。pytest 側は tests/conftest.py が scripts/ を sys.path に追加する)。
# 不変条件: ここに副作用のあるコードを置かない。import 時の実行順序に依存させない。
