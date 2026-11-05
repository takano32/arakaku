# TASKS

Unofficial ARAKAKU Database の作業台帳です。過去の仕事も含め、すべての作業をここで採番して管理します。

## 運用ルール

- 親タスクは `T.N`、子タスクは `T.N.M`、孫タスクは `T.N.M.K` と採番する（例: `T.33`, `T.33.2`, `T.33.2.1`）。
- 番号は通し番号で、再利用しない。新しい親タスクは最後の番号の次を使う。
- 状態は `未着手` / `進行中` / `保留` / `完了` のいずれか。子・孫タスクはチェックボックスで `[x]` 完了、`[ ]` 未完了を表す。
- コミットで完了した子・孫タスクには短いハッシュと日付を書く。
- TASKS.md が大きくなったら、完了した親タスクを丸ごと `tasks/T.N.md` に移し、下の一覧の行だけを残す。
- 作業を始める前に `git status`、`git log --oneline -5`、`make check` を実行する。`make check` が落ちる場合は、build / validate / pytest のどこで落ちているか先に確かめる。

## 再開メモ（2026-10-25 時点で一時停止）

- 2026-11-05 追記: T.112（リファクタリング）が進行中。中断の状態と残りの作業は T.112 の節を見る。
- 作業ツリーはクリーンで、すべて push 済み。CI（Test・Deploy Pages）も成功している。
- 自動で進められるタスクは残っていない。「未着手」「進行中」の親タスクは無く、残りは下の判断待ち（Fable 5.5 まで保留）と、T.42（ニュースが増えるまで）・T.57（#10 の返信待ち）だけ。
- 再開したら: (1) #10 に作者の返信があれば T.57.3 に進む。(2) Fable 5.5 で動いていれば、下の判断待ちを effort max で自分で判断して進める。(3) それ以外は `make refresh-sources`（YouTube の API キーは `eval "$(grep '^export YOUTUBE_API_KEY=' ~/.bashrc)"` で読み込み、表示しない）で新しい note・動画を取り込み、新しく見つかった作業を台帳に登録して進める。
- ローカル環境: `.venv` に requirements-dev.txt を入れてある。`make rebuild` などは `PATH=$PWD/.venv/bin:$PATH` を付けて実行する。

## 判断待ちタスクの扱い（2026-10-25 にユーザーが決定）

「判断が必要」で保留にしているタスク（T.91.3・T.94.2・T.95.2・T.96.2・T.98.2・T.99.1・T.100.1・T.101.1・T.104.1・T.110.1・T.111.2）は、いったん保留する。Fable 5.5 が使えるようになったら、ユーザーに質問せずに Fable 5.5（effort max）が各タスクの説明と出典を読んで自分で判断し、判断の理由を台帳に書いてから進める（事実をでっち上げない・推測で勝敗を決めないなどの AGENTS.md の原則はそのまま）。T.42（ニュースが増えるまで）と T.57（Numbers の作者の回答待ち）は対象外。

## 一覧

