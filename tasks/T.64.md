# T.64 キーボードでボタン・リンク・チップを Enter / Space で押せない

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

`ui/keyboard.js` の `#onKeyDown` が INPUT/TEXTAREA/SELECT 以外で Enter と Space を `preventDefault()` するので、フォーカスした行の開閉ボタン・フィルタのチップ・ナビのリンクが動かない（Chrome で再現）。

- [x] T.64.1 フォーカスがボタン・リンク・summary にあるときは既定動作に任せる（a823d37、2026-10-25）。ブラウザで行の開閉ボタン（Enter）・チップ（Space）・ナビのリンク（Enter）が動くことを確認
- [x] T.64.2 j/k のカーソル移動でフォーカスも移す（今は見た目だけ）（a823d37、2026-10-25）。行（article）に tabindex=-1 でフォーカスするので、Enter は行の開閉、Space は半ページスクロールのまま。ブラウザで確認、Console 0 件。VIEWER_FEATURES F8 は 6647631
