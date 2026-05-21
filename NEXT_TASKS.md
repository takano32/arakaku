# ARAKAKU Next Tasks

このファイルは、ARAKAKU の次回作業候補を優先度つきでまとめた TODO です。

---

## P0: 作業前確認

作業を始める前に必ず実行します。

```bash
git status
make check
make clean-generated
```

`make check` が落ちる場合は、先に build / validate / pytest のどこで落ちているか確認してください。

---

## P1: 出典言及 view にフィルタを追加

### 目的

`source_mentions.csv` は 1801 rows あり、現在は検索だけで見る状態です。  
`mention_type` で絞り込めるようにすると、レビューがかなり楽になります。

### 対象

```text
docs/assets/app.js
docs/assets/style.css
docs/index.html
```

### 想定フィルタ

```text
すべて
event
matchup
result
note_url
youtube_url
```

### 完了条件

- 出典言及タブで `mention_type` フィルタが使える
- `result` だけに絞れる
- `matchup` だけに絞れる
- 検索ボックスと併用できる
- `make check` が通る
- Pages で確認済み

---

## P1: source_mentions から試合結果候補CSVを作る

### 目的

`mention_type=result` の 321 件から、`bouts.csv` に反映できそうな候補を作る。

### 出力先

```text
review/source_mention_result_candidates.csv
```

### 候補に含めたい列

```text
candidate_id
mention_id
source_id
source_type
source_ref_id
line_number
matched_text
context
event_hint
matchup_hint
method_hint
round_hint
time_hint
confidence
notes
```

### 重要ルール

この段階では `data-src/bouts.csv` に反映しない。  
候補CSVを作るだけ。

### 完了条件

- 候補CSVが生成される
- 件数と confidence 分布が確認できる
- `make check` が通る

---

## P1: source_documents / source_mentions から出典参照候補CSVを作る

### 目的

note本文とYouTube概要欄から、大会・試合・動画ごとに確認すべき出典候補を作る。

### 出力先

```text
review/source_event_reference_candidates.csv
review/source_bout_reference_candidates.csv
review/source_video_reference_candidates.csv
```

### コマンド

```bash
make source-reference-candidates
```

### 重要ルール

候補CSVはレビュー支援用です。  
勝敗・決着方法・ラウンド・タイムを確定反映する前に、必ず本文文脈を確認してください。

### 完了条件

- 大会・試合・動画の出典候補CSVが生成される
- 件数と confidence 分布が確認できる
- `make check` が通る

---

## P2: 試合 view に関連出典候補を表示

### 目的

試合カードから、その試合に関係しそうな出典言及を確認できるようにする。

### マッチ候補

- `bout.matchup` が `source_mentions.context` に含まれる
- `fighter_a` / `fighter_b` が両方含まれる
- `eventName(bout.event_id)` が含まれる
- `mention_type` が `matchup` または `result`

### 注意

誤爆があり得るので、表示ラベルは「出典候補」にする。  
「確定出典」とはしない。

---

## P2: 大会 view に関連出典候補を表示

### 目的

大会カードから、その大会に関係しそうな note本文・YouTube概要欄・言及候補を確認できるようにする。

### マッチ候補

- 大会名が `source_mentions.context` に含まれる
- `entity_hint` に大会名が入っている
- source document title が大会名を含む

---

## P2: 動画 view に YouTube概要欄プレビューを表示

### 目的

動画カードに、YouTube概要欄の preview と抽出された note URL / matchup / result 件数を表示する。

### 対象データ

```text
source_documents.csv
source_mentions.csv
videos.csv
```

### 注意

全文表示は出典本文 view で行う。  
動画 view では preview に留める。

---

## P3: source_documents JSON 軽量化

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
- Pages で正常動作する

---

## P3: unknown 試合の結果補完

### 目的

`result_status=unknown` の試合について、出典確認済みのものから結果を補完する。

### 反映前に確認すること

- event_id が正しい
- fighter_id が正しい
- winner / loser が出典本文で確認できる
- method / round / time が出典本文で確認できる
- 同名選手の誤爆がない

### 注意

動画タイトルだけで勝敗を確定しない。

---

## P3: 王座変遷の精度向上

### 目的

`titles.csv` の王座・トーナメント情報をより正確にする。

### 注意

王座変遷は誤ると影響が大きいので、出典確認を優先する。

---

## P3: 選手プロフィール補完

### 目的

`fighters.csv` の所属・階級・概要などを補完する。

### 注意

プロフィール情報は時点によって変わる可能性がある。  
時点依存の情報は `fighter_snapshots.csv` に入れることを検討する。

---

## Done に近いもの

以下は直近で完了済み。

- 出典本文DBの追加
- 出典言及DBの追加
- 出典本文 view の追加
- 出典言及 view の追加
- GitHub Actions 最新化
- `upload-pages-artifact@v5` 対応
- README 詳細化
- AGENTS.md 追加
- Codex向け SKILL.md 追加
