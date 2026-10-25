# T.87 YouTube の新しい動画（2026-05-10 以降）が取り込まれていない

- 状態: 完了
- 期間: 2026-10-25

T.86 の調査で判明。`archives/youtube.csv` の最新の公開日は 2026-05-10。`cache_youtube_api.py` は `videos.csv` にある ID の情報を videos.list で取り直すだけで、チャンネルの新しい動画を見つける処理がない（以前の yt-dlp の取り込み `import_youtube_videos.py` は T.33 以降使われていない）。

- [x] T.87.1 YouTube Data API（channels.list の uploads プレイリスト → playlistItems.list）でチャンネルの全動画 ID を列挙し、`videos.csv` に無いものを見つける（bda3b59、2026-10-25）。チャンネルの動画は 727 本、videos.csv は 360 本（Shorts は 0 本。最初の取り込みが「動画」タブだったため）。欠けは 367 本で、うち Shorts 282 本（タイトルに #shorts、または 60 秒以内）
- [x] T.87.2 新しい動画を `videos.csv` に追加し、キャッシュ・アーカイブ・本文 DB を作り直す。`make refresh-sources` に組み込む（9dedbe0・3ef670e・208147a・70c42c9、2026-10-25）。Shorts 以外の 85 本を追加（エンペラーNo.121・122、ターゲットNo.103・104、マウンテン・ヒーローズNo.26・41、第6回MAXバウトミドル級GP一回戦のフルファイト、観戦配信、NEWS など）。videos 360 → 445、出典 479 → 611。試合・大会への紐づけはしていない（大会が CSV に無いものは T.86.3 の判断待ち）。Shorts を入れるかは必要になったら `--include-shorts`
