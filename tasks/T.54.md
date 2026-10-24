# T.54 MAXバウトのスペシャルワンマッチ大会を Numbers の SP / SP2 と照合する

- 状態: 完了
- 期間: 2026-10-24

T.50 の残り。Numbers の個人成績はスペシャルワンマッチ大会の興行番号を `SP` / `SP2` と書くが、`events.csv` の `event_number` は整数列なので、`max-bout-special-1/2` と照合できない。ビューアの表示を数えると勝者が出ていない試合は 22 件で、そのうち 10 件がこの 2 大会（Numbers には 10 試合 20 行の記録がある）。

- [x] T.54.1 `events.csv` に Numbers の興行番号を書く列 `numbers_event_number` を足し、`max-bout-special-1` を `SP`、`max-bout-special-2` を `SP2` にする（空なら `event_number` で照合）（b53f870, 2026-10-24）
  - 2 大会とも、CSV の 5 試合の出場者の組が Numbers の SP / SP2 の 5 試合と 1 対 1 で一致する
- [x] T.54.2 `build_json.py` で `events.json` に出す（ed52c93, 2026-10-24）
- [x] T.54.3 ビューアの照合（`enrichBout`）と名鑑のみの大会の合成で、この列を使う（1ff1e11, 2026-10-24）
  - 10 試合に Numbers の勝敗と決着が付き、勝者の出ない試合は 22 → 12 件。大会・試合の件数は変わらない（67 / 315）
  - 残りの 12 件: エリートスピリッツミドル級GP 7、ターゲットNo.87・No.14 各 1、第6回ライト級トーナメント 1、動画カタログ 2。どれも note・Numbers に結果が無い
- [x] T.54.4 README・SCHEMA_NOTES に `numbers_event_number` を書く（d77c187, 2026-10-24）
- 見つけた Numbers 側の不審な記録: 名鑑のみの試合 `numbers-emperor-105-2`（エンペラーNo.105）も両者とも勝ちになっている
