# CODEX.md

ARAKAKU リポジトリで Codex を使うときの参照ファイルです。
オンボーディング手順・コピペ用プロンプト・タスク仕様テンプレート・レビューチェックリストを一括収録しています。

---

## オンボーディング

### 最初に読むファイル

```text
README.md
AGENTS.md
HANDOFF.md
NEXT_TASKS.md
OPERATIONS_CHECKLIST.md
.agents/skills/arakaku-maintainer/SKILL.md
.agents/skills/arakaku-numbers-pipeline/SKILL.md
.agents/skills/arakaku-source-pipeline/SKILL.md
```

公式 Codex の Skills 探索に合わせるなら、`.agents/skills/*/SKILL.md` にも同じ内容を配置してください。

### 最初に実行するコマンド

```bash
git status
git log --oneline -5
make check
make clean-generated
```

この時点で `make check` が落ちる場合は、新規作業に入らず、まず build / validate / pytest のどこで落ちたかを確認してください。

### 現在の安定状態

直近の確認では以下が通っています。

```text
make check: PASS
json validation passed: 0 warning(s)
pytest: 18 passed
make clean-generated: DONE
```

GitHub Pages viewer で以下を確認済みです。

```text
試合 / 選手 / 大会 / 団体 / 王座 / 動画 / 出典本文 / 出典言及 / 関連出典候補 / 出典リンク横の詳細トグル
archive 由来の動画・記事メタデータ補助表示
仮想スクロール（@tanstack/virtual-core@3 CDN）
SAX ストリーミング JSON パース（@streamparser/json CDN）
Phase 1 インクリメンタル表示 → Phase 2 エンリッチメント更新
```

### 最初に渡すおすすめプロンプト

```text
README.md、AGENTS.md、HANDOFF.md、NEXT_TASKS.md、OPERATIONS_CHECKLIST.md を読んで、このリポジトリの現在状態を把握してください。
そのあと git status、make check、make clean-generated を実行して、作業可能な状態か確認してください。
まだコードやCSVは変更しないでください。
```

### 重要ルール

- 正規データは `data-src/*.csv`
- `docs/data/*.json` は生成物なので直接編集しない
- `tmp/note-html/*.html` と `tmp/youtube-info/*.info.json` はコミットしない
- `data-src/archives/youtube.csv` と `data-src/archives/note.csv` は cache から生成した永続メタデータで、コミット対象
- archive metadata は viewer の補助表示・検索用であり、試合結果や選手同定を確定しない
- 不明な試合結果を推測で確定しない
- 抽出候補はまず `review/`
- Numbers由来の個人成績は比較データであり、確認前に `bouts.csv` / `bout_participants.csv` へ直接反映しない
- 変更後は必ず `make check` と `make clean-generated`

### 次に着手しやすいタスク

詳細は `NEXT_TASKS.md` を参照してください。

---

## コピペ用プロンプト集

### 状態確認だけさせる

```text
README.md、AGENTS.md、HANDOFF.md、NEXT_TASKS.md、OPERATIONS_CHECKLIST.md を読んでください。
その後、git status、git log --oneline -5、make check、make clean-generated を実行して、現在の状態を報告してください。
まだファイルは変更しないでください。
```

### viewer を変更させる

```text
docs/index.html、docs/assets/js/、docs/assets/style.css を対象に viewer を更新してください。
AGENTS.md と .agents/skills/arakaku-viewer-ui/SKILL.md を必ず読んでください。
変更後は make check と make clean-generated を実行してください。
docs/data/*.json は編集・コミットしないでください。
```

### data-src を変更させる

```text
data-src/*.csv の正規データを変更してください。
AGENTS.md と .agents/skills/arakaku-data-curator/SKILL.md を必ず読んでください。
不明な勝敗・決着方法・ラウンド・タイムを推測で確定しないでください。
変更後は make check と make clean-generated を実行してください。
```

### Numbers 由来データを更新させる

