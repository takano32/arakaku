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

**通常ビュー（PUBLIC_TABS）:**

- 公式 view（公式ページ + 公式ニュース）
- 試合 view
- 選手 view
- 大会 view
- 団体 view
- 王座 view
- 動画 view

**管理ビュー（ADMIN_TABS）:**

- 出典本文 view
- 出典言及 view
- 名鑑選手 view
- 名前対応 view
- 名鑑記録 view
- 公式選手 view
- 公式 view（officialMisc: トーナメント・試合・沿革）

**共通:**

- 試合・大会・動画カードの関連出典候補
- note本文リンクと動画リンクの `▶ 詳細` / `▼ 詳細` 展開

---

## 現在の主なデータ規模

行数は随時変化するため固定の数値表は持ちません。最新の件数はソース CSV を直接数えて確認してください。`source_documents.csv` などは本文内に改行を含むため、`wc -l` ではなく CSV パーサで行を数えます。

```bash
python - <<'PY'
import csv, glob, os

for path in sorted(glob.glob("data-src/*.csv") + glob.glob("data-src/archives/*.csv")):
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    print(os.path.relpath(path, "data-src"), len(rows), "rows")
PY
```

`source_documents.csv` の `source_type` 分布、`source_mentions.csv` の `mention_type` 分布の確認方法は `OPERATIONS_CHECKLIST.md` の「本文DB更新時」を参照してください。

---

## 直近で追加・整備したもの

### Phase 19: コード構造・保守性の整理 (2026-06-13)

性能は出し切ったため、コード構造・品質の軸を調査。**モノリス分割は不要**（viewer は大きいが凝集している）と正直に判定し、確実な低リスク改善のみ実施。

- **完全な dead code を削除**（`data-repository.js` / `data-enricher.js`）: どこからも参照されない 7 つの rich getter（`richFighterSnapshots` / `richBoutParticipants` / `richVideoLinks` / `richArticleLinks` / `richSource{Event,Bout,Video}References`）と、それぞれの private フィールド宣言＋コンストラクタ／`invalidate()` 二重リセット、孤立した 7 つの pass-through enricher、孤立した `#officialPlayerFor` を削除。**live なものは厳密に温存**（`richArticles`←`findRichArticle`、`richSourceMentions`/`enrichSourceMention`、`richPromotions`/`enrichPromotion`、`#applyOfficialPlayer`、全プレーン getter）。各シンボルの参照ゼロを grep で確認してから削除
- **`itemPassesFilters` の Node ユニットテスト追加**（`scripts/test_filters.mjs`）: 11 タブのクライアント側フィルタの中核（単一/配列フィールド・「その他」・`forceOther`・複数グループ AND）が無テストだった。純関数なので依存ゼロの `node:test` で 8 ケース検証し、`make validate` に組込み。viewer 初の JS ユニットテストの足場で、将来のフィルタ変更を de-risk
- **最後のインライン label マップを LabelRegistry へ**（`tab-renderers.js` → `label-registry.js`）: `#articleTypeLabel` を `LabelRegistry.articleType()` に移管（他の全ラベルは既に LabelRegistry 経由）。マッピングはバイト同一

調査の結論（doNot に従い変更なし）: tab-renderers.js（817 行）の分割は dead code も循環結合も無く DOM テストも無いため挙動保存リスクのみで却下。rich getter のメモ化ヘルパー化・merge/lineage/sourceDocLookup の関数抽出・view-controller/query-matcher の分割・createElement→template の整形・Python の VALID_VIDEO_TYPES 統合はいずれも churn として却下。

### Phase 18: 初回描画クリティカルパス (CDN・フォント) (2026-06-13)

データロード以外の性能領域（Service Worker・初回描画・ペイロード）を調査し、初回描画クリティカルパス上の CDN/フォント依存を解消しました。

