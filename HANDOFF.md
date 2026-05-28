# Unofficial ARAKAKU Database Handoff Notes

このファイルは、Unofficial ARAKAKU Database リポジトリの現在状態を次の作業者・別エージェントへ引き継ぐためのメモです。

README.md / AGENTS.md / .agents/skills/arakaku-maintainer/SKILL.md を読んだうえで、直近の状態確認に使ってください。

---

## 現在の安定状態

直近の同期確認では、以下が成立しています。

```text
make check: PASS
json validation passed: 0 warning(s)
pytest: 18 passed
make clean-generated: DONE
```

GitHub Pages viewer でも、以下の正常動作を確認済みです。

- 試合 view
- 選手 view
- 大会 view
- 団体 view
- 王座 view
- 動画 view
- 出典本文 view
- 出典言及 view
- 試合・大会・動画カードの関連出典候補
- note本文リンクと動画リンクの `▶ 詳細` / `▼ 詳細` 展開

---

## 現在の主なデータ規模

```text
articles.csv: 122 rows
events.csv: 54 rows
bouts.csv: 270 rows
bout_participants.csv: 540 rows
fighters.csv: 146 rows
numbers_fighters.csv: 101 rows
numbers_name_matches.csv: 101 rows
numbers_fight_records.csv: 543 rows
titles.csv: 16 rows
title_reigns.csv: 68 rows
videos.csv: 360 rows
article_links.csv: 244 rows
video_links.csv: 1076 rows
source_documents.csv: 479 rows
source_mentions.csv: 1794 rows
archives/youtube.csv: 360 rows
archives/note.csv: 120 rows
```

`source_documents.csv` の内訳:

```text
youtube_description: 359
note_article: 120
```

`source_mentions.csv` の主な内訳:

```text
event: 860
youtube_url: 384
result: 317
matchup: 169
note_url: 64
```

---

## 直近で追加・整備したもの

### Phase 10: 公式データ統合・UI改善・キーボードナビゲーション (2026-05-29)

#### 公式データパイプライン

`kobayashi856/arakaku-site` リポジトリから公式サイトデータを取得し、enrichment に使う体制を整えました。

- `scripts/download_official_data.sh`: GitHub API 経由で `tmp/arakaku-site/` にダウンロード（`make cache-sources` に組み込み）
- `scripts/generate_official_csvs.py`: `tmp/arakaku-site/src/data/*.json` → `data-src/official_*.csv`（stage-1）
- `scripts/build_official_json.py`: `data-src/official_*.csv` → `docs/data/official_players.json`, `docs/data/official_tournaments.json`（`make build-official`）
- enrichment は **クライアントサイドのみ**（`data-enricher.js`）。`build_json.py` は一切変更しない。

生成 CSV:

```text
data-src/official_players.csv
data-src/official_tournaments.csv
data-src/official_matches.csv
data-src/official_history.csv
```

#### クライアントサイド enrichment 拡張

`data-enricher.js` で `richFighter`, `richFighterSnapshot`, `richBoutParticipant`, `richEvent` に公式データを付与するようにしました。

- 選手カード: ニックネーム・国籍・通算戦績（勝/敗）・「公式」バッジ
- 大会カード: champion/runner_up・「公式」バッジ
- バッジ表記統一: "名鑑確認済み" → "名鑑"、"公式確認済み" → "公式"

#### ビジュアル改善

- バナーヘッダ復活: `header.webp` をライトテーマに合わせて表示
- ヘッダタイトル: フォント大きめ・2行分割・背景透明化
- サマリーカード: コンパクトなインラインピル型レイアウトに変更

#### スクロール挙動修正

複数の scroll-to-top バグを修正しました:

