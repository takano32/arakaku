# T.49 生成 CSV の再生成で関係ない差分が出る問題を調べる

- 状態: 完了
- 期間: 2026-10-24

T.36・T.48 の作業中に見つけた。

- `make generate-stage2` を単独で実行すると、入力を変えていないのに `article_links.csv`・`official_news.csv`・`official_pages.csv`・`source_documents.csv` が変わった
- `make source-reference-candidates` で作る `review/source_*_reference_candidates.csv` は、T.45（note 本文の抽出変更）以降作り直されていない。作り直すと候補が 661 → 691 件になり、連番の `candidate_id` がずれてほぼ全行が変わる。T.36・T.48 で消した選手名もここに残っている

完了条件: どの生成物が古いか・冪等でないかの原因が分かり、作り直した結果をコミットするか、作り直さない理由が書かれている。

- [x] T.49.1 原因を調べる
  - 生成スクリプトを 1 本ずつ単独で実行し、コミット済みの CSV との差分を見た。さらに stage1・stage2・レビュー候補を `PYTHONHASHSEED` を変えて 2 回作り直し、結果が一致するかを見た
  - 冪等でなかったのは `generate_article_links.py` だけ。団体紹介ページから拾う選手名を `set` で返していたため、行の順番が実行ごとに変わっていた（中身は同じ）。以前「選手リンク 20 件が消える」と見えたのは、この並び替えを差分で見ていたため。実際には 1 件も消えていない
  - ほかの差分は、入力が変わったのに作り直していなかった古い生成物だった
    - `article_links.csv`: T.36・T.44・T.48・T.50 で選手名と試合を直した後に作り直していなかった。作り直すとリンクが 38 件増える（改名した選手・付け替えた試合への note のリンク）。また、T.50 で ID だけ付け替えたとき、「MAXバウトスペシャルワンマッチ大会No.2」の記事 2 件が `max-bout-special-1` に誤って結ばれていたのが `max-bout-special-2` に直る
    - `bouts.csv`・`events.csv`・`source_documents.csv`・`video_links.csv`: T.44・T.45・T.50 の後に `reorder_data.py` を実行しておらず、行の順番だけが違う（中身は同じ）
    - `official_*.csv`: T.32 で取り直した公式サイトが更新されていた。ニュース 3 件（第6回MAXバウトミドル級GP の出場者・1回戦の結果・ベスト8抽選会）、選手 2 人（kokudo・iisan-donsutaa）、選手の年齢・戦績、MAXバウトの大会一覧 14 件、about ページのロゴ画像
    - `review/source_*_candidates.csv`: T.45 以降作り直していなかった。行は 1 件も消えず、候補が増える（試合 617 → 672、大会 388 → 417、勝敗の言及 317 → 318）。変わる列は主に `line_numbers`（T.45 で本文の行が変わったため）と、改名した選手名・付け替えた大会名。勝敗の言及の 1 件増は T.45.2 に書いた `kobayashi856.github.io` の誤検出
    - `numbers_*.csv`・`archives/*.csv`・`articles.csv`・`promotions.csv`・`titles.csv`・`aliases.csv` は差分なし
- [x] T.49.2 `extract_promotion_profile_fighters` を出現順のリストで返すようにし、すべて作り直してコミットする（c33418f, 2026-10-24）
  - 作り直した後、ハッシュのシードを変えた 2 回の結果が完全に一致することを確かめた
