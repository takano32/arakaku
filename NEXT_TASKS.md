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
- `database.json` と relationship JSON の生成（`database.json` はその後廃止し、現在はテーブルごとの JSON のみを出力）
- GitHub Actions と Codex/agent handoff 文書の整備
- `アラカク選手名鑑.numbers` から Numbers 由来三分割CSVを生成
- `data-src/archives/youtube.csv` / `data-src/archives/note.csv` を cache metadata archive として整備
- `youtube_archives.json` / `note_archives.json` を生成・検証し、viewer の動画表示・記事リンク・検索に補助連携
- `make archive-metadata` を追加し、`make refresh-sources` に組み込み
- `DataRepository` による名鑑データを用いた不明情報の自動補完と「名鑑確認済み」バッジ表示の実装
- 仮想スクロール（`@tanstack/virtual-core@3` CDN）を全タブに導入
- SAX ストリーミング JSON パース（`@streamparser/json` CDN）による Phase 1 インクリメンタル描画
- Phase 2 エンリッチメント（`ENRICHMENT_DATA_KEYS`）バックグラウンドロードと `DataRepository` 再構築
- `TabRenderers` の descriptor パターン移行（`{ items, renderItem, estimateSize? }`）
- `TabRendererRegistry` の `DataRepository` 参照・フィルタフィンガープリントによる再描画最適化
- `source_documents.json` の軽量化（`source_document_bodies.json` 分離・遅延ロード）
- note記事 ○●🆚 構造化結果の抽出・照合・適用（88件、unknown 265→177）
- Service Worker + Stale-While-Revalidate による JSON データキャッシュ（`docs/sw.js`）
- `lite-youtube-embed` CDN web component による動画ファサード（クリックまで YouTube JS 不要）
- 公式サイト（kobayashi856/arakaku-site）データのダウンロード・CSV化・JSON化パイプライン整備
- クライアントサイド enrichment で公式データ（nickname, nationality, wins/losses/draws, champion）を richFighter / richEvent 等に統合
- バッジ表記統一（"名鑑" / "公式"）、バナーヘッダ復活、サマリーカードのコンパクト化
- スクロール挙動修正（タブ切り替え・ジャンプナビ・フォーカス変化）
- 検索クリアボタン（✕ ボタン + Escape キー）
- URL パーマリンク同期（url-sync.js）
- キーボードナビゲーション（keyboard-nav.js）: j/k/h/l/g/G/Enter/o/c/Space/r/1-6/?

---

## P1: 公式データの選手マッチング精度向上

### 背景

`data-src/official_players.csv` は 106 人。`data-enricher.js` は `display_name` 完全一致を優先し、取れない場合は中黒・空白・ピリオド・全半角差を吸収する正規化キー（`normalizeFighterName`）でフォールバック突き合わせする。現状この方式で 106 人中 99 人が `fighters.csv` の `display_name` とマッチし、残り 7 人（例: きくちぴあのせん、トワックデビル、のこぎりやまだ、ブレイブ、ヤック・タイアット、ラミーロ・コート、ループデビル）は表記差でマッチしていない。

### 案

- `aliases.csv` を活用して公式名から canonical fighter_id へのマッピングを追加
- または `data-enricher.js` の正規化（`normalizeFighterName`）をさらに強化

### 完了条件

- マッチ率が 106/106、または残り 7 人の不一致理由が文書化されている

---

## P1: Pages 上でストリーミング・仮想スクロールを目視確認する

### 目的

ストリーミング実装・仮想スクロールが Pages 上で正常に動くか目視確認する。CI は通っているが、ブラウザ動作の確認が未完了。

### 確認項目

- 公式タブ（初期画面）が PRIMARY ストリーミング完了を待たず最初に表示される（Phase 0 最優先ロード）
- 公式タブで `<details>` を開いてもストリーミング中に閉じない（itemsSource による再描画スキップ）
- データがインクリメンタルに表示される（一気に出るのではなく段階的に増える）
- スクロールが滑らか（大量データでも重くない）
- Phase 2 エンリッチメント後にスクロール位置がリセットされない
- 検索クリア後（アイテム数が増加するフィルタ変更）に古いカードが残らない
- 全タブ（試合・選手・大会・団体・王座・動画）が表示される
- 検索・フィルタが正しく動く
- 出典本文・出典言及タブが表示される（遅延ロードのため切替後に表示される）
- Console に JS エラーがない