- タブ切り替えボタンのクリックでスクロールしないよう `renderTabs()` を修正（DOM 再構築をやめアクティブクラスのみ更新）
- `VirtualList.setItems()` から自動 scroll-to-top を削除
- ジャンプナビゲーション（選手リンク/大会リンク）の `scrollTo` を `state.patch()` 後に移動して DOM 変更によるキャンセルを防止
- フォーカス変化検出を `TabRendererRegistry` に追加し、`refreshItems` パスでもスクロールするように対応

#### 検索UIの改善

- 検索ボックス右端に目立つ `✕` ボタン（テキスト入力中のみ表示）
- Escape キーでもクリア
- ネイティブ webkit cancel ボタンは非表示にして競合を防止

#### URLパーマリンク

`docs/assets/js/core/url-sync.js` を新設し、アプリ状態を URL クエリ文字列に同期しました。

- `?tab=fighters&q=山本&fighter=waku` のような URL で状態を共有・復元できる
- `history.replaceState` で URL 更新（履歴は増やさない）
- 対応パラメータ: `tab`, `q`, `fighter`, `event`, `promotion`, `division`, `mention`

#### キーボードナビゲーション

`docs/assets/js/ui/keyboard-nav.js` を新設し、Vim スタイルのキーボード操作を実装しました。

| キー | 動作 |
|------|------|
| `j` / `↓` | 次のアイテムへ（仮想リストカーソル移動、上端揃え） |
| `k` / `↑` | 前のアイテムへ |
| `g` / `G` | 先頭 / 末尾へ |
| `Enter` | フォーカスアイテムの最初のボタンをクリック |
| `o` | フォーカスアイテムの詳細を展開/折りたたむ |
| `h` / `←` | 前のタブへ（循環） |
| `l` / `→` | 次のタブへ（循環） |
| `1`〜`6` | タブ直接切り替え |
| `c` | 現在の URL をコピー（トースト表示） |
| `Space` / `Shift+Space` | 半ページスクロール |
| `r` | ページ再読み込み |
| `/` | 検索ボックスにフォーカス |
| `?` | ヘルプダイアログ表示 |
| `Esc` | 検索ボックスをブラー / ヘルプを閉じる |

仮想リスト (`VirtualList`) にカーソルインデックス管理を追加。`align: "start"` で上下移動を上端揃えに統一。タブ切り替え時はカーソルリセット＋スクロールトップ。

---

### Phase 9: クライアントキャッシュ・CDNライブラリ・データ品質 (2026-05-28)

#### Service Worker + Stale-While-Revalidate

`docs/sw.js` を新設し、`/data/*.json` へのすべてのフェッチをインターセプトします。

- キャッシュがあれば即座に返す（stale-while-revalidate）
- バックグラウンドで `ETag`/`If-None-Match` 条件付きGETで再検証
- データ更新を検出したら全ウィンドウに `DATA_UPDATED` を送信
- `main.js` がバナー（`update-banner`）を一度だけ表示し、ボタンクリックで `location.reload()`
- GitHub Pages はカスタム `Cache-Control` ヘッダを使えないため Service Worker で代替

#### lite-youtube-embed（動画ファサード）

`<iframe>` 埋め込みを `<lite-youtube>` web component に差し替えました。

- Paul Irish 作、v0.3.4（2025年11月）、6.3k stars
- `esm.sh` から import（`main.js` でサイドエフェクト import）
- CSS は `style.css` にインライン化（追加ネットワークリクエスト不要）
- クリックするまで YouTube JavaScript を一切ロードしない

#### note記事構造化結果の抽出・適用（88件）

○●🆚 記法のパースと bout_participants.csv を使った名前照合を修正し、88件の `result_status=unknown` 試合を `known` に更新しました。

- `extract_note_structured_results.py`: ○●🆚 記法パーサーを実装
- `make_structured_result_patch_candidates.py`: `bout_participants.csv` との結合で名前照合を修正
- `apply_structured_result_patches.py`: サイドベース照合（red/blue）で勝敗を正しく反映
- `result_status=unknown`: 265 → 177 件

#### バグ修正

