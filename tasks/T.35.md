# T.35 アーカイブ CSV の行が消える問題の検討

- 状態: 完了
- 期間: 2026-10-24

`scripts/archive_metadata.py` は、キャッシュにあるファイルだけで `data-src/archives/youtube.csv` / `note.csv` を丸ごと書き直す。キャッシュが空のまま実行すると全行が消え、削除・非公開になった動画や記事の行も黙って落ちる。README は「再取得できなくなった場合に備えてコミットする」と説明しており、その意図と食い違っている。

- [x] T.35.1 キャッシュにない既存行を残す設計に変えるかを決める → 残す（AGENTS.md の「行を黙って消さない」と README の説明に合わせる）
- [x] T.35.2 `archive_metadata.py` でキャッシュに無い既存行をそのまま残し、`[kept]` と表示する（44fe918, 2026-10-24）
- [x] T.35.3 `tests/test_80_archive_metadata.py` を追加し、README・SKILL.md を更新（44fe918, 2026-10-24）
