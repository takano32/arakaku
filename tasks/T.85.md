# T.85 テストの重複と性能の小改善

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

`test_20_validate_json.py`・`test_30_validate_videos.py` は `make validate` と同じ検証を繰り返すだけ。`make test` が build に依存していない。`validate_json.js` は renderHead の漏れを見ていない。`boutsForEvent`・`videosForEntity`・`sourceReferenceForVideo` が行ごとの線形探索（全描画 813ms）。`mapping.py` が空の結果を null でなく `""` にする。

- [x] T.85.1 重複テストを異常系の単体テストに置き換え、`test: build` の依存と renderHead の検査を足す（c5e3cd2・9bbb2d7・bc51d04、2026-10-25）。実データで make validate と同じことをしていた 4 テストを、壊れた入力が失敗することを確かめる単体テストに置き換えた。`mapping.py` の空文字は手を付けていない（JSON の形が変わり viewer と sw のキャッシュ名に影響するため、必要になったら別タスク）
- [x] T.85.2 線形探索をインデックスにする（a0fa5f6、2026-10-25）。全行描画は試合 92→78ms、大会 50→38ms（Node）
