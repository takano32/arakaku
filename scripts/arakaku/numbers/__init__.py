# 役割: Apple Numbers の選手名鑑 (data-raw/アラカク選手名鑑.numbers) を numbers_*.csv の行にする純粋なロジックのパッケージ。
#   cells.py  = セルの値の整え方 (空白・小数点・回数・階級・団体・勝敗の記号) と見出しの検査
#   names.py  = 名鑑の名前と fighters.csv の照合、Numbers 由来の合成 ID
#   sheets.py = シート「全体」「個人成績」の行 -> numbers_fighters / numbers_name_matches / numbers_fight_records の行
# アーキ上の位置: scripts/extract_numbers.py が numbers_parser で表を開き、文字列にした行をここに渡す。
#   CSV から docs/data/numbers_*.json を組み立てるのは arakaku/build/numbers.py。
# 不変条件: 標準ライブラリだけを使う (numbers_parser はスクリプトだけが import する。CI でもテストできるように)。
#   I/O はしない。
