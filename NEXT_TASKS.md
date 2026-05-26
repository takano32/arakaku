# Unofficial ARAKAKU Database Next Tasks

このファイルは、Unofficial ARAKAKU Database の次回作業候補を優先度つきでまとめた TODO です。

---

## P0: 作業前確認

作業を始める前に必ず実行します。

```bash
git status
git log --oneline -5
make check
make clean-generated
```

`make check` が落ちる場合は、先に build / validate / pytest のどこで落ちているか確認してください。

---

## 完了済み: 全コミット履歴から確認できる主な作業

以下は全コミット履歴上で完了済みです。重複して新規タスク化しないでください。

- CSV-backed database、Pages viewer、build / validate / pytest の初期構築
- 王座変遷、動画カタログ、動画タブ、選手・大会・試合リンクの追加
- YouTube概要欄候補、note結果候補、構造化結果候補、review CSV workflow の追加
- note本文と YouTube概要欄の本文DB化
- 出典本文 view、出典言及 view、`mention_type` フィルタの追加
- `source_mentions.csv` からの試合結果候補CSV生成
- 大会・試合・動画の出典参照候補CSV生成
- 試合・大会 view の関連出典候補表示
- 動画 view の YouTube概要欄 preview 表示
- note本文リンク、出典候補リンク、動画リンク横の `▶ 詳細` / `▼ 詳細` 展開
- viewer JS の分割
- relational-style CSV schema への移行
- `bout_participants.csv` / `title_reigns.csv` / `article_links.csv` の追加
- `database.json` と relationship JSON の生成
- GitHub Actions と Codex/agent handoff 文書の整備
- `アラカク選手名鑑.numbers` から Numbers 由来三分割CSVを生成
- `data-src/archives/youtube.csv` / `data-src/archives/note.csv` を cache metadata archive として整備
- `youtube_archives.json` / `note_archives.json` を生成・検証し、viewer の動画表示・記事リンク・検索に補助連携
- `make archive-metadata` を追加し、`make refresh-sources` に組み込み
- `DataRepository` による名鑑データを用いた不明情報の自動補完と「名鑑確認済み」バッジ表示の実装

---

## P1: Pages 上で出典詳細トグルと archive 補助表示を確認する

### 目的

note本文リンク、出典候補の note本文リンク、動画リンクに追加した `▶ 詳細` / `▼ 詳細` と、archive 由来の動画・記事メタデータ補助表示が Pages 上でも見やすく動くか確認する。

### 対象

```text
docs/assets/js/services/source-renderers.js
docs/assets/js/tabs/tab-renderers.js
docs/assets/js/core/data-repository.js
docs/assets/js/core/query-matcher.js
docs/assets/style.css
```

### 確認項目

- note本文リンクの横に `▶ 詳細` がある
- 展開すると `▼ 詳細` に変わる
- 出典候補の note本文リンクでも同じ挙動になる
- 動画リンクの横でも YouTube概要欄を展開できる
- YouTube archive の `fulltitle` / `uploader` / `upload_date` が動画 view と関連動画リンクに補助表示される
- note archive の `title` が記事リンク表示に補助利用される
- archive 由来のタイトル・概要欄で検索できる
- 長い本文がカード外へ大きく崩れない
- モバイル幅でリンク、バッジ、詳細本文が重ならない

### 完了条件

- `make check` が通る
- Pages で確認済み

---

## P1: source_documents JSON 軽量化

### 背景

`source_documents.json` は約 1.1MB あります。  
今後本文が増えると viewer の初期ロードが重くなります。

### 案

```text
source_document_index.json
source_document_bodies.json
```

または:

```text
source_documents_preview.json
source_documents_full.json
```

### 完了条件

- 初期ロードに全文を載せない
- 出典本文 view では必要時に全文を開ける
- 既存の `▶ 詳細` / `▼ 詳細` 展開を壊さない
- Pages で正常動作する

---

## P2: unknown 試合の結果補完

### 目的

`result_status=unknown` の試合について、出典確認済みのものから結果を補完する。

### 反映前に確認すること

- event_id が正しい
- fighter_id が正しい
- `bout_participants.csv` の participant result が出典本文で確認できる
- method / round / time が出典本文で確認できる
- 同名選手の誤爆がない

### 注意

動画タイトルだけで勝敗を確定しない。

---

## P2: 選手プロフィール補完

### 目的

`fighters.csv` の所属・階級・概要などを補完する。

### 注意

プロフィール情報は時点によって変わる可能性がある。  
時点依存の情報は `fighter_snapshots.csv` に入れることを検討する。

---

## P3: 王座変遷の精度向上


### 目的

`titles.csv` / `title_reigns.csv` の王座・トーナメント情報をより正確にする。

### 注意

王座変遷は誤ると影響が大きいので、出典確認を優先する。
