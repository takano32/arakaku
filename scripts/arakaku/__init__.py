# 役割: scripts/arakaku を Python パッケージ化するためのマーカー。中身は意図的に空。
# アーキ上の位置: scripts/build_*.py や validate_json.py が `from arakaku.utils import ...`
#   のように import する。各 build スクリプトは `python scripts/xxx.py` でリポジトリ直下から
#   起動され、sys.path[0] に scripts/ が入るため `arakaku` パッケージが解決できる
#   (PYTHONPATH の明示設定は無い。pytest 側は tests/conftest.py が scripts/ を sys.path に追加する)。
# 不変条件: ここに副作用のあるコードを置かない。import 時の実行順序に依存させない。
