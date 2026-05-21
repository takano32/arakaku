# ARAKAKU

[![Test](https://github.com/takano32/arakaku/actions/workflows/test.yml/badge.svg)](https://github.com/takano32/arakaku/actions/workflows/test.yml)
[![Deploy Pages](https://github.com/takano32/arakaku/actions/workflows/pages.yml/badge.svg)](https://github.com/takano32/arakaku/actions/workflows/pages.yml)

公開ページ: https://takano32.github.io/arakaku/

ARAKAKU は、[アラカク通信のーと](https://note.com/xyz1090) などの公開情報をもとに、アラカクの団体・大会・試合結果・選手情報を整理する非公式データベースです。

CSV で管理しているソースデータを、GitHub Pages で利用しやすい静的 JSON に変換することを目的としています。

## Data policy

このリポジトリでは、実データをソースとして扱います。

テストや fixture では、モック CSV を使いません。  
テストは、実際のデータパイプラインと生成済み JSON の検証を中心にします。

## Source data

CSV ファイルは以下に置きます。

```text
data-src/
```

CSV ファイルはソースデータなのでコミットします。

生成された JSON ファイルは以下に出力されます。

```text
docs/data/
```

生成 JSON はビルド成果物なのでコミットしません。

空の出力ディレクトリを Git で保持するため、以下のファイルだけを置きます。

```text
docs/data/.gitkeep
```

GitHub Pages では、生成後の `docs/data/` 配下の JSON を読み込みます。

## Local commands

ローカル確認には `Makefile` を使います。

```bash
make check
make clean-generated
```

`make check` は以下を順に実行します。

```text
build → validate → pytest
```

`make clean-generated` は生成済みの `docs/data/*.json` を削除し、`docs/data/.gitkeep` を戻します。

## Build

```bash
make build
```

`docs/data/` 配下に JSON を生成します。

生成された `docs/data/*.json` はコミットしません。

## Validate

```bash
make validate
```

生成された JSON の構造と参照関係を検証します。  
対象は articles、promotions、events、bouts、fighters、titles、fighter snapshots、videos、video links などです。

## Test

```bash
make test
```

## GitHub Actions

CI は `master` への push / pull request で実行します。

```text
build → validate → pytest
```

## Branch

```text
master
```

## Repository

```text
takano32/arakaku
```

## Naming notes

本文では `スーパーうんどう` 表記を基本にします。

ただし、引用や出典の表記を保持する必要がある場合は、出典側の表記を尊重します。  
資料によっては `スーパー運動` と表記される場合があります。

## Current MVP data

初期データは、最小構成として以下のみを含みます。

- ターゲット
- ターゲットNo.103
- ターゲットNo.103 全5試合
- 出場10選手
- わくのターゲットライト級王座最小情報

他団体、他大会、王座変遷の詳細は段階的に追加します。

## Test file ordering

テストファイル名には、意図した順序が分かるように数値プレフィックスを付けます。

```text
tests/test_10_build_json.py
tests/test_20_validate_json.py
tests/test_30_validate_videos.py
```

`10`, `20`, `30` のように間隔を空けることで、あとから新しいテスト段階を差し込めるようにします。

## Test suite

現在の pytest は小さく保ち、ファイル名順で役割を分けています。

```text
tests/
  conftest.py
  test_10_build_json.py
  test_20_validate_json.py
  test_30_validate_videos.py
```

- `test_10_build_json.py`: build helper の検証
- `test_20_validate_json.py`: JSON 検証ロジックの検証
- `test_30_validate_videos.py`: video / video_links 検証ロジックの検証

## Generated data policy

コミットするもの:

```text
data-src/*.csv
docs/data/.gitkeep
```

コミットしないもの:

```text
docs/data/*.json
```

JSON はローカルまたは CI で再生成します。

```bash
make build
```

## Video data policy

動画URLは、試合・大会データに直接持たせず、専用CSVで管理します。

理由は、動画と対象データの関係が 1 対 1 とは限らないためです。

想定するケース:

- 1試合に複数動画がある
- 1動画に複数試合が含まれる
- 大会全体の配信アーカイブがある
- 選手紹介、煽りV、ハイライト、ショート動画がある
- YouTube以外の動画プラットフォームが出る
- 公式、非公式、削除済み、未確認などの状態を管理したい

そのため、動画そのものは `videos.csv`、動画と対象データの関係は `video_links.csv` に分けます。

```text
data-src/videos.csv
data-src/video_links.csv
```

### videos.csv

動画そのものを管理します。

```csv
video_id,platform,platform_video_id,url,title,channel_name,published_at,official_status,video_type,link_status,duplicate_group_id,duplicate_note,notes,source_article_ids
```

主な列の意味:

`video_id`
: リポジトリ内で使う動画ID。

`platform`
: `youtube` などの動画プラットフォーム。

`platform_video_id`
: YouTube の動画IDなど、プラットフォーム側の動画ID。

`url`
: 動画URL。

`video_type`
: `full_fight`、`highlight`、`stream_archive`、`preview`、`reference` など。

`link_status`
: `linked`、`partially_linked`、`unlinked`、`needs_review` など。

`duplicate_group_id`
: 同じ動画・同じ試合の候補を束ねるための任意ID。

`duplicate_note`
: 重複候補に関するメモ。

### video_links.csv

動画がどのデータに紐づくかを管理します。

```csv
video_id,entity_type,entity_id,relation_type,start_time,end_time,notes
```

`entity_type` は当面、以下を想定します。

```text
event
bout
fighter
promotion
title
```

`relation_type` は当面、以下を想定します。

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

この設計により、以下の関係を扱えるようにします。

- 1動画 → 複数試合
- 1試合 → 複数動画
- 1動画 → 大会にも試合にも紐づく
- 1動画 → 選手紹介やインタビューとして紐づく

`bouts.csv` や `events.csv` には、動画URL列を直接追加しません。

URLまたは `platform_video_id` が異なる動画は、タイトルが似ていても `videos.csv` では別行として保持します。  
同一動画や重複投稿の可能性があるものは削除せず、`duplicate_group_id` と `duplicate_note` で管理します。

## YouTube import

公式YouTubeチャンネルの一覧は `yt-dlp` で TSV に出力し、`scripts/import_youtube_videos.py` で `videos.csv` に変換します。

```bash
mkdir -p tmp

yt-dlp \
  --flat-playlist \
  --skip-download \
  --print "%(id)s	%(webpage_url)s	%(title)s	%(channel)s	%(upload_date)s	%(duration_string)s" \
  "https://www.youtube.com/@アラカク通信/videos" \
  > tmp/arakaku-youtube-videos.tsv

python scripts/import_youtube_videos.py
```

既存の `videos.csv` にある `link_status` や `duplicate_note` などの手作業情報は、通常は保持します。

完全に作り直す場合だけ、以下を使います。

```bash
python scripts/import_youtube_videos.py --replace
```

## Local environment note

一部の notebook 系実行環境では、Python 起動時に `artifact_tool` の spreadsheet warmup 警告が出ることがあります。

このリポジトリの `Makefile` では `OAI_IS_JUPYTER_KERNEL=0` を付けて実行するため、ローカル確認時の警告を抑制します。

GitHub Actions や通常のローカル Python 環境では、この回避策は不要なはずです。

## Roadmap

今後の予定です。

- GitHub Pages viewer の表示改善
- ターゲット以外の団体データ追加
- ターゲットの王座変遷データ拡充
- 大会ごとの試合結果追加
- 選手プロフィールと戦績スナップショットの拡充
- 検索・絞り込み UI の改善
- データ出典の整理と参照性向上
- 動画データの追加と viewer 表示

## Status

初期構築段階です。
