# T.15 キャッシュ・CDN・ペイロード軽量化

- 状態: 完了
- 期間: 2026-05-28

Service Worker による stale-while-revalidate、lite-youtube-embed、source_documents の本文分離など、読み込みを軽くした。

## 子タスク

- [x] T.15.1 source_documents.json から本文を source_document_bodies.json に分離して遅延読み込み（a3ee90c, 2026-05-28）
- [x] T.15.2 refreshItems で DOM をクリアして残像行を防ぐ（be01cbf, 2026-05-28）
- [x] T.15.3 選手カードの決まり手を通常の文字色に（172ef87, 2026-05-28）
- [x] T.15.4 record-details の値の文字色を戻す（0ce85b5, 2026-05-28）
- [x] T.15.5 Service Worker で JSON を stale-while-revalidate キャッシュ（74a8522, 2026-05-28）
- [x] T.15.6 YouTube の iframe を lite-youtube-embed に置き換え（2dd85dc, 2026-05-28）
- [x] T.15.7 Phase 9（キャッシュ・CDN・データ品質）を記録（4930b68, 2026-05-28）
