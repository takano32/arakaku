# T.90 Numbers だけの試合の並び・試合順・ID が不安定

- 状態: 完了
- 期間: 2026-10-25

T.88 の洗い出しで登録。

`repository.js` の numbersOnlyBouts が Numbers の記録の順のまま。試合タブの末尾 68 行が大会をまたいで混ざり、`bout_order` を「第N試合」と表示する（根拠のない事実）。ID（numbers-…-N）も記録順なので Numbers が変わると共有リンクがずれる。

- [x] T.90.1 大会・選手名で並べ、Numbers だけの試合では試合順を出さない。ID を選手の組から作る（9b13648、2026-10-25）。68 試合が大会ごとにまとまり、ID（例: numbers-target-86--harris_orbick--kitamura）は一意
