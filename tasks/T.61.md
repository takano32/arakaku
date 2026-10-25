# T.61 公式ニュース本文の `<iframe>` がタグのまま表示される

- 状態: 完了
- 期間: 2026-10-25

2026-10-25 にユーザーが指摘:「公式ニュースで iframe が生でタグが出るだけになってるとこあるんだが？」。

- 原因: `2026-09-maxbout6-middle-best8-lottery` の `body_md` 末尾にチケット予約ウィジェット `<iframe src="https://tiget.net/events/522668/widgets">` がある。`ui/markdown.js` は XSS 対策で最初に `<` `>` をすべてエスケープするので、タグが文字として出ていた
- 方針: 1 行だけの `<iframe>` を取り出し、許可したホスト（tiget.net）の https なら属性を組み立て直した iframe と元 URL へのリンク、それ以外はリンクだけにする。ほかの HTML は今までどおりエスケープする
- [x] T.61.1 `ui/markdown.js` で `<iframe>` 行を扱う（9cb55f8、2026-10-25）。Node で javascript: URL・属性への注入・行の途中の iframe・`<script>` が今までどおりエスケープされることを確認。ブラウザで 255×470 の埋め込みと「tiget.net を開く」リンクを確認
  - この検証ブラウザでは tiget 側が AWS WAF の人間確認画面を返す（tiget を直接開いても同じなので、埋め込み方ではなく検証環境の問題）。ウィジェットの中身そのものは確認できていない。iframe 内の確認画面が出す「form field に id / name が無い」issue は tiget 側のもの
- [x] T.61.2 `validate_json.js` で、描画した行に `&lt;iframe` が出たら失敗にする（修正前のコードで失敗することを確認。d2d7a5e、2026-10-25）
- [x] T.61.3 `docs/VIEWER_FEATURES.md` の H1 と viewer-ui スキルに記載（24076f9、2026-10-25）
