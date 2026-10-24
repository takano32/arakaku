# T.46 YouTube サムネイルの 404 が Console に出る

- 状態: 完了
- 期間: 2026-10-24

`lite-youtube-embed` は最初に `hqdefault.jpg` を表示し、その後で高画質の `vi_webp/<id>/sddefault.webp` を取りに行く。高画質版のない動画では YouTube が 404 を返し、ブラウザがそれを Console にエラーとして記録する（2026-10-24 の T.37 で `dHBctG1OlFU` を確認）。ライブラリは 404 のときに返る 120×90 の代わりの画像を見分けて `hqdefault.jpg` のまま表示するので、見た目の問題はない。

AGENTS.md は Console のエラーを本当の失敗として扱うよう求めている。直すなら `<lite-youtube>` に背景画像を最初から指定して高画質化を止める方法があるが、全動画のサムネイルが `hqdefault` 止まりになる。

- [x] T.46.1 高画質化をやめて Console をきれいにするか、ライブラリの想定どおりの 404 として許容するかを決める
  - 2026-10-24 にユーザーが決定: 高画質版の無い動画だけ高画質化を止める。YouTube Data API の `snippet.thumbnails` に `standard`（= `sddefault`）が無い動画は 360 本中 2 本（`dHBctG1OlFU`、`SaeRIC9vHMI`）で、残りは高画質のまま
- [x] T.46.2 `archives/youtube.csv` に API が返したサムネイルの種類（`thumbnail_sizes`）を保存する（961f8e4, 2026-10-24）
- [x] T.46.3 `videos.json` に `thumbnail_sizes` を載せる（`youtube_archives.json` は後から読み込まれ、最初の描画に間に合わないため）（961f8e4, 2026-10-24）
- [x] T.46.4 ビューアで、`standard` が無いと分かっている動画は `<lite-youtube>` に `hqdefault.jpg` の背景を最初から指定して高画質化を止める（961f8e4, 2026-10-24）
- [x] T.46.5 公開中の Pages で、該当動画を表示しても Console に 404 が出ないことを確かめる（2026-10-24）
  - `dHBctG1OlFU` と `SaeRIC9vHMI` は `hqdefault.jpg` のまま表示され、`sddefault.webp` へのリクエストも Console のエラーも無い。手元のサーバーでは、ほかの動画（ターゲットNo.103 の 5 本など）が今まで通り `sddefault.webp` に切り替わることも確認
  - デプロイ直後の 1 回目だけは 404 が出た。ブラウザに残っていた古い JS を使ったためで、読み込み直すと出なくなった（GitHub Pages は JS を最大 10 分キャッシュさせる）
