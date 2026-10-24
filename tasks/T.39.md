# T.39 ビューアの未使用データキーと未メモ化フィルタの整理

- 状態: 完了
- 期間: 2026-10-24

2026-06-13 の調査で見つかった整理候補。どれも実害は小さい。

- [x] T.39.1 `data-repository.js` の `eventsForPromotion` / `relatedBoutsForFighter` / `fighterSnapshotsForFighter` を revision キーの Map でメモ化する（`invalidate()` でクリア）。現状は検索のキー入力ごとに再フィルタ・再ソートしている（各 0.001〜0.027ms と軽微）（647d1e6, 2026-10-24）
  - 引数ごとの結果を 1 つの Map に入れ、`invalidate()` で消す。呼び出し側は返り値を書き換えていないことを確かめた
- [x] T.39.2 `officialMatches` / `officialHistory`（管理ビューの「公式」タブ専用、各 1〜2KB）を ENRICHMENT から外し、`TAB_DATA_KEYS` / `REQUIRED_TAB_DATA_KEYS` に `officialMisc` を足して遅延読み込みにする（任意）
- [x] T.39.3 `source_document_bodies.json`（約 557KB / 479 件）のうち通信タブが使う note 記事 120 件分だけを別 JSON に分け、通信タブの遅延読み込みを約 40% に縮める（任意。体感の待ちは T.27 で解消済み）
  - T.39.2・T.39.3 は行わないことにした（2026-10-24）。どちらも「任意」で、減るのは数 KB と体感できない待ちだけ。読み込みの経路を増やす複雑さのほうが大きい