```text
data-raw/アラカク選手名鑑.numbers から Numbers 由来CSVを更新してください。
AGENTS.md と .agents/skills/arakaku-numbers-pipeline/SKILL.md を必ず読んでください。
python scripts/extract_numbers.py を実行し、numbers_fighters.csv、numbers_name_matches.csv、numbers_fight_records.csv の行数と差分を確認してください。
Numbers由来の個人成績を data-src/bouts.csv や data-src/bout_participants.csv へ直接反映しないでください。
変更後は make check と make clean-generated を実行してください。
```

### source_documents / source_mentions を更新させる

```text
note本文とYouTube概要欄の取り込み・archive metadata パイプラインを更新してください。
AGENTS.md と .agents/skills/arakaku-source-pipeline/SKILL.md を必ず読んでください。
tmp/note-html/*.html と tmp/youtube-info/*.info.json はコミットしないでください。
data-src/archives/youtube.csv と data-src/archives/note.csv は cache から生成した永続メタデータです。
必要なら make cache-sources、make archive-metadata、make build-sources、make check、make clean-generated を実行してください。
archive metadata を試合結果や選手同定の確定根拠として扱わないでください。
```

### review CSV を作らせる

```text
source_mentions.csv から review 用の候補CSVを作成してください。
AGENTS.md と .agents/skills/arakaku-review-workflow/SKILL.md を必ず読んでください。
候補は review/ に出してください。
data-src/bouts.csv へはまだ反映しないでください。
make check と make clean-generated を実行してください。
```

### GitHub Actions を見直させる

```text
.github/workflows/*.yml を確認し、GitHub Actions の action version と Pages workflow を見直してください。
AGENTS.md と .agents/skills/arakaku-actions-ops/SKILL.md を必ず読んでください。
grep -RIn "uses: actions/" .github/workflows を実行し、make check と make clean-generated も実行してください。
```

### ドキュメントを整備させる

```text
README.md、AGENTS.md、HANDOFF.md、NEXT_TASKS.md、OPERATIONS_CHECKLIST.md、.agents/skills/*/SKILL.md を確認し、引き継ぎに不足があれば追記してください。
AGENTS.md と .agents/skills/arakaku-docs-handoff/SKILL.md を必ず読んでください。
doc-only 変更でも make check と make clean-generated を実行してください。
```

### 変更を最小化させる

```text
最小差分で修正してください。
目的外のリファクタリング、整形、ファイル移動はしないでください。
変更後に git diff を確認し、意図したファイルだけが変わっていることを報告してください。
```

### PR 前レビューをさせる

```text
git diff を読み、今回の変更が AGENTS.md のルールに違反していないかレビューしてください。
特に docs/data/*.json、tmp cache、推測で確定した試合結果、review を経由しない大量反映がないか確認してください。
make check と make clean-generated の結果も報告してください。
```

---

## タスク仕様テンプレート

Codex にタスクを依頼する前に要件を明確化するためのテンプレートです。

```markdown
## タスク名

例: 出典言及 view に mention_type フィルタを追加する

## 背景

なぜこの変更が必要かを書きます。

例:
`source_mentions.csv` は多数の候補行を持ち、現在は検索だけで確認している。`result` や `matchup` だけに絞り込めるようにしたい。

## 対象ファイル

docs/assets/js/
docs/assets/style.css
docs/index.html

## 変更してよいファイル

docs/assets/js/
docs/assets/style.css

## 変更してはいけないファイル

docs/data/*.json
tmp/note-html/*.html
tmp/youtube-info/*.info.json

必要に応じて変更してよい生成元CSV:
data-src/archives/youtube.csv
data-src/archives/note.csv

archive CSV は `make archive-metadata` で cache から再生成する永続メタデータです。cache ファイルそのものはコミットしません。

## 仕様

（具体的な仕様をここに書く）

## 完了条件

- `make check` が通る
- `make clean-generated` を実行済み
- `git diff` が目的ファイルだけになっている
- Pages で正常動作する見込みがある

## 注意事項

- archive metadata を試合結果や選手同定の確定根拠にしない
- 目的外のリファクタリングをしない
```

