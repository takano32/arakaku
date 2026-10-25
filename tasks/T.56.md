# T.56 ビューアを今の見た目にとらわれずに作り直す（機能は残す）

- 状態: 完了
- 期間: 2026-10-24

2026-10-24 にユーザーが依頼:「既存ビューのことを忘れつつ、機能を活かしてリビルドしてほしい」。作業は Fable（effort max）のエージェントに worktree で任せ、結果を確かめてから master に取り込む。

- [x] T.56.1 今のビューアの機能を洗い出す（`docs/VIEWER_FEATURES.md`、6232ca5、2026-10-24）
- [x] T.56.2 新しいビューアを作る（2026-10-24）
  - [x] T.56.2.1 データ層を `docs/assets/js/data/` に作り直す（旧 `core/*` と Node で突き合わせ 188/188 一致。40a5e00、2026-10-24）
  - [x] T.56.2.2 UI の土台（`app/state.js`、`ui/html.js`、`ui/list.js`、`ui/parts.js`、`ui/keyboard.js`。a02c175、2026-10-24）
  - [x] T.56.2.3 タブごとのセクション `ui/sections/*.js`（6505ef7、2026-10-24）
  - [x] T.56.2.4 新しいスタイル `docs/assets/app.css`（b9325cc、2026-10-24）
  - [x] T.56.2.5 `index.html` / `ui/shell.js` / `main.js` で新ビューアに切り替え（1ab86c3、2026-10-24）
  - [x] T.56.2.6 旧ビューアのファイルを削除（848c3bf、2026-10-24）
  - [x] T.56.2.7 `validate_json.js` / `test_filters.mjs` を新モジュールへ（全セクション全行の描画検査を追加。d78ca90、2026-10-24）
  - [x] T.56.2.8 README・SCHEMA_NOTES・OPERATIONS_CHECKLIST・CODEX・GEMINI・skills を更新（64556f7、2026-10-24）
  - [x] T.56.2.9 公式ページ本文の「/」始まりリンク・画像を公式サイト基準にし、Console の 404 / web-share 警告を無くす（66c2be4、2026-10-24）
  - [x] T.56.2.10 スマートフォン幅のページ末尾に外部リンクとヘルプを出す（11ff279、2026-10-24）
- [x] T.56.3 検証（`make check`・ブラウザの Console・機能の一覧との突き合わせ）して master に取り込む
  - [x] T.56.3.1 `docs/VIEWER_FEATURES.md` に新実装の場所と検証状況を記入（検証済 90・変更 18・廃止 0。a6100ad、2026-10-24）
  - [x] T.56.3.2 `make check` 通過、Chrome（1280px / 390px）で全 15 セクション・検索・絞り込み・共有リンク・キーボード・配色切替を確認、Console はエラー・警告 0 件（41af0bd、2026-10-24。worktree の最終コミットで確認）
  - [x] T.56.3.3 ブランチ `worktree-agent-a35978d70fb68c4fc` をレビューして master に fast-forward で取り込む。取り込み後の `make check` で公式 about ページの base64 画像中の「NaN」が描画漏れ検査に誤検出されたため、検査で `data:` URI を除外（a1e8de5、2026-10-24）。ブラウザで共有リンク・390px 幅・Console 0 件を再確認
