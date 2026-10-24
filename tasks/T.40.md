# T.40 結果不明の試合の結果補完

- 状態: 完了
- 期間: 2026-10-24

`result_status=unknown` の試合のうち、出典で確認できたものの結果を補完する。動画タイトルだけで勝敗を確定しない。

反映前に確認すること:

- event_id が正しい
- fighter_id が正しい
- `bout_participants.csv` の出場者ごとの結果が出典本文で確認できる
- method / round / time が出典本文で確認できる
- 同名選手の取り違えがない

- [x] T.40.1 note の結果候補を作り直し、結果不明の試合と照合する（15d626b, 2026-10-24）
  - `extract_note_structured_results.py` と `make_structured_result_patch_candidates.py` で `review/note_structured_results.csv`・`review/structured_result_patch_candidates.csv` を作り直した（T.45 以降古いままだった。2 回実行して同じ結果）
  - `make_structured_result_patch_candidates.py` はあいまいな名前一致のため、1 試合に同じ記事の別の試合の候補も付く。そこで note の両選手名を `aliases.csv`・`fighters.csv` で選手 ID に解決し、出場者 2 人が完全に一致する候補だけで照合した
  - 結果不明 152 試合の内訳
    - note の勝者と Numbers の勝者が一致: 85 試合
    - note の勝者と Numbers が食い違う: 4 試合
      - ゆめろう vs クレイエル・アビソカ（エンペラーNo.115）、わく vs きたむら（ターゲットNo.93）、ワインセル vs センサー・ファッジ（ターゲットNo.95）は、Numbers が両者を勝ちにしている。note はそれぞれゆめろう・わく・ワインセルの勝ち。わく vs きたむらは Numbers のきたむら側にも「王座挑戦失敗」とある
      - かぶと vs イベルト・キューミ（ターゲットNo.101）は、note がかぶとの勝ち、Numbers がイベルト・キューミの勝ち（かぶと側も負け）で本当に食い違う
    - note に結果が無い: 63 試合
  - note の候補の決着は、`method_raw` がキーワード（`ＫＯ` など）だけで技名を取っていない。既に反映済みの 87 試合も同じ形
- [x] T.40.2 note と Numbers の勝者が一致した 85 試合を反映する（bbe52a6・e4f4b28, 2026-10-24）
  - 2026-10-24 にユーザーが決定: 85 試合とも反映する
  - 試合ごとに候補を 1 行だけ `apply=true` にし（結果の列が最も多いもの。同数なら記事 ID 順）、`apply_structured_result_patches.py` で反映した
  - `result_status` は known 95 → 180、unknown 152 → 67。出場者 170 人に勝敗が付いた。反映した勝者はすべて Numbers の勝者と同じで、両者とも勝ちの試合は無い
  - 決着（`method_normalized`）が空の known の試合は 82 件。note の原文には技名があることが多い
- [x] T.40.3 `apply_structured_result_patches.py` を再実行しても notes に同じ出典を二重に書かないようにする（e934247, 2026-10-24）
- [x] T.40.4 Numbers が両者とも勝ちにしている 3 試合を note の勝者で反映する（e633ba1・5083030, 2026-10-24）
  - 2026-10-24 にユーザーが決定: note の勝者（ゆめろう・わく・ワインセル）で反映し、notes に「Numbers の個人成績では両者とも勝ち」と書く。Numbers のファイルはユーザーが手元で直す
  - ビューアは Numbers を優先するので、Numbers を直すまでは、この 3 試合が両者とも勝ちに見える
- [x] T.40.5 残りを整理する
  - かぶと vs イベルト・キューミ（`target-101-0nt8ufrwimc`）: 2026-10-24 にユーザーが決定: 保留。note はかぶとの勝ち、Numbers はイベルト・キューミの勝ち。CSV は unknown のまま。ビューアは Numbers のとおりイベルト・キューミの勝ちを出す
  - note に結果が無く Numbers にだけある 42 試合: CSV には書かない。ビューアが実行時に Numbers の勝敗と決着を補っている
  - note にも Numbers にも結果が無い 21 試合（動画タイトルだけでは確定しないため unknown のまま）
    - `elite-spirits-middleweight-gp-0f7ci7mo380` ジャニマード・トスパチ vs こだま
    - `elite-spirits-middleweight-gp-1gjvqnjwjo4` エス・ガリオン vs ジャニマード・トスパチ
    - `elite-spirits-middleweight-gp-ivzr3cr_yka` ぱいそんはやし vs アンディ・ザメス
    - `elite-spirits-middleweight-gp-mtwfjz88t8q` オーロラデビル vs ぱいそんはやし
    - `elite-spirits-middleweight-gp-n20_g5cynje` ぎんのすけ vs オーロラデビル
    - `elite-spirits-middleweight-gp-tg_jild1vk0` かぜの vs エス・ガリオン
    - `elite-spirits-middleweight-gp-youvqzjbhty` オーロラデビル vs エス・ガリオン
    - `max-bout-6-lightweight-tournament-mzffdb97ygw` コルト・アプロー vs センサー・ファッジ
    - `max-bout-special-1-4cbcymly7ma` ダイス・ヴォルケード vs ライン・デュオ
    - `max-bout-special-1-bompcnznx34` ミサ・ウィル・ジョー vs ルージュド・スターリー
    - `max-bout-special-1-opylhps0jq0` おとさわ vs らんちゃーすがや
    - `max-bout-special-1-siibzv70fww` かべい vs さかえだ
    - `max-bout-special-1-tuog5suk_fo` テール・ジャンク vs タイプ・ジー
    - `max-bout-special-2-574ikyazfj4` マルコ・フレイザー vs ダブド・ガブリシャン
    - `max-bout-special-2-bacmlios1i8` コルト・アプロー vs つくりはら
    - `max-bout-special-2-f1u0bfqhu9o` ランダーデビル vs わく
    - `max-bout-special-2-ooihz_c01e0` きたむら vs さんごく
    - `max-bout-special-2-qtswvquloji` ブルーワン vs イスカン・アステ
    - `target-14-d6tuqnfvmhy` らんちゃーすがや vs あかそ
    - `video-catalog-54kwdqyjoa8-54kwdqyjoa8` マルコ・フレイザー vs ブルーワン
    - `video-catalog-f93bk3gibcq-f93bk3gibcq` ダートソン vs アトゥリうえはら
