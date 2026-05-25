# ARAKAKU Operations Checklist

このファイルは、ARAKAKU の日常運用・同期・検証・リリース確認のためのチェックリストです。

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

note本文やYouTube概要欄を再取得する場合:

```bash
make cache-sources
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
- Console に viewer JS 由来のエラーがない

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

### source_documents.json が重い

既知です。将来的に preview と body の分離を検討してください。

### make check が build_json.py で落ちる

CSV の列名、参照ID、空欄、Path/str の扱いを確認してください。

### make check が validate_json.py で落ちる

unknown reference / duplicate id / missing required field の可能性があります。  
エラーメッセージに出る JSON と index を確認してください。