- **`@tanstack/virtual-core` を動的 import 化**（`virtual-list.js`）: 旧実装は `virtual-list.js` 冒頭の **static** `import ... from "https://esm.sh/@tanstack/virtual-core@3"` で、起動モジュールグラフ（`main.js` → `tab-registry` → `virtual-list`）が esm.sh の cold ラウンドトリップで評価ブロックされ、`main.js` トップレベル（`dataLoader.load()` = Phase 0 開始）すら待たされていた（lite-youtube-embed では既に動的化済みだったが virtual-core だけ漏れていた）。`Virtualizer`/`windowScroll` はコンストラクタでは使われず描画時のみのため、動的 import＋モジュール評価時の先行起動に変更し、Phase 0 データ取得と並行化。`#virtualizerGen` 世代ガードで未ロード中に setItems が複数回来ても二重生成しない。CDN 障害時は `.catch` で unhandled rejection を防ぎリトライ可能にし、リストは「読み込み中…」で待機（旧 static import はグラフ全体を失敗させアプリ起動不能だった → 退行モードが改善）
- **リソースヒント追加**（`index.html`）: `esm.sh` / `fonts.googleapis.com` / `fonts.gstatic.com` への `preconnect`（cold 接続で各 ~1 RTT 短縮）
- **Google Fonts の `@import` チェーン解消**（`style.css` → `index.html`）: `style.css` 冒頭の `@import` はレンダーブロッキングな CSS の後段に連鎖した別オリジン要求で first paint を遅らせていた。`index.html` の `<link>`（preconnect 付き）に移し HTML パース時点から並行取得に。`display=swap` と system-ui フォールバックは維持

調査の結論（doNot に従い変更なし）: 生成 JSON の minify は gzip がインデントをほぼ吸収（節約 4.5〜6.7%）し安定 diff を壊すため不可。SW のアプリシェル precache はデプロイ時キャッシュバスティングが無いと stale JS を恒久配信するリスクがあり見送り（HTTP キャッシュで再訪は十分高速）。PWA manifest・critical CSS インライン・header.webp preload・modulepreload はノイズフロア以下。

### Phase 17: 通信タブを本文ロード待ちから解放 (2026-06-13)

ロード後の挙動（オンデマンド遅延ロード／インタラクション）を調査し、公開「通信」タブの体感を改善しました。

- **通信（tsushin）タブを `sourceDocumentBodies`（~557KB）の完了待ちから解放**（`view-controller.js`）: 旧実装は `REQUIRED_TAB_DATA_KEYS.tsushin = ["sourceDocuments", "sourceDocumentBodies"]` で、本文ファイル全ダウンロード完了まで「読み込み待ち」プレースホルダのみ表示し、リストを 1 件も描画しなかった。しかし `source_documents`（Phase 2 eager）に全 120 note 記事の `content_preview` があり、`renderNoteArticleCard` は `content_text` 不在時に preview へフォールバックする。`REQUIRED` から `sourceDocumentBodies` を外し（`["sourceDocuments"]` に）、リストを即座に preview で描画。本文は `TAB_DATA_KEYS.tsushin` 経由の `loadForTab` で届き次第、各カードにインライン追補される（プログレッシブ）。`TAB_DATA_KEYS` は変更せず本文ロード自体は継続

調査で確認した「現状で十分」な点（doNot に従い変更なし）: 検索ホットパスは `#cachedText`（revision キャッシュ）でウォーム、検索キーストロークは invalidate を起こさず substring 照合のみ。タブ切替/フォーカスのゲートも正しく機能。`itemsSource` スキップをデータタブへ拡張するのはフィルタ/検索で items が変わるため無意味。未メモ化フィルタ 3 種は現データ規模ではノイズフロア以下。

### Phase 16: Phase 2 enrichment/参照ロードの最適化 (2026-06-13)