- `refreshItems()` でDOMをクリアしていなかったため初回タブ表示でゴースト要素が残存 → `this.#el.innerHTML = ""` 追加
- グローバル `dd { color: var(--muted) }` が `.record-details dd` に漏れて値が薄字 → `color: var(--ink)` オーバーライド追加
- 試合結果の決まり手テキストに誤って `class="meta"` が付いて薄字 → クラス削除

---

### バーチャルスクロール・ストリーミング実装 (2026-05-28)

#### 仮想スクロール (`@tanstack/virtual-core@3`)

`docs/assets/js/ui/virtual-list.js` を新設し、全タブの描画をウィンドウスクロールベースの仮想リストに移行しました。

- オフスクリーン DOM を解放し、大量データでもスムーズにスクロールできます。
- `VirtualList` は `setItems` / `refreshItems` / `extendItems` の3メソッドを持ちます。
- `@tanstack/virtual-core@3` を `https://esm.sh/` から CDN 動的インポートします。

#### SAX ストリーミング JSON パース (`@streamparser/json`)

`DataLoader.load()` を2フェーズ構成に変更しました。

**Phase 1 — ストリーミング (PRIMARY_DATA_KEYS):**

13ファイルを並列にストリーミングSAXパース（`@streamparser/json` CDN）します。30件ごと / 50ms ごとのバッチで `state.patch({})` を呼び、ページをインクリメンタルに描画します。

```javascript
PRIMARY_DATA_KEYS = [
  "bouts", "boutParticipants", "fighters", "events", "promotions",
  "videos", "titles", "titleReigns", "videoLinks", "aliases",
  "fighterSnapshots", "articles", "articleLinks",
]
```

**Phase 2 — エンリッチメント (ENRICHMENT_DATA_KEYS):**

8ファイルを通常ロードし、完了後に `DataRepository` を再構築します。

```javascript
ENRICHMENT_DATA_KEYS = [
  "metadata",
  "numbersFighters", "numbersNameMatches", "numbersFightRecords",
  "youtubeArchives", "noteArchives",
  "sourceDocuments", "sourceMentions",
]
```

#### タブ描画アーキテクチャ変更

`TabRenderers` のメソッドは HTML 文字列ではなく descriptor オブジェクトを返します:

```javascript
{ items: [...], renderItem: (item) => html, estimateSize?: (i) => px }
```

`TabRendererRegistry.renderTo(container, tabId)` が `VirtualList` のライフサイクルを管理します。`DataRepository` 参照の変化とフィルタフィンガープリントで再描画を検出し、無駄な再描画を省略します。

#### 発見・修正したバグ

実装後のコードレビューで以下を修正しました:

1. **`load()` が enrichment 完了前に解決していた** — `#loadEnrichment()` を `await` なしで呼んでいたため、バリデーターの `CORE_DATA_KEYS` チェックが失敗。`await this.#loadEnrichment()` に修正。

2. **`#streamKey` のエラーパスで `loadedDataKeys.add()` 漏れ** — fetchエラー・HTTPエラー時にキーが「未ロード」状態のまま残り続ける。両パスに `loadedDataKeys.add(key)` を追加。

3. **フィルタ変更時に `extendItems` が呼ばれてスタール DOM が残存** — アイテム数が増加するフィルタ変更（検索クリア等）で `extendItems` が使われ、旧フィルタ時の DOM が残存。このパスを `refreshItems` に修正。

4. **`.reverse()` 配列でのストリーミング中に全インデックスが変化** — `richBouts`・`richVideos`・`events` は `.reverse()` で返されるため、各ストリーミングバッチで既存インデックスのアイテムがすべて変わる。`extendItems`（既存行を再レンダリングしない）を使うと古い DOM が残存。`TabRendererRegistry` から `extendItems` パスを完全削除し、常に `refreshItems` を使うよう変更。

---

### 本文DB・アーカイブ・パイプライン

