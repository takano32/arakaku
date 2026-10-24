# T.17 公式サイトデータの連携

- 状態: 完了
- 期間: 2026-05-29

kobayashi856/arakaku-site のデータを取得して official_*.csv / JSON にし、選手・大会カードへクライアント側で統合した。

## 子タスク

- [x] T.17.1 公式サイトのリポジトリからデータを取得する download_official_data.sh を追加（0f6f1d9, 2026-05-29）
- [x] T.17.2 cache-sources に download-official-data を追加（de482fd, 2026-05-29）
- [x] T.17.3 tmp/arakaku-site/.gitkeep を追加し、.gitignore を更新（86af647, 2026-05-29）
- [x] T.17.4 tmp/arakaku-site の JSON から official_*.csv を生成（e6ab7eb, 2026-05-29）
- [x] T.17.5 generate_official_csvs を stage1 に移動（659ad62, 2026-05-29）
- [x] T.17.6 build_official_json.py と build-official ターゲットを追加（ceabb15, 2026-05-29）
- [x] T.17.7 公式の選手データ（ニックネーム・国籍・紹介文・戦績）で選手を補完（a1b1584, 2026-05-29）
- [x] T.17.8 公式データの補完を大会・スナップショット・出場者に拡張（2270423, 2026-05-29）
- [x] T.17.9 選手カードに公式のニックネーム・国籍・戦績、大会カードに優勝者を表示（22448a3, 2026-05-29）
- [x] T.17.10 src/data/ ではなく src/ を取得し、JSON の読み込みパスを更新（e748281, 2026-05-29）
- [x] T.17.11 パスの [slug] に対応するため curl に --globoff を追加（a0a824a, 2026-05-29）
- [x] T.17.12 Phase 10 の作業に合わせて SKILL.md と HANDOFF.md を更新（2194094, 2026-05-29）
- [x] T.17.13 Phase 10 の作業に合わせて全文書を同期（2325d33, 2026-05-29）
