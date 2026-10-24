# T.48 動画タイトルの断片が混ざった選手名を本来の選手にまとめる

- 状態: 完了
- 期間: 2026-10-24

T.36 の作業中に見つけた。動画タイトルから選手名を取り出したとき、「試合前インタビュー」「第６回」「第一試合」「No.95」などの断片まで名前に含めてしまい、既存の選手とは別の選手として登録された行が `fighters.csv` に 14 件ある。どれも試合 1 件と動画リンク 1 件だけを持ち、本来の名前の選手は `fighters.csv`・Numbers・公式のすべてに居る。

| fighter_id | 現在の名前 | 本来の選手 |
|---|---|---|
| `no_118` | エンペラーNo.118 ミドル級ワンマッチ ルージュド・スターリー | `rouged_starry` |
| `fighter_3b93aaef4c` | 試合前インタビュー マルコ・フレイザー | `marco_fraser` |
| `fighter_6579bb563a` | ランダーデビル 第６回 | `lander_devil` |
| `fighter_a20697a85d` | 試合前インタビュー ブルーワン | `blue_one` |
| `fighter_dc0d28e973` | アイス・トロン 第６回 | `ice_tron` |
| `fighter_289c68dda1` | 試合前インタビュー コルト・アプロー | `colt_apro` |
| `fighter_3ce17be3cd` | フラーム・グラン 第６回 | `frahm_gran` |
| `fighter_c5a0e29e83` | 試合前インタビュー わく | `waku` |
| `fighter_01c8f1b9f0` | ゆめろう 第６回 | `fighter_4d6356d021`（ゆめろう） |
| `max_gp` | 第７回 MAXバウトライト級GPＡブロック ランダーデビル | `lander_devil` |
| `fighter_062d57b5e3` | 第一試合 ランダーデビル | `lander_devil` |
| `fighter_e9dbb51256` | 第ニ試合 わく | `waku` |
| `no_95` | センサー・ファッジ No.95 | `fighter_c333ddf234`（センサー・ファッジ） |
| `fighter_1306a749d5` | レイ・ガシーオ２ | `fighter_32d0d719ec`（レイ・ガシーオ）。Numbers にエンペラーNo.113 ダートソン vs レイ・ガシーオの記録あり |

- [x] T.48.1 まとめ方を決める
  - 2026-10-24 にユーザーが決定: 14 件まとめて本来の選手に統合する（T.36.2 と同じやり方）
- [x] T.48.2 `bout_participants.csv` の出場者を表の付け替え先に直し、14 行を `fighters.csv` から消し、`generate_video_links.py` で動画リンクを作り直す（bb6b03d, 2026-10-24）
  - `extract_numbers.py` を作り直しても Numbers の出力は変わらない。`make check` 通過
  - 手元のサーバーで「ランダーデビル」を検索すると 1 人だけ出る
  - `review/source_bout_reference_candidates.csv` には消した名前が残る（管理ビューの参照候補）。このファイルは T.45 以降作り直されておらず、作り直すと関係ない差分が数百行出るため、T.49 で扱う