公開タブの enrichment（名鑑/公式バッジ・出典候補ブロック）の到着を早めました。調査で、`load()` が `await #loadEnrichment()` してから `await loadPublicReferences()` する**二段ゲート**のため、公開タブの試合/大会/動画カードが使う ~1.5MB の `source*References` が、管理専用の `source_mentions`（~1MB）を含む enrichment 全完了まで開始すらしないと判明。

- **enrichment と公開参照を 1 並列プールに統合**（`data-loader.js`）: `Promise.all([#loadEnrichment(), loadPublicReferences()])`。参照データが enrichment の完了を待たず並行ダウンロードされ、公開データの readiness が約 57% 早まる（6 接続上限の FIFO モデル）。参照は enricher の入力ではない独立データなので並列化は安全
- **`source_mentions`（~1MB・最大ファイル）を eager から除去**（`config.js`）: 消費者を全列挙し管理「出典言及」タブ専用と確認。`TAB_DATA_KEYS`/`REQUIRED_TAB_DATA_KEYS` 経由でタブを開いた時に遅延ロード（既存のローディングカードがカバー）。唯一の公開フォールバック（出典参照の無い動画の概要欄件数バッジ）は `source-renderers.js` で `loadedDataKeys.has("sourceMentions")` ガードし、未ロード時はバッジ非表示（件数 0 の誤表示を回避）
- **未使用 `metadata` を eager から除去**（`config.js`）: viewer 未参照かつ object を配列 SAX で `[]` に誤パースする既存バグ（aliases/titleReigns と同類）

非公開タブのみを見るユーザーは ~1MB を一切ダウンロードしなくなります。`source_documents`・`source*References`・`official_tournaments` は公開タブ（通信タブ・動画/記事詳細・試合/大会の出典候補・公式バッジ）が参照するため eager 維持（調査の doNot に従う）。

### Phase 15: Phase 1 ストリーミングの描画コスト削減 (2026-06-13)

PRIMARY ストリーミング（Phase 1）中の無駄な再描画を削減しました。マルチエージェント調査で、`invalidate()` 自体はほぼ無料（~0.5µs）だが、**`renderSummary()` が毎 patch で無条件に `repo.richBouts/richFighters/richVideos` を読み**、公式タブ表示中でも 3 つの rich コレクションを毎フラッシュ再構築（約 4ms × 37〜180 回）していたのが支配的コストと判明。

- **renderSummary から rich ビルドを排除**（`view-controller.js`）: 試合・動画の件数は enrich で増減しない（`richBouts.length === bouts.length`、`richVideos.length === videos.length`。rich は reverse + 並べ替えのみ）ため生配列長 `d.bouts.length` / `d.videos.length` を使用。選手だけは名鑑/公式由来の選手発見と重複統合で件数が変わるため、確定キー（`fighters` + `numbersFighters` + `numbersNameMatches` + `officialPlayers`）が揃うまで生 `fighters.length` を表示し、揃ってから `richFighters.length`。これによりストリーミング中の richFighters 再構築（名鑑/公式が未ロードで件数が誤る中間状態）を回避（最終表示値は不変）
- **patch 通知の rAF コアレッシング**（`data-loader.js`）: 13 並列キーが flush ごとに `state.patch({})` していたのを、`#schedulePatch()` で 1 フレーム 1 回にまとめる。`invalidate()` はフラッシュ毎に必要なので残置。`requestAnimationFrame` の無い Node/テストでは即時 patch で従来挙動を保つ。各フェーズ末尾の確定 patch は直接呼び出しのまま（最終描画を保証）
- **renderViewModeSwitch の再構築ガード**（`view-controller.js`）: viewMode 不変かつ既に描画済みなら innerHTML 再構築をスキップ
- **未使用 PRIMARY キーの除去**（`config.js`）: `aliases` は object 形式を配列 SAX に通して `[]` に誤パースされる既存バグ（選手別名は fighters.json に焼き込み済み・top-level aliases は未参照）かつ未使用。`titleReigns` も base getter のみで呼び出し元なし（系譜は titles.json の lineage に焼き込み済み）。両者を PRIMARY から除去し、ストリーム対象を 13→11 に。データファイル自体は `DATA_FILES` に残し再利用可能
- **`#streamKeySafe` による失敗封じ込めの統一**（`data-loader.js`）: Phase 1 だけにあった per-key `.catch`（fallback + dataLoadErrors + loaded 扱い）をヘルパー化し、Phase 2（`#loadEnrichment`）・`loadPublicReferences`・`loadForTab` にも適用。1 ファイルの異常（body=null・CDN/parse 例外など）が `Promise.all` 全体を reject して `load()` を落とし viewer 全画面エラーになる経路を解消（前回 Phase 0 レビューでも指摘されていた非対称の解消）

