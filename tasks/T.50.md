# T.50 煽り・試合前インタビュー動画から作られた重複試合をまとめる

- 状態: 完了
- 期間: 2026-10-24

T.44.3 の作業中に見つけた。`bouts.csv` は動画 1 本につき試合 1 行を作っていたため、【煽り】動画・試合前インタビュー・パブリックビューイング版の動画からも、フルファイトと同じ試合が別の行として作られている。同じ大会・同じ出場者の組が 14 組ある（エンペラーNo.118、MAXバウト第6回ライト級トーナメント 2 回戦 4 試合、マウンテン・ヒーローズNo.29・No.37・No.39、ターゲットNo.90・No.96 の 2 組・No.98・No.100 の 2 組）。

`video_links.csv` は `bouts.inferred_from_video_id` から自動生成しており、試合 1 行に動画 1 本しか結べない。重複行を消すと【煽り】などの動画が試合から外れるので、動画と試合を手で結ぶ関係表が要る。

T.44.4 の調査で、大会ごと重複しているものも見つけた。第7回MAXバウトは「ライト級GP」（`max-bout-7-lightweight-gp`、見どころ動画 12 本＋フルファイト 3 本）と「ライト級トーナメント」（`max-bout-7-lightweight-tournament`、フルファイト 12 本）が同じトーナメント。「MAXバウトミドル級スペシャルワンマッチ」（`max-bout-unknown-middleweight-special`、フルファイト）と「MAXバウトスペシャルワンマッチ」（`max-bout-unknown-special-one-match`、見どころ動画）も同じ 5 試合。Numbers の「SP」「SP2」（MAXバウトのスペシャルワンマッチ）は、興行番号が空の `max-bout-unknown-*` 大会と対応付いていない。

- [x] T.50.1 動画と試合を手で結ぶ関係表の形を決める
  - 2026-10-24 にユーザーが決定: 手で管理する `data-src/video_bout_links.csv`（`video_id, bout_id, notes`、主キー `(video_id, bout_id)`）を足し、`generate_video_links.py` が `bouts.inferred_from_video_id` に加えてこの表も読む
- [x] T.50.2 MAXバウトの重複大会をどう整理するか決める
  - 2026-10-24 にユーザーが決定: 公式サイト・note の名前に合わせて 3 大会にする
    - 第7回: 公式サイトと note の「第7回 MAXバウト ライト級GP」に合わせ `max-bout-7-lightweight-gp` にまとめ、`max-bout-7-lightweight-tournament` を消す
    - `max-bout-unknown-middleweight-special` と `max-bout-unknown-special-one-match` を `max-bout-special-1`「MAXバウトスペシャルワンマッチ大会」にまとめる（note の同名記事。Numbers の SP）
    - `max-bout-unknown-lightweight-tournament`「第?回MAXバウトライト級トーナメント」を `max-bout-special-2`「MAXバウトスペシャルワンマッチ大会No.2」に改名（note の同名記事。Numbers の SP2）
- [x] T.50.3 重複試合をまとめ、残りの動画を関係表で結ぶ（b601a5c, 2026-10-24）
  - 同じ大会・同じ出場者の組は、大会をまとめた分も含めて 31 組。残すのはフルファイトの試合。消す側にしか無い結果（ラウンド・時間・決着など）と出場者の勝敗は残す側へ移し、その出所の notes も移した。食い違いは 0 件
  - 試合 ID の大会部分も付け替えた（27 件）。旧 ID → 新 ID: `max-bout-7-lightweight-tournament-*` → `max-bout-7-lightweight-gp-*`、`max-bout-unknown-middleweight-special-*` と `max-bout-unknown-special-one-match-*` → `max-bout-special-1-*`、`max-bout-unknown-lightweight-tournament-*` → `max-bout-special-2-*`。消した 31 試合とまとめ先はコミットメッセージに一覧
  - 第7回の `bout_order` は、1・2回戦（旧 -tournament の 1〜12）の後に準決勝A 13・準決勝B 14・決勝 15
  - 消した試合の動画 31 本を `video_bout_links.csv` に入れた。`video_links.csv` は作り直し、旧 ID を読み替えると新旧が完全に一致することを確かめた
  - `article_links.csv` と `review/` の CSV は作り直さず ID だけ付け替えた（作り直すと T.45 由来の関係ない差分が出るため。T.49）。`generate_article_links.py` の大会判定も新しい大会 ID に合わせた
  - 結果: `bouts.csv` 270 → 239 行、`events.csv` 54 → 52 行。重複組 0。Numbers との対応付きは 217 件のまま、勝敗の矛盾 0
  - 残り: Numbers の SP / SP2 は、`event_number` が整数列のため `max-bout-special-1/2` と照合できない（ビューアで Numbers の勝敗は補われない）
- [x] T.50.4 新しい 2 大会の概要文から作業メモ（「T.50 で…をまとめた」）を外す（fc3e440, 2026-10-24）。公開ページに出ていたため。経緯はこの台帳とコミットに残る
