# CODEX_REVIEW_CHECKLIST.md

Codex または別エージェントが変更を出したあと、人間または別エージェントが確認するためのチェックリストです。

---

## 1. 変更ファイル確認

```bash
git status
git diff --stat
```

確認すること:

- 目的外のファイルが変更されていない
- `docs/data/*.json` が含まれていない
- `tmp/note-html/*.html` が含まれていない
- `tmp/youtube-info/*.info.json` が含まれていない

---

## 2. 生成物確認

```bash
git status --short
```

以下が出ている場合は基本的にコミットしない:

```text
docs/data/*.json
tmp/note-html/*.html
tmp/youtube-info/*.info.json
__pycache__/
.pytest_cache/
```

必要なら:

```bash
make clean-generated
```

---

## 3. 検証

```bash
make check
make clean-generated
```

期待値:

```text
json validation passed: 0 warning(s)
pytest passed
```

---

## 4. data-src 変更の確認

`data-src/*.csv` が変わった場合:

- ID が重複していないか
- 参照先 ID が存在するか
- `event_id` が正しいか
- `fighter_id` が正しいか
- `video_id` が正しいか
- `article_id` が正しいか

特に `bouts.csv` 変更時:

- `fighter_a` / `fighter_b` は対戦カードである
- `winner` / `loser` は出典で確認できたときだけ入っている
- `result_status=unknown` を勝手に確定していない
- `matchup` が表示用に自然である
- 同じ試合が重複していない

---

## 5. review 変更の確認

`review/*.csv` が変わった場合:

- 候補CSVとして妥当か
- confidence 分布が確認できるか
- いきなり `data-src/` へ大量反映していないか
- ambiguous / low confidence を残しているか

---

## 6. viewer 変更の確認

`docs/assets/app-*.js` / `style.css` / `index.html` が変わった場合:

- タブが表示される
- 検索が動く
- 試合 view が壊れていない
- 選手クリックが動く
- 大会クリックが動く
- 出典本文 view が表示される
- 出典言及 view が表示される
- 関連出典候補が候補として表示され、確定情報のように見えない
- note本文リンク、出典候補リンク、動画リンクの `▶ 詳細` / `▼ 詳細` が開閉する
- Console に viewer JS 由来のエラーがない

---

## 7. Actions 変更の確認

`.github/workflows/*.yml` が変わった場合:

```bash
grep -RIn "uses: actions/" .github/workflows
```

期待値:

```text
actions/checkout@v5
actions/setup-python@v6
actions/configure-pages@v6
actions/upload-pages-artifact@v5
actions/deploy-pages@v5
```

---

## 8. PR / commit 前

```bash
git diff
make check
make clean-generated
git status
```

最後に確認:

- 変更理由が説明できる
- テストが通っている
- 生成物を含んでいない
- 不明結果を推測で確定していない
- README / AGENTS / SKILL と矛盾していない
