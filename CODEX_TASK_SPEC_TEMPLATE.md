# CODEX_TASK_SPEC_TEMPLATE.md

このテンプレートは、Codex にタスクを依頼する前に要件を明確化するためのものです。

---

## タスク名

例: 出典言及 view に mention_type フィルタを追加する

---

## 背景

なぜこの変更が必要かを書きます。

例:

`source_mentions.csv` は 1801 rows あり、現在は検索だけで確認している。`result` や `matchup` だけに絞り込めるようにしたい。

---

## 対象ファイル

```text
docs/assets/app.js
docs/assets/style.css
docs/index.html
```

---

## 変更してよいファイル

```text
docs/assets/app.js
docs/assets/style.css
```

---

## 変更してはいけないファイル

```text
docs/data/*.json
tmp/note-html/*.html
tmp/youtube-info/*.info.json
```

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
- 目的外のリファクタリングをしない
