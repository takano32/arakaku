# Unofficial ARAKAKU Database

[![Test](https://github.com/takano32/arakaku/actions/workflows/test.yml/badge.svg)](https://github.com/takano32/arakaku/actions/workflows/test.yml)
[![Deploy Pages](https://github.com/takano32/arakaku/actions/workflows/pages.yml/badge.svg)](https://github.com/takano32/arakaku/actions/workflows/pages.yml)

公開ページ: https://takano32.github.io/arakaku/

Unofficial ARAKAKU Database は、アラカクの団体・大会・試合・選手・王座・動画・出典本文を整理する非公式データベースです。

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

通常ビュー（タブ）:

- 公式（公式サイトの about/history と news）
- 通信（アラカク通信ノートの記事本文）
- 試合
- 選手
- 大会
- 団体
- 王座
- 動画

管理ビュー（タブ）:

- 出典本文 / 出典言及 / 名鑑選手 / 名前対応 / 名鑑記録 / 公式選手 / 公式（トーナメント・試合・沿革）

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

絞り込み・データ補完・出所表示:

- 各タブの上部に、設定駆動の絞り込みボタン（階級・団体・種別など。`docs/assets/js/filters.js` の `TAB_FILTERS`）を表示します。URL クエリは英語トークン（`lightweight` / `target` / `other` など）で共有できます。
- 選手や試合の情報が不足している場合、Apple Numbers 由来の名鑑データや団体公式サイトのデータから実行時に補完されます。信頼性は **名鑑 > 公式 > 通信ノート > YouTube > 未登録** の順で、低信頼のレコードは各タブの末尾へ寄せられます。
- 出所が分かるよう、名鑑由来のデータは**名鑑バッジと同色（青）の丸角ボックス**、公式由来のデータは**公式バッジと同色（緑）の丸角ボックス**でまとめて表示します。選手カードには名鑑の通算戦績（〇勝〇負）・実績マーカー（👑 🏆）や、公式 bio（王座履歴・トーナメント成績）を重複なく表示します。
- 表記ゆれ（中黒・空白・ピリオド差）だけが異なる重複選手は、ビューア上で 1 人に統合します（関連試合・動画・記事を取りこぼさず、消えた表記は別名として保持）。元の `data-src/fighters.csv` は変更しません。
- データの突合・補完・統合はすべてビューア上での実行時に行われ、ソースデータは純粋な事実を保ちます。

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
│   │   ├── js/              # viewer 設定・状態・描画・検索
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
- `docs/assets/js/*.js`
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

### 生成 JSON

`make build` は `docs/data/*.json` を生成します。

主な出力:

- `database.json`: relational-style CSV をまとめた正規化スナップショット
- per-view JSON: viewer が直接読む `bouts.json`、`fighters.json`、`events.json` など
- relationship JSON: `article_links.json`、`bout_participants.json`、`title_reigns.json`、`video_links.json`

通常は check 後に `make clean-generated` を実行し、生成 JSON を作業ツリーから消します。

---

## data-src の主要CSV

現在の CSV は、事実テーブルと関係テーブルを分ける relational-style の設計です。移行の詳細、旧CSVからの対応、主キー・外部キーは `SCHEMA_NOTES.md` にまとめています。

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

大会内の試合順、階級、結果状態、決着方法、ラウンド、タイム、王座戦情報など、試合そのものの事実を管理します。

勝敗が未確認の試合は、無理に結果を入れず、`result_status=unknown` として扱います。

重要な考え方:

- 試合参加者は `bout_participants.csv` に分離します。
- 勝敗は参加者ごとの `result` として扱います。
- `matchup`、`winner`、`loser` は生成 JSON 側の派生表示です。
- 結果が不明な試合では参加者 `result=unknown` を使います。

### `data-src/bout_participants.csv`

試合と選手の関係データです。

原則として 1 試合につき 2 行を持ちます。`bout_id` で `bouts.csv` に、`fighter_id` で `fighters.csv` に接続します。選手同定が未確定の場合でも、捨てずに `fighter_name` を残します。

### `data-src/fighters.csv`

選手データです。

選手ID、表示名、階級、所属、概要などを管理します。

選手名クリックや検索の基本データになります。

### `data-src/numbers_fighters.csv`

`data-raw/アラカク選手名鑑.numbers` の「全体」シートから抽出した選手名鑑データです。

既存の `fighters.csv` を置き換えるものではありません。Numbers 側のプロフィールを viewer やクライアントサイド突合で参照するための二次ソースとして扱います。

主な役割:

- Numbers に含まれる選手名、階級、主戦団体、身長、年齢、所属を保持する
- Numbers に含まれる試合数、勝、負、勝率を集計値として保持する
- 白グローブ出場回数、優勝、出場回、ベルト欄を Numbers 上の実績表示として保持する
- キャッチコピーと備考を、Numbers 由来のプロフィール文として保持する
- 既存 `fighters.csv` との突合結果を混ぜず、原データに近い形で保持する
- ビューアの `DataRepository` による不足情報の自動補完（リッチ化）のソースとして使われる

注意:

- `age`、`height`、`gym` は Numbers ファイル時点の情報であり、恒久的な選手属性とは限りません。
- Numbers 由来の情報を既存 `fighters.csv`、`fighter_snapshots.csv`、`bouts.csv` へ反映する場合は、別途確認してから行います。
- Numbers の「個人成績」シートは、個人視点の戦績行を含むため、直接 `bouts.csv` に入れず、まず別CSVまたは viewer 上の突合候補として扱います。

### `data-src/numbers_name_matches.csv`

Numbers 上の選手名と既存 `fighters.csv` の推定対応を管理します。

主な役割:

- `numbers_fighters.csv` の `numbers_fighter_id` と、既存 `fighters.csv` の `fighter_id` を対応づける
- 完全一致した選手は `matched_fighter_id` に既存IDを入れる
- 未一致の選手は `candidate_fighter_id` を生成し、既存選手とは未確定であることを残す
- `match_method` と `match_confidence` で、突合方法と信頼度を明示する

このCSVにより、Numbers の原データと突合結果を混ぜずに扱えます。

### `data-src/numbers_fight_records.csv`

`data-raw/アラカク選手名鑑.numbers` の「個人成績」シートから抽出した個人視点の戦績データです。

1行は「その選手から見た1試合」です。同じ試合が対戦相手側にも現れることがあるため、このCSVをそのまま `bouts.csv` や `bout_participants.csv` に反映してはいけません。

主な役割:

- Numbers 上の選手名、対戦相手、団体、No、形式、勝敗、詳細を保持する
- Numbers 選手IDと既存 `fighter_id` の突合結果を参照できるようにする
- 同一試合ペア候補、片側だけの戦績行、勝敗矛盾を viewer 側で検出できるようにする
- `団体 + No` と既存 `events.csv` の対応候補を JavaScript 側で比較できるようにする
- ビューアの `DataRepository` による `unknown` な試合結果の自動補完ソースとして使われる

### `data-src/titles.csv`

王座・トーナメント系データです。

王座ID、団体、階級など、王座そのもののデータを管理します。

### `data-src/title_reigns.csv`

王座変遷・トーナメント履歴のデータです。

各王座履歴の出典は `source_article_id` または `source_video_id` で管理します。
該当する決定戦・タイトル戦の動画が確認できる場合は、王座 view で動画出典を優先表示します。

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

### `data-src/archives/youtube.csv`

`tmp/youtube-info/*.info.json` から抽出した YouTube メタデータのアーカイブです。

`videos.csv` は手で管理する動画台帳、`archives/youtube.csv` は取得済みキャッシュから保存した外部メタデータです。動画タイトル、投稿者、投稿日、概要欄などを viewer の補助表示や再検証に使いますが、試合結果や選手同定を確定するデータではありません。

再生成時は `display_id` で既存 `archived_at` を維持し、`display_id` 順に並べます。

### `data-src/archives/note.csv`

`tmp/note-html/*.html` から抽出した note メタデータのアーカイブです。

`articles.csv` は手で管理する記事台帳、`archives/note.csv` は取得済みHTMLから保存した外部メタデータです。canonical URL、HTML title、description を保存し、viewer の補助表示や記事確認に使います。

再生成時は `filename` で既存 `archived_at` を維持し、`filename` 順に並べます。

### `data-src/article_links.csv`

記事と対象データの関係を管理します。

`source_article_id` や `source_article_ids` のようなテーブル内リストではなく、記事と団体・大会・試合・選手・動画・王座履歴などの関係を 1 行ずつ保存します。

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

## Numbers 由来CSVの分割方針

`アラカク選手名鑑.numbers` には、少なくとも以下の性質の違うデータがあります。

- 「全体」シート: 選手プロフィール、集計戦績、肩書き、備考
- 「個人成績」シート: 選手ごとの試合履歴。1行は「その選手から見た1試合」で、同じ試合が対戦相手側にも重複して現れることがあります

既存の正規CSVは変更せず、Numbers 由来データは別CSVとして追加します。比較・突合・重複検出・勝敗矛盾検出は、原則としてクライアントサイド JavaScript で行います。

分割しすぎると、元の Numbers 行との対応が追いにくくなり、列間の意味も早い段階で推測してしまいます。そのため、現時点では細かい関係テーブルへ分解しすぎず、次の程度にまとめる方針です。

- `numbers_fighters.csv`
  - 「全体」シート由来の選手プロフィールCSV
  - 選手名、階級、主戦団体、身長、年齢、所属、集計戦績、実績欄、キャッチコピー、備考を扱う
  - 既存 `fighters.csv` への補完候補として viewer で比較する
- `numbers_name_matches.csv`
  - Numbers 上の名前と既存 `fighter_id` の推定対応を保存するCSV
  - 自動一致結果と原データを混ぜないために、最初から分離する
- `numbers_fight_records.csv`
  - 「個人成績」シート由来の個人視点戦績CSV
  - 1行を1戦績行として保持し、ペア化や重複排除は JavaScript 側で行う
  - `bouts.csv` / `bout_participants.csv` へ直接反映しない

この三分割を基本形とし、これ以上の細分化は viewer 側の比較UIを作ってから判断します。

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

- `database.json`
- `articles.json`
- `article_links.json`
- `promotions.json`
- `events.json`
- `bouts.json`
- `bout_participants.json`
- `fighters.json`
- `titles.json`
- `title_reigns.json`
- `fighter_snapshots.json`
- `videos.json`
- `video_links.json`
- `aliases.json`
- `source_documents.json`
- `source_mentions.json`
- `numbers_fighters.json`
- `numbers_name_matches.json`
- `numbers_fight_records.json`
- `youtube_archives.json`
- `note_archives.json`
- `source_event_references.json`
- `source_bout_references.json`
- `source_video_references.json`
- `metadata.json`

### `scripts/migrate_csv_schema.py`

旧 CSV の多値列や埋め込み参加者列を、現在の relational-style CSV に移すための移行スクリプトです。通常作業で毎回実行するものではありません。新しいスキーマ移行を行う場合は、このスクリプトを参考に、事実データを捨てない移行手順を作ります。

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

### `scripts/archive_metadata.py`

`tmp/note-html/` と `tmp/youtube-info/` を読み、外部メタデータを以下に保存します。

- `data-src/archives/youtube.csv`
- `data-src/archives/note.csv`

キャッシュファイルそのものはコミットしませんが、archive CSV は再取得できなくなった場合に備えた永続メタデータとしてコミット対象です。既存行の `archived_at` は維持し、新規行だけに実行時刻を入れます。

### `scripts/extract_numbers.py`

`data-raw/アラカク選手名鑑.numbers` を読み、Numbers 由来のCSVを生成します。

現在は以下の3CSVを生成します。

- `data-src/numbers_fighters.csv`
- `data-src/numbers_name_matches.csv`
- `data-src/numbers_fight_records.csv`

既存 `fighters.csv` の選手名と照合し、同名選手がいる場合は `numbers_name_matches.csv` に既存 `fighter_id` を記録します。試合ペア化・既存DB突合・勝敗矛盾の検出は viewer 側の JavaScript で行う方針です。

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
make archive-metadata
make build-sources
make refresh-sources
```

### `make build`

CSV から JSON を生成します。

### `make validate`

生成された JSON を検証します。

### `make test`

pytest を実行します。

### `make archive-metadata`

`tmp/note-html/` と `tmp/youtube-info/` のキャッシュから `data-src/archives/*.csv` を再生成します。

### `make check`

以下を順に実行します。

```text
build → validate → pytest
```

### `make clean-generated`

生成済みの `docs/data/*.json` を削除し、`docs/data/.gitkeep` を戻します。

### `make refresh-sources`

出典本文のキャッシュ取得、archive CSV 生成、本文DB生成、通常 check をまとめて実行します。

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
make archive-metadata
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
- viewer を `docs/assets/js/` 配下の modules に分割
- CSV schema を relational-style に移行し、参加者・王座履歴・記事リンクを関係テーブル化
- 試合・大会・動画カードへ関連出典候補と YouTube概要欄 preview を表示
- note本文リンク、出典候補の note本文リンク、動画リンクに `▶ 詳細` / `▼ 詳細` の本文展開を追加
- GitHub Actions、エージェント向け handoff、Codex prompt/checklist/skill 文書を整備
- `アラカク選手名鑑.numbers` を三分割CSVに変換し、Numbers由来プロフィール・名前突合・個人成績をクライアントサイド比較用データとして追加
- YouTube / note cache metadata を `data-src/archives/*.csv` に永続化し、`youtube_archives.json` / `note_archives.json` を viewer の補助表示・検索へ連携
- 団体公式サイト (`kobayashi856/arakaku-site`) のデータを `official_*` CSV として取り込み、公式タブと選手プロフィール補完に連携
- データ信頼性の階層（名鑑 > 公式 > 通信 > YouTube > 未登録）を `core/reliability.js` に定義し、enricher の重ね合わせ・低信頼の末尾寄せ・絞り込みの「その他/最小登録」判定へ適用
- 全タブ共通の設定駆動フィルタ（`filters.js` の `TAB_FILTERS`、URL は英語トークン）と、名鑑=青/公式=緑の出所カラーリング、公式bio表示、表記ゆれ重複選手のビューア統合を追加

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
- `docs/assets/js/config.js`
- `docs/assets/js/main.js`
- `docs/assets/js/data-loader.js`
- `docs/assets/js/core/`
- `docs/assets/js/services/`
- `docs/assets/js/tabs/`
- `docs/assets/js/ui/`
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
- `bouts.csv`: 270 rows
- `bout_participants.csv`: 540 rows
- `fighters.csv`: 146 rows
- `titles.csv`: 16 rows
- `title_reigns.csv`: 68 rows
- `videos.csv`: 360 rows
- `article_links.csv`: 244 rows
- `video_links.csv`: 1076 rows
- `source_documents.csv`: 479 rows
- `source_mentions.csv`: 1794 rows
- `archives/youtube.csv`: 360 rows
- `archives/note.csv`: 120 rows

件数は今後増える可能性があります。

---

## 次の改善候補

- `source_documents.json` を軽量化する
- 王座変遷の精度を上げる
- 選手プロフィールを充実させる
- unknown 試合の結果補完を進める
- 出典詳細トグルと archive 補助表示を Pages 上で確認し、必要なら開閉時のレイアウトを微調整する