### Phase 14: 初期タブ (公式) の最優先ロード (2026-06-13)

初期画面である「公式」タブを最速で描画するため、`DataLoader.load()` に Phase 0 を追加しました。

- `INITIAL_TAB_DATA_KEYS = ["officialPages", "officialNews"]` を `config.js` に新設し、`ENRICHMENT_DATA_KEYS` から除去（二重ロード防止）
- Phase 0 は PRIMARY 13 ファイル（数 MB）より**先に単独で**この 2 ファイル（合計 ~16KB）をロード。従来は全 PRIMARY 完了後の Phase 2 でようやくロードされていた
- 16KB にストリーミングは不要なため `loadKeys()`（plain fetch + `JSON.parse`）を使用。`@streamparser/json` の CDN import 完了を待たないことが最速経路。CDN import 自体は Phase 0 開始時に `getJSONParser()` を await なしで発火して裏で温め、Phase 1 の開始遅延を相殺
- `CORE_DATA_KEYS` に `INITIAL_TAB_DATA_KEYS` を追加（`validate_json.js` の `load()` 網羅 assert が新キーをカバー）
- 公式タブの描画は `repo.officialPages` / `repo.officialNews`（base-repository の直接アクセサ）のみに依存するため、PRIMARY 不要で即描画できる

#### 敵対的レビューで検出した退行の修正（同日）

- `fetchJsonText` が HTTP エラーで黙って fallback を返し公式タブが無言で空白になる退行 → `!response.ok` で throw し、`loadKeys` がキー単位で fallback + `dataLoadErrors` 記録 + loaded 扱いに統一（`#streamKey` と同じ意味論、「データ読み込み失敗」カードに表示される）。`required=true`（`loadAll`）は従来どおり即 throw
- await なしの `getJSONParser()` ウォームアップが Phase 0 中に unhandled rejection を起こしうる退行 → `.catch(() => {})` を付与
- 既存問題も同時修正: `#streamKey` の `await getJSONParser()` が CDN 障害時に `load()` 全体を reject させ、描画済みの公式タブごと全画面エラーで消していた → `.catch(() => null)` で通常 fetch+parse にフォールバック
- 既存問題: `main.js` の `lite-youtube-embed` 静的 CDN import が boot（Phase 0 含む）全体をブロック → await しない動的 import に変更（カスタム要素は後から定義されても自動アップグレードされる）
- ストリーミング中の flush ごとに公式タブが同一内容で再描画され、開いた `<details>` が閉じる問題 → descriptor に任意フィールド `itemsSource`（描画元の生配列）を追加し、参照同一なら再描画をスキップ（`tab-registry.js`、公式タブのみ宣言）
- `validate_json.js` に `officialPages` / `officialNews` の配列・非空 assert を追加。なお `load()` のキー網羅 assert がストリーミングキーに対して実質無効な既存問題は `NEXT_TASKS.md` P2 に記録

### Phase 13: 共有テキスト解析モジュール・ビルド最適化 (2026-06-13)

#### scripts/arakaku/textparse.py 新設（重複排除）

複数スクリプトで挙動が完全に一致していたテキスト解析コードを共有モジュールに集約しました。

