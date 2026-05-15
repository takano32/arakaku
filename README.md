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

## Build

```bash
python scripts/build_json.py
```

`docs/data/` 配下に JSON を生成します。

生成された `docs/data/*.json` はコミットしません。

## Validate

```bash
python scripts/validate_json.py
```

生成された JSON の構造と参照関係を検証します。  
対象は articles、promotions、events、bouts、fighters、titles、fighter snapshots などです。

## Test

以下の順番で実行します。

```bash
python scripts/build_json.py
python scripts/validate_json.py
python -m pytest
```

順番には意味があります。

1. JSON を生成する
2. 生成 JSON を検証する
3. pytest を実行する

## GitHub Actions

CI は `master` への push / pull request で実行します。

```text
build → validate → pytest
```

## Branch

このリポジトリでは以下のブランチを使います。

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
```

`10`, `20`, `30` のように間隔を空けることで、あとから新しいテスト段階を差し込めるようにします。

CI 全体の順序は以下です。

```text
build → validate → pytest
```

pytest 内でも、ファイル名から概念上の順序が分かるようにします。

## Test suite

現在の pytest は小さく保ち、ファイル名順で役割を分けています。

```text
tests/
  conftest.py
  test_10_build_json.py
  test_20_validate_json.py
```

`test_10_build_json.py` は、空値処理、真偽値変換、リスト分割など、build helper を検証します。

`test_20_validate_json.py` は、ID 重複検出、記事参照、alias 構造、未知の決着方法 warning など、JSON 検証ロジックを検証します。

全体の build → validate は pytest 内で重複実行せず、以下のコマンド列で確認します。

```bash
python scripts/build_json.py
python scripts/validate_json.py
python -m pytest
```

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
python scripts/build_json.py
```

## Local environment note

一部の notebook 系実行環境では、Python 起動時に `artifact_tool` の spreadsheet warmup 警告が出ることがあります。

これは実行環境固有の警告で、このリポジトリの問題ではありません。

必要な場合は、以下のように実行します。

```bash
OAI_IS_JUPYTER_KERNEL=0 python scripts/build_json.py
OAI_IS_JUPYTER_KERNEL=0 python scripts/validate_json.py
OAI_IS_JUPYTER_KERNEL=0 python -m pytest -q
```

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

## Status

初期構築段階です。