---

## レビューチェックリスト

Codex または別エージェントが変更を出したあと、人間または別エージェントが確認するためのチェックリストです。

### 1. 変更ファイル確認

```bash
git status
git diff --stat
```

確認すること:

- 目的外のファイルが変更されていない
- `docs/data/*.json` が含まれていない
- `tmp/note-html/*.html` が含まれていない
- `tmp/youtube-info/*.info.json` が含まれていない

### 2. 生成物確認

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

### 3. 検証

```bash
make check
make clean-generated
```

期待値:

```text
json validation passed: 0 warning(s)
pytest passed
```

### 4. data-src 変更の確認

`data-src/*.csv` が変わった場合:

- ID が重複していないか
- 参照先 ID が存在するか
- `event_id` が正しいか
- `fighter_id` が正しいか
- `video_id` が正しいか
- `article_id` が正しいか

特に `bouts.csv` 変更時:

- bout-level facts と participant facts が混ざっていない
- 参加者は `bout_participants.csv` に 1 試合 2 行で入っている
- `bout_participants.result` は出典で確認できたときだけ `win` / `loss` になっている
- `result_status=unknown` を勝手に確定していない
- 同じ試合が重複していない

特に Numbers 由来CSV変更時:

- `numbers_fighters.csv`、`numbers_name_matches.csv`、`numbers_fight_records.csv` の行数が説明できる
- `numbers_name_matches.csv` の `matched_fighter_id` は既存 `fighters.csv` に存在する
- generated candidate を確定済み選手IDとして扱っていない
- `numbers_fight_records.csv` の個人成績を直接 `bouts.csv` / `bout_participants.csv` に反映していない
- 片側行や勝敗矛盾を隠していない

特に archive CSV変更時:

- `data-src/archives/youtube.csv` の `display_id` が一意で空欄ではない
- `data-src/archives/note.csv` の `filename` が一意で空欄ではない
- `webpage_url`、表示用タイトル、`archived_at` が空欄になっていない
- 既存行の `archived_at` が不要に更新されていない
- archive 由来データを試合結果・選手同定・王座履歴の確定根拠として扱っていない

### 5. review 変更の確認

`review/*.csv` が変わった場合:

- 候補CSVとして妥当か
- confidence 分布が確認できるか
- いきなり `data-src/` へ大量反映していないか
- ambiguous / low confidence を残しているか

### 6. viewer 変更の確認

`docs/assets/js/` / `style.css` / `index.html` が変わった場合:

- タブが表示される
- 検索が動く
- 試合 view が壊れていない
- 選手クリックが動く
- 大会クリックが動く
- 出典本文 view が表示される
- 出典言及 view が表示される
- 関連出典候補が候補として表示され、確定情報のように見えない
- note本文リンク、出典候補リンク、動画リンクの `▶ 詳細` / `▼ 詳細` が開閉する
- archive 由来の動画タイトル・投稿者・投稿日が補助表示として使われる
- archive 由来の note title が記事リンクの補助表示として使われる
- archive 由来の文字列が検索対象に入っている
- Console に viewer JS 由来のエラーがない

仮想スクロール・ストリーミング固有:

- データがインクリメンタルに表示される（一気に表示されるのではなく段階的に増える）
- Phase 2 エンリッチメント後にスクロール位置がリセットされない
- 検索クリア後（アイテム数が増加するフィルタ変更後）に古い内容が残らない
- `TabRenderers` のメソッドが `{ items, renderItem, estimateSize? }` descriptor を返している（HTML文字列ではない）
- `TabRendererRegistry` で `extendItems` を呼んでいない（常に `setItems` か `refreshItems` のみ）
- `.virtual-list` に `position: relative` が当たっている
- `node scripts/validate_json.js` が通る（`CORE_DATA_KEYS` 全件が `loadedDataKeys` に入っている）

### 7. Actions 変更の確認

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

### 8. PR / commit 前

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
