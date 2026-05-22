# AGENTS.md

このファイルは、ARAKAKU リポジトリで作業するエージェント・自動化ツール・AIアシスタント向けの作業ルールです。

人間向けの概要は `README.md` を参照してください。  
このファイルでは、作業時に守るべき方針、編集してよいファイル、編集してはいけないファイル、検証手順をまとめます。

---

## プロジェクト概要

ARAKAKU は、アラカクの団体・大会・試合・選手・王座・動画・出典本文を整理する非公式データベースです。

正規データは CSV で管理し、`scripts/build_json.py` によって GitHub Pages 用の JSON を生成します。

公開 viewer:

```text
https://takano32.github.io/arakaku/
```

---

## 最重要ルール

### 1. 正規データは `data-src/*.csv`

正規データは `data-src/` にあります。

`docs/data/*.json` は生成物です。  
直接編集しないでください。

### 2. 生成物をコミットしない

原則として、以下はコミットしません。

```text
docs/data/*.json
tmp/note-html/*.html
tmp/youtube-info/*.info.json
__pycache__/
.pytest_cache/
```

### 3. 不明情報を勝手に確定しない

未確認の勝敗、決着方法、ラウンド、タイム、選手同定は、推測で確定しないでください。

不明なものは以下のように扱います。

```text
result_status=unknown
勝敗未入力
needs_review
review/*.csv の候補
```

動画タイトルだけ、概要欄だけ、曖昧な本文だけを根拠に、勝敗や結果を確定させないでください。

### 4. 自動抽出結果はまず `review/`

自動抽出した試合結果、対戦カード、選手候補、イベント候補などは、まず `review/` に出してください。

レビューなしで `data-src/bouts.csv` や `data-src/fighters.csv` に大量反映しないでください。

### 5. 変更後は必ず検証

変更後は必ず以下を実行してください。

```bash
make check
make clean-generated
```

---

## 作業前に確認すること

作業開始時は、まず現在の状態を確認してください。

```bash
git status
git log --oneline -5
```

---

## 通常の検証手順

通常の変更後:

```bash
make check
make clean-generated
```

本文DBを更新する場合:

```bash
make cache-sources
make build-sources
make check
make clean-generated
```

`make check` は以下を実行します。

```text
build → validate → pytest
```

---

## ファイル編集ルール

### 編集してよい主なファイル

```text
data-src/*.csv
review/*.csv
scripts/*.py
tests/*.py
docs/index.html
docs/assets/js/**/*.js
docs/assets/style.css
README.md
AGENTS.md
SCHEMA_NOTES.md
.github/workflows/*.yml
Makefile
```

### 原則として直接編集しないファイル

```text
docs/data/*.json
tmp/note-html/*.html
tmp/youtube-info/*.info.json
```

`docs/data/*.json` は `make build` または `make check` で生成されます。

---

## ディレクトリの役割

### `data-src/`

正規ソースCSVです。

主なファイル:

```text
promotions.csv
events.csv
bouts.csv
fighters.csv
titles.csv
fighter_snapshots.csv
videos.csv
video_links.csv
articles.csv
source_documents.csv
source_mentions.csv
aliases.csv
```

### `review/`

反映前の候補CSVを置きます。

自動抽出、推定、曖昧な照合結果はここに置いて、人間が確認してから `data-src/` に反映します。

主な出典レビュー候補:

```text
source_mention_result_candidates.csv
source_event_reference_candidates.csv
source_bout_reference_candidates.csv
source_video_reference_candidates.csv
```

### `docs/`

GitHub Pages 用 viewer です。

```text
docs/index.html
docs/assets/js/**/*.js
docs/assets/style.css
docs/data/.gitkeep
```

### `scripts/`

CSV から JSON を生成したり、外部出典を取り込んだり、候補を抽出したりするスクリプト群です。

### `tmp/`

ローカルキャッシュです。

```text
tmp/note-html/
tmp/youtube-info/
```

HTML や `.info.json` 本体はコミットしません。

---

## data-src の主要CSV

### `promotions.csv`

団体データです。

団体名、カテゴリ、ルール、概要などを管理します。

### `events.csv`

大会データです。

大会ID、団体ID、大会名、開催日、概要、参照記事などを管理します。

`event_id` は、試合・動画リンク・出典言及との結合キーです。

### `bouts.csv`

試合データです。

大会内の試合順、選手A/B、`matchup`、勝敗、決着方法、ラウンド、タイム、王座戦情報などを管理します。

重要:

- `fighter_a` / `fighter_b` は対戦カードです。
- `winner` / `loser` は結果が確認できたときだけ埋めます。
- `matchup` は viewer 表示用の補助列です。
- 結果が不明な試合も `A vs B` として表示できるようにします。

### `fighters.csv`

選手データです。

選手ID、表示名、階級、所属、概要などを管理します。

### `videos.csv`

動画本体のデータです。

YouTube などの URL、タイトル、公開日、動画種別、リンク状態、重複候補などを管理します。

### `video_links.csv`

動画と対象データの関係を管理します。

`entity_type` の想定:

```text
event
bout
fighter
promotion
title
```

`relation_type` の想定:

```text
full_fight
highlight
short
stream_archive
preview
interview
commentary
reference
```

### `articles.csv`

note 記事などの出典記事データです。

削除済み・非公開・404 の記事がある場合でも、必要に応じてレコードは保持します。

### `source_documents.csv`