### 完了条件

- 上記項目を目視で確認済み

---

## P2: validate_json.js の load() カバレッジ検証を実効化する

### 背景

`scripts/validate_json.js` は Node 上で `DataLoader.load()` を実行し `CORE_DATA_KEYS` の全キーが `loadedDataKeys` に入ることを assert しているが、ストリーミング（`#streamKey`）キーは Node では `fetch()` がローカルファイルパスを解釈できず常にエラーパス（fallback データ + loaded 扱い）に落ちる。そのためこの assert は Phase 0 の 2 キー（`officialPages` / `officialNews`、`fetchText` 注入経路で実データを読む）以外を実質検証していない。ストリーミング経路が完全に壊れていても green になる。敵対的レビュー（2026-06-13）で発見。

### 案

- `#streamKey` にも `fetchText` 注入を通す、または Node 実行時にローカルパスを `file://` URL に変換する
- もしくは `load()` 検証を「キー網羅」ではなく `loadAll()` ベースの実データ検証に寄せる

### 完了条件

- ストリーミング経路を意図的に壊すと `validate_json.js` が fail する

---

## P3: viewer の未使用・誤パースデータキーと未メモ化フィルタの整理

### 背景

Phase 15 の調査（2026-06-13）で以下が判明。いずれも実害は小さいが整理候補。

- `metadata`（`ENRICHMENT_DATA_KEYS` かつ `OBJECT_DATA_KEYS`）は object 形式を配列 SAX ストリームに通して `[]` に誤パースされる。さらに viewer に読み手がいない（`aliases` と同じ既存バグ。Phase 15 で aliases は PRIMARY から除去済み）
- `data-repository.js` の `eventsForPromotion` / `relatedBoutsForFighter` / `fighterSnapshotsForFighter` は revision メモ化されておらず、検索キーストロークごとに再フィルタ/ソートする（現規模では各 0.001〜0.027ms と軽微）

（`metadata` は Phase 16 で ENRICHMENT から除去済み。`aliases` は Phase 15 で PRIMARY から除去済み。）

### 案

- 上記 3 フィルタを revision キーの Map でメモ化（`invalidate()` でクリア）
- `officialMatches` / `officialHistory`（管理「公式 / officialMisc」タブ専用・各 1〜2KB）を ENRICHMENT から除去し、`TAB_DATA_KEYS` / `REQUIRED_TAB_DATA_KEYS` に `officialMisc` を追加して遅延ロード化（バイト削減は僅少なので任意。3 ファイル連携が必要）

### 完了条件

- フィルタがメモ化され検索描画が一段軽くなる / 管理専用データが公開クリティカルパスから外れる

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

## P3: 公式タブを「公式ページ」と「公式ニュース」に分割する

### 背景

現在、通常ビューの「公式」タブには `official_pages`（about・history）と `official_news` が混在している。
今は合計4件しかなく、分けるとタブあたり2件になるためまとめたままにしている。

### 分割のタイミング

公式ニュースが10件程度に増えたタイミングが目安。「最新情報だけ確認したい」という使い方に応えられるようになってから検討する。

### 実装メモ

- `config.js` の `PUBLIC_TABS` で `["official", "公式"]` を `["officialPages", "公式ページ"]` と `["officialNews", "公式ニュース"]` に分割
- `TAB_DATA_KEYS` も対応して分割（officialPages → officialPages のみ、officialNews → officialNews のみ）
- `tab-registry.js` と `tab-renderers.js` で descriptor を分けるだけで済む

---

## P3: 王座変遷の精度向上


### 目的

`titles.csv` / `title_reigns.csv` の王座・トーナメント情報をより正確にする。

### 注意

王座変遷は誤ると影響が大きいので、出典確認を優先する。
