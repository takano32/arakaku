# ARAKAKU

[![Test](https://github.com/takano32/arakaku/actions/workflows/test.yml/badge.svg)](https://github.com/takano32/arakaku/actions/workflows/test.yml)
[![Deploy Pages](https://github.com/takano32/arakaku/actions/workflows/pages.yml/badge.svg)](https://github.com/takano32/arakaku/actions/workflows/pages.yml)

公開ページ: https://takano32.github.io/arakaku/

ARAKAKU は、アラカクの団体・大会・試合・選手・王座・動画・出典本文を整理する非公式データベースです。

CSV で管理しているソースデータを静的 JSON に変換し、GitHub Pages 上の viewer で検索・閲覧できるようにしています。

主な情報源は、公開されている note 記事、YouTube 動画、YouTube 概要欄、公開されている大会・試合情報です。

この README は、人間の利用者だけでなく、別エージェントや自動化ツールが安全に作業を引き継げるように、プロジェクトの構造・データ方針・作業手順を詳しくまとめています。

---

## 目的

このリポジトリの目的は、アラカクの情報をあとから追いやすくすることです。

たとえば以下を調べやすくします。

- この大会にはどの試合があったか
- この選手はどの試合に出ていたか
- この試合の動画はあるか
- この大会や試合について、どの note 本文や YouTube 概要欄に言及があるか
- 動画タイトルや概要欄から、どんな候補情報が拾えるか
- 勝敗・決着方法・ラウンド・タイムをあとから補完できるか
- 王座やトーナメントの流れをあとから確認できるか

まだ整理中のデータも多いため、不明な情報は無理に確定せず、`unknown` や `勝敗未入力` として扱います。

---

## 現在の viewer 機能

GitHub Pages の viewer では、現在以下を表示します。

- 試合
- 選手
- 大会
- 団体
- 王座
- 動画
- 出典本文
- 出典言及

主な導線:

- 試合 view の選手名をクリックすると、選手 view に移動します。
- 試合 view の大会名をクリックすると、大会 view に移動します。
- 大会 view には、その大会に含まれる関連試合カードを表示します。
- 選手 view には、その選手の関連試合を表示します。
- 出典本文 view では、note 本文と YouTube 概要欄を確認できます。
- 出典言及 view では、本文中から抽出した大会名・対戦カード・結果・URL などの候補を確認できます。
- 試合・大会・動画などのカードでは、関連する出典候補を確認できます。
- note本文リンクや動画リンクの横にある `▶ 詳細` / `▼ 詳細` から、本文や YouTube概要欄をその場で展開できます。
- 検索ボックスで各 view の内容を絞り込めます。

---

## 基本方針

### 1. 正規データは CSV

正規データは `data-src/*.csv` に置きます。

JSON は viewer 用の生成物です。  
`docs/data/*.json` を直接編集してはいけません。

### 2. 実データを使う

テストや build は、実際の `data-src/*.csv` を使います。  
モックCSVや仮の fixture を中心にしたテストにはしません。

### 3. 抽出候補は review に置く

自動抽出した結果、推定した試合カード、候補選手、候補イベントなどは、まず `review/` に出します。

確認前の候補をいきなり `data-src/` に大量反映しないでください。

### 4. 不明情報を推測で確定しない

未確認の勝敗・決着方法・ラウンド・タイム・選手同定は、推測で確定させないでください。

不明なものは、以下のように扱います。

- `result_status=unknown`
- `勝敗未入力`
- `needs_review`
- `review/*.csv` の候補

### 5. 生成物はコミットしない

`docs/data/*.json` は build で生成される成果物です。  
原則としてコミットしません。

`tmp/` 配下の HTML や info JSON もローカルキャッシュなのでコミットしません。

---

## ディレクトリ構成

```text
.
├── .github/
│   └── workflows/          # GitHub Actions
├── data-src/               # 正規ソースCSV
├── docs/                   # GitHub Pages 用 viewer
│   ├── assets/
│   │   ├── app-config.js    # viewer 設定・データ定義
│   │   ├── app-core.js      # 共通状態・検索・リンク処理
│   │   ├── app-main.js      # 初期化・イベント処理
│   │   ├── app-related.js   # 関連カード表示
│   │   ├── app-sources.js   # 出典・動画関連表示
│   │   ├── app-views.js     # 各 view の描画
│   │   └── style.css        # viewer CSS
│   ├── data/                # 生成JSON出力先。JSONはコミットしない
│   └── index.html           # viewer HTML
├── review/                 # 自動抽出・推定・反映前レビュー用CSV
├── scripts/                # build / validate / import / extraction scripts
├── tests/                  # pytest
├── tmp/                    # ローカルキャッシュ
│   ├── note-html/           # note HTML cache
│   └── youtube-info/        # yt-dlp info JSON cache
├── Makefile
├── SCHEMA_NOTES.md
└── README.md
```

---

## コミットするもの / しないもの

### コミットするもの

- `data-src/*.csv`
- `review/*.csv`
- `docs/data/.gitkeep`
- `tmp/.gitkeep`
- `tmp/note-html/.gitkeep`
- `tmp/youtube-info/.gitkeep`
- `scripts/*.py`
- `tests/*.py`
- `docs/assets/app-*.js`
- `docs/assets/style.css`
- `docs/index.html`
- `.github/workflows/*.yml`
- `README.md`
- `SCHEMA_NOTES.md`

### コミットしないもの

- `docs/data/*.json`
- `tmp/note-html/*.html`
- `tmp/youtube-info/*.info.json`
- `__pycache__/`
- `.pytest_cache/`
- ローカル実験用の一時ファイル

---

## data-src の主要CSV

### `data-src/promotions.csv`

団体データです。

例:

- ターゲット
- エンペラー
- マウンテン・ヒーローズ
- MAXバウト
- エリートスピリッツ

団体名、カテゴリ、ルール、概要などを管理します。

### `data-src/events.csv`

大会データです。

大会ID、団体ID、大会名、開催日、概要、参照記事などを管理します。

`event_id` は、試合・動画リンク・出典言及との結合キーになります。

### `data-src/bouts.csv`

試合データです。

大会内の試合順、選手A/B、`matchup`、勝敗、決着方法、ラウンド、タイム、王座戦情報などを管理します。

勝敗が未確認の試合は、無理に結果を入れず、`result_status=unknown` として扱います。

重要な考え方:

- `fighter_a` / `fighter_b` は対戦カードです。
- `winner` / `loser` は結果が確認できたときだけ埋めます。
- `matchup` は viewer 表示用の補助列です。
- 結果が不明な試合でも `A vs B` として表示できるようにします。

### `data-src/fighters.csv`

選手データです。

選手ID、表示名、階級、所属、概要などを管理します。

選手名クリックや検索の基本データになります。

### `data-src/titles.csv`

王座・トーナメント系データです。

王座ID、団体、階級、王座変遷などを管理します。

王座変遷は viewer の王座 view に表示されます。

### `data-src/fighter_snapshots.csv`

大会や時点ごとの選手状態を保存するためのデータです。

将来的に、当時の階級・所属・肩書き・王座保持状態などを追うために使います。

### `data-src/videos.csv`

動画そのもののデータです。

YouTube などの動画 URL、動画タイトル、公開日、動画種別、リンク状態、重複候補などを管理します。

動画は試合や大会に直接埋め込まず、独立した動画データとして扱います。

### `data-src/video_links.csv`

動画と対象データの関係を管理します。

1動画に複数試合が含まれる場合や、大会全体の配信アーカイブ、選手紹介動画などを扱うため、動画本体とリンク関係を分離しています。

`entity_type` は以下を想定します。

- `event`
- `bout`
- `fighter`
- `promotion`
- `title`

`relation_type` は以下を想定します。

- `full_fight`
- `highlight`
- `short`
- `stream_archive`
- `preview`
- `interview`
- `commentary`
- `reference`

### `data-src/articles.csv`

note 記事などの出典記事データです。

記事ID、タイトル、URL、記事種別、団体ID、公開日、状態などを管理します。

削除済み・非公開・404 の記事がある場合でも、必要に応じてレコードは保持します。  
本文キャッシュに失敗した記事は、`source_documents.csv` には入りません。

### `data-src/source_documents.csv`

note 本文や YouTube 概要欄そのものを保存する本文DBです。

現在の主な `source_type`:

- `note_article`
- `youtube_description`

主な用途:

- 出典本文 view で本文を確認する
- 全文検索する
- source_mentions の抽出元として使う
- 後続の試合結果候補抽出に使う

### `data-src/source_mentions.csv`

`source_documents.csv` の本文中から抽出した言及候補です。

現在の主な `mention_type`:

- `event`
- `matchup`
- `result`
- `note_url`
- `youtube_url`

主な用途:

- 出典言及 view で抽出候補を確認する
- 試合結果候補CSVを作る
- 大会・試合・動画とのリンク候補を作る

### `data-src/aliases.csv`

表記揺れや別名を管理します。

viewer や抽出処理での検索・照合改善に使います。

---

## review の役割

`review/` は、正規データに反映する前の候補を置く場所です。

例:

- `review/note_result_candidates.csv`
- `review/note_structured_results.csv`
- `review/structured_result_patch_candidates.csv`
- `review/youtube_description_candidates.csv`
- `review/inferred_bouts_from_video_titles.csv`
- `review/inferred_events_from_video_titles.csv`
- `review/inferred_fighters_from_video_titles.csv`
- `review/source_mention_result_candidates.csv`
- `review/source_event_reference_candidates.csv`
- `review/source_bout_reference_candidates.csv`
- `review/source_video_reference_candidates.csv`
- `review/parse_skips.csv`

`review/` のデータは、原則として人間が確認してから `data-src/` に反映します。

---

## scripts の役割

### `scripts/build_json.py`

`data-src/*.csv` から `docs/data/*.json` を生成します。

生成対象の例:

- `articles.json`
- `promotions.json`
- `events.json`
- `bouts.json`
- `fighters.json`
- `titles.json`
- `fighter_snapshots.json`
- `videos.json`
- `video_links.json`
- `aliases.json`
- `source_documents.json`
- `source_mentions.json`
- `source_event_references.json`
- `source_bout_references.json`
- `source_video_references.json`
- `metadata.json`

### `scripts/validate_json.py`

生成された JSON の構造と参照関係を検証します。

例:

- unknown event reference
- unknown fighter reference
- duplicate id
- invalid video link
- missing required field
- duplicate source id
- duplicate mention id

### `scripts/cache_note_html.py`

`data-src/articles.csv` の note URL を読み、本文HTMLを `tmp/note-html/` にキャッシュします。

404 や削除済み記事は、全体の処理を止めずに警告扱いにします。

### `scripts/cache_youtube_info.py`

`data-src/videos.csv` の YouTube URL から、`yt-dlp` を使って `.info.json` を `tmp/youtube-info/` にキャッシュします。

動画本体はダウンロードしません。

`yt-dlp` の警告が出ても、`.info.json` が生成できている場合は本文DB生成に進めます。

### `scripts/build_source_documents.py`

`tmp/note-html/` と `tmp/youtube-info/` を読み、以下を生成します。

- `data-src/source_documents.csv`
- `data-src/source_mentions.csv`

note本文・YouTube概要欄を本文DB化し、本文中の大会名・対戦カード・結果・URL などの候補を抽出します。

### `scripts/crawl_note_articles.py`

note の RSS / API / HTML などから記事一覧を探索し、`articles.csv` に追加するためのスクリプトです。

### `scripts/extract_note_result_candidates.py`

note 本文から試合結果っぽい行を抽出します。

### `scripts/extract_note_structured_results.py`

note 本文から、より構造化された試合結果候補を抽出します。

### `scripts/make_structured_result_patch_candidates.py`

構造化結果候補と `bouts.csv` を照合し、反映候補CSVを作ります。

### `scripts/make_source_mention_result_candidates.py`

`source_mentions.csv` の `result` 言及から、レビュー用の試合結果候補CSVを作ります。

### `scripts/make_source_reference_candidates.py`

note本文と YouTube概要欄から、大会・試合・動画ごとの関連出典候補CSVを作ります。

生成先:

- `review/source_event_reference_candidates.csv`
- `review/source_bout_reference_candidates.csv`
- `review/source_video_reference_candidates.csv`

これらは確認支援用の候補です。勝敗や結果を確定する根拠として使う前に、本文文脈を必ず確認してください。

### `scripts/apply_structured_result_patches.py`

レビュー済みの structured result patch を `bouts.csv` に反映します。

反映前に必ず候補CSVを確認してください。

### `scripts/import_youtube_videos.py`

YouTube動画情報を `videos.csv` へ取り込むためのスクリプトです。

### `scripts/import_youtube_descriptions.py`

YouTube概要欄を解析するためのスクリプトです。

過去の抽出・検証用に残しています。現在は `build_source_documents.py` のほうが本文DB化の中心です。

---

## Makefile

主なコマンド:

```bash
make build
make validate
make test
make check
make clean-generated
```

本文キャッシュと本文DB生成:

```bash
make cache-note-html
make cache-youtube-info
make cache-sources
make build-sources
make refresh-sources
```

### `make build`

CSV から JSON を生成します。

### `make validate`

生成された JSON を検証します。

### `make test`

pytest を実行します。

### `make check`

以下を順に実行します。

```text
build → validate → pytest
```

### `make clean-generated`

生成済みの `docs/data/*.json` を削除し、`docs/data/.gitkeep` を戻します。

### `make refresh-sources`

出典本文のキャッシュ取得、本文DB生成、通常 check をまとめて実行します。

---

## 通常の開発手順

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

push 後:

- GitHub Actions の test workflow を確認します。
- GitHub Actions の pages workflow を確認します。
- GitHub Pages の表示を確認します。

---

## GitHub Actions

CI は `master` への push / pull request で実行します。

現在の主な actions:

- `actions/checkout@v5`
- `actions/setup-python@v6`
- `actions/configure-pages@v6`
- `actions/upload-pages-artifact@v5`
- `actions/deploy-pages@v5`

workflow:

- `.github/workflows/test.yml`
- `.github/workflows/pages.yml`

Node.js 20 deprecation warning 対応のため、Pages artifact 系 action は v5 系へ更新しています。

---

## コミット履歴から見た整備済み領域

全コミット履歴では、以下の順に機能が整備されています。

- 初期の CSV-backed database、Pages viewer、build / validate / pytest を構築
- 王座変遷、選手・大会・試合リンク、動画カタログ、動画タブを追加
- YouTube概要欄候補、note試合結果候補、構造化結果候補、反映候補CSVの review workflow を追加
- note本文と YouTube概要欄を `source_documents.csv` / `source_mentions.csv` として本文DB化
- 出典本文 view、出典言及 view、`mention_type` フィルタ、試合結果候補CSV、出典参照候補CSVを追加
- viewer を `app-config.js` / `app-core.js` / `app-main.js` / `app-related.js` / `app-sources.js` / `app-views.js` に分割
- 試合・大会・動画カードへ関連出典候補と YouTube概要欄 preview を表示
- note本文リンク、出典候補の note本文リンク、動画リンクに `▶ 詳細` / `▼ 詳細` の本文展開を追加
- GitHub Actions、エージェント向け handoff、Codex prompt/checklist/skill 文書を整備

---

## Branch

既定ブランチは以下です。

```text
master
```

---

## 命名・表記メモ

本文では `スーパーうんどう` 表記を基本にします。

ただし、引用や出典の表記を保持する必要がある場合は、出典側の表記を尊重します。  
資料によっては `スーパー運動` と表記される場合があります。

---

## 他エージェント向け作業ルール

複数エージェントで作業する場合は、以下を守ってください。

### 1. 正規データは `data-src/`

正規データは `data-src/*.csv` にあります。

`docs/data/*.json` を直接編集しないでください。  
JSON は生成物です。

### 2. 抽出候補はまず `review/`

自動抽出した試合結果・対戦カード・選手候補などは、まず `review/` に出してください。

レビューなしで `bouts.csv` や `fighters.csv` に大量反映しないでください。

### 3. 不明情報を勝手に確定しない

未確認の勝敗・決着方法・ラウンド・タイムは、推測で埋めないでください。

不明なものは `unknown`、`勝敗未入力`、またはレビュー候補として扱います。

### 4. `tmp/` のキャッシュ本体はコミットしない

以下はコミットしません。

- `tmp/note-html/*.html`
- `tmp/youtube-info/*.info.json`

必要なら各自で再生成します。

### 5. 変更後は必ず check

変更後は必ず以下を実行してください。

```bash
make check
make clean-generated
```

### 6. viewer の更新対象

viewer の主要ファイルは以下です。

- `docs/index.html`
- `docs/assets/app-config.js`
- `docs/assets/app-core.js`
- `docs/assets/app-main.js`
- `docs/assets/app-related.js`
- `docs/assets/app-sources.js`
- `docs/assets/app-views.js`
- `docs/assets/style.css`

### 7. Pages の表示確認

push 後は GitHub Pages を確認してください。

```text
https://takano32.github.io/arakaku/
```

### 8. 大きな自動反映は禁止

抽出候補を大量に `data-src/` へ反映する場合は、必ず候補CSVを確認してください。

少なくとも以下を確認します。

- event_id が正しいか
- fighter_id が正しいか
- 同名・類似名の誤爆がないか
- result が本当に本文から確認できるか
- 動画タイトルだけから勝敗を推定していないか

---

## 現在のデータ規模

目安:

- `articles.csv`: 122 rows
- `events.csv`: 54 rows
- `bouts.csv`: 274 rows
- `fighters.csv`: 146 rows
- `videos.csv`: 360 rows
- `video_links.csv`: 273 rows
- `source_documents.csv`: 480 rows
- `source_mentions.csv`: 1801 rows

件数は今後増える可能性があります。

---

## 次の改善候補

- `source_documents.json` を軽量化する
- 王座変遷の精度を上げる
- 選手プロフィールを充実させる
- unknown 試合の結果補完を進める
- 出典詳細トグルの表示を Pages 上で確認し、必要なら開閉時のレイアウトを微調整する
