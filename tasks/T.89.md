# T.89 ビューアが誤った事実を表示する

- 状態: 完了
- 期間: 2026-10-25

T.88 の洗い出しで登録。

- `data/enricher.js` の Numbers による勝敗の上書きが、Numbers の 2 行が矛盾する試合でも効く。target-87-wdwtmtyvh_y が「センサー・ファッジ def. センサー・ファッジ」、target-95-m3upkoczyo4・emperor-115-cx_ge_lrruq・target-93-xchkwjueaku は両者「勝ち」と表示される（T.40.4・T.86.6 で決めた note の勝者が消える）
- `repository.js` の Numbers だけの試合は最初の「勝ち」を勝者にする。numbers-emperor-105-2（さかえだ vs チャールス・ブランディン、Numbers は両者勝ち）がさかえだの勝ちと出る（note はブランディンの勝ち）
- 王座タブが返上（vacated）の最後の王者を「現王者」と出す（target-middleweight のギタミン・アーロン）
- `richTitles` が空の won_at_event_id を source_video_id の大会で埋めるが、4 本は防衛戦の動画なので獲得・喪失の大会が誤る: emperor-lightweight-10（マルコ、実際の獲得は No.107）、mh-lightweight-4（ランダーデビル、mh-30 は防衛②）、mh-middleweight-1（テール・ジャンク、mh-29 は防衛）、target-middleweight-8（ルージュド、target-87 は防衛3）。前の王者の喪失大会も連動して誤る

- [x] T.89.1 Numbers の行が矛盾する試合は勝敗の上書きと numbers_verified をしない（CSV の勝者を残す）（8159bb2、2026-10-25）
- [x] T.89.2 Numbers だけの試合で両者が同じ結果なら unknown にする（766525c、2026-10-25）
- [x] T.89.3 王座タブで最後の王者が vacated なら「空位」と出す（dd16037、2026-10-25）
- [x] T.89.4 won_at の推定に防衛戦の動画を使わない（reign 行に明示されたときだけ）（55bc4eb、2026-10-25）
- 検証: Node で 4 試合が note の勝者・勝ち 1 負け 1 で表示され、numbers-emperor-105-2 が unknown、4 王座の獲得・喪失大会が推定されないことを確認。validate_json.js に「表示する全試合で勝ち 1・負け 1、勝者と敗者が別」の検査を追加（04b3427。修正前のコードで失敗する）
