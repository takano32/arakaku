# T.33 YouTube の取得を YouTube Data API に移行

- 状態: 完了
- 期間: 2026-10-24

yt-dlp はこのマシンの IP では YouTube に拒否される（接続方法 8 種、最新版、Chrome の cookie をすべて試して失敗）。YouTube Data API v3 の `videos.list` で取得するように切り替える。

- [x] T.33.1 取得と読み取りを実装（338b469, 2026-10-24）
  - [x] T.33.1.1 `scripts/cache_youtube_api.py` を追加（50 件ずつ取得し `tmp/youtube-api/<id>.json` に保存）（338b469 に含まれる）
  - [x] T.33.1.2 `scripts/arakaku/youtube.py` に読み取りと正規化を共通化（338b469 に含まれる）
  - [x] T.33.1.3 `archive_metadata.py` / `build_source_documents.py` / `import_youtube_descriptions.py` を API キャッシュに切り替え（338b469 に含まれる）
  - [x] T.33.1.4 `scripts/cache_youtube_info.py` を削除し、Makefile ターゲットを `cache-youtube-api` に変更（338b469 に含まれる）
  - [x] T.33.1.5 `tests/test_60_youtube_cache.py` を追加（338b469 に含まれる）
  - [x] T.33.1.6 README・SKILL.md などの記述を更新（338b469 に含まれる）
- [x] T.33.2 Google Cloud で API キーを発行し、このマシンの `~/.bashrc` に `YOUTUBE_API_KEY` を設定する（ユーザー作業）
- [x] T.33.3 `make cache-youtube-api` で 360 件を取得する（取得 360、欠落 0）
- [x] T.33.4 `make archive-metadata` 後に `data-src/archives/youtube.csv` の差分を確認し、既存の値と一致することを確かめる
  - 360 行すべて残り、`fulltitle` / `uploader` / `upload_date` / `description` は全件一致
  - `view_count` 277 件と `like_count` 23 件は増加、2 件は減少（取得時点の違い）
  - `like_count` 50 件が空欄から `0` に（旧処理は 0 を空欄にしていた）
  - `duration_string` 160 件が 1 秒長い（API の再生時間は yt-dlp より 1 秒長く出ることがある）
- [x] T.33.5 `make build-sources` と `make check` を通してコミットする（YouTube 由来の本文は変化なし。note 由来の差分は T.45 に分けてコミットしない）（338b469, 2026-10-24）
