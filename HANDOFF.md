# ARAKAKU Handoff Notes

このファイルは、ARAKAKU リポジトリの現在状態を次の作業者・別エージェントへ引き継ぐためのメモです。

README.md / AGENTS.md / .agents/skills/arakaku-maintainer/SKILL.md を読んだうえで、直近の状態確認に使ってください。

---

## 現在の安定状態

直近の同期確認では、以下が成立しています。

```text
make check: PASS
json validation passed: 0 warning(s)
pytest: 15 passed
make clean-generated: DONE
```

GitHub Pages viewer でも、以下の正常動作を確認済みです。

- 試合 view
- 選手 view
- 大会 view
- 団体 view
- 王座 view
- 動画 view
- 出典本文 view
- 出典言及 view
- 試合・大会・動画カードの関連出典候補
- note本文リンクと動画リンクの `▶ 詳細` / `▼ 詳細` 展開

---

## 現在の主なデータ規模

```text
articles.csv: 122 rows
events.csv: 54 rows
bouts.csv: 274 rows
fighters.csv: 146 rows
videos.csv: 360 rows
video_links.csv: 273 rows
source_documents.csv: 480 rows
source_mentions.csv: 1801 rows
```

`source_documents.csv` の内訳:

```text
youtube_description: 359
note_article: 121
```

`source_mentions.csv` の主な内訳:

```text
event: 863
youtube_url: 384
result: 321
matchup: 169
note_url: 64
```

---

## 直近で追加・整備したもの

### 本文DB

以下を追加済みです。

```text
data-src/source_documents.csv
data-src/source_mentions.csv
docs/data/source_documents.json
docs/data/source_mentions.json
```

ただし `docs/data/*.json` は生成物なのでコミットしません。

### 本文キャッシュ系スクリプト

以下を追加済みです。

```text
scripts/cache_note_html.py
scripts/cache_youtube_info.py
scripts/build_source_documents.py
```

### Makefile target

以下を追加済みです。

```text
make cache-note-html
make cache-youtube-info
make cache-sources
make build-sources
make refresh-sources
```

### viewer

以下のタブを追加済みです。

```text
出典本文
出典言及
```

viewer は以下のファイルへ分割済みです。

```text
docs/assets/app-config.js
docs/assets/app-core.js
docs/assets/app-main.js
docs/assets/app-related.js
docs/assets/app-sources.js
docs/assets/app-views.js
docs/assets/style.css
```

関連出典候補と本文展開 UI も追加済みです。

- 出典言及 view に `mention_type` フィルタ
- 試合・大会 view に関連出典候補
- 動画 view に YouTube概要欄 preview
- note本文リンク横の `▶ 詳細` / `▼ 詳細`
- 出典候補にある note本文リンク横の `▶ 詳細` / `▼ 詳細`
- 動画リンク横の `▶ 詳細` / `▼ 詳細`

### GitHub Actions

現在の主な actions は以下です。

```text
actions/checkout@v5
actions/setup-python@v6
actions/configure-pages@v6
actions/upload-pages-artifact@v5
actions/deploy-pages@v5
```

### ドキュメント

以下を追加・更新済みです。

```text
README.md
AGENTS.md
.agents/skills/arakaku-maintainer/SKILL.md
```

---

## 全コミット履歴の作業サマリ

全コミットを通して、プロジェクトは以下の順に整備されています。

1. CSV-backed database、GitHub Pages viewer、build / validate / pytest の土台を作成
2. 王座変遷、選手・大会・試合リンク、動画カタログ、動画タブを追加
3. YouTube概要欄候補、note試合結果候補、構造化結果候補、review CSV workflow を追加
4. note本文と YouTube概要欄を本文DB化し、`source_documents.csv` / `source_mentions.csv` を追加
5. 出典本文 view、出典言及 view、`mention_type` フィルタ、試合結果候補CSVを追加
6. 大会・試合・動画向けの出典参照候補CSVを生成する workflow を追加
7. viewer を複数 JS ファイルへ分割し、関連出典候補と詳細情報表示を強化
8. 出典記事、出典候補、動画リンクに本文・概要欄の折りたたみ詳細表示を追加
9. GitHub Actions と Codex/agent handoff 文書を整備

---

## 重要な作業ルール

### 正規データ

正規データは以下です。

```text
data-src/*.csv
```

`docs/data/*.json` は生成物です。直接編集しないでください。

### 抽出候補

自動抽出・推定結果は、まず `review/` に出してください。

特に、試合結果・勝敗・決着方法・ラウンド・タイムは、出典で確認できるまで `data-src/bouts.csv` に確定反映しないでください。

### tmp

以下はローカルキャッシュなのでコミットしません。

```text
tmp/note-html/*.html
tmp/youtube-info/*.info.json
```

`.gitkeep` のみ保持します。

---

## よく使う確認コマンド

```bash
git status
git log --oneline -5

make check
make clean-generated

grep -RIn "uses: actions/" .github/workflows
```

本文DBを更新する場合:

```bash
make cache-sources
make build-sources
make check
make clean-generated
```

---

## 現在の既知リスク

### source_documents.json が重い

`docs/data/source_documents.json` は約 1.1MB あります。

現状は Pages で動作確認済みですが、今後本文量が増えると初期読み込みが重くなる可能性があります。

将来的な対策候補:

- `source_document_index.json` と本文本体を分離する
- 出典本文 view だけ遅延読み込みする
- preview だけ初期ロードし、本文は別ファイル化する

### source_mentions は候補である

`source_mentions.csv` は本文から自動抽出した候補です。

`mention_type=result` であっても、正規の試合結果として確定しているわけではありません。  
反映前に必ず出典文脈を確認してください。

### note 404

`articles.csv` には、note 側で 404 / 削除 / 非公開になっている記事が含まれる可能性があります。

`cache_note_html.py` は 404 で全体を止めない方針です。

---

## 次にやるとよい作業

優先度順のおすすめです。

1. `source_documents.json` の軽量化
2. unknown 試合の結果補完
3. 選手プロフィールの補完
4. 王座変遷の精度向上
5. Pages 上で出典詳細トグルの表示確認と必要な CSS 微調整

---

## 再開時の推奨手順

1. 最新の `master` を pull する
2. `make check` を実行する
3. `make clean-generated` を実行する
4. Pages / Actions の状態を確認する
5. 次タスクへ進む

```bash
git pull
make check
make clean-generated
```

---

## 作業者への注意

このプロジェクトでは「正しそうだから埋める」よりも、「不明なものを不明として残す」ことを優先してください。

特に試合結果は、後で参照される重要データなので、曖昧な抽出結果をそのまま勝敗として反映しないでください。
