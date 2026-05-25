# CODEX_TASK_SPEC_TEMPLATE.md

このテンプレートは、Codex にタスクを依頼する前に要件を明確化するためのものです。

---

## タスク名

例: 出典言及 view に mention_type フィルタを追加する

---

## 背景

なぜこの変更が必要かを書きます。

例:

`source_mentions.csv` は多数の候補行を持ち、現在は検索だけで確認している。`result` や `matchup` だけに絞り込めるようにしたい。

---

## 対象ファイル

```text
docs/assets/js/
docs/assets/style.css
docs/index.html
```

---

## 変更してよいファイル

```text
docs/assets/js/
docs/assets/style.css
```

---

## 変更してはいけないファイル

```text
docs/data/*.json
tmp/note-html/*.html
tmp/youtube-info/*.info.json
```

必要に応じて変更してよい生成元CSV:

```text
data-src/archives/youtube.csv
data-src/archives/note.csv
```

archive CSV は `make archive-metadata` で cache から再生成する永続メタデータです。cache ファイルそのものはコミットしません。

---

## 仕様

- `mention_type` で絞り込める
- 選択肢は `すべて`, `event`, `matchup`, `result`, `note_url`, `youtube_url`
- 検索ボックスと併用できる
- 既存の出典本文 view は壊さない

---

## 完了条件

- `make check` が通る
- `make clean-generated` を実行済み
- `git diff` が目的ファイルだけになっている
- Pages で正常動作する見込みがある

---

## 注意事項

- source_mentions は候補であり、確定結果ではない
- `mention_type=result` を試合結果として確定表示しない
- archive metadata を試合結果や選手同定の確定根拠にしない
- 目的外のリファクタリングをしない