- `normalize_digits` / `TIME_RE` / `infer_time`: `extract_note_structured_results.py` と `make_source_mention_result_candidates.py` で同一定義だったものを統合
- `find_method(text, patterns)`: 両スクリプトの `infer_method` の同一ロジックを汎用化（`METHOD_PATTERNS` 自体は語彙が意図的に異なるため各スクリプトに残置）
- `NOTE_URL_RE` / `YOUTUBE_URL_RE` / `VS_RE`: `build_source_documents.py` と `import_youtube_descriptions.py` で同一だった URL/対戦表記の正規表現を統合
- **残置の方針**: `METHOD_PATTERNS`・`ROUND_RE`（`終了` 対応の有無）・`EVENT_RE`・`RESULT_RE` は語彙がスクリプトごとに意図的に異なるため共有化しない
- 編集前ロジックを同一入力で再実行し、出力がバイト単位で一致することを確認済み（挙動保存）

#### 追加の重複排除（敵対的レビューで検出）

マルチエージェントの敵対的検証で見つかった残り重複も統合しました。

- `note_cache_name()` を `arakaku/utils.py` に新設: `tmp/note-html/` のキャッシュファイル名契約。writer (`cache_note_html.py`) と reader (`build_source_documents.py`) が同一関数を二重定義していた（片方だけ変えるとキャッシュ参照が静かに壊れる）
- `build_bout_fighter_names()` を `arakaku/mapping.py` へ: `make_source_reference_candidates.py` と `make_structured_result_patch_candidates.py` で同一定義だった bout_id → (red, blue) 名マッピング
- `line_number()` を `arakaku/utils.py` へ: `make_source_mention_result_candidates.py` と `make_source_reference_candidates.py` で同一定義
- `rows()` ラッパー（`build_json.py` / `build_numbers_json.py` の 2 行関数）は局所的な糖衣として意図的に残置
- 共有化した各関数は実データで新旧の出力一致を assert で確認済み

#### build_json.py の CSV 再読込解消

- モジュールレベルで読込済みの `ARTICLE_LINKS` / `BOUT_PARTICIPANTS` / `TITLE_REIGNS` / `VIDEO_LINKS` / `ALIASES` を `JSON_BUILDERS` 内で再読込していた箇所を定数参照に変更
- `source_documents.csv` の 2 回読込を `SOURCE_DOCUMENTS` 1 回に統合
- 生成 JSON は md5 比較でバイト同一を確認済み

#### viewer: Markdown コンパイラ分離

- `tabs/tab-renderers.js` 冒頭の `mdToHtml` / `mdToHtmlCompile`（約 40 行）を `docs/assets/js/ui/markdown.js` に移動し import に置換（タブ描画と独立した純関数のため）

#### review CSV の鮮度ズレ解消

- `review/note_structured_results.csv` / `source_mention_result_candidates.csv` / `youtube_description_candidates.csv` を再生成。差分は (1) `write_csv` の `lineterminator="\n"` 化以降の改行コード追従、(2) 更新済み `source_documents.csv` への入力データ追従のみで、抽出ロジックの変化はなし

### Phase 12: ビルド整理・ストリーミング統一・UI改善 (2026-05-29)

#### ビルドスクリプト分割・整理

- `build_numbers_json.py` を新設し `build_json.py` から numbers ビルダーを分離
- `build-official` Makefile ターゲットを廃止し `build` ターゲットに統合
- CI (`pages.yml` / `test.yml`) を `make build` 一本に統一
- `make build` = `build_json.py` + `build_numbers_json.py` + `build_official_json.py` + `build_official_pages_json.py`

#### 全データキーのストリーミング統一

すべてのデータキーが `#streamKey()` SAX ストリーミングに統一されました。

