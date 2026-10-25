# T.75 動画データの古い列と未リンク動画

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

`videos.link_status` は 355 件が `unlinked` だが、265 件は試合に紐づいていてビューアに「未紐づけ」と出る。`channel_name=NA`（359 件）、`published_at` が全件空（アーカイブに upload_date あり）、notes が yt-dlp 時代のまま。リンクの無い 90 動画のうち約 35 本は 1 つの大会のダイジェスト・見どころ・ライブ配信。

- [x] T.75.1 `link_status` をリンク表から導くか列を廃止する（f53c58d・bd88c0c、2026-10-25）。列を廃止し、build_json がリンク表から導く。linked 269 / unlinked 91（のち T.75.3 で 315 / 45）。partially_linked だった youtube_qecknlomyoy は notes に説明が残っている
- [x] T.75.2 `channel_name`・`published_at`・notes をアーカイブから直す（c1104b3・ccee07b、2026-10-25）。channel_name・published_at の列を廃止し、videos.json はアーカイブから写す（初回描画の「NA」も解消）。yt-dlp 時代の notes 359 件を空にした（再生時間はアーカイブにある）
- [x] T.75.3 大会が明らかな約 35 本の動画に `video_links` を追加する（046afcd・cfeea2b・54c2d0a・188464a、2026-10-25）。手で管理する `video_event_links.csv` を新設し、タイトルに大会名がある 46 本・52 リンクを入れた。大会が特定できない「MAXバウトスペシャルワンマッチ大会煽り映像集」などは入れていない。README は 3cae0c1
