# CODEX_PROMPTS.md

このファイルは、ARAKAKU リポジトリで Codex に作業を依頼するときのコピペ用プロンプト集です。

---

## 状態確認だけさせる

```text
README.md、AGENTS.md、HANDOFF.md、NEXT_TASKS.md、OPERATIONS_CHECKLIST.md を読んでください。
その後、git status、git log --oneline -5、make check、make clean-generated を実行して、現在の状態を報告してください。
まだファイルは変更しないでください。
```

---

## viewer を変更させる

```text
docs/index.html、docs/assets/js/、docs/assets/style.css を対象に viewer を更新してください。
AGENTS.md と .agents/skills/arakaku-viewer-ui/SKILL.md を必ず読んでください。
変更後は make check と make clean-generated を実行してください。
docs/data/*.json は編集・コミットしないでください。
```

---

## data-src を変更させる

```text
data-src/*.csv の正規データを変更してください。
AGENTS.md と .agents/skills/arakaku-data-curator/SKILL.md を必ず読んでください。
不明な勝敗・決着方法・ラウンド・タイムを推測で確定しないでください。
変更後は make check と make clean-generated を実行してください。
```

---

## Numbers 由来データを更新させる

```text
data-raw/アラカク選手名鑑.numbers から Numbers 由来CSVを更新してください。
AGENTS.md と .agents/skills/arakaku-numbers-pipeline/SKILL.md を必ず読んでください。
python scripts/extract_numbers.py を実行し、numbers_fighters.csv、numbers_name_matches.csv、numbers_fight_records.csv の行数と差分を確認してください。
Numbers由来の個人成績を data-src/bouts.csv や data-src/bout_participants.csv へ直接反映しないでください。
変更後は make check と make clean-generated を実行してください。
```

---

## source_documents / source_mentions を更新させる

```text
note本文とYouTube概要欄の取り込み・archive metadata パイプラインを更新してください。
AGENTS.md と .agents/skills/arakaku-source-pipeline/SKILL.md を必ず読んでください。
tmp/note-html/*.html と tmp/youtube-info/*.info.json はコミットしないでください。
data-src/archives/youtube.csv と data-src/archives/note.csv は cache から生成した永続メタデータです。
必要なら make cache-sources、make archive-metadata、make build-sources、make check、make clean-generated を実行してください。
archive metadata を試合結果や選手同定の確定根拠として扱わないでください。
```

---

## review CSV を作らせる

```text
source_mentions.csv から review 用の候補CSVを作成してください。
AGENTS.md と .agents/skills/arakaku-review-workflow/SKILL.md を必ず読んでください。
候補は review/ に出してください。
data-src/bouts.csv へはまだ反映しないでください。
make check と make clean-generated を実行してください。
```

---

## GitHub Actions を見直させる

```text
.github/workflows/*.yml を確認し、GitHub Actions の action version と Pages workflow を見直してください。
AGENTS.md と .agents/skills/arakaku-actions-ops/SKILL.md を必ず読んでください。
grep -RIn "uses: actions/" .github/workflows を実行し、make check と make clean-generated も実行してください。
```

---

## ドキュメントを整備させる

```text
README.md、AGENTS.md、HANDOFF.md、NEXT_TASKS.md、OPERATIONS_CHECKLIST.md、.agents/skills/*/SKILL.md を確認し、引き継ぎに不足があれば追記してください。
AGENTS.md と .agents/skills/arakaku-docs-handoff/SKILL.md を必ず読んでください。
doc-only 変更でも make check と make clean-generated を実行してください。
```

---

## 変更を最小化させる

```text
最小差分で修正してください。
目的外のリファクタリング、整形、ファイル移動はしないでください。
変更後に git diff を確認し、意図したファイルだけが変わっていることを報告してください。
```

---

## PR 前レビューをさせる

```text
git diff を読み、今回の変更が AGENTS.md のルールに違反していないかレビューしてください。
特に docs/data/*.json、tmp cache、推測で確定した試合結果、review を経由しない大量反映がないか確認してください。
make check と make clean-generated の結果も報告してください。
```
