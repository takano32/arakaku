# T.93 note 解析の不具合とテスト不足

- 状態: 完了
- 期間: 2026-10-25

T.88 の洗い出しで登録。

- 「1R終了時TKO」が time=終了・method「時TKO …」に分かれる（target-89-aczznfws9eg、emperor-119-wae2pl4rfdw）
- 勝ち記号に 〇（U+3007）が無く、`generate_article_links.py` は ◯・〇・「🟦 ①名前」を拾わない。max-bout-special-1 の 5 試合など 19 試合に結果 note のリンクが無い
- 試合側の照合が 3 行以内しか見ないので、名前・年齢・戦績・🆚・名前の形（4 行離れる）を取りこぼす（mh-38 の 3 試合、emperor-118-u6 など）
- 決着の行が「（」で始まる行しか見ないので、「3R終了 判定3-0」「1R 2分10秒KO（…）」を取りこぼす（既知 22 試合の決着が空）
- 名前を部分一致で探す（「ロン」がアイス・トロン・フロントチョークに当たる）。今は誤判定 0
- 大会に Numbers の記録が無いとき組み合わせ全体にフォールバックして apply=true になりうる（T.86 の修正と矛盾）
- スコア「29-28」を「9-2」と読む、KO が先頭以外だと分類しない、最初の括弧を決着と取る
- match・discover・crawl・generate_articles・reorder・build_json の新しい処理にテストが無い

- [x] T.93.1 「終了時」と 〇・① を扱い、記号の集合を 2 スクリプトで共有する（265e2ff・a2c9258・928d966、2026-10-25）。article_links は 130 本増（消えたもの 0）。target-89・emperor-119 の「時TKO」を直した
- [x] T.93.2 照合の窓をカード形式（4〜5 行）に広げ、決着の行の取り方を直す（a2c9258、2026-10-25）。窓は 5 行、間に ☆ か 2 つ目の 🆚 があれば別の試合
- [x] T.93.3 名前の境界判定、フォールバックは apply=false、スコア・KO・括弧の解析を直す（a2c9258、2026-10-25）。別の大会の記録とだけ一致するものは agree_other_event（apply=false）
- [x] T.93.4 新しいスクリプトの単体テストを足す（19685c2、2026-10-25）。照合スクリプトの parse_result・occurrences・result_text。ほかのスクリプトのテストは T.93.5
- [x] T.93.5 discover_youtube_videos・crawl_note_articles・generate_articles・reorder_data・build_json（result_published_at・link_status）のテスト（e076297・8a6ce7e、2026-10-25）
