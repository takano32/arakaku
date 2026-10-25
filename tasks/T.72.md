# T.72 試合の種別の誤り

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

`target-101-vplbxarc3pc`（ギタミン・アーロン vs おとさわ）は動画タイトルが「ターゲットNo.101 ミドル級タイトルマッチ」なのに `video_catalog_bout`・階級空・`is_title_bout=false`。ほかに target・mh・emperor の 22 試合が `video_catalog_bout` のまま（タイトルはワンマッチ）。`max-bout-special-2` は `one_match`、special-1 は `special_one_match`。

- [x] T.72.1 target-101-vplbxarc3pc を title_match・ミドル級・王座戦にする（fafa9df、2026-10-25）。title_id は T.76 の判断待ちなので空のまま
- [x] T.72.2 ほかの `video_catalog_bout` とスペシャルワンマッチの種別を揃える（fafa9df、2026-10-25）。動画タイトルがワンマッチの 17 試合を one_match、special-2 の 5 試合を special_one_match に。煽り動画由来の video-catalog-* 2 試合は T.71 で扱う。生成 CSV への影響なし（check-generated 成功）
