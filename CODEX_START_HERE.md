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
.agents/skills/arakaku-numbers-pipeline/SKILL.md
.agents/skills/arakaku-source-pipeline/SKILL.md
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
pytest: 18 passed
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
関連出典候補
出典リンク横の詳細トグル
archive 由来の動画・記事メタデータ補助表示
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
- `data-src/archives/youtube.csv` と `data-src/archives/note.csv` は cache から生成した永続メタデータで、コミット対象
- archive metadata は viewer の補助表示・検索用であり、試合結果や選手同定を確定しない
- 不明な試合結果を推測で確定しない
- 抽出候補はまず `review/`
- Numbers由来の個人成績は比較データであり、確認前に `bouts.csv` / `bout_participants.csv` へ直接反映しない
- 変更後は必ず `make check` と `make clean-generated`

---

## 6. 次に着手しやすいタスク

優先度の高い候補:

```text
1. Pages 上で出典詳細トグルと archive 補助表示を確認する
2. source_documents.json を軽量化する
3. Numbers 由来データの viewer 突合表示を作る
4. unknown 試合の結果補完を進める
5. 選手プロフィールを補完する
6. 王座変遷の精度を上げる
```

詳細は `NEXT_TASKS.md` を参照してください。