以下を追加済みです。

```text
data-src/source_documents.csv
data-src/source_mentions.csv
data-src/archives/youtube.csv
data-src/archives/note.csv
scripts/archive_metadata.py
```

### アーカイブ戦略とパイプラインの変更 (2026-05-25)

- メタデータアーカイブ: `scripts/archive_metadata.py` を実装し、YouTube / Note キャッシュからメタデータを抽出し `data-src/archives/*.csv` に集約・永続化する体制を構築しました。
- アーカイブの JSON 化: `build_json.py` でこれら CSV を `youtube_archives.json` / `note_archives.json` に変換し、ビューアー側で利用可能にしました。
- クライアントサイドマージ: ビューアーの `DataRepository` が archive JSON と動画・記事をクライアントサイドで結合します。動画 view、関連動画リンク、検索、記事リンク表示で archive メタデータを補助的に使います。
- deterministic archive: `archive_metadata.py` は固定ヘッダ・固定ソートで出力し、既存 `archived_at` を維持します。新規 archive 行だけ実行時刻を持ちます。
- 検証: `scripts/validate_json.py` と `scripts/validate_json.js` は archive JSON と viewer repository lookup を検証します。直近確認では `make check` が通っています。

### グローバル・リファクタリング (2026-05-25)

- **Frontend リファクタリング**: `DataRepository.js` を `BaseRepository.js` (生データアクセス/インデックス管理) と `DataEnricher.js` (Rich Data 構築ロジック) に分割し、責務を明確にしました。
- **Python スクリプトのモジュール化**: `scripts/arakaku/` パッケージを新設し、`mapping.py`, `models.py`, `utils.py` にロジックを整理しました。
- **ビルドプロセスの簡素化**: `build_json.py` のマッピングロジックを外部モジュール化し、メンテナンス性を向上させました。
- **後方互換性**: 既存のスクリプトを壊さないよう、`scripts/arakaku_utils.py` をプロキシとして維持しています。

- データ補完ロジック: `DataRepository` に `getRichFighterInfo` / `getRichBoutInfo` を実装し、`unknown` な選手プロフィールや試合結果を Numbers 由来データ（`numbers_fighters.json` / `numbers_fight_records.json`）で自動補完するようにしました。
- 情報の最大活用: 通算戦績、実績マーカー（👑 🏆）、階級・試合形式の補完など、名鑑に含まれる人手管理の情報を最大限に活用して表示します。
- クリーンビルドと動的マージ: `build_json.py` は正規 CSV の事実のみを出力するようにリファクタリングされました。名鑑にのみ存在する選手の発見や、情報の優先上書きはすべて `DataRepository` がクライアントサイドで実行時に行います。
- **Numbers データの絶対優先ポリシー**: Apple Numbers 由来のデータは人手で検証・入力されたものであるため、システムにおいて**絶対的な正当性を持つもの**として扱います。クライアントサイドでのマージ時、競合する項目（階級、試合形式、決着内容、選手プロフィール等）は Numbers の値で無条件に上書きされます。
- UI表示: 補完・確認された項目に「名鑑確認済み」バッジと統計ブロックを表示し、出典を明示しました。
- キャッシュ: パフォーマンス維持のため、リポジトリ内でリッチ化済みオブジェクトをキャッシュします。
- バリデーション更新: `scripts/validate_json.js` はオブジェクト再生成に対応するため、IDベースの一致チェックを行うように修正済みです。

---

## 作業者への注意

このプロジェクトでは「正しそうだから埋める」よりも、「不明なものを不明として残す」ことを優先してください。

特に試合結果は、後で参照される重要データなので、曖昧な抽出結果をそのまま勝敗として反映しないでください。

また、アーカイブのデータ突合ロジックを変更する際は、クライアントサイドでの null チェック（`this.data?.sourceDocuments ?? []` 等）と `sourceVideoReferences` / archive getter の維持を必ず確認してください。


