# Unofficial ARAKAKU Database Operations Checklist

このファイルは、Unofficial ARAKAKU Database の日常運用・同期・検証・リリース確認のためのチェックリストです。

---

## 通常の変更後

```bash
make check
make clean-generated
```

成功条件:

```text
json validation passed: 0 warning(s)
pytest: passed
docs/data/*.json removed by clean-generated
docs/data/.gitkeep exists
```

---

## 本文DB更新時

note本文やYouTube概要欄を再取得し、アーカイブする場合:

```bash
make cache-sources
make archive-metadata
make build-sources
make check
make clean-generated
```

確認:

```bash
python - <<'PY'
import csv

for path in [
    "data-src/source_documents.csv",
    "data-src/source_mentions.csv",
    "data-src/archives/youtube.csv",
    "data-src/archives/note.csv",
]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        print(path, len(list(csv.DictReader(f))), "rows")
PY
```

`source_documents.csv` は本文内に改行を含むため、`wc -l` は CSV の行数確認には使いません。

分布確認:

```bash
python - <<'PY'
import csv
from collections import Counter

for path in [
    "data-src/source_documents.csv",
    "data-src/source_mentions.csv",
    "data-src/archives/youtube.csv",
    "data-src/archives/note.csv",
]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    print(path, len(rows), "rows")

    if rows and "source_type" in rows[0]:
        print("source_type:", Counter(row["source_type"] for row in rows))

    if rows and "mention_type" in rows[0]:
        print("mention_type:", Counter(row["mention_type"] for row in rows))

    print()
PY
```

archive CSV 確認:

- `data-src/archives/youtube.csv` は `display_id` が主キーです。
- `data-src/archives/note.csv` は `filename` が主キーです。
- archive は viewer の補助表示・検索に使いますが、試合結果や選手同定の確定根拠ではありません。
- cache 再取得後は `make archive-metadata` を実行し、`archived_at` が既存行で不要に変わっていないか差分を確認してください。

本文DBからレビュー用の出典参照候補を作る場合:

```bash
make source-reference-candidates
```

生成される候補:

```text
review/source_event_reference_candidates.csv
review/source_bout_reference_candidates.csv
review/source_video_reference_candidates.csv
```

注意:

- これらはレビュー候補です。
- 試合結果や勝敗として確定反映しないでください。
- `data-src/bouts.csv` へ反映する前に本文文脈を確認してください。

---

## Numbers 由来データ更新時

`data-raw/アラカク選手名鑑.numbers` をCSVへ再出力する場合:

```bash
python scripts/extract_numbers.py
make check
make clean-generated
```

確認:

```bash
python - <<'PY'
import csv

for path in [
    "data-src/numbers_fighters.csv",
    "data-src/numbers_name_matches.csv",
    "data-src/numbers_fight_records.csv",
]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        print(path, len(list(csv.DictReader(f))), "rows")
PY
```

注意:

- `numbers_fighters.csv` は「全体」シート由来の比較用プロフィールです。
- `numbers_name_matches.csv` は推定対応です。generated candidate を確定済み選手IDとして扱わないでください。
- `numbers_fight_records.csv` は「個人成績」シート由来の個人視点戦績です。
- Numbers由来の個人成績を、確認前に `bouts.csv` / `bout_participants.csv` へ直接反映しないでください。

---

## GitHub Actions 更新時

Actions の利用状況確認:

```bash
grep -RIn "uses: actions/" .github/workflows
```

現在の期待値:

```text
actions/checkout@v5
actions/setup-python@v6
actions/configure-pages@v6
actions/upload-pages-artifact@v5
actions/deploy-pages@v5
```

確認:

```bash
make check
make clean-generated
```

push 後に確認:

- Test workflow
- Deploy Pages workflow
- GitHub Pages 表示

---

## viewer 更新時

対象:

```text
docs/index.html
docs/assets/js/config.js
docs/assets/js/main.js
docs/assets/js/data-loader.js
docs/assets/js/core/
docs/assets/js/services/
docs/assets/js/tabs/
docs/assets/js/ui/
docs/assets/style.css
```

確認項目:

- タブが表示される
- 検索が動く
- 試合 view が表示される
- 選手名クリックで選手 view に遷移する
- 大会名クリックで大会 view に遷移する
- 大会 view に関連試合が出る
- 出典本文タブが表示される
- 出典言及タブが表示される
- 試合・大会・動画カードに関連出典候補が出る
- note本文リンク、出典候補リンク、動画リンクの `▶ 詳細` / `▼ 詳細` が開閉する
- YouTube archive のタイトル・投稿者・投稿日が動画 view と関連動画リンクに補助表示される
- note archive の HTML title が記事リンクの補助表示に使われる
- archive 由来の文言で検索できる
- Console に viewer JS 由来のエラーがない

仮想スクロール・ストリーミング固有の確認:

- データがインクリメンタルに増えていく（ストリーミング）
- スクロールが滑らか
- Phase 2 エンリッチメント後にスクロール位置がリセットされない
- 検索クリア後に古いカードが残らない
- `TabRenderers` のメソッドが descriptor `{ items, renderItem, estimateSize? }` を返している
- `config.js` の `PRIMARY_DATA_KEYS` / `ENRICHMENT_DATA_KEYS` に追加したキーが入っている
- `validate_json.js` が通る（`node scripts/validate_json.js`）

新しいデータキーを追加したとき:

- `config.js` の `DATA_FILES` にパスを追加する
- ロードタイミングに応じて、次の4つのいずれかにキーを分類する:
  - `config.js` の `PRIMARY_DATA_KEYS`: 表示に直結し、初期ロードで Phase 1 ストリーミングするもの
  - `config.js` の `ENRICHMENT_DATA_KEYS`: Phase 1 の後にバックグラウンドでエンリッチに使うもの
  - `data-loader.js` の `PUBLIC_REFERENCE_DATA_KEYS`: 出典参照候補など、エンリッチメント後に並列ストリームする公開参照
  - `data-loader.js` の `TAB_DATA_KEYS`: 特定タブを開いたときだけ遅延ロードするもの（例: `sourceDocumentBodies`）
- `data-parser.js` の `fallbackForDataKey` に追加する（配列なら `[]`、オブジェクトなら `{}`）
- `CORE_DATA_KEYS` は `PRIMARY_DATA_KEYS` + `ENRICHMENT_DATA_KEYS` の合成。`PRIMARY` / `ENRICHMENT` に入れたキーは `validate_json.js` の `CORE_DATA_KEYS` チェック対象になるので、これが通ることを確認する。`PUBLIC_REFERENCE_DATA_KEYS` / `TAB_DATA_KEYS` のみのキーは `CORE_DATA_KEYS` に含まれない点に注意する。

コマンド:

```bash
make check
make clean-generated
```

Pages:

```text
https://takano32.github.io/arakaku/
```

---

## 同期用ZIP作成

コミット済み master のみ:

```bash
git status
git log --oneline -5
git archive --format=zip --output arakaku-master.zip master
```

未コミット差分込み:

```bash
git status

zip -r arakaku-working-tree.zip .   -x '.git/*'   -x 'docs/data/*.json'   -x '__pycache__/*'   -x '.pytest_cache/*'   -x 'tmp/note-html/*.html'   -x 'tmp/youtube-info/*.info.json'
```

---

## コミット前チェック

```bash
git status
make check
make clean-generated
git status
```

確認すること:

- `docs/data/*.json` が入っていない
- `tmp/note-html/*.html` が入っていない
- `tmp/youtube-info/*.info.json` が入っていない
- 変更ファイルが意図通り
- README / AGENTS / SKILL などのMarkdownが壊れていない

---

## 推奨コミットメッセージ例

```text
Add source mention filters
Generate source mention result candidates
Show related source mentions on bout cards
Update viewer source document UI
Update viewer source detail toggles
Improve source document build pipeline
Archive external metadata from caches
Migrate CSV schema to relational tables
Export Numbers-derived comparison CSVs
Update project handoff documentation
```

---

## トラブルシュート

### `docs/data/*.json` が git status に出る

生成物です。通常はコミットしません。

```bash
make clean-generated
```

### note cache で 404 が出る

削除済み・非公開・URL不正の可能性があります。  
全体が止まらない設計なら、そのまま続行できます。

### yt-dlp warning が出る

`.info.json` が生成され、description が取れているなら続行できます。

確認例:

```bash
ls tmp/youtube-info/*.info.json | head
```

### archive CSV の差分が大きい

`archive_metadata.py` は固定ヘッダ・固定ソートで `data-src/archives/*.csv` を書きます。古い出力順から移行した直後は差分が大きく見えます。

確認すること:

- 行数が意図せず減っていない
- `display_id` / `filename` が重複していない
- 既存行の `archived_at` が不要に更新されていない

### source_documents.json と本文の分離

本文（`content_text`）は分離済みです。`build_json.py` は `source_documents.json`（preview + メタデータの軽量インデックス）と `source_document_bodies.json`（`{source_id, content_text}` の本文本体）を別々に生成します。本文は `data-loader.js` の `TAB_DATA_KEYS`（`tsushin` / `sources` タブ）で必要時に遅延ロードされるため、初期ロードには全文を載せません（`mentions` タブは `sourceDocuments` / `sourceMentions` を遅延ロード）。

### make check が build_json.py で落ちる

CSV の列名、参照ID、空欄、Path/str の扱いを確認してください。

### make check が validate_json.py で落ちる

unknown reference / duplicate id / missing required field の可能性があります。  
エラーメッセージに出る JSON と index を確認してください。