note 本文や YouTube 概要欄そのものを保存する本文DBです。

主な `source_type`:

```text
note_article
youtube_description
```

### `source_mentions.csv`

`source_documents.csv` の本文中から抽出した言及候補です。

主な `mention_type`:

```text
event
matchup
result
note_url
youtube_url
```

このファイルは、試合結果候補や大会名候補を後から確認・反映するためのレビュー支援データです。

---

## scripts の役割

### `scripts/build_json.py`

`data-src/*.csv` から `docs/data/*.json` を生成します。

### `scripts/validate_json.py`

生成された JSON の構造と参照関係を検証します。

検出する例:

```text
unknown event reference
unknown fighter reference
duplicate id
invalid video link
missing required field
duplicate source id
duplicate mention id
```

### `scripts/cache_note_html.py`

`data-src/articles.csv` の note URL を読み、本文HTMLを `tmp/note-html/` にキャッシュします。

404 や削除済み記事は、全体の処理を止めずに警告扱いにします。

### `scripts/cache_youtube_info.py`

`data-src/videos.csv` の YouTube URL から、`yt-dlp` で `.info.json` を `tmp/youtube-info/` にキャッシュします。

動画本体はダウンロードしません。

### `scripts/build_source_documents.py`

`tmp/note-html/` と `tmp/youtube-info/` を読み、以下を生成します。

```text
data-src/source_documents.csv
data-src/source_mentions.csv
```

### `scripts/make_structured_result_patch_candidates.py`

構造化結果候補と `bouts.csv` を照合し、反映候補CSVを作ります。

### `scripts/make_source_mention_result_candidates.py`

`source_mentions.csv` の result 言及から、レビュー用の試合結果候補CSVを作ります。

### `scripts/make_source_reference_candidates.py`

note本文と YouTube概要欄から、大会・試合・動画ごとの関連出典候補CSVを作ります。

### `scripts/apply_structured_result_patches.py`

レビュー済みの structured result patch を `bouts.csv` に反映します。

反映前に必ず候補CSVを確認してください。

---

## viewer 更新ルール

viewer の主要ファイル:

```text
docs/index.html
docs/assets/js/**/*.js
docs/assets/style.css
```

viewer で現在扱う主なタブ:

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

現在の viewer では、関連出典候補と詳細トグルも扱います。

- 試合・大会・動画カードに関連出典候補を表示します。
- note本文リンク、出典候補にある note本文リンク、動画リンクの右横に `▶ 詳細` / `▼ 詳細` を表示します。
- `▶ 詳細` / `▼ 詳細` は本文DBの note本文または YouTube概要欄を展開するための UI です。
- `source_mentions` と出典参照候補は確認支援の候補であり、確定結果として表示しないでください。

viewer を変更した場合は、少なくとも以下を確認してください。

```bash
make check
make clean-generated
```

push 後は Pages も確認してください。

```text
https://takano32.github.io/arakaku/
```

---

## GitHub Actions

workflow:

```text
.github/workflows/test.yml
.github/workflows/pages.yml
```

現在の主な actions:

```text
actions/checkout@v5
actions/setup-python@v6
actions/configure-pages@v6
actions/upload-pages-artifact@v5
actions/deploy-pages@v5
```

Node.js 20 deprecation warning 対応として、Pages artifact 系 action は v5 系へ更新しています。

---

## ブランチ

既定ブランチ:

```text
master
```

`main` ではありません。

---

## 命名・表記

本文では `スーパーうんどう` 表記を基本にします。

ただし、引用や出典の表記を保持する必要がある場合は、出典側の表記を尊重します。

資料によっては `スーパー運動` と表記される場合があります。

---

## 大きな自動反映を行う場合

大量の候補を `data-src/` に反映する場合は、必ず事前に候補CSVを確認してください。

最低限、以下を確認します。

- event_id が正しいか
- fighter_id が正しいか
- 同名・類似名の誤爆がないか
- result が本当に本文から確認できるか
- 動画タイトルだけから勝敗を推定していないか
- 同じ試合を重複登録していないか
- `make check` が通るか

---

## よくある作業

### JSON を再生成して検証する

```bash
make check
make clean-generated
```

### note本文とYouTube概要欄を再取得・再生成する

```bash
make cache-sources
make build-sources
make check
make clean-generated
```

### Pages viewer を触ったあと

```bash
make check
make clean-generated
```

その後、Pages で表示確認します。

### Actions を更新したあと

```bash
grep -RIn "uses: actions/" .github/workflows
make check
make clean-generated
```

---

## 次の改善候補

- `source_documents.json` を軽量化する
- 王座変遷の精度を上げる
- 選手プロフィールを充実させる
- unknown 試合の結果補完を進める
- Pages 上で出典詳細トグルの表示を確認し、必要なら CSS を微調整する

---

## 補足ドキュメント (gemini-cli 用)

本リポジトリでは `gemini-cli` 向けに以下の階層的な指示ファイルを用意しています。

- `./GEMINI.md`: プロジェクト全体の基本原則と共通ワークフロー
- `./data-src/GEMINI.md`: データ管理に特化した詳細指示
- `./scripts/GEMINI.md`: スクリプト開発・保守に特化した詳細指示
- `./CHRONICLE.md`: 全コミット履歴に基づくプロジェクトの変遷サマリ

エージェントはこれらのファイルも参照して、より詳細なコンテキストを把握してください。