ただし `docs/data/*.json` は生成物なのでコミットしません。

### relational-style CSV schema

以下を追加・移行済みです。

```text
data-src/bout_participants.csv
data-src/title_reigns.csv
data-src/article_links.csv
docs/data/database.json
```

`bouts.csv` は bout-level facts、`bout_participants.csv` は参加者と参加者ごとの result、`titles.csv` は王座本体、`title_reigns.csv` は王座履歴を持ちます。`database.json` は正規化 CSV の生成スナップショットです。

### Numbers 由来の選手名鑑CSV

以下を追加済みです。

```text
data-src/numbers_fighters.csv
data-src/numbers_name_matches.csv
data-src/numbers_fight_records.csv
scripts/extract_numbers.py
```

`numbers_fighters.csv` は `data-raw/アラカク選手名鑑.numbers` の「全体」シートから生成した二次ソースです。既存 `fighters.csv` を置き換えるものではなく、viewer やクライアントサイド突合で比較するための入力です。

`numbers_name_matches.csv` は Numbers 上の選手名と既存 `fighters.csv` の推定対応を、原データと分けて保存します。`numbers_fight_records.csv` は「個人成績」シートの1行をそのまま個人視点の戦績として保存します。

「個人成績」シートは、既存 `bouts.csv` / `bout_participants.csv` へ直接反映しません。ペア化、重複検出、既存イベント・試合との突合、勝敗矛盾の表示は JavaScript 側で行う方針です。

`build_json.py` は `numbers_fighters.json`、`numbers_name_matches.json`、`numbers_fight_records.json` を生成し、`database.json` にも Numbers 由来テーブルを含めます。`docs/assets/js/data-loader.js` はこれらをロードできますが、専用の比較UIは次タスクです。

### 本文キャッシュ系スクリプト

以下を追加済みです。

```text
scripts/cache_note_html.py
scripts/cache_youtube_info.py
scripts/build_source_documents.py
```

### Makefile target

以下を追加済みです。

```text
make cache-note-html
make cache-youtube-info
make cache-sources
make archive-metadata
make build-sources
make refresh-sources
```

### viewer

以下のタブを追加済みです。

```text
出典本文
出典言及
```

viewer は以下のファイルへ分割済みです。

```text
docs/assets/js/config.js
docs/assets/js/main.js
docs/assets/js/data-loader.js
docs/assets/js/core/
docs/assets/js/services/
docs/assets/js/tabs/
docs/assets/js/ui/
docs/assets/style.css
```

関連出典候補と本文展開 UI も追加済みです。

- 出典言及 view に `mention_type` フィルタ
- 試合・大会 view に関連出典候補
- 動画 view に YouTube概要欄 preview
- note本文リンク横の `▶ 詳細` / `▼ 詳細`
- 出典候補にある note本文リンク横の `▶ 詳細` / `▼ 詳細`
- 動画リンク横の `▶ 詳細` / `▼ 詳細`

### GitHub Actions

現在の主な actions は以下です。

```text
actions/checkout@v5
actions/setup-python@v6
actions/configure-pages@v6
actions/upload-pages-artifact@v5
actions/deploy-pages@v5
```

### ドキュメント

以下を追加・更新済みです。

```text
README.md
AGENTS.md
.agents/skills/arakaku-maintainer/SKILL.md
```

---

## 全コミット履歴の作業サマリ

全コミットを通して、プロジェクトは以下の順に整備されています。

