# T.77 日付の欠落と書式の不統一

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

`events.event_date`・`videos.published_at`・`articles.published_at` が全件空。source_documents と youtube アーカイブは YYYYMMDD、ほかは YYYY-MM-DD。日付の書式は検証していない。

- [x] T.77.1 大会の日付を何から決めるか（結果 note・最初の試合動画の公開日など）をユーザーに確認する（7116187・75a288d・f250ea5・1abe938・45c9ab5、2026-10-25）。2026-10-25 にユーザーが決定: 結果 note の投稿日。空の event_date 列を廃止し、events.json の result_published_at を build_json が導く（54 大会中 52、結果 note の無いターゲットNo.105 などは null）。viewer は「結果発表日」と表示し、sw のキャッシュを v2 に。reorder_data も同じ日付（無ければ大会の note のいちばん早い投稿日）で大会と試合を時系列に並べる
- [x] T.77.2 列ごとに日付の書式を決めて検証する。記事の公開日を note 本文 2 行目から入れる（523f188・bbd027f・f7c714a・a1903f6、2026-10-25）。note の公開日を HTML の datePublished から archives/note.csv → articles.csv → source_documents.csv に通した（168 件中 167）。日付の書式は note・大会が YYYY-MM-DD、YouTube の公開日がアーカイブどおり YYYYMMDD とし、validate_json.py で検査
