# 役割: note.com の記事 (アラカク通信のーと) に関する純粋なロジックのパッケージ。
#   cache.py    = tmp/note-html/ のキャッシュのファイル名の規約 (書く側と読む側の契約)
#   html.py     = 記事 HTML から本文・メタデータを取り出す
#   crawl.py    = 記事一覧 (RSS / HTML / 非公式 API) の解析と articles.csv への追記規則
#   articles.py = アーカイブ済みメタデータから articles.csv の行を作る (article_type の分類)
#   matchups.py = 記事本文から対戦カード・歴代王者・大会 ID を読む (article_links 用)
#   results.py  = 結果 note の ○/● 記号から勝者を、括弧書きから決着を読む (note 照合用)
#   patterns.py = 複数の場所で同じであるべき note の解析パターン (勝敗記号・URL・vs・タイム)
# アーキ上の位置: scripts/ の入口と arakaku/sources・derive・review が使う。I/O はしない。
# 不変条件: ここの関数は文字列と行のリストだけを受け取る。ネットワークやファイルは呼び出し側。
