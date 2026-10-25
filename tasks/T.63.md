# T.63 公式ニュース Markdown のリンクで XSS が起きる

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

`ui/markdown.js` のリンク変換が `[a](javascript:alert(1))` を `href="javascript:alert(1"` に、`[a](https://x" onmouseover="alert(1))` を属性の注入にしてしまう（Node で再現）。`body_md` は第三者リポジトリ（kobayashi856/arakaku-site）から取り込んでいる。今のデータには該当なし。

- [x] T.63.1 リンクの URL を https/http に限り、属性値をエスケープする。Node のテストを追加（cb71955・245846e、2026-10-25）。`scripts/test_markdown.mjs` は修正前のコードで 3 件失敗する。実データ 5 件のニュースの描画結果は修正前と同一
- [x] T.63.2 リストの直後の段落に `<p>` が付かない不具合を直す（`- x\n- y\n\ntext`）（cb71955、2026-10-25）
- [x] T.63.3 `validate_json.py` で公式ページ本文 HTML の `<script`・`on*=`・`javascript:`・`srcdoc`・`<form`・`<object|embed>`・許可外ホストの iframe を失敗にする（b326fdf・2bd24cb、2026-10-25。今のデータは通過。ドキュメントは d43ebeb で VIEWER_FEATURES H20 と viewer-ui スキル）
