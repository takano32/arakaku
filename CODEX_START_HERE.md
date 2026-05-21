# CODEX_START_HERE.md

このファイルは、Codex に ARAKAKU リポジトリを引き継がせるときの最初の入口です。

Codex セッション開始時は、まずこの順番で読ませてください。

---

## 1. 最初に読むファイル

```text
README.md
AGENTS.md
HANDOFF.md
NEXT_TASKS.md
OPERATIONS_CHECKLIST.md
.agents/skills/arakaku-maintainer/SKILL.md
```

公式 Codex の Skills 探索に合わせるなら、`.agents/skills/*/SKILL.md` にも同じ内容を配置してください。

---

## 2. 最初に実行するコマンド

```bash
git status
git log --oneline -5
make check
make clean-generated
```

この時点で `make check` が落ちる場合は、新規作業に入らず、まず build / validate / pytest のどこで落ちたかを確認してください。

---

## 3. 現在の安定状態

直近の確認では以下が通っています。

```text
make check: PASS
json validation passed: 0 warning(s)
pytest: 10 passed
make clean-generated: DONE
```

GitHub Pages viewer で以下を確認済みです。

```text
試合
選手
大会
団体
王座
動画
出典本文
出典言及
```

---

## 4. Codex に最初に渡すおすすめプロンプト

```text
README.md、AGENTS.md、HANDOFF.md、NEXT_TASKS.md、OPERATIONS_CHECKLIST.md を読んで、このリポジトリの現在状態を把握してください。
そのあと git status、make check、make clean-generated を実行して、作業可能な状態か確認してください。
まだコードやCSVは変更しないでください。
```

---

## 5. 重要ルール

- 正規データは `data-src/*.csv`
- `docs/data/*.json` は生成物なので直接編集しない
- `tmp/note-html/*.html` と `tmp/youtube-info/*.info.json` はコミットしない
- 不明な試合結果を推測で確定しない
- 抽出候補はまず `review/`
- 変更後は必ず `make check` と `make clean-generated`

---

## 6. 次に着手しやすいタスク

優先度の高い候補:

```text
1. 出典言及 view に mention_type フィルタを追加する
2. source_mentions から試合結果候補CSVを作る
3. 試合 view に関連出典候補を表示する
4. 大会 view に関連出典候補を表示する
5. source_documents.json を軽量化する
```

詳細は `NEXT_TASKS.md` を参照してください。
