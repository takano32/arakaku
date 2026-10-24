# T.16 派生データのクライアント化と再現可能な CSV 生成

- 状態: 完了
- 期間: 2026-05-28

再現できない派生データを CSV から外してビューア側で導出し、CSV を生スキャン（stage1）と派生（stage2）の 2 段で再生成できるようにした。

## 子タスク

- [x] T.16.1 Numbers から選手のジム・階級を補完し、王座在位の大会 3 件を導出（93c7cd2, 2026-05-28）
- [x] T.16.2 隣接する在位から王座の大会をクライアント側で導出（906e1e5, 2026-05-28）
- [x] T.16.3 fighters.csv と title_reigns.csv から派生データを削除（revert）（1e64557, 2026-05-28）
- [x] T.16.4 再現できない派生データを CSV からすべて削除（revert）（8ec5ed1, 2026-05-28）
- [x] T.16.5 全エンティティにリッチ getter を追加し、王座獲得をクライアント側で導出（e19b97d, 2026-05-28）
- [x] T.16.6 ビュー層で全エンティティのリッチ版を使う（8dc82bd, 2026-05-28）
- [x] T.16.7 選手・試合の補完用に遅延インデックスを作り O(1) に（97f5d44, 2026-05-28）
- [x] T.16.8 Makefile に再現性ターゲットを追加し、生成 CSV を更新（ad9c2c6, 2026-05-28）
- [x] T.16.9 articles / aliases / video_links CSV の生成スクリプトを追加（f328feb, 2026-05-28）
- [x] T.16.10 クロールデータから article_links / promotions / titles CSV を自動生成（80874fb, 2026-05-28）
- [x] T.16.11 build_source_documents の前に generate_articles を実行（d3fdd17, 2026-05-28）
- [x] T.16.12 regenerate-csvs を generate-stage1 / generate-stage2 に分割（d9d500f, 2026-05-28）
- [x] T.16.13 clean ターゲットを分割し、rebuild-stage2 を追加（70097af, 2026-05-28）