1. CSV-backed database、GitHub Pages viewer、build / validate / pytest の土台を作成
2. 王座変遷、選手・大会・試合リンク、動画カタログ、動画タブを追加
3. YouTube概要欄候補、note試合結果候補、構造化結果候補、review CSV workflow を追加
4. note本文と YouTube概要欄を本文DB化し、`source_documents.csv` / `source_mentions.csv` を追加
5. 出典本文 view、出典言及 view、`mention_type` フィルタ、試合結果候補CSVを追加
6. 大会・試合・動画向けの出典参照候補CSVを生成する workflow を追加
7. viewer を複数 JS ファイルへ分割し、関連出典候補と詳細情報表示を強化
8. 出典記事、出典候補、動画リンクに本文・概要欄の折りたたみ詳細表示を追加
9. GitHub Actions と Codex/agent handoff 文書を整備
10. CSV schema を relational-style に移行し、参加者・王座履歴・記事リンクを関係テーブル化
11. YouTube / note cache metadata を `data-src/archives/*.csv` に永続化し、archive JSON を viewer の補助表示・検索に連携

---

## 重要な作業ルール

### 正規データ

正規データは以下です。

```text
data-src/*.csv
```

`docs/data/*.json` は生成物です。直接編集しないでください。

### 抽出候補

自動抽出・推定結果は、まず `review/` に出してください。

特に、試合結果・勝敗・決着方法・ラウンド・タイムは、出典で確認できるまで `data-src/bouts.csv` / `data-src/bout_participants.csv` に確定反映しないでください。

### tmp

以下はローカルキャッシュなのでコミットしません。

```text
tmp/note-html/*.html
tmp/youtube-info/*.info.json
```

`.gitkeep` のみ保持します。

---

## よく使う確認コマンド

```bash
git status
git log --oneline -5

make check
make clean-generated

grep -RIn "uses: actions/" .github/workflows
```

本文DBを更新する場合:

```bash
make cache-sources
make archive-metadata
make build-sources
make check
make clean-generated
```

---

## 現在の既知リスク

### source_documents.json が重い

`docs/data/source_documents.json` は約 1.1MB あります。

現状は Pages で動作確認済みですが、今後本文量が増えると初期読み込みが重くなる可能性があります。

将来的な対策候補:

- `source_document_index.json` と本文本体を分離する
- 出典本文 view だけ遅延読み込みする
- preview だけ初期ロードし、本文は別ファイル化する

### source_mentions は候補である

`source_mentions.csv` は本文から自動抽出した候補です。

`mention_type=result` であっても、正規の試合結果として確定しているわけではありません。  
反映前に必ず出典文脈を確認してください。

### Numbers の個人成績は直接 bout 化しない

`アラカク選手名鑑.numbers` の「個人成績」シートは個人視点の戦績表です。同じ試合が両選手分の2行として現れることがあり、一部は片側行だけ、または勝敗表記が矛盾する可能性があります。

このデータを扱う場合は、まず Numbers 専用CSVとして保存し、viewer 側で既存CSVとの比較・突合・警告表示を行ってください。確認前に `bouts.csv` や `bout_participants.csv` へ確定反映しないでください。

### note 404

`articles.csv` には、note 側で 404 / 削除 / 非公開になっている記事が含まれる可能性があります。

`cache_note_html.py` は 404 で全体を止めない方針です。

---

## 次にやるとよい作業

優先度順のおすすめです。

1. `source_documents.json` の軽量化
2. 公式データの選手マッチング精度向上（現在は display_name 一致、77人中71人がマッチ）
3. Numbers データの更なる突合（対戦カードの不一致検出など）
4. 王座変遷の精度向上
5. UI のアクセシビリティ改善
6. キーボードナビ: `u` で前の状態に戻る（ナビゲーション履歴）

---

## 再開時の推奨手順

1. 最新の `master` を pull する
2. `make check` を実行する
3. `make clean-generated` を実行する
4. Pages / Actions の状態を確認する
5. 次タスクへ進む

```bash
git pull
make check
make clean-generated
```

---

## 作業者への注意

このプロジェクトでは「正しそうだから埋める」よりも、「不明なものを不明として残す」ことを優先してください。

特に試合結果は、後で参照される重要データなので、曖昧な抽出結果をそのまま勝敗として反映しないでください。