| 番号 | タイトル | 状態 | 期間 |
|---|---|---|---|
| [T.1](tasks/T.1.md) | プロジェクト初期構築 | 完了 | 2026-05-21 |
| [T.2](tasks/T.2.md) | 結果候補の抽出と review ワークフロー | 完了 | 2026-05-21 |
| [T.3](tasks/T.3.md) | 出典本文 DB と出典ビュー | 完了 | 2026-05-21 〜 2026-05-22 |
| [T.4](tasks/T.4.md) | エージェント向けドキュメント整備 | 完了 | 2026-05-21 〜 2026-05-31 |
| [T.5](tasks/T.5.md) | ビューアの表示改善（カード・詳細トグル・動画埋め込み） | 完了 | 2026-05-21 〜 2026-05-23 |
| [T.6](tasks/T.6.md) | ビューア JS のモジュール分割とリファクタ | 完了 | 2026-05-21 〜 2026-05-23 |
| [T.7](tasks/T.7.md) | リレーショナル CSV スキーマへの移行 | 完了 | 2026-05-25 |
| [T.8](tasks/T.8.md) | ビューアの構成見直しと管理ビュー | 完了 | 2026-05-25 |
| [T.9](tasks/T.9.md) | Numbers 選手名鑑の取り込み | 完了 | 2026-05-25 〜 2026-05-30 |
| [T.10](tasks/T.10.md) | 外部メタデータのアーカイブ化 | 完了 | 2026-05-25 |
| [T.11](tasks/T.11.md) | Numbers データによるクライアント側のリッチ補完 | 完了 | 2026-05-25 〜 2026-05-26 |
| [T.12](tasks/T.12.md) | ソート方針とリポジトリ全体のリファクタ | 完了 | 2026-05-27 |
| [T.13](tasks/T.13.md) | 仮想スクロールとストリーミング読み込み | 完了 | 2026-05-28 |
| [T.14](tasks/T.14.md) | 王座・試合結果のデータ補完 | 完了 | 2026-05-28 |
| [T.15](tasks/T.15.md) | キャッシュ・CDN・ペイロード軽量化 | 完了 | 2026-05-28 |
| [T.16](tasks/T.16.md) | 派生データのクライアント化と再現可能な CSV 生成 | 完了 | 2026-05-28 |
| [T.17](tasks/T.17.md) | 公式サイトデータの連携 | 完了 | 2026-05-29 |
| [T.18](tasks/T.18.md) | ライトテーマとヘッダの刷新 | 完了 | 2026-05-29 |
| [T.19](tasks/T.19.md) | スクロール・検索・パーマリンク・キーボード操作 | 完了 | 2026-05-29 |
| [T.20](tasks/T.20.md) | 管理ビューの拡張と公式タブ | 完了 | 2026-05-29 〜 2026-06-03 |
| [T.21](tasks/T.21.md) | ビルドの統合とストリーミング読み込みの統一 | 完了 | 2026-05-29 |
| [T.22](tasks/T.22.md) | 通信タブとビュー切替 | 完了 | 2026-05-29 〜 2026-06-05 |
| [T.23](tasks/T.23.md) | 選手タブを名鑑の順で並べる | 完了 | 2026-05-30 |
| [T.24](tasks/T.24.md) | タブごとのフィルタ | 完了 | 2026-06-03 〜 2026-06-05 |
| [T.25](tasks/T.25.md) | 信頼度レイヤリングと選手データの統合 | 完了 | 2026-06-03 〜 2026-06-05 |
| [T.26](tasks/T.26.md) | 共有ヘルパーの切り出しとビルド最適化 | 完了 | 2026-06-13 |
| [T.27](tasks/T.27.md) | 読み込みパフォーマンスの最適化 | 完了 | 2026-06-13 〜 2026-06-14 |
| [T.28](tasks/T.28.md) | 保守性の整理・文書監査・コードコメント | 完了 | 2026-06-13 |
| [T.29](tasks/T.29.md) | 選手プロフィールの統合と Numbers 全項目の表示 | 完了 | 2026-06-14 〜 2026-06-15 |
| [T.30](tasks/T.30.md) | サマリーと出典候補の折りたたみ | 完了 | 2026-06-21 |
| [T.31](tasks/T.31.md) | scripts とビューア JS の重複・デッドコード整理 | 完了 | 2026-07-09 |
| [T.32](tasks/T.32.md) | 新しい開発マシンへの移行 | 完了 | 2026-10-24 |
| [T.33](tasks/T.33.md) | YouTube の取得を YouTube Data API に移行 | 完了 | 2026-10-24 |
| [T.34](tasks/T.34.md) | 作業台帳 TASKS.md の導入 | 完了 | 2026-10-24 |
| [T.35](tasks/T.35.md) | アーカイブ CSV の行が消える問題の検討 | 完了 | 2026-10-24 |
| [T.36](tasks/T.36.md) | 公式データの選手マッチング精度向上 | 完了 | 2026-10-24 |
| [T.37](tasks/T.37.md) | Pages 上でストリーミングと仮想スクロールを目視確認 | 完了 | 2026-10-24 |
| [T.38](tasks/T.38.md) | validate_json.js の load() 網羅チェックを実効化 | 完了 | 2026-10-24 |
| [T.39](tasks/T.39.md) | ビューアの未使用データキーと未メモ化フィルタの整理 | 完了 | 2026-10-24 |
| [T.40](tasks/T.40.md) | 結果不明の試合の結果補完 | 完了 | 2026-10-24 |
| [T.41](tasks/T.41.md) | 選手プロフィールの補完 | 完了 | 2026-10-24 |
| T.42 | 公式タブを「公式ページ」と「公式ニュース」に分割 | 保留 | |
| [T.43](tasks/T.43.md) | 王座変遷の精度向上 | 完了 | 2026-10-24 |
| [T.44](tasks/T.44.md) | Numbers データのさらなる突き合わせ | 完了 | 2026-10-24 |
| [T.45](tasks/T.45.md) | note.com のページ構成変更による本文抽出のノイズ | 完了 | 2026-10-24 |
| [T.46](tasks/T.46.md) | YouTube サムネイルの 404 が Console に出る | 完了 | 2026-10-24 |
| [T.47](tasks/T.47.md) | 選手タブ・大会タブの見出しをクリックで絞り込めるようにする | 完了 | 2026-10-24 |
| [T.48](tasks/T.48.md) | 動画タイトルの断片が混ざった選手名を本来の選手にまとめる | 完了 | 2026-10-24 |
| [T.49](tasks/T.49.md) | 生成 CSV の再生成で関係ない差分が出る問題を調べる | 完了 | 2026-10-24 |
| [T.50](tasks/T.50.md) | 煽り・試合前インタビュー動画から作られた重複試合をまとめる | 完了 | 2026-10-24 |
| [T.51](tasks/T.51.md) | 第6回MAXバウトミドル級GP 1回戦を公式ニュースから取り込む | 完了 | 2026-10-24 |
| [T.52](tasks/T.52.md) | 作業ルールを AGENTS.md に足す | 完了 | 2026-10-24 |
| [T.53](tasks/T.53.md) | 公式ニュースの出場者紹介を時点情報として取り込む | 完了 | 2026-10-24 |
| [T.54](tasks/T.54.md) | MAXバウトのスペシャルワンマッチ大会を Numbers の SP / SP2 と照合する | 完了 | 2026-10-24 |
| [T.55](tasks/T.55.md) | 出典言及の結果判定で英単語の一部を KO などと誤検出しない | 完了 | 2026-10-24 |
| [T.56](tasks/T.56.md) | ビューアを今の見た目にとらわれずに作り直す（機能は残す） | 完了 | 2026-10-24 |
| T.57 | Numbers の記録の食い違いを作者に確認してもらう（[#10](https://github.com/takano32/arakaku/issues/10)） | 保留 | 2026-10-25 |
| [T.58](tasks/T.58.md) | 「データが更新されました。」が頻繁に出る原因を直す | 完了 | 2026-10-25 |
| [T.59](tasks/T.59.md) | ローリングJr とギタミン・アーロンの主な階級を最新にする | 完了 | 2026-10-25 |
| [T.60](tasks/T.60.md) | ナビ下の件数表示を押すと該当タブに切り替える | 完了 | 2026-10-25 |
| [T.61](tasks/T.61.md) | 公式ニュース本文の `<iframe>` がタグのまま表示される | 完了 | 2026-10-25 |
| [T.62](tasks/T.62.md) | 新しいタスクを徹底的に洗い出す | 完了 | 2026-10-25 |
| [T.63](tasks/T.63.md) | 公式ニュース Markdown のリンクで XSS が起きる | 完了 | 2026-10-25 |
| [T.64](tasks/T.64.md) | キーボードでボタン・リンク・チップを Enter / Space で押せない | 完了 | 2026-10-25 |
| [T.65](tasks/T.65.md) | 試合の回が「3終了R」と表示される・時間に note の投稿時刻が入っている | 完了 | 2026-10-25 |
| [T.66](tasks/T.66.md) | 検索で全角半角・ひらがなカタカナ・複数語を区別してしまう | 完了 | 2026-10-25 |
| [T.67](tasks/T.67.md) | ビューアの細かい不具合とアクセシビリティ | 完了 | 2026-10-25 |
| [T.68](tasks/T.68.md) | デプロイ前に pytest が走らない・生成 CSV のずれを検出しない | 完了 | 2026-10-25 |
| [T.69](tasks/T.69.md) | 検証の穴をふさぐ | 完了 | 2026-10-25 |
| [T.70](tasks/T.70.md) | note に結果があるのに unknown の 32 試合を取り込む | 完了 | 2026-10-25 |
| [T.71](tasks/T.71.md) | 煽り動画から作られた重複試合 3 件と架空の大会 3 件 | 完了 | 2026-10-25 |
| [T.72](tasks/T.72.md) | 試合の種別の誤り | 完了 | 2026-10-25 |
| [T.73](tasks/T.73.md) | 決着方法・技・判定スコアを note から補う | 完了 | 2026-10-25 |
| [T.74](tasks/T.74.md) | 選手の主な団体・階級が Numbers・公式サイトと食い違う | 完了 | 2026-10-25 |
| [T.75](tasks/T.75.md) | 動画データの古い列と未リンク動画 | 完了 | 2026-10-25 |
| [T.76](tasks/T.76.md) | 王座戦の title_id・title_result が全件空 | 完了 | 2026-10-25 |
| [T.77](tasks/T.77.md) | 日付の欠落と書式の不統一 | 完了 | 2026-10-25 |
| [T.78](tasks/T.78.md) | 公式サイトの試合・歴史データがプレースホルダらしい | 完了 | 2026-10-25 |
| [T.79](tasks/T.79.md) | official_pages.json がローカルと CI で違う | 完了 | 2026-10-25 |
| [T.80](tasks/T.80.md) | ブラウザの「戻る」でサイトから出てしまう | 完了 | 2026-10-25 |
| [T.81](tasks/T.81.md) | サービスワーカーのデータとアプリのコードがずれうる | 完了 | 2026-10-25 |
| [T.82](tasks/T.82.md) | ドキュメントを T.56 以降の実態に合わせる | 完了 | 2026-10-25 |
| [T.83](tasks/T.83.md) | TASKS.md の整理 | 完了 | 2026-10-25 |
| [T.84](tasks/T.84.md) | 使われていないコードとスクリプト | 完了 | 2026-10-25 |
| [T.85](tasks/T.85.md) | テストの重複と性能の小改善 | 完了 | 2026-10-25 |
| [T.86](tasks/T.86.md) | アラカク通信のーとの記事が 49 件取り込まれていない | 完了 | 2026-10-25 |
| [T.87](tasks/T.87.md) | YouTube の新しい動画（2026-05-10 以降）が取り込まれていない | 完了 | 2026-10-25 |
| [T.88](tasks/T.88.md) | 新しいタスクを限界まで洗い出す（2 回目） | 完了 | 2026-10-25 |
| [T.89](tasks/T.89.md) | ビューアが誤った事実を表示する | 完了 | 2026-10-25 |
| [T.90](tasks/T.90.md) | Numbers だけの試合の並び・試合順・ID が不安定 | 完了 | 2026-10-25 |
| T.91 | make rebuild が壊れている | 保留 | 2026-10-25 |
| [T.92](tasks/T.92.md) | make refresh-sources と check-generated の抜け | 完了 | 2026-10-25 |
| [T.93](tasks/T.93.md) | note 解析の不具合とテスト不足 | 完了 | 2026-10-25 |
| T.94 | 結果不明の試合をさらに埋める | 保留 | 2026-10-25 |
| T.95 | 決着欄の残りと書式 | 保留 | 2026-10-25 |
| T.96 | 動画の紐づけの残り | 保留 | 2026-10-25 |
| [T.97](tasks/T.97.md) | 対戦カードの note が記事種別 note_article になり大会に結ばれない | 完了 | 2026-10-25 |
| T.98 | 王座データの補完 | 保留 | 2026-10-25 |
| T.99 | 選手のプロフィール・概要が古い | 保留 | 2026-10-25 |
| T.100 | Numbers にある 14 大会を CSV に入れるか | 保留 | 2026-10-25 |
| T.101 | 対戦カードの選手情報を時点情報にするか | 保留 | 2026-10-25 |
| [T.102](tasks/T.102.md) | ビューアの表示の改善 | 完了 | 2026-10-25 |
| [T.103](tasks/T.103.md) | 取得スクリプトが失敗しても成功を返す | 完了 | 2026-10-25 |
| T.104 | YouTube の公開日が UTC | 保留 | 2026-10-25 |
| [T.105](tasks/T.105.md) | CI と実行環境の細部 | 完了 | 2026-10-25 |
| [T.106](tasks/T.106.md) | 外部リンクの URL スキームを確かめていない | 完了 | 2026-10-25 |
| [T.107](tasks/T.107.md) | ドキュメントとスキルを今の手順に合わせる | 完了 | 2026-10-25 |
| [T.108](tasks/T.108.md) | TASKS.md の表示崩れと記録の欠け | 完了 | 2026-10-25 |
| [T.109](tasks/T.109.md) | #10 に追記できる Numbers の食い違い | 完了 | 2026-10-25 |
| T.110 | 範囲の判断が要るもの（マイナー団体・ライブ・白グローブ・ランナーアップ） | 保留 | 2026-10-25 |
| T.111 | 選手タブのヘビー絞り込みが 1 人 | 保留 | 2026-10-25 |
| T.112 | テストしやすさ・責務の分割・カプセル化を重視したリファクタリング | 進行中 | 2026-11-05 |

---

## T.42 公式タブを「公式ページ」と「公式ニュース」に分割

- 状態: 保留

通常ビューの「公式」タブには `official_pages`（about・history）と `official_news` が混在している。分けるとタブあたりの件数が少なすぎるため、まとめたままにしている。公式ニュースが 10 件程度に増えたら検討する。

2026-10-24 の確認: T.49 で公式サイトを取り直した後は、公式ページ 2 件・公式ニュース 5 件。まだ 10 件に届かないので保留のまま。

実装メモ:

- `config.js` の `PUBLIC_TABS` で `["official", "公式"]` を `["officialPages", "公式ページ"]` と `["officialNews", "公式ニュース"]` に分ける（キーボード 1〜8 の割り当てが 1 つずれる）
- `ui/sections/official.js` を固定ページとニュースの 2 セクションに分け、`ui/sections/index.js` の `SECTIONS` に登録する
- `INITIAL_TAB_DATA_KEYS` は両方のタブで使うので今のままでよい

## T.57 Numbers の記録の食い違いを作者に確認してもらう

- 状態: 保留（作者の回答待ち）
- 期間: 2026-10-25

2026-10-25 にユーザーが依頼:「チケットにしてチケットを見てもらうことにしたい」。T.40・T.43・T.54 で見つかった Numbers 側の疑わしい記録をまとめ、作者向けのチケットにした。

- [x] T.57.1 GitHub Issue [#10](https://github.com/takano32/arakaku/issues/10) を作る（2026-10-25。Issue の作成だけでコミットなし）
  - 両者とも勝ち: エンペラーNo.115 ゆめろう vs クレイエル・アビソカ、ターゲットNo.93 わく vs きたむら、ターゲットNo.95 ワインセル vs センサー・ファッジ、エンペラーNo.105 さかえだ vs チャールス・ブランディン
  - 勝者の食い違い: ターゲットNo.101 かぶと vs イベルト・キューミ（`target-101-0nt8ufrwimc`）
  - 王者の代数: エンペラー ミドル級のミサ・ウィル・ジョー（Numbers は現4代目、note は 3代目）、ターゲット ライト級のわく（Numbers は元9代目、CSV では No.103 で防衛した現王者）
- [x] T.57.2 ユーザーの指摘（「辻褄があってないところ、こちらとの差分は伝えたほうがいい」）を受け、個人成績 561 行を相手側の行・全体シート・CSV と機械的に突き合わせ、#10 を書き直す（2026-10-25。Issue の編集だけでコミットなし）
  - A（Numbers 内の食い違い 39 件）: 両者勝ち・両者負け 5、対戦相手・大会番号の不一致 3（ターゲットNo.102 かぜの、MH No.30 さんごく、ゼット vs らんちゃーすがやの MH37/38）、片側だけの記録 4、決着内容の不一致 5、試合形式の不一致 10、負けなのに勝ち向きの判定スコア 8、全体シートより行が多い 4
  - B（CSV との差分 8 件）: 勝者 1（ターゲットNo.101）、大会番号 1（かぶと vs つくりはら: Numbers No.92、公式動画 No.93）、決着時間 2、王者の代数 2、主な階級 2（ローリングJr、ギタミン・アーロン。CSV が古い可能性）
  - 比較スクリプトはリポジトリに入れていない（一度きりの調査）
- [ ] T.57.3 回答に合わせて CSV（または Numbers の取り込み）を直す
- [x] T.57.4 T.86 で取り込んだ note をもとに #10 へ追記する（2026-10-25。Issue のコメントだけでコミットなし。issuecomment-6398160496・issuecomment-6399044205）
  - 答えが出た項目: A1-4（エンペラーNo.105 はチャールス・ブランディンの勝ち）、A5（エンペラーNo.107 コルト vs マルコは両側ともライト級タイトルマッチ）、B4-2（ターゲットNo.105 がライト級王座決定戦なので「元9代目」で合う。手放した時期は不明）、B5-1（ターゲットNo.104 で引退・返上、14勝5敗）、A1 のターゲットNo.87 イベルト vs センサー（note はセンサーの勝ち）
  - 新しい差分: Numbers に無い試合（第6回MAXバウトライト級 1回戦 コルト vs センサー）、決着の種類（同 2回戦 ブルーワン vs アイス・トロン: note TKO、Numbers KO）、Numbers にまだ無い大会（ターゲットNo.104・105、エンペラーNo.122、マウンテン・ヒーローズNo.41）
  - CSV に無く Numbers にある大会の個人成績を note の ○● と突き合わせ、A1-4 以外に勝敗の食い違いが無いことを確認

## T.91 make rebuild が壊れている

- 状態: 保留（T.91.3 の判断待ち）
- 期間: 2026-10-25

T.88 の洗い出しで登録。

- `reorder_data.py` が T.77 から article_links.csv を読むが、`generate-stage1` の中で動くので stage2 を消した直後に FileNotFoundError で止まり、CSV が消えたまま残る（作業用コピーで再現）
- `extract_numbers.py` が使う `numbers_parser` が pyproject・README・Makefile のどこにも無く、`check-stage1-inputs` も確かめない（system python で ModuleNotFoundError、CSV が消えたまま）
- `regenerate-csvs`・`rebuild-stage2` は stage2 の後に reorder しない
- `clean-stage1-csvs` が archives/*.csv と source_documents.csv を消すので、archived_at・fetched_at と取得できなくなった行の履歴が失われる

- [x] T.91.1 reorder_data を stage2 の後に 1 回だけ動かす（bddb2cc・d5780c8、2026-10-25）。作業用 worktree で .venv の Python を使い make rebuild を最後まで実行し、差分がタイムスタンプ（archived_at・last_checked_at・fetched_at）だけになることを確認（pytest は venv に無いので test で止まった）。記事の並びのキーに article_id を足し、article_links の出力順が rebuild でも同じになるようにした
- [x] T.91.2 numbers_parser を依存として宣言し、入力チェックで import を確かめる（d5780c8・13290a7・8d0ebaf、2026-10-25）
- [ ] T.91.3 rebuild で archives と source_documents を消すのをやめるかをユーザーに確認する

## T.94 結果不明の試合をさらに埋める

- 状態: 保留（T.94.2 の判断待ち）
- 期間: 2026-10-25

T.88 の洗い出しで登録。

T.93 の解析で取れるもの・判断が要るもの。
- T.40 の条件（note と Numbers が一致）で埋まる: mh-38-nm0ig9mdpi（ゼット）、mh-38-htdjihj6z_q（ラドフ）、mh-38-3jbgtu_pkeu（ぱいそんはやし）、emperor-118-u6_s5feulqm（ダイス・ヴォルケード）
- 判断が要る: mh-37-e8wdonlgqdm（note に ○● が無く戦績からきくちぴあのせんの勝ちと読める）、mh-29-7su1lyzlexi（Numbers だけ）、エリートスピリッツミドル級GP 7 試合（公式の選手紹介の優勝・準優勝と勝敗数から組み合わせで決まる。決着は不明）

- [x] T.94.1 T.40 の条件で 4 試合を反映する（928d966、2026-10-25）。○● があって Numbers と一致した emperor-118-u6_s5feulqm・mh-38-3jbgtu_pkeu を反映。mh-38-nm0ig9mdpi（ゼット）と mh-38-htdjihj6z_q（ラドフ）は note に ○● が無い（ゼットは「第二代…王者」の文、ラドフは戦績の増減だけ）ので T.94.2 に回した
- [ ] T.94.2 mh-37・mh-29・エリートスピリッツ、mh-38 のゼット・ラドフ（note に ○● が無い）の扱いをユーザーに確認する

## T.95 決着欄の残りと書式

- 状態: 保留（T.95.2 の判断待ち）
- 期間: 2026-10-25

T.88 の洗い出しで登録。

- 既知 22 試合で決着が空（ターゲットNo.87 6・エンペラーNo.109 4・ターゲットNo.88 3・第6回MAXバウトライト級 1回戦 8・第5回ミドル級決勝）。T.70.4 の mzffdb97ygw も 16 行目に「1R3分51秒KO（飛びヒザ蹴り）」がある
- 時間のゼロ詰め漏れ（3分8秒・3分4秒）、method_raw の全角「ＫＯ」約 25 件と全角空白
- 判定で round が空の試合（emperor-112-xogycqouw_e など。判断が要る）

- [x] T.95.1 T.93 の解析で決着を補い、書式を揃える。検証にゼロ詰めを足す（928d966・a99437b・6138f64、2026-10-25）。既知 21 試合の決着を補い（決着が空の既知試合は 3）、秒のゼロ詰め 2 件と全角 KO・空白 25 件を直し、検証にゼロ詰めを足した。判定で round が空の試合は T.95.2
- [ ] T.95.2 判定で round が空の試合（emperor-112-xogycqouw_e、max-bout-6-middleweight-gp-01・-07）と round が空の反則（emperor-110-lp2btuxgjiy）を Numbers で埋めるかをユーザーに確認する

## T.96 動画の紐づけの残り

- 状態: 保留（T.96.2 の判断待ち）
- 期間: 2026-10-25

T.88 の洗い出しで登録。

- 判断不要: target-103-01 のフルファイト youtube_zwgjiqqhttg、第6回MAXバウトミドル級GP 1回戦のフルファイト 8 本（-01〜-08 がどれも動画なし）、target-103-02 の見どころ youtube_ofy3tcobh3m、大会リンク 5 本（mh-41・emperor-122・target-104 のカード NEWS、第6回 MW GP の 16 名発表・スーパーダイジェスト）。スペシャルワンマッチ No.2 のフルファイト 5 本の video_type が reference
- 判断が要る: 「MAXバウトスペシャルワンマッチ大会煽り映像集」（公開日と概要欄からスペシャル No.1）、タイトルが「第7回MAXバウトミドル級GP」の 3 本（第6回の誤記らしい）、概要欄にだけ大会名がある約 15 本を大会に結ぶか

- [x] T.96.1 判断不要の紐づけを入れる（949017e・7e3c554・1b2f189、2026-10-25）。試合の元動画 9、見どころ 1、大会リンク 5、video_type 5
- [ ] T.96.2 判断が要る 3 件をユーザーに確認する

## T.98 王座データの補完

- 状態: 保留（T.98.2 の判断待ち）
- 期間: 2026-10-25

T.88 の洗い出しで登録。

- won_at_event_id が空: max-bout-lightweight-6・-7、max-bout-middleweight-5（大会は CSV にある）
- title_note が空の王座決定戦（target-96・mh-38）と、note が数えている防衛（target-87 防衛3 ×2、mh-30 防衛②、emperor-112 防衛①、target-100 2度目、target-101 防衛）
- トーナメントの bout_order で決勝が準決勝より前（第6回ライト級・第5回ミドル級・エリートスピリッツ）
- わく（target-lightweight-9）がまだ現王者（ターゲットNo.105 が王座決定戦。判断が要る）

- [x] T.98.1 won_at・title_note・トーナメントの試合順を直す（a0010fe・20c0d19・6f6fbd8、2026-10-25）。title_note は「王座決定戦」と決めつけず note の文面を引用（10 試合。mh-29・mh-30・target-93 は該当行が無く空）。なお note では target-96 のかべいと target-100 のギタミン・アーロンがどちらも「第10代」（title_reigns は 9 代・10 代）
- [ ] T.98.2 わくの王座をユーザーに確認する

## T.99 選手のプロフィール・概要が古い

- 状態: 保留（T.99.1 の判断待ち）
- 期間: 2026-10-25

T.88 の洗い出しで登録。

- 年齢などが最新の対戦カードより古い（つくりはら・きんとき・おとさわ・かべい・ザモン・オーロラデビルなど）
- 30 人の概要が「王座・トーナメント履歴のための最小登録」のまま（試合がある選手も含む）。ギタミン・アーロンの引退が無い
- タイプ・ジーだけ main_promotion_id が max_bout（公式は「メジャー各団体1マッチ契約」。判断が要る）

- [ ] T.99.1 プロフィールの更新方針（最新カードで上書きか時点情報に任せるか）をユーザーに確認して直す

## T.100 Numbers にある 14 大会を CSV に入れるか

- 状態: 保留
- 期間: 2026-10-25

T.88 の洗い出しで登録。

ターゲットNo.83〜86、エンペラーNo.105〜108・121、マウンテン・ヒーローズNo.22〜26 は note の対戦カード・結果があり、Numbers にもある（T.44 の方針でビューアが実行時に補っている）。CSV に入れないと、エンペラーNo.121・MH No.26 のフルファイト 9 本を結べず、Numbers に無い 4 試合（T83 ビル・ジャガー vs ゴスティーノ、まとりだ vs ランド・クラークス、T85 かぶと vs いたみ、T86 パス・フィーリー vs ビル・ジャガー）と約 18 人の選手が見えない。表記ゆれ（ファビオ・パピール／パーピル、レイダー・バルチャコル／バチャコル）あり。

- [ ] T.100.1 T.44 の方針を変えて入れるかをユーザーに確認する

## T.101 対戦カードの選手情報を時点情報にするか

- 状態: 保留
- 期間: 2026-10-25

T.88 の洗い出しで登録。

fighter_snapshots.csv は 26 行（2 大会）だけ。CSV の大会の対戦カード 67 本に約 447 組の選手情報（年齢・身長・ジム・戦績）がある。

- [ ] T.101.1 時点情報として取り込むかをユーザーに確認する

## T.104 YouTube の公開日が UTC

- 状態: 保留
- 期間: 2026-10-25

T.88 の洗い出しで登録。

`arakaku/youtube.py` が publishedAt の UTC 日付を使う。445 本中 55 本が日本時間の公開日の前日になる。note の日付は日本時間。

- [ ] T.104.1 日本時間に揃えるかをユーザーに確認する

## T.110 範囲の判断が要るもの（マイナー団体・ライブ・白グローブ・ランナーアップ）

- 状態: 保留
- 期間: 2026-10-25

T.88 の洗い出しで登録。

- 選手の肩書きに出るマイナー団体 約 20（ネオ・マーキーズ、ジャパンファイト、キングプロレスなど）が promotions.csv に無い
- アラカクライブ No.12〜19・試合だけライブ・超アラカク（約 25 回、日付と会場が概要欄にある）が大会に無い（arakaku_live 団体はある）
- MAXバウトの準優勝者（公式のトーナメント 15）を持っていない
- 選手 1 人の振り返り動画（youtube_tv_q8xyq_x8）を選手に結ぶ表が無い

- [ ] T.110.1 どこまで扱うかをユーザーに確認する

## T.111 選手タブのヘビー絞り込みが 1 人

- 状態: 保留（T.111.2 の判断待ち）
- 期間: 2026-10-25

T.88 の調査（T.102 の説明）から分けた。イーサン・ドンスターの階級が公式サイトの「ヘビー級118kg」で上書きされ、完全一致の絞り込みから漏れていた。ほかのヘビー級 5 人は最小登録なので「その他」側に倒している。ぎんのすけは Numbers がミドル級。

- [x] T.111.1 選手の階級の絞り込みを前方一致にする（fe3345f、2026-10-25）。ヘビーで 2 人（クーラー・ジョイントン、イーサン・ドンスター）
- [ ] T.111.2 最小登録の選手を階級の絞り込みに含めるかをユーザーに確認する

## T.112 テストしやすさ・責務の分割・カプセル化を重視したリファクタリング

- 状態: 進行中
- 期間: 2026-11-05〜

ユーザーの依頼（2026-11-05）。「Fable max でリファクタリング。テスト可能なことと責務の分割、カプセル化などを重視して細かいファイルに割って構わない」。完了の条件: 生成物（docs/data/*.json と data-src・review の CSV）がリファクタリング前とバイト単位で一致し、make check と make check-generated が通り、新しいテストが分割した単位を直接検査していること。挙動を変える修正は混ぜない（見つけたバグは T.112.4 に積んで別に直す）。

**役割分担（2026-11-05 にユーザーが決定）:** レビューと設計の判断は Fable（effort max）が行い（T.112.1.10・T.112.2.16 は済み、残りは T.112.3.5 の最終レビュー）、それ以外の細かい作業は Opus が行う。

**中断の記録:** 2026-11-05、Fable のサブエージェント 2 本（Python 側・ビューア側）が Fable の週の利用上限（HTTP 429、9:00 UTC にリセット）で途中で止まった。止まった時点のコミットは各ブランチに残っていて、作業ツリーに未コミットの変更は無い。両ブランチの先端で make check は通り、`make build` の docs/data は master と完全に一致することを確かめた（2026-11-05）。2 つのブランチが変えたファイルは重ならない（Python 側 68 ファイル、ビューア側 81 ファイル）。

- 作業ブランチ（worktree は `.claude/worktrees/` の下）:
  - Python 側: `worktree-agent-a9a7dad521b481e6b`（先端 6269775、15 コミット）
  - ビューア側: `worktree-agent-af9a3f71a11f54e70`（先端 3d7e35e、20 コミット）
- 同じセッション内なら、止まったエージェントにメッセージを送れば続きから再開できる。セッションが変わったら、上のブランチを起点に新しく任せる。

**レビューの記録（2026-11-05）:** 上限が戻ってから、Fable（effort max）が 2 本のブランチをそれぞれ読むだけでレビューした（T.112.1.10・T.112.2.16）。止まっていた 2 本のエージェントからは引き継ぎの報告を受け取った。
- Python 側: 移した関数の本体を AST で比べると、意図した付け替えのほかは同じ。docs/data・validate_json の出力・make check-generated もすべて一致。
- ビューア側: master とブランチで 15 タブ × 248 の UI 状態（検索・全絞り込み・フォーカス）の行の HTML を比べ、バイト単位で一致。ただし DOM を扱う部分（`ui/render/*` のクラス、検索窓、テーマ、トースト、履歴の配線、`ui/list.js`）はブラウザでしか確かめられず、まだ確かめていない（T.112.2.15）。
- 指摘はすべて下の子に積んだ。挙動が変わるもの（バグ）は T.112.4 にまとめた。

**比較用のスクリプト（コミットしない）:** このセッションの scratchpad（`/tmp/claude-1001/-home-takano32-GitHub-arakaku/af5f415a-719b-4945-974e-2d283b10afc3/scratchpad/`）に残っている。セッションが変わると消えるので、そのときは作り直す。
- `py-refactor/`: build の差分、旧版との生成スクリプトの比較、検証器の出力の比較
- `cmp/dump.mjs`: `node dump.mjs <ROOT> <OUT>` で、ビューアの全タブの行の HTML を書き出す（T.112.2.14 のもの）
- `baseline/`: ビューア側のデータ層の出力（before.json・after.json・verify.sh）

**進め方（この順で行う）:**
1. マージ前に直すもの。Python 側は T.112.1.9・T.112.1.11〜T.112.1.14、ビューア側は T.112.2.17〜T.112.2.19。各ブランチの worktree で行う。
2. ブラウザで master と比べる（T.112.2.15）。
3. master にマージし、ドキュメントとスキルを直して push する（T.112.3.1〜T.112.3.4）。worktree を片付ける（T.112.3.6）。
4. 残りのリファクタリングは master の上で、細かいコミットで進める。順番は、Python 側が T.112.1.15 → T.112.1.7 → T.112.1.5 → T.112.1.8 → T.112.1.16 → T.112.1.6、ビューア側が T.112.2.9 → T.112.2.10 → T.112.2.12 → T.112.2.11 → T.112.2.13 → T.112.2.20〜T.112.2.22。1 歩ごとに、Python 側は docs/data の差分と make check-generated で、ビューア側は `cmp/dump.mjs` の差分で、挙動が変わっていないことを確かめる。
5. Fable が最終レビューをする（T.112.3.5）。
6. T.112.4 のバグを 1 件ずつ直す（挙動が変わるので、リファクタリングとは別のコミットにする）。

- [x] T.112.1 Python のスクリプトとパッケージを分割し、単体テストを足す（2026-11-05。子はすべて完了）
  - [x] T.112.1.1 `arakaku/utils.py` を `paths.py`・`io.py`・`text.py`・`csvmap.py` に分け、各スクリプトの import を移す（ece9f62・2db67ad、2026-11-05）
  - [x] T.112.1.2 JSON の組み立てを `arakaku/build/`（canonical・relations・numbers・official）に移し、build_json.py が import 時に CSV を読む処理（`RESULT_PUBLISHED_AT` など）をなくす。単体テスト test_11_build_canonical.py（9c21e64・021ae96、2026-11-05）
  - [x] T.112.1.3 検証を `arakaku/validation/`（runner・report・entities・links・rules・sources・official・numbers・archives・locate・common・vocab）に移す。単体テスト test_21_validation_units.py（cafc86f・1dc1afd・12eda30、2026-11-05）
  - [x] T.112.1.4 本文 DB・アーカイブ・note 一覧・記事の分類・記事リンク・note 結果照合・出典候補・結果候補を `arakaku/sources/`・`arakaku/notes/`・`arakaku/derive/`・`arakaku/review/` に移し、`arakaku/utils.py` と `mapping.py` を消す（f3b44c7・f4cbcbd・e23f1d7・2364df5・9156cb8・9a6372d・e6032b4・6269775、2026-11-05）
  - [x] T.112.1.5 `extract_numbers.py`（382 行）を `arakaku/numbers/` に分ける。`numbers_parser` の import はスクリプトに残し、パッケージは標準ライブラリだけで CI でも import できるようにする（a087aa3・8767567・d00043a、マージ 6640e3d、2026-11-05）。make extract-numbers で CSV に差分が無いことを確かめた。到達しない端の違い: シートが 0 枚の Numbers ファイルは IndexError ではなく「No fighter data found」になる
    - `numbers/cells.py`: `cell_text`・`clean_text`・`clean_number`・`clean_event_number`・`clean_division`・`promotion_id`・`PROMOTION_MAP`・`RESULT_MAP`・`row_dict`、`require_columns`（`class NumbersSchemaError(ValueError)` を投げる。スクリプトが受けて `SystemExit(f"[error] {exc}")` にし、メッセージと終了コードを今と同じにする）
    - `numbers/names.py`: `normalized_name`・`normalized_name_map`・`generated_fighter_id`・`numbers_fighter_id`・`numbers_record_id`、`extract_numbers.py:180-193` の照合の判断を `match_name(name, name_to_id, by_normalized) -> NameMatch(matched_id, matched_display_name, method, confidence, notes, candidate_id)` として切り出す
    - `numbers/sheets.py`: `FIGHTER_COLUMNS`・`RECORD_COLUMNS`・`fighter_row`・`record_row`・`extract_fighters(table_rows, name_to_id)`・`extract_fight_records(table_rows, fighters_by_name, matches, name_to_id)`。入力は文字列にした行（`list[list[str]]`）にして、テストで Numbers ファイルを要らなくする。「全体」の表の 1 行目を見出しとする規則と、対戦相手の補い（`:266-268`）もここに置く
    - 出力の列名は 3 つの直書きのリスト（`:308-374`）をやめ、`schema.CSV_HEADERS["numbers_*.csv"]` を使う。パスは `paths.NUMBERS_PATH`
    - スクリプトは Document を開き、`cell_text` で行を文字列にし、2 つの抽出を呼び、`write_csv` を 3 回して表示するだけにする
    - `tests/test_12_numbers_extract.py`: 照合の 3 種類（完全一致、正規化して一意＝medium、正規化してあいまい＝generated_candidate）、`clean_event_number("第5回 1回戦A") == "5"`、`clean_division("ライト") == "ライト級"`、`clean_number("12.0") == "12"`、3 行の表での `extract_fighters`、`require_columns` のエラー文、行の辞書のキーがスキーマの見出しと同じこと
    - この環境には numbers_parser が無い（`.venv` にはある）。スクリプト全体の確認は `PATH=$PWD/.venv/bin:$PATH make extract-numbers` で生成した CSV に差分が無いことで行う
  - [x] T.112.1.6 `arakaku/build/canonical.py`（372 行）をエンティティごとに分ける（最後に行う。宣言的なスキーマが多いので、急がない）。`build/articles.py`（`build_articles`・`source_documents_without_bodies`・`source_document_bodies`）、`build/promotions.py`（`_promotion_rules` を含む）、`build/events.py`、`build/bouts.py`（`_bout_matchup`・`_bout_fighters`・`_participant_field`・`_bout_result`・`_bout_title`・`_is_title_bout`）、`build/fighters.py`（`_fighter_profile`・`build_fighter_snapshots`）、`build/titles.py`（`_group_by`）、`build/videos.py`（`_thumbnail_sizes`・`build_video_links`）、`build/aliases.py`。`canonical.py` には `build_metadata` と、出力の順番を決める `json_builders` だけを残す。test_11 もモジュールごとに分ける（b6e0461・65b4ffd・4204735、マージ 6640e3d、2026-11-05）。分割は 1 コミット。test_11 は 1 ファイルのまま、モジュールごとの節に分けた
  - [x] T.112.1.7 小さいスクリプトを、純粋な関数をパッケージに置き、スクリプトは読み書きだけという形にそろえる（出力は変えない。確認は make check-generated）（8f684ce〜c86e9c2 の 14 コミット、マージ 6640e3d、2026-11-05）。設計からの違い: `video_link_rows` は `video_event_links` も受け取る。`apply_patches` は `PatchResult(bouts, participants, applied, unknown_bout_ids)` を返し、入力を変更しない。旧版と新版を同じ入力で走らせて、標準出力・終了コード・出力ファイルが一致することを確かめた（取得系はオフラインの偽物で）
    - `reorder_data.py`: 31〜44 行目の独自の日付計算を `arakaku.event_dates.event_note_dates(articles, article_links)` に置き換える（"9999" の番兵も含めて同じ規則）。`sort_key_date` と、試合・王座の並べ替えキーを `arakaku/derive/ordering.py` に移す。`main()` を足す。test_92 の独立した再実装は、照合用として残す
    - `generate_video_links.py` → `arakaku/derive/video_links.py` の `video_link_rows(videos, fighters, bouts, bout_participants, video_bout_links)`
    - `generate_aliases.py` → `arakaku/derive/aliases.py`（固定の `FIGHTER_ALIASES` などと `alias_rows()`）
    - `apply_structured_result_patches.py` → `arakaku/review/patches.py` の `apply_patches(bouts, participants, patch_rows) -> (bouts, participants, applied)`。CSV の読み書きと表示の順番はスクリプトに残す
    - `generate_official_csvs.py`・`generate_official_pages_csv.py` → `arakaku/official/csvs.py`・`pages.py`（JSON から行への変換、`parse_frontmatter`、`extract_astro_body`）
    - `discover_youtube_videos.py`・`cache_youtube_api.py`・`cache_note_html.py`: `urllib` はスクリプトに残し、純粋な規則（まだ取得が要る行の判定、Shorts の判定、新しい行の組み立て、API の URL の組み立て、`slugify`・`classify_video_type`・`is_short`）を `arakaku/youtube.py` と `arakaku/notes/cache.py` に移す。`discover_youtube_videos.py:95` の長さの正規表現は `youtube.ISO_DURATION_RE` と重複しているが、`fullmatch` と `match` の違いに注意する
    - `build_numbers_json.py`・`build_official_pages_json.py`・`generate_promotions.py`・`generate_titles.py` はすでに薄いか、固定の表なので対象から外す
  - [x] T.112.1.8 単体テストの無いパッケージにテストを足す。実データではなく小さい手書きの行で検査する。価値の高い順に:（81e0b9d・44c7c18・471f804・6e4cae0、マージ 6640e3d、2026-11-05）。test_93〜96 を追加
    - `derive/article_links.article_link_rows`: 重複の除去、`(published_at, article_id)` の順、試合へのリンクは組が出場者に含まれるときだけ、時点情報へのリンクは `note:` の出典だけ
    - `notes/matchups`: `extract_matchups` の行内 🆚・行内 vs・単独行の 🆚 と ☆ で止まること、`title_to_event_ids` の合同大会（T.70 のコメントの例）、`max_bout_event_id` の GP とトーナメントの補い、`clean_fighter_name`
    - `review/note_results.match_bouts`: 判定の 4 種類（agree・agree_other_event・note_only・conflict、`for_event_exact` 経由）、既知の試合の補いと食い違い（`same_value("3分4秒")`）。実データでは 1 行しか通らない
    - `notes/results.pair_verdicts`: ☆ と 2 つ目の 🆚 で区切ること、引き分け
    - `sources/documents`: `keep_unchanged_fetched_at` はハッシュが同じときだけ古い `fetched_at` を残す、`youtube_document` は videos.csv のタイトルと URL を優先する、`note_documents` は note 以外・キャッシュ無し・本文が空を飛ばす、YouTube の ID の補い
    - `sources/mentions.extract_mentions`: URL の手がかりが大会の手がかりより優先されること、`mention_id` の形
    - `notes/crawl`: `merge_articles` の URL での重複除去と `-2` の接尾辞、`row_from_note_object` が 32 文字のキーを弾くこと、`parse_json_notes` が `FetchFailed` を投げること、`normalize_url`、`article_id_from_url`、`parse_rss`
    - `notes/html` のメタデータの解析、`notes/articles.article_row`、`sources/archives` の `archived_at_for` と行の組み立て、`review/mention_result_candidates.nearest_hint` の距離、`textparse.strip_name_prefix`・`infer_time`
  - [x] T.112.1.9 実在しないファイルや古いパスを書いているコメントを、今のファイルに合わせる（コメントだけのコミット。マージ前）。T.112.1.7 を先に行う場合は、そのあとで `ls` と突き合わせて見直す（3ef19e9、2026-11-05）
    - `build/numbers.py:3`（`arakaku/numbers_extract.py` と書いている。実際は `scripts/extract_numbers.py`）
    - `build/official.py:4`（`arakaku/official/` が生成と書いている。実際は `generate_official_csvs.py`・`generate_official_pages_csv.py`）
    - `derive/__init__.py:2-3` と `derive/article_links.py:12`（`aliases.py`・`video_links.py` はまだ無い）
    - `review/__init__.py:5`（`patches.py` はまだ無い）
    - `event_dates.py:4-5`（`reorder.py` と共有と書いているが、`reorder_data.py:31-44` は独自に持っている）
    - `textparse.py:3-4,52`（使う側として古いスクリプト名を挙げている。今は `sources/mentions.py`・`notes/matchups.py`・`notes/results.py`・`review/mention_result_candidates.py`）
    - `io.py:4`（純粋なモジュールは io を import しないと書いているが、12 個が `CsvRow` を import し、`validation/locate.py:12`・`runner.py:14` は `load_json`・`read_csv` を使う）
    - `arakaku/__init__.py:2` と `apply_structured_result_patches.py:10`（`arakaku.utils`）
    - あわせて、各スクリプトの冒頭コメント（役割・アーキ上の位置・不変条件・関連スキル）が新しい構成と合っているかを確かめる
  - [x] T.112.1.10 Fable（effort max）が Python 側の差分全体をレビューする（2026-11-05。コミットなし。指摘は T.112.1.5〜T.112.1.9、T.112.1.11〜T.112.1.16、T.112.4 に積んだ）
  - [x] T.112.1.11 【マージ前・バグ】`match_unknown_bouts_to_note_results.py:38,43` で、`json.loads(path.read_text())` が `load_json(path, [])` に変わった。そのため docs/data が無いと例外にならず、終了コード 0 のまま `review/unknown_bout_note_results.csv` を見出しだけのファイルで上書きしてしまう。`arakaku/io.py` に、ファイルが無いときは `FileNotFoundError(f"{path}: required JSON is missing (run make build)")` を投げる `read_json(path)` を足し、2 か所で使う。test_10 に、無いときに例外になるテストを足す。`load_json(default)` は、自分で欠けを報告する `validation/runner.py` だけで使う（0bbd156・9383539、2026-11-05）。docs/data を外すと終了コード 1 で止まり、CSV は書き換わらないことを確かめた
  - [x] T.112.1.12 【マージ前】`participants_by_bout` という同じ名前の関数が、2 つの違う約束で定義されている。`build/relations.py:102` は赤・青・不明の順に並べ替える。`review/note_results.py:62` はファイルの順のまま `defaultdict` を返す。後者を `participant_pairs_by_bout` に改名し、「ファイルの順。fighter_a・fighter_b の列を決める」と 1 行の docstring を付ける（24da4ac、2026-11-05）
  - [x] T.112.1.13 【マージ前】`paths.py` に足した定数が使われていない。`cache_note_html.py:24` は `NOTE_HTML_DIR`、`extract_numbers.py:23` は `NUMBERS_PATH`、`generate_official_csvs.py:21`・`generate_official_pages_csv.py:22` は `OFFICIAL_SITE_DIR` を import して使う（パスは同じ）（8ddfa77、2026-11-05）。make extract-numbers で CSV に差分が無いことを確かめた
  - [x] T.112.1.14 【マージ前】`review/note_results.py:142` の `ctx.names[a["fighter_id"]]` は、`names_by_fighter` が `defaultdict` を返すときにしか動かない。`NoteMatchContext.names` の既定値は普通の dict なので、手で組んだ文脈（単体テスト）では `KeyError` になる。`ctx.names.get(a["fighter_id"], ())` にする（今の動作は同じ）（e808b85、2026-11-05）
  - [x] T.112.1.15 `CsvRow` を `arakaku/io.py` から `arakaku/schema.py` に移し、15 個の import 元を直す。`note_cache_name` は新しい `arakaku/notes/cache.py` に移す（書く側の `cache_note_html.py` と読む側の `sources/documents.py` が import する。`paths.py` の `text.py` への依存も消える）。そのうえで `tests/test_00_layering.py` を足す。`ast` で次のモジュールが `arakaku.io` と `arakaku.paths` を import していないことを確かめる: `notes/`・`sources/`・`derive/`・`review/` の全モジュール、`csvmap.py`・`text.py`・`textparse.py`・`event_dates.py`・`build/canonical.py`・`build/numbers.py`・`build/official.py`（3ff8e11・4d01e64・ecfcbbf、マージ 6640e3d、2026-11-05）。import 元は 13 個だった
  - [x] T.112.1.16 細かい整理。T.112.1.15・T.112.1.7 で同じファイルに触れるときにまとめて行う（f8a9a6b・5fd1485・d53a312・768391f・738be16、マージ 6640e3d、2026-11-05）
    - `textparse.py` を `arakaku/notes/patterns.py` に移す（中身はすべて note の語彙で、使う側は notes/・sources/mentions・review/mention_result_candidates だけ）
    - `validation/__init__.py` が約 40 の名前を再公開している。`Report`・`run`・`validate_docs_data`・`locate_error` に絞り、test_20・21・30 はサブモジュールから import する
    - `notes/crawl.py:226,235,249` が純粋なはずのモジュールから標準エラーに進捗を出している。`log` を引数で受け取るようにする
- [ ] T.112.2 ビューアの JS を分割し、Node の単体テストを足す
  - [x] T.112.2.1 Node の単体テストを `tests/js/` に移し、`make validate` で `node --test tests/js/test_*.mjs` として走らせる（9642088、2026-11-05）
  - [x] T.112.2.2 `data/repository.js` から大会の日付・王座の系譜・出典の検索・名鑑だけの試合・選手の一覧・重複選手の統合・索引を切り出す（ec420bd・b00be6e・b0c5f5f・4883888・94ecf0b・1b4d003・680f0e6、2026-11-05）
  - [x] T.112.2.3 `data/enricher.js` を `data/enrich/`（official・fighter・bout・media）に分ける（33de0fc・1c7b5d4・00a25cf・c9df281、2026-11-05）
  - [x] T.112.2.4 `data/query.js` から検索用テキストの組み立てを `data/search_text.js` に分ける（9e52152、2026-11-05）
  - [x] T.112.2.5 `ui/parts.js` の HTML 組み立てを `ui/parts/` の純粋なモジュールに移し、Parts クラスをなくす（3b90e98・ed15397、2026-11-05）
  - [x] T.112.2.6 `ui/sections/admin.js` を管理タブごとのモジュールに分ける（a1d209a、2026-11-05）
  - [x] T.112.2.7 `app/state.js` から URL の読み書きと履歴の同期を分ける（c277e50、2026-11-05）
  - [x] T.112.2.8 `ui/shell.js` から検索窓・テーマ切り替え・トースト・動画埋め込み、ナビ・統計・警告・絞り込み・ツールバーの描画、一覧の描画（`ui/render/list_view.js`）を分ける（8d2a971・b9736d8・3d7e35e、2026-11-05）
  - [ ] T.112.2.9 `ui/list.js`（315 行）から判断を純粋なモジュールとして `ui/list/` に切り出す。DOM を持つのは `RecordList` だけにする。import 元で直すのは `ui/render/list_view.js:4` だけ
    - `ui/list/paging.js`: `initialCount(total, chunk)`（84 行目）、`refreshTarget(rendered, chunk, total)` = `min(max(rendered, chunk), total)`（100 行目）、`keysUnchanged(rows, items, keyOf, target)`（101 行目）、`nextEnd(rendered, n, total)`（117 行目）、`statusText({count, loading, emptyMessage})` → `{text, hidden, isLoading}`、`moreLabel(remaining)`（205〜216 行目）
    - `ui/list/cursor.js`: `nextCursor(cursor, delta, total, isCursorable)`（164〜170 行目。-1 から始まることと見出し行を飛ばすことを含む）、`edgeCursor(edge, total, isCursorable)`（172〜178 行目。範囲外の添字を返すことがあり、`setCursor` が丸める）、`clampIndex(i, total)`（181 行目）
    - `ui/list/open_state.js`: DOM を持たない小さい `OpenState`（キーから真偽への Map。`isOpen(key, fallback)`・`set`・`toggle`。132〜155 行目）
    - `ui/list/row_html.js`: `rowShellHtml()`（241〜247 行目のテンプレート）、`toggleLabel(open, title)`（293〜295 行目）、`renderErrorHtml(message)` と `safeRender(fn, item, what)`（218〜225 行目）
    - `#onRowsClick`（300〜314 行目）は list.js に残し、`INTERACTIVE_SELECTOR = "a, button, summary, input, select, textarea, label"` だけを export する
    - テスト: `test_list_paging.mjs`、`test_list_cursor.mjs`（-1 からの両方向、見出し行の飛ばし、端、丸め、空の一覧）、`test_list_row_html.mjs`（テンプレートの文字列そのもの、タイトルの有無での aria-label、エラーの HTML で `<` がエスケープされること）、`test_list_open_state.mjs`
  - [ ] T.112.2.10 `data/repository.js`（382 行。getter 39、メソッド 42。外から使われるのは getter 20、メソッド約 35）を小さくする
    - 呼ぶところが無い getter を 4 つ消す: `sourceDocumentBodies`（123 行目）・`articleLinks`（124 行目）・`boutParticipants`（125 行目）・`titleReigns`（127 行目）。ほかの生データの getter は、`findById` が `this[collectionName]` で引くので残す
    - `enricher`（49 行目）と `sourceReferenceForVideo`（304 行目）を private にする
    - 新しい `data/raw_repository.js`: `class RawRepository`（data、private の IndexCache、`raw()`、残りの生データの getter、`findById`・`findManyByField`、find 系・`videoById`・`numbersFighterById`・`findYoutubeArchive`・`findNoteArchive` の 1 行メソッド、`promotionIdByName`）。`DataRepository extends RawRepository` には、加工済みの getter、`numbersOnly`、加工済みの find 系、memo、`revision`・`invalidate` を残す
    - 新しい `data/relations.js`（純粋。入力は明示し、手書きの入力でテストする）: `videosForEntity(linksByEntity, type, id, videoById)`（291〜295 行目）、`videoIdsLinkedToEventBouts(bouts, videoLinks, eventId)`（297〜300 行目）、`sortSnapshotsByEvent(snapshots, findEvent)`（324〜327 行目）、`sortEventsNewestFirst(events)`（333〜334 行目）、`countMentionTypes(mentions, types)`（350〜357 行目）、`boutsInOrder(bouts)`（370〜371 行目）、`boutsForFighterIds(bouts, ids)`（363 行目）
    - 新しい `data/source_documents.js`: `withBodies(docs, bodyById)`（212〜226 行目）
    - モジュールの `nextRevision` カウンタは残す（QueryMatcher が `repo.revision` でキャッシュするので、新しいインスタンスが同じ番号を使ってはいけない）
    - 最後に、できれば `DataEnricher` にリポジトリ全体ではなく、必要な検索だけをまとめたオブジェクトを渡す（`findEvent`・`findBout`・`numbersFighterById`・`promotionIdByName`・`findYoutubeArchive`・`findNoteArchive`・`videoLinksForVideo`・`numbersNameMatches`・`numbersFightRecords`・`officialPlayers`・`officialTournaments`）。リポジトリと enricher の相互参照が消え、enricher.js を偽物でテストできる
  - [ ] T.112.2.11 `data/loader.js`・`ui/keyboard.js`・`config.js`・`main.js` を見直す
    - `data/loader.js`: `applyLoadedText(key, text)`（解析、「配列 JSON ではありません」の検査、失敗時の扱い。132〜140 行目）を切り出してテストする。fetch と rAF はクラスに残す。`loadKeys` に配列の検査が無い件は T.112.4.16 で直し、ここで黙ってそろえない
    - `ui/keyboard.js`: キーの組み合わせから操作名を返す純粋な表 `keyToAction({key, shiftKey, ctrlKey, metaKey, altKey, inInput, dialogOpen, onControl, hasQuery})`（45〜134 行目）を切り出し、普通のオブジェクトでテストする。クラスは操作を呼ぶだけにする。`document.querySelector("#search")` ではなく `searchBox.focus` を受け取る
    - `config.js`: フェーズの一覧・`TAB_DATA_KEYS`・`REQUIRED_TAB_DATA_KEYS` のキーがすべて `DATA_FILES` にあること、タブの ID が `SECTIONS` にあること、`MENTION_TYPE_ORDER` が labels のキーに含まれることを確かめるテストを 1 つ足す
    - `main.js`: `app/sw_client.js` に `registerServiceWorker({ onDataUpdated })` と、1 セッションに 1 回の更新バナーを移す（メッセージ型 `DATA_UPDATED` は `docs/sw.js` と同期する）。`showFatalError(host, error)` を切り出し、main.js は組み立てだけにする
    - `data/filters.js` はすでに純粋でテストもあるので、分けない
  - [ ] T.112.2.12 各タブの `build()` を DOM なしでテストする
    - `tests/js/fixtures/fake_repo.mjs` を作る。`fakeRepo()` はタブが使う約 45 のメンバーを持ち、中身は 2 団体、3 大会（1 つは名鑑だけ）、4 試合、4 選手（1 組は統合）、2 王座、3 動画、3 文書、4 言及、名鑑と公式の行。`fakeState()` は `FILTER_STATE_KEYS` をすべて ""、`loadedDataKeys` を Set にする
    - タブごとに 1 ファイル。次を確かめる
      - `items` の選び方: 本物の `QueryMatcher(state, () => repo)` での検索、絞り込み 1 つ、フォーカスでちょうど 1 件、存在しないフォーカスで 0 件
      - `keyOf` が一意であること、`rowClass`、王座と公式の `isHeader` と `defaultOpen`
      - `renderHead` と `renderBody` の 2〜3 個の正規表現（例: 試合の head に `data-event-id`、body に「出典候補」）
    - あわせて、`titles.js` の `championLabel` を export してテストする。`tsushin.js` の `cleanNoteBody`・`noteDate`、`official.js` の `officialBodyHtml`、`common.js` の `focusedOrFiltered`・`code` もテストする
    - 実データでの網羅は validate_json.js に任せる
  - [ ] T.112.2.13 `scripts/validate_json.js`（319 行）は今のままでも読めるので、分けるのは役に立つ場合だけにする（分けるなら `scripts/validate_viewer/` の下に registry・loader・repository・search・rendering）。検査は弱めない。あわせて、直接のテストが無いモジュールにテストを足す
    - `ui/html.js`: `escapeHtml`、`boutResultText`（「1R …」の接頭辞の規則を含む）、`recordText`、`formatDate`、`externalLink` が `javascript:` を弾くこと
    - `data/reliability.js`: `isMinimalFighter`、各段階、`lowReliabilityLast` が安定であること
    - `app/state.js`: `patch` が `{}` で通知すること、`viewMode`、`hasFocus`
  - [x] T.112.2.14 挙動が変わっていないことを確かめる（データ層。2026-11-05。コミットなし）
    - 引き継ぎの報告: 20 コミットのそれぞれで、データ層の出力が `baseline/before.json` とバイト単位で一致した。中身は件数、加工済みの全エンティティ、全 ID の検索、15 タブ × 2 つの読み込み段階のすべての行の `renderHead`・`renderBody`、絞り込み、検索、フォーカス
    - レビュー: master とブランチで 248 の UI 状態の行の HTML（17,467 行）が一致した
    - 残りのリファクタリングでは、1 歩ごとに `cmp/dump.mjs` で同じ比較をする
  - [x] T.112.2.15 挙動が変わっていないことを確かめる（ブラウザ。マージ前）。master とブランチを 2 つのポートで配信する。幅 1280px と 390px で `#main` と `#list-host` の innerHTML を比べ、コンソールのエラーと警告が 0 件であることを確かめる。メモリが少ないので、Chrome のページは 1 枚ずつ開く（2026-11-05。コミットなし）。46 の URL を 1280px と 390px で比べた差はすべて読み込みのタイミングによるもので、master 自身も実行ごとに同じ揺れ方をする（隠れた状態行の「読み込み中…」と件数）。37 の操作の手順（タブ・リンク・チップ・検索・スクロール・戻る×2・進む・j/k/g/G/Enter/o/h/l/2・?・Esc・テーマ・検索窓の Esc と ✕・統計のセル・管理ビュー・言及の select・さらに表示）は両方で全く同じ。YouTube の仮表示、IME、Service Worker の登録と更新バナー（1 回だけ）も同じ。エラーと警告は 0 件
    - タブ: `/`、`?tab=tsushin`、`?tab=bouts`、`?tab=fighters`、`?tab=events`、`?tab=promotions`、`?tab=titles`、`?tab=videos`、`?tab=sources`、`?tab=mentions`、`?tab=numbersFighters`、`?tab=numbersNameMatches`、`?tab=numbersFightRecords`、`?tab=officialPlayers`、`?tab=officialMisc`、`?tab=bogus`（公式に戻る）
    - フォーカス: `?tab=fighters&fighter=kabei`、`fighter=frank_dakuta`、`fighter=vanhorn_soldier`、`fighter=bogus`、`?tab=events&event=max-bout-special-1`、`event=max-bout-6-middleweight-gp`、`event=numbers-emperor-105`、`event=bogus`、`?tab=bouts&bout=target-105-05`、`bout=numbers-emperor-105--colt_apro--ice_tron`、`bout=bogus`
    - 検索と絞り込み: `?tab=fighters&q=テール`、`?tab=bouts&q=ターゲット+ミドル級`、`?tab=bouts&q=ﾀｰｹﾞｯﾄ`、`?tab=videos&q=ko`、`?tab=fighters&fighter_promo=max_bout`、`?tab=fighters&fighter_div=other`、`?tab=bouts&bout_div=lightweight&bout_promo=target`、`?tab=events&event_promo=target&event_type=tournament`、`?tab=promotions&promo_cat=major`、`?tab=titles&title_promo=target`、`?tab=titles&title_div=middleweight`、`?tab=videos&video_div=lightweight`、`?tab=tsushin&tsushin_promo=emperor`、`?tab=sources&src_type=note_article`、`?tab=mentions&mention=result`、`?tab=mentions&mention=bogus`（どちらでも T.112.4.21 の食い違いが出る）、`?tab=numbersFighters&nf_promo=target`、`?tab=numbersFightRecords&nr_promo=max_bout`、`?tab=officialPlayers&op_div=heavyweight`
    - 操作（両方で同じになること）:
      - 読み込み: 通信を絞った初回の読み込み（読み込み中の表示、`#list-host` の `aria-busy`、統計が「…」から 7/68/330/132/16/445/611/1745 になる）
      - 履歴: タブ → 選手リンク → 絞り込みのチップ → 検索 → 戻る・戻る・進む（pushState はタブとフォーカスの変更だけ、検索と絞り込みは replaceState、`renderAll` のあとにスクロールが戻る）。ナビのリンクを Ctrl クリック・中クリックすると新しいタブで開く
      - 検索窓: IME の変換中は検索しない（compositionend まで待つ）。Esc（検索語あり・なし）と ✕ ボタン
      - 絞り込みとナビ: チップのオン・オフと `aria-pressed`、言及の select の変更、フォーカスのチップの ✕、ナビの「管理ビュー」の開閉で最後の公開タブ・管理タブに戻ること、統計のセルのクリック
      - キーボード: j/k/g/G/Enter/o/h/l/1-8/c（トースト）/?/Esc
      - 表示: テーマの切り替えが再読み込み後も残ること（`localStorage` の `arakaku-theme`、ボタンの aria-label が変わる）。言及タブの「さらに表示」とスクロールでの追加読み込み。YouTube の仮表示をクリックすると `youtube-nocookie` の iframe に替わること。`document.title` がタブごとに変わること
      - Service Worker: 登録されること。JSON を 1 つ変えると DATA_UPDATED のバナーが出ること
  - [x] T.112.2.16 Fable（effort max）がビューア側の差分全体をレビューする（2026-11-05。コミットなし。挙動の変化は見つからなかった。指摘は T.112.2.9〜T.112.2.15、T.112.2.17〜T.112.2.22、T.112.4 に積んだ）
  - [x] T.112.2.17 【マージ前】`Makefile:18` の `node --test $(wildcard tests/js/test_*.mjs)` は、ワイルドカードが空だとテスト 0 件で成功してしまう（`test_*.mjs` は Node が自動で探す名前でもない）。`JS_TESTS := $(wildcard tests/js/test_*.mjs)` にして、`validate:` で `@test -n "$(JS_TESTS)" || { echo "no tests/js/test_*.mjs found"; exit 1; }` を `node --test $(JS_TESTS)` の前に置く（7666183、2026-11-05）。JS_TESTS を空にすると make が止まることを確かめた
  - [x] T.112.2.18 【マージ前】`tests/js/test_source_lookup.mjs:44-49` のテスト名は「url の無い動画が url の無い文書に当たってしまわない」だが、47 行目の検査は当たることを求めている。今の約束どおりの名前（例:「url が無い動画は url 欄の無い文書に当たる（線形 find の === と同じ約束）」）に改める。動作そのものは T.112.4.20 で直す（2de2bf6、2026-11-05）
  - [x] T.112.2.19 【マージ前】`data/fighter_merge.js:10` の JSDoc に「入力のオブジェクトは変更しない」とあるが、28 行目は統合しない行に `merged_fighter_ids` を書き込んでいる（test_fighter_merge.mjs:34 もそれを確かめている）。コメントを「統合しない行はその場で merged_fighter_ids を付ける」に直す。書き込みそのものは T.112.4.19 で直す（ff06c97、2026-11-05）
  - [ ] T.112.2.20 どこからも import されていない export を整理する。`data/enrich/bout.js:7` の `fightRecordKey` は export をやめる。`ui/parts/sources.js:33` の `sourceDocumentDetail` と `:82` の `sourceReferenceSummary` は、export をやめるか、test_parts_sources.mjs に検査を 1 つずつ足す（`RELIABILITY`・`winRatePercent`・`officialBodyHtml`・`cleanNoteBody` は以前からある。後の 2 つは T.112.2.12 でテストする）
  - [ ] T.112.2.21 `ui/sections/numbers_fighters.js:2` が、enrich の内部モジュールである `data/enrich/fighter.js` から `numbersAchievementLabels` を import している。これを `data/labels.js` に移し、`enrich/fighter.js:108` とタブの両方でそこから import する。test_enrich_fighter.mjs:68-72 の 3 つの検査も一緒に移す
  - [ ] T.112.2.22 細かい整理。`ui/render/filters.js` と `data/filters.js` は名前が同じなので、前者を `ui/render/filter_chips.js` に改名する。`test_parts_bouts.mjs` の中で `links.js` を検査している部分を `test_parts_links.mjs` に分ける。`events.js` の `EVENT_TYPE_LABELS` と `promotions.js` の `CATEGORY_LABELS` が `filters.js` の選択肢のラベルと重複しているので、1 か所にまとめる（表示が変わらないことを `cmp/dump.mjs` で確かめる）。`data/query.js:24` の正規表現の文字の書き換えは、同じ文字であることを確かめたので、そのままにする
- [ ] T.112.3 2 つの作業を master に取り込み、ドキュメントとスキルを新しい構成に合わせる
  - [x] T.112.3.1 2 つのブランチを master にマージする（変えたファイルは重ならない）。マージ後に make check と、変更の無い作業ツリーで make check-generated を通し、`make build` の docs/data がマージ前の master と一致することを確かめる（57caec7・636aef3、2026-11-05）。make check（JS 115 件と pytest）と make check-generated が通り、docs/data はマージ前と一致
  - [ ] T.112.3.2 古いパスを指すドキュメントを直す（`grep -rn "arakaku/utils\|arakaku.utils\|mapping.py\|ui/parts.js\|enricher.js\|sections/admin.js\|test_filters.mjs\|test_markdown.mjs\|readFromURL\|writeToURL\|#renderList\|#renderNav\|#renderFilters"` で洗い出す）。報告で分かっている行:
    - README.md: 93・97・104・579・645〜646・648・649・660・867
    - scripts/GEMINI.md: 28・33
    - GEMINI.md: 83・90
    - CODEX.md: 52・354〜355（ctx に `parts` はもう無い）
    - SCHEMA_NOTES.md: 255〜257
    - docs/VIEWER_FEATURES.md: 15・25・28・30・40・43・46・47・53〜55・65〜67・93・95・97・98・110〜114・123・135・139〜149・159
    - scripts/validate_json.py: 8
    - docs/index.html: 31 の HTML コメント（`ui/shell.js #syncThemeButton` → `ui/theme.js ThemeToggle.sync`）
    - HANDOFF.md: 188〜196・501 は日付つきの履歴なので残す。CHRONICLE.md・tasks/ も履歴なので直さない
  - [ ] T.112.3.3 スキルを新しい構成に合わせる
    - 報告で分かっている行: arakaku-viewer-ui（18・22・23・26・135・137）、arakaku-filters（80・85・99・108・114）、arakaku-maintainer（81・104〜105）、arakaku-reliability-layering（26〜28・37。`#applyOfficialPlayer` などは data/enrich/fighter.js に移った）、arakaku-numbers-pipeline（172・220・222。入口は今も DataEnricher.enrichFighter・enrichBout だが、規則は移った）、arakaku-source-pipeline（126。`note_cache_name()` は paths.py、T.112.1.15 のあとは notes/cache.py）
    - ほかに arakaku-review-workflow・arakaku-data-curator・arakaku-sorting-strategy・arakaku-docs-handoff も見る（特にモジュールの一覧と make validate の中身）
  - [ ] T.112.3.4 push して CI（Test・Deploy Pages）が通ることを確かめ、公開サイトを開いてコンソールのエラーが無いことを確かめる
  - [ ] T.112.3.5 Fable（effort max）がマージ後の全体を最終レビューする。指摘は新しい子として積む
  - [x] T.112.3.6 作業用の worktree とブランチを消す（`git worktree remove`・`git branch -d`）（2026-11-05。コミットなし）。最初の 2 本の worktree とブランチを消した。残りのリファクタリング用の worktree（2 本）も、それぞれのマージのあとで消す
- [ ] T.112.4 リファクタリング中に見つけたバグを、1 件ずつ別のコミットで直す。2026-11-05 に、2 本の引き継ぎの報告と 2 本のレビューから集めた。どれもリファクタリング前の master からある（マージ前のバグ T.112.1.11 は除く）。直すと出力や挙動が変わるので、データが変わるものは生成物を別のコミットにし、ビューアの挙動が変わるものは docs/VIEWER_FEATURES.md も直す
  - [x] T.112.4.1 【Python・高】`build_source_documents.py` は、`tmp/` にキャッシュが無いと終了コード 0 のまま `data-src/source_documents.csv`（27,913 行が 1 行になる）と `source_mentions.csv` を切り詰めてしまう（master で再現済み）。文書が 0 件のときは `SystemExit("[error] no cached sources under tmp/; refusing to overwrite …")` で書かないようにするか、`build-sources` を `check-stage1-inputs` に依存させる（6e92fc8・94d6f67、2026-11-05）。note と YouTube のどちらかが 0 件なら書かずに止まる。キャッシュがあるときの出力は値も件数も変わらない
  - [x] T.112.4.2 【Python】`review/note_results.py:50,144`（元の `match_unknown_bouts_to_note_results.py:58-68, 219-233`）。名前の表記の集合を set の順で回すので、同じ note に 2 つの表記（例: わく・ワク）が別の行範囲で記号付きで出ると、引用する行が実行ごとに変わりうる（make check-generated が不安定になる）。今のデータでは起きない。名前を並べ替えた順で回す（28727f2・ab6939e、2026-11-05）。make check-generated で review の CSV が変わらないことを確かめた
  - [x] T.112.4.3 【Python】`apply_structured_result_patches.py` が `bouts.csv`・`bout_participants.csv` をそのまま `open("w")` で書いている。途中で落ちると正本のデータが切り詰められるので、`arakaku.io` の atomic な書き込みにする（表示の順番は変えない）（9dcf49f、2026-11-05）。表示の順番はそのまま
  - [x] T.112.4.4 【Python】`apply_structured_result_patches.py:107,109` の補いは、赤コーナー＝fighter_a を前提にしている。しかし作る側（`review/note_results.match_bouts`）の fighter_a は `bout_participants.csv` の最初の行で、赤とは限らない。今は名前の一致が先に当たるので害は無いが、名前が合わない手直しの行では勝者を取り違える。fighter_a・fighter_b の名前だけで決めるようにする（4435a93・9dcf49f・e174732、2026-11-05）。名前が 1 人ずつ一致しない行は [warn] を出して何も当てない（補いで勝者を推測しない）
  - [x] T.112.4.5 【Python】`read_csv`（`arakaku/io.py:34-37`）は、data-src の外のファイル（`load_tables` が読む review の 3 つの CSV）が無いと `[warn]` を出して `[]` を返す。そのため review の CSV を消したり改名したりすると、`source_*_references.json` が空になったまま検証も通る。`load_tables` のこの 3 ファイルは、無ければエラーにする（`required=True`）（4eb9bc9・3ef9960・d22841f、2026-11-05）
  - [x] T.112.4.6 【Python】`build/canonical.py:229` の王座の並べ替えキー `parse_int(...) or 0` は、数字でない `reign_order` のとき文字列を返す。そのため `sorted()` が `TypeError` で build ごと止まり、悪い行が報告されない。検証で報告するようにする（今のデータはすべて数字）（44e23bf・a0f45b2・f1c3e26、2026-11-05）。数字でない値は検証で error にする
  - [x] T.112.4.7 【Python】titles と fighter_snapshots の ID の重複が 2 回報告される（`validation/runner.py:117,119` と `entities.py:161,216` の両方で `collect_ids` を呼んでいる）。1 回にする。あわせて `validation/runner.py:58-61` で `metadata.json` が 2 回挙がっているのを直す（1ae17fb・1346f26、2026-11-05）
  - [ ] T.112.4.8 【Python】bouts.json の空の扱いがそろっていない。`build/canonical.py:139` の `time`・`method_raw`・`method_normalized`・`technique`・`decision_score` と、`:150` の `title_id`・`title_result` は、空のセルを `""` で出す。ほかの列はすべて `none_if_empty` で `null` にしている。`null` にそろえる（bouts.json が変わるので、検証器・ビューア・validate_json.js が両方を空として扱うことを確かめてから）
  - [x] T.112.4.9 【Python】`sources/documents.py:98` の `video.get("published_at") or cached["upload_date"]` は、videos.csv に `published_at` 列が無いので、CSV の値が勝つことはない。「正本の値を優先する」というコメントもこの列については誤り。死んだ分岐を消す（827138d・a99eff4、2026-11-05）。source_documents.csv の値は変わらない
  - [x] T.112.4.10 【Python】`notes/crawl.py:97-106` の `infer_article_type` が、`notes/articles.py` では作らず、検証もしない `title_history` という値を出す。この値は、キャッシュされず再生成もされない取得行に残る。語彙をそろえるか、`article_type` を検証する（387916c・25d1b73・8fe195a、2026-11-05）。promotion_profile にそろえ、article_type を検証する
  - [x] T.112.4.11 【Python】`notes/articles.py:89` は、タイトルに「｜」があるときだけ `.strip()` する（`classify_article` は常に strip する）。直す前に、articles.csv に前後の空白があるかを確かめる（あれば出力が変わる）（59a796d・a99eff4、2026-11-05）。articles.csv に前後の空白のあるタイトルは無く、生成物は変わらない
  - [x] T.112.4.12 【Python】`arakaku/youtube.py:62-64` は、壊れたキャッシュの JSON を `[warn]` だけで飲み込んでいる（AGENTS.md の「広く例外を飲み込まない」に反する）。エラーにする（fff741b・d9c5359、2026-11-05）
  - [x] T.112.4.13 【Python・小】細かいもの（1d4ebd3・a260c8b・c837fca・a282b5b、2026-11-05）。archived_at の既存の行は、どの時間帯で書いたか分からない（+0900 の環境で書かれた）ので書き換えず、新しい行だけ UTC の時差つきにした。source_documents の並びは今のデータでは変わらない。`Report.warnings` は、消すと表示が変わるだけで得が無いので残す
    - `sources/archives.py:36` の `archived_at` は時差の無いローカル時刻で、`fetched_at` は UTC と時差つき。そろえる
    - `reorder_data.py:85` は `source_documents` を日付だけで並べ、同じ日付の順番を作る側に任せている。ID を第 2 キーにする
    - `notes/results.py:62` の `mark_a in WIN_MARKS` は、`"" in "○◯〇"` が真であることに依存している。明示的に書く
    - `validation/report.py` の `Report.warnings` は使われていない（消すと「… 0 warning(s)」の表示が変わる）
  - [ ] T.112.4.14 【ビューア】検索窓で Esc を押すと、選手・大会・試合のフォーカスが外れ、履歴も 1 つ積まれる。`ui/search_box.js:31` → `Shell.clearSearch()`（`ui/shell.js:146`）が、無条件に `state.clearFocus()` を呼ぶため。全体の Esc（`ui/keyboard.js:57`）は T.102 で検索語があるときだけに直したが、入力欄のほうは直っていない。再現: `?tab=fighters&fighter=<id>` を開き、空の検索窓で Esc。検索語が空のときはフォーカスを残す
  - [ ] T.112.4.15 【ビューア】`ui/shell.js:133-140` の `#jump` が、検索の遅延（150ms）を取り消さない（`clearSearch` は取り消す）。再現: 「ka」と打って 150ms 以内に一覧の選手リンクを押すと、検索窓は空なのに「ka」で検索され、フォーカスが消える。`#jump` の最初で `this.#searchBox.cancelPending()` を呼ぶ（対称のため `switchTab` でも）
  - [ ] T.112.4.16 【ビューア】`data/loader.js:106` の `loadKeys`（Phase 0 の公式ページ・公式ニュースと `loadAll` で使う）には、`#loadKeyProgressive`（135 行目）にある「配列 JSON ではありません」の検査が無い。そのため `official_pages.json` が `{}` だと読み込みエラーとして出ず、「描画エラー」になる。検査を共通にする（T.112.2.11 の `applyLoadedText` を使う）
  - [ ] T.112.4.17 【ビューア】タブの `build()` が例外を投げたとき、`ui/render/list_view.js:114-118` が `#lastCount` を更新せずに戻る。そのため、エラーの表示の横に前の「N 件」が残る。catch の中で `this.#lastCount = -1` にする
  - [ ] T.112.4.18 【ビューア】`data/enrich/fighter.js:54` の `if (op.bio && !rich.summary) rich.summary = op.bio;` は、102 行目が `rich.summary` を計算し直すので効果が無い（公式の紹介文は `official_data` で出すのが意図。test_enrich_fighter.mjs:28 がそれを固定している）。この行と 53 行目のコメントを消す
  - [ ] T.112.4.19 【ビューア】`data/fighter_merge.js:28` が、統合しない選手の入力のオブジェクトに `merged_fighter_ids` を書き込んでいる。名鑑・公式のデータが無い 43 人（130 人中）では、それが `state.data.fighters` の生の行なので、「生の JSON は読むだけ」という約束が選手タブを描いた時点で破れる。`Object.assign({}, f, { merged_fighter_ids: [f.fighter_id] })` にし、test_fighter_merge.mjs:34-35 を直す（`findFighter(id) !== findRichFighter(id)` になるが、同一性に頼っているところは無い）
  - [ ] T.112.4.20 【ビューア・潜在】`data/source_lookup.js:18,48` の `forVideo` は、`doc.url`・`video.url` を生の値で登録して引く。そのため url の無い動画が、url の無い最初の YouTube の文書に当たる（`undefined === undefined`）。今は url の無い文書も動画も 0 件。`remember()` で `null` と `""` を登録せず、`forVideo` で `!video.url` のときは url で引かない。T.112.2.18 のテストも合わせて直す
  - [ ] T.112.4.21 【ビューア】`mention=` は値を検査しない（`VALID_FILTER_VALUES` に `mentionType` が無い）。そのため `?tab=mentions&mention=bogus` は 0 件（「該当する言及がありません」）なのに、select は一致する選択肢が無いので「すべての言及」と表示する。`isValidParam` で `MENTION_TYPE_ORDER` と照らし合わせる
  - [ ] T.112.4.22 【ビューア・性能】言及タブでは、`ui/render/filters.js:58` の `sortMentionTypes` が、状態が変わるたび（1 文字打つたび）に 2,527 件の言及を写して並べ替える。`repo.revision` で覚えておく
  - [x] T.112.4.23 【Python】`notes/matchups.py:81-96` の `extract_promotion_profile_fighters` は `nfkc(line)` に対して照合するが、NFKC で全角の括弧「（）」が「()」になるのに、コードは `（[^）]*）` を取り除き、MAXバウトの形式は `第N回名前（` を探している。そのため実データで、役割の注記が取れずに選手 ID に結びつかない（note-emperor の「むらき(ターゲットライト級王座統一)」「ユーナ・ガナ(2階級王者)」）。MAXバウトの王者の形式も一致せず、note-max-bout の団体紹介記事に選手のリンクが付かない。直すと article_links.csv が変わる（2026-11-05、Python 側の残りのリファクタリングで見つかった）（005661c・c7b06c3・3622dce、2026-11-05）。団体紹介の note から歴代王者へのリンクが 10 本増えた（note の行と照らして確かめた）
  - [x] T.112.4.24 【Python・潜在】`sources/documents.py:89` は、videos.csv に無い動画の ID を `youtube_<元の ID>` で作るが、videos.csv の ID は `youtube_<slugify した ID>`（小文字）。今は videos.csv に無い動画の文書は無いので表に出ない。`arakaku.youtube` の ID の作り方を共有する（e039e46・fd81ce3、2026-11-05）。今のデータでは変わらない
- [x] T.112.5 `.claude/worktrees/` を .gitignore に入れる（47f4ec7、2026-11-05）。今は master の作業ツリーで `.claude/` が未追跡として出ていて、`git add -A` で worktree を誤ってコミットするおそれがある
