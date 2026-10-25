# T.70 note に結果があるのに unknown の 32 試合を取り込む

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

note の結果記事の書式（◯ U+25EF、1 行の `○A vs ●B`、片側だけの ○/●、合同大会の記事、alias の無い「ローリングjr」）を抽出スクリプトが拾えていない。31 試合は Numbers の勝者と一致、`max-bout-6-lightweight-tournament-mzffdb97ygw`（コルト・アプロー 1R 3分51秒 KO 飛びヒザ）は note だけ。`mh-37-e8wdonlgqdm` は ○/● が無く勝者不明。

- [x] T.70.1 合同大会の note（note-n1dad6c53911a・note-nab6c0086a467・note-n6f402a63952c）をすべての大会に紐づける（`generate_article_links.py`）（204734f・d514edb、2026-10-25）。`title_to_event_ids` がタイトルに出る大会をすべて返す。追加は大会 4・試合 5 のリンク
- [x] T.70.2 ローリングジュニア / ローリングjr を alias に追加し、書き換えられた `videos.original_title` 12 件をアーカイブから戻す（d328887・803fdff・c915daa・f16c040、2026-10-25）。53e7539（2026-05-22「Use kana video titles」）が英訳タイトルからカナに戻すときに Rolling Junior をローリングジュニアにしていた。アーカイブの元タイトル（ローリングJr. / ローリングjr）に戻し、両方の表記を別名に追加（ローリングJr. の 8 試合に note の出典が付いた）
- [x] T.70.3 抽出スクリプトを上の書式に対応させ、Numbers と一致する 31 試合を T.40.2 と同じ方法で反映する（a6d3455・f9190a8・9dbf307、2026-10-25）。既存の抽出は note 側から試合を組むため取りこぼしと記号の混線があったので、試合側から探す `scripts/match_unknown_bouts_to_note_results.py` を追加。33 試合で勝者が 1 人に決まり、31 試合が Numbers と一致 → 反映（unknown 64 → 33）。決着の文言・ラウンド・時間も反映。`target-101-0nt8ufrwimc` は T.40.5 の保留どおり反映しない
- [x] T.70.4 note だけにある 1 試合の扱いをユーザーに確認する（fb70f51、2026-10-25）。2026-10-25 にユーザーが決定: 入れる。勝敗だけを反映し（note の行に決着の記載なし）、notes に「Numbers に記録なし」と書いた
  - `max-bout-6-lightweight-tournament-mzffdb97ygw` コルト・アプロー vs センサー・ファッジ: note-n96b3975ccdad 15 行目「○コルト・アプローvs●センサー・ファッジ」。Numbers に記録なし。`review/unknown_bout_note_results.csv` では apply=false
- [x] T.70.5 T.40.5 の「note も Numbers も無い 21 試合」の一覧を見直す（2026-10-25）。T.40.5 の 21 試合のうち、スペシャルワンマッチ大会の 10 試合は反映済み。残りは エリートスピリッツ 7 試合（note も Numbers も無し）、`max-bout-6-lightweight-tournament-mzffdb97ygw`（T.70.4）、`target-14-d6tuqnfvmhy` と video-catalog 2 試合（T.71）
