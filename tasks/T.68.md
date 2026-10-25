# T.68 デプロイ前に pytest が走らない・生成 CSV のずれを検出しない

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

`pages.yml` は `make build` と `make validate` だけで、`test.yml` と独立しているので、pytest の CSV 検査が落ちてもデプロイされる。第2段階の生成 CSV（promotions・titles・aliases・video_links・article_links、reorder、review 候補）は今は再生成と一致するが、CI で確かめていない。

- [x] T.68.1 `pages.yml` で `make check` を実行する（pytest を入れる）。`actions/setup-node` で Node を固定、`test.yml` に `permissions: contents: read`（3310802、2026-10-25）。Node は 24（ローカルと同じ）。push 後の Deploy Pages・Test とも成功
- [x] T.68.2 `make check-generated`（オフラインで再生成して `git diff --exit-code data-src review`）を追加して CI で実行する（86856e2、2026-10-25）。クリーンな状態で成功、生成 CSV を 1 行消したコミットでは失敗することを確認。README は 86e5058