- `ENRICHMENT_DATA_KEYS`: バッチロードから `#streamKey()` 並列に変更（管理タブのデータが届き次第表示）
- `TAB_DATA_KEYS`: `loadKeys()` から `#streamKey()` に変更
- `PUBLIC_REFERENCE_DATA_KEYS`: `loadPublicReferences()` も `#streamKey()` 並列に変更
- `officialPages` / `officialNews` を `ENRICHMENT_DATA_KEYS` に移動（タブクリック前から Phase 2 でロード開始）
- CDN import の Node.js 互換: `getJSONParser()` と `marked` に `typeof window` ガードを追加（Node.js v26 対応）

#### 空状態の改善

- `VirtualList` に `#loading` フラグを追加。ロード中は「読み込み中...」、ロード完了後の空は空欄（メッセージなし）
- `TabRendererRegistry` で `loadingDataKeys.size > 0` を判定して VirtualList に通知

#### marked CDN 廃止

- `marked`（esm.sh CDN）を削除し、自前 `mdToHtml()` 関数（約30行）に置き換え
- ニュース記事2件・基本 Markdown のみという実態に対して CDN fetch は過剰だったため
- CDN ライブラリ3つの深堀り評価: `@streamparser/json`・`@tanstack/virtual-core@3`・`lite-youtube-embed` は全て維持

#### 「公式」タブ UI 改善

- ページ（アラカクとは・歴史の流れ）を `<details>` で折りたたみ表示
  - summary をボタン風（背景色・角丸）にスタイリング、▶ が 90° 回転して開閉を示す
  - ニュース記事は末尾にそのまま表示
- フッターに「公式サイト」（kobayashi856.github.io/arakaku-site/）と「YouTube」を追加

---

### Phase 11: 管理ビュー拡張・公式ドキュメントタブ・Safari バグ修正 (2026-05-29)

#### 管理ビュー 5タブ追加

管理ビュー（ADMIN_TABS）に名鑑・公式由来のタブを追加しました。

- **名鑑選手**（`numbersFighters`）: 選手プロフィール・マッチング状況
- **名前対応**（`numbersNameMatches`）: Numbers 名 → fighters.csv ID のマッピング・信頼度
- **名鑑記録**（`numbersFightRecords`）: 個人成績シートの試合記録・bout 対応状況
- **公式選手**（`officialPlayers`）: 公式サイト選手データ
- **公式**（`officialMisc`）: official_tournaments + official_matches + official_history を type バッジ付きで混在表示

`officialMisc` という ID 名は、将来 PUBLIC_TABS に `official` を追加したときの衝突を避けるために選定。

#### Safari replaceState レート制限バグ修正

`docs/assets/js/core/url-sync.js` の `writeToURL()` を修正しました。

- **問題**: `state.patch({})` がストリーミング中に 30件ごと・50ms ごとに呼ばれ、その都度 `history.replaceState()` が走っていた。Safari は 10秒あたり 100回の制限があり超過していた。
- **修正**: 前回書いた URL と同じ文字列なら `replaceState` をスキップするよう `_lastSearch` キャッシュを追加。URL に関係するのはユーザー操作（tab/query/focus）だけであり、データロード状態変化では URL は変わらないため、これで十分に抑制できる。

#### 公式ドキュメント CSV/JSON パイプライン

`tmp/arakaku-site` 内の Markdown・Astro ドキュメントを CSV/JSON 化するパイプラインを追加しました。

- **`scripts/generate_official_pages_csv.py`** (stage-2):
  - `content/news/*.md` → `data-src/official_news.csv`（slug, title, date, category, summary, body_md）
  - `pages/about.astro`, `pages/history.astro` → `data-src/official_pages.csv`（slug, title, description, body_html）
  - Astro 固有構文除去：Tailwind class, frontmatter, JSX map 式展開, `{base}` 補間
- **`scripts/build_official_pages_json.py`** (`make build`):
  - CSV → `docs/data/official_news.json` / `docs/data/official_pages.json`
  - `tmp/arakaku-site/public/` の画像を Base64 データ URI として埋め込む
- **`scripts/download_official_data.sh`**: `public/` ディレクトリも取得するよう拡張
- `maxbout.astro`（データ駆動）と `index.astro`（ナビ専用）は対象外

