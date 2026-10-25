# T.65 試合の回が「3終了R」と表示される・時間に note の投稿時刻が入っている

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

- `bouts.csv` の `round` が `3R終了`（20 件）・`1R終了`（2 件）の行は `int_field` が文字列 `3終了` を返し、`html.js` が R を付けて「3終了R 判定」と表示される
- 8 試合の `time`（`07分51秒` など）は引用元の note の投稿時刻（例: 2024年1月23日 07:51）と一致する。いずれも 083ab83 の low-confidence パッチ由来: emperor-114-g4yds9beona, max-bout-7-lightweight-gp-hmig9qnqcp8, mh-30-bjwu94npmh8, target-100-trhpbjg3e9i, target-101-0nt8ufrwimc, target-92-granro4uj_4, mh-38-3jbgtu_pkeu, max-bout-6-lightweight-tournament-mzffdb97ygw

- [x] T.65.1 「終了」の扱いを決めて `round` を整数にする（61f5f54、2026-10-25）。`3R終了` → `round=3R`・`time=終了` に分けた（事実を落とさないため。`1R終了 コーナーストップ`・`1R終了時TKO ドクターストップ` のように終了時のストップもある）。表示は「3R 終了 判定」
- [x] T.65.2 投稿時刻が入った 8 試合の `time` を空にするか、結果 note の時間に置き換える（61f5f54、2026-10-25）。8 件とも引用元の対戦カード note の 2 行目の投稿時刻と一致することを確認して空にした。4 件は判定（時間なし）、4 件は結果不明
- [x] T.65.3 検証: round は整数、time は 5:00 以下、round の無い time を失敗にする（4843ea0・bc61d81、2026-10-25。修正前のデータでは 33 件のエラー。README は d81ea2b）