#### 通常ビュー「公式」タブ追加

PUBLIC_TABS の先頭（左端）に `["official", "公式"]` を追加しました。

- `official_pages`（about・history HTML）と `official_news`（Markdown）をタブ切替時に遅延ロード（`TAB_DATA_KEYS.official`）
- Markdown レンダリングに `marked`（esm.sh CDN）を使用
  - Node.js が `https:` 静的 import を解釈できないため、module-level dynamic import + `.catch(() => {})` パターンで lazy 初期化
  - ロード前はエスケープテキストで fallback 表示
- キーボードショートカットのヒントを `1〜6` → `1〜7` に更新
- タブ数が増えたため、将来「公式ページ」「公式ニュース」への分割を NEXT_TASKS.md に記録済み

---

### Phase 10: 公式データ統合・UI改善・キーボードナビゲーション (2026-05-29)

#### 公式データパイプライン

`kobayashi856/arakaku-site` リポジトリから公式サイトデータを取得し、enrichment に使う体制を整えました。

- `scripts/download_official_data.sh`: GitHub API 経由で `tmp/arakaku-site/` にダウンロード（`make cache-sources` に組み込み）
- `scripts/generate_official_csvs.py`: `tmp/arakaku-site/src/data/*.json` → `data-src/official_*.csv`（stage-1）
- `scripts/build_official_json.py`: `data-src/official_*.csv` → `docs/data/official_players.json`, `docs/data/official_tournaments.json`（`make build`）
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
| `1`〜`7` | タブ直接切り替え |
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
- **Python スクリプトのモジュール化**: `scripts/arakaku/` パッケージを新設し、`mapping.py`, `utils.py`, `validation.py` にロジックを整理しました。
- **ビルドプロセスの簡素化**: `build_json.py` のマッピングロジックを外部モジュール化し、メンテナンス性を向上させました。

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
```

`bouts.csv` は bout-level facts、`bout_participants.csv` は参加者と参加者ごとの result、`titles.csv` は王座本体、`title_reigns.csv` は王座履歴を持ちます。各テーブルは `build_json.py` がテーブルごとの JSON（`bouts.json` / `bout_participants.json` / `title_reigns.json` 等）として生成します。

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

Numbers 由来三テーブルの JSON（`numbers_fighters.json`、`numbers_name_matches.json`、`numbers_fight_records.json`）は `build_numbers_json.py` が生成します。`docs/assets/js/data-loader.js` がこれらをロードし、管理ビューの名鑑タブと `data-enricher.js` のクライアントサイド突合に使います。

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

### source_documents.json の本文分離（対応済み）

本文を含めると `source_documents.json` が肥大化するため、本文は別ファイルに分離済みです。

- `source_documents.json`: `content_text` を除いた軽量インデックス（メタデータ + preview）。エンリッチメントで通常ロードされる。
- `source_document_bodies.json`: `{source_id, content_text}` のみの本文本体。`data-loader.js` の `TAB_DATA_KEYS`（`tsushin` / `sources` タブ）で必要時に遅延ロードされる（`mentions` タブは `sourceDocuments` / `sourceMentions` を遅延ロード）。

これにより初期ロードに全文を載せず、出典本文・通信タブを開いたときだけ本文を取得します。今後本文量がさらに増える場合は、本文側のページング等を追加検討してください。

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

優先度順のおすすめです。詳細は `NEXT_TASKS.md` を参照。

1. 公式データの選手マッチング精度向上（display_name 完全一致 + 表記ゆれ正規化で、official_players.csv 106人中99人がマッチ。残り7人は表記差で未一致）
2. 公式ページ・ニュースが増えたら「公式ページ」「公式ニュース」タブに分割（NEXT_TASKS.md 参照）
3. Numbers データの更なる突合（対戦カードの不一致検出など）
4. 王座変遷の精度向上

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
