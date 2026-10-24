# ビューア機能一覧（T.56 リビルドの機能マップ）

T.56「ビューアを今の見た目にとらわれずに作り直す（機能は残す）」のために、リビルド前のビューア（`docs/index.html` / `docs/assets/style.css` / `docs/assets/js/**`、約 6,400 行）が持っていた利用者から見える機能とデータ側の振る舞いをすべて洗い出した一覧です。

- 「旧実装」はリビルド前にその機能が置かれていた場所です。
- 「新実装」「状態」の列は T.56.2 / T.56.3 で埋めます。状態は `未検証` / `検証済` / `変更`（意図して形を変えた。理由を備考に書く）/ `廃止`（理由を備考に書く）のいずれかです。

## A. 画面構成・ナビゲーション

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| A1 | ヘッダ（タイトル「Unofficial ARAKAKU Database」、ロゴ画像 `header.webp`、GitHub リボン） | `index.html`, `style.css` | | 未検証 | |
| A2 | サマリー件数 8 項目（団体・大会・試合・選手・王座・動画・出典・出典候補）。未ロードは `...`。選手は fighters/numbersFighters/numbersNameMatches/officialPlayers が揃ってから `richFighters.length`、大会・試合は numbersFightRecords ロード後に名鑑のみ分を加算 | `view-controller.js renderSummary` | | 未検証 | |
| A3 | 通常ビューのタブ 8 個: 公式 / 通信 / 試合 / 選手 / 大会 / 団体 / 王座 / 動画（この順がキーボード 1〜8） | `config.js PUBLIC_TABS`, `view-controller.js renderTabs` | | 未検証 | |
| A4 | 管理ビューのタブ 7 個: 出典本文 / 出典言及 / 名鑑選手 / 名前対応 / 名鑑記録 / 公式選手 / 公式 | `config.js ADMIN_TABS` | | 未検証 | |
| A5 | 通常ビュー / 管理ビューの切替。離れる前の各ビューの最後のタブを記憶して復元 | `event-controller.js (#prevPublicTab / #prevAdminTab)`, `view-controller.js renderViewModeSwitch` | | 未検証 | |
| A6 | 既定タブは公式（`DEFAULT_TAB`）、管理ビューの既定は出典本文 | `config.js` | | 未検証 | |
| A7 | 未知のタブ ID は既定タブにフォールバック | `tab-registry.js renderTo` | | 未検証 | |
| A8 | フッタの外部リンク（公式サイト / アラカク通信のーと / YouTube） | `index.html` | | 未検証 | |
| A9 | タブ構成が同じときは DOM を再構築せず active クラスだけ更新（フォーカスを保つ） | `view-controller.js renderTabs / renderViewModeSwitch` | | 未検証 | |

## B. 検索・絞り込み

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| B1 | フリーテキスト検索（150ms デバウンス、✕ クリアボタン、Esc でクリア、入力時にフォーカス状態を解除） | `event-controller.js`, `index.html #search` | | 未検証 | |
| B2 | 部分一致検索（小文字化した連結文字列に対する includes） | `query-matcher.js #matchQuery` | | 未検証 | |
| B3 | 選手の検索対象: 表示名・別名・階級・団体 ID・身長・年齢・所属・概要・出典記事 ID・推定元動画 ID・推定信頼度・出典別プロフィール各項目 | `query-matcher.js fighterMatches` | | 未検証 | |
| B4 | 試合の検索対象: bout_id・対戦カード・勝者・敗者・階級・weight_class_id・種別・出典記事 ID・結果状態・推定元動画 ID/タイトル・信頼度・メモ・選手名・王座情報・大会名・団体名・決着（raw/normalized）・出典候補テキスト | `query-matcher.js boutSearchText` | | 未検証 | |
| B5 | 大会の検索対象: 名前・ID・種別・出典記事 ID・動画 ID・推定元・信頼度・概要・団体名・出典候補テキスト | `query-matcher.js eventMatches` | | 未検証 | |
| B6 | 団体の検索対象: 名前・英字名・ID・カテゴリ・範囲・概要・出典記事 ID・所属大会 ID/名・王座表示名 | `query-matcher.js promotionMatches` | | 未検証 | |
| B7 | 動画の検索対象: アーカイブ補完後のタイトル・原題・ID・URL・投稿者・投稿日・概要欄・platform・公式状態・種別・紐づけ状態・メモ・重複情報・出典記事 ID・出典参照/本文のプレビュー・matched_texts | `query-matcher.js videoMatches` | | 未検証 | |
| B8 | 王座の検索対象: title_id・階級・団体名・歴代（選手名・代ラベル・獲得/喪失大会 ID・出典 ID） | `query-matcher.js titleMatches` | | 未検証 | |
| B9 | 出典言及の検索対象: 種別・entity_type・hint・matched_text・context・source_id・ref・confidence・notes・出典本文のタイトル/URL。mention_type フィルタも同時に適用 | `query-matcher.js mentionMatches` | | 未検証 | |
| B10 | 出典本文の検索対象: タイトル・URL・種別・ref・プレビュー・本文・notes | `query-matcher.js sourceDocumentMatches` | | 未検証 | |
| B11 | 検索テキストのキャッシュは `repo.revision` が進むと破棄 | `query-matcher.js #cachedText` | | 未検証 | |
| B12 | タブ別の絞り込みボタン（`TAB_FILTERS`）: 選手=階級/団体、試合=階級/団体、王座=階級/団体、大会=団体/種別、団体=区分、動画=階級/団体、通信=階級/団体、出典本文=種別、名鑑選手=階級/団体、名鑑記録=階級/団体、公式選手=階級/団体 | `filters.js TAB_FILTERS`, `view-controller.js renderTabFilters` | | 未検証 | |
| B13 | フィルタの URL/状態トークンは英語（`lightweight` / `target` / `other` など）、ボタン表示は日本語、実データ値は `match` | `filters.js` | | 未検証 | |
| B14 | 「その他」バケット: 既知の選択肢に一致しない値、または `forceOther`（選手の最小登録）を通す | `filters.js itemPassesFilters`, `reliability.js isMinimalFighter` | | 未検証 | |
| B15 | 配列フィールド（通信記事の `divisions`）はいずれかが一致すれば通過 | `filters.js itemPassesFilters` | | 未検証 | |
| B16 | 派生フィルタ項目: 動画の `promotion_id`/`division`（video_links → bout/event）、通信記事の `promotion_id`（article）と `divisions`（article_links → bout）、公式選手の `promotion_id`（organization → promotionIdByName） | `data-enricher.js enrichVideo`, `tab-renderers.js #withNoteFilterFields / officialPlayers` | | 未検証 | |
| B17 | 同じフィルタボタンの再クリックで解除（トグル） | `event-controller.js` | | 未検証 | |
| B18 | 出典言及の種別セレクト（`MENTION_TYPE_ORDER` → 日本語ロケール順、ラベルは「日本語 / コード」） | `view-controller.js renderMentionFilters / sortedMentionTypes`, `index.html #mention-type-filter` | | 未検証 | |
| B19 | `itemPassesFilters` の Node ユニットテスト | `scripts/test_filters.mjs` | | 未検証 | |

## C. URL 同期・共有リンク

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| C1 | URL パラメータ ↔ 状態の対応表 `PARAM_MAP`（tab, q, fighter, event, title_promo, title_div, mention, fighter_div, fighter_promo, bout_div, bout_promo, event_promo, event_type, promo_cat, video_div, video_promo, tsushin_div, tsushin_promo, src_type, nf_div, nf_promo, nr_div, nr_promo, op_div, op_promo） | `core/url-sync.js` | | 未検証 | 既存の共有リンク（例 `?tab=events&event=max-bout-special-1`、`?tab=fighters&fighter=kabei`、`?tab=titles&title_promo=target`）が解決できること |
| C2 | 起動時に URL から状態を復元し、検索ボックスにも反映 | `main.js`, `url-sync.js readFromURL` | | 未検証 | |
| C3 | 状態変化のたびに `history.replaceState` で URL を更新（履歴を増やさない。既定値は省略。同じ URL なら書き込まない） | `url-sync.js writeToURL` | | 未検証 | |

## D. 遷移・フォーカス

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| D1 | 選手名リンク → 選手タブへ移動し、その選手だけを表示（通常ビューに戻し、大会フォーカスを解除、検索ボックスに選手名を入れ、先頭へスクロール） | `ui/navigation.js jumpToFighter`, `event-controller.js (#content click)` | | 未検証 | |
| D2 | 大会名リンク → 大会タブへ移動し、その大会だけを表示（同上） | `ui/navigation.js jumpToEvent` | | 未検証 | |
| D3 | フォーカス中は該当 1 件のみを表示（`focusedOrFiltered`）。見つからなければ空 | `tabs/tab-renderers.js focusedOrFiltered` | | 未検証 | |
| D4 | フォーカス変化時は先頭へスクロール。タブ切替・検索入力でフォーカス解除 | `tabs/tab-registry.js`, `event-controller.js`, `ui/keyboard-nav.js` | | 未検証 | |
| D5 | 対戦カード表記の優先順位: `fighters[]` → `fighter_a/b` → 勝者/敗者 → `matchup` 文字列 → `bout_id` | `ui/navigation.js boutMatchup` | | 未検証 | |
| D6 | 結果サマリ「A def. B」（`result_status=unknown` のときは出さない） | `ui/navigation.js renderBoutResultSummary` | | 未検証 | |
| D7 | 選手リンク・大会リンクの表示名は repo の現在名（統合後の表示名）を優先し、無ければ fallback 名 | `ui/navigation.js fighterLink / eventLink` | | 未検証 | |

## E. データ読み込み

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| E1 | `DATA_FILES`（31 ファイル）が `docs/data/*.json` と 1:1 | `config.js DATA_FILES` | | 未検証 | |
| E2 | フェーズ分割ロード: Phase 0 = 初期タブ（officialPages/officialNews、先に単独で取得して公式タブを描画）→ Phase 1 = PRIMARY 11 ファイル並列 → Phase 2 = ENRICHMENT 10 ファイル + 公開参照 3 ファイルを 1 つの並列プールで取得 | `data-loader.js load`, `config.js INITIAL_TAB_DATA_KEYS / PRIMARY_DATA_KEYS / ENRICHMENT_DATA_KEYS`, `data-loader.js PUBLIC_REFERENCE_DATA_KEYS` | | 未検証 | |
| E3 | 配列 JSON の SAX ストリーミング（`@streamparser/json`、flush ごとに `repository.invalidate()` + 1 フレーム 1 回に束ねた再描画、最初の flush は即時、以降 200ms スロットル） | `data-loader.js #streamKey / #schedulePatch` | | 未検証 | |
| E4 | タブを開いたときだけ読む重いデータ `TAB_DATA_KEYS`（通信=本文、出典本文=文書+本文、出典言及=文書+言及） | `data-loader.js TAB_DATA_KEYS / loadForTab` | | 未検証 | |
| E5 | 描画ゲート `REQUIRED_TAB_DATA_KEYS`（通信=sourceDocuments、出典本文=sourceDocuments、出典言及=sourceDocuments+sourceMentions）。読込中は「読み込み中」、未着は「読み込み待ち」のプレースホルダ。通信タブは本文（557KB）を待たずプレビューで先に描画し、本文到着後に差し替え | `view-controller.js renderContent`, `tab-renderers.js renderNoteArticleCard` | | 未検証 | |
| E6 | 失敗時の扱いはキー単位で統一: fallback 値 + `dataLoadErrors[key]` + `loadedDataKeys` に追加（1 ファイルの失敗で全体を止めない）。HTTP エラーは握りつぶさず記録 | `data-loader.js #streamKeySafe / loadKeys` | | 未検証 | |
| E7 | 「データ読み込み失敗」カード（`role="alert"`、ファイル名とメッセージを列挙。失敗が無ければ非表示） | `view-controller.js renderDataLoadErrors`, `index.html #data-load-errors` | | 未検証 | |
| E8 | 致命的失敗（`load()` 自体の reject）は本文領域に「読み込みに失敗しました」カード | `event-controller.js renderLoadError`, `main.js` | | 未検証 | |
| E9 | 空フォールバックの形: `aliases` / `metadata` はオブジェクト、それ以外は配列 | `core/data-parser.js` | | 未検証 | |
| E10 | Repository はシングルトン。データ差し替え後は `invalidate()` で rich キャッシュ・インデックス・enricher キャッシュ・メモを破棄し、単調増加の `revision` を進める | `core/data-repository.js` | | 未検証 | |
| E11 | Service Worker（`docs/data/*.json` のみ stale-while-revalidate、ETag/Last-Modified で再検証、更新があれば `DATA_UPDATED` を通知 → 「データが更新されました / 再読み込み」バナーを 1 セッション 1 回） | `docs/sw.js`, `main.js` | | 未検証 | |
| E12 | CDN 依存（`@tanstack/virtual-core@3`、`@streamparser/json`、`lite-youtube-embed`）はすべて動的 import。失敗時は fetch+parse / 読み込み中表示 / 未登録要素にフォールバックし、アプリは落ちない。`esm.sh` / Google Fonts への preconnect | `ui/virtual-list.js`, `data-loader.js getJSONParser`, `main.js`, `index.html` | | 未検証 | |
| E13 | Node からの検証用 DI（`dataFiles` / `fetchText` / `fetchResponse`）と `loadAll()`（全ファイル required） | `data-loader.js`, `scripts/validate_json.js` | | 未検証 | |
| E14 | `validate_json.js` の検査: fallback 形、`load()` 後に CORE キーがエラー無しでファイル内容と一致、`sourceDocumentBodies` は初期ロードに含まれない、`loadAll()` がパーサと同一、Repository が全 bout/event/fighter/promotion/video/article/video_link を解決、空クエリが全レコードに一致、bout_id 検索が一致、patch 通知 | `scripts/validate_json.js` | | 未検証 | |

## F. 描画基盤

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| F1 | 仮想スクロール（window スクロール基準、実測高さ、overscan 3）。可視行だけを描画し初期描画を速くする | `ui/virtual-list.js` | | 未検証 | |
| F2 | タブごとに 1 つのリストを保持し、変化（タブ・repo.revision・フィルタ指紋・フォーカス・itemsSource）が無ければ再計算しない | `tabs/tab-registry.js renderTo` | | 未検証 | |
| F3 | 公式タブはストリーミング中の flush で開いた `<details>` が閉じないよう、描画元配列が同一なら再描画しない（`itemsSource`） | `tabs/tab-registry.js #itemsSourceUnchanged`, `tab-renderers.js official` | | 未検証 | |
| F4 | 選手タブは名鑑順ソートに必要なキー（numbersFighters / numbersNameMatches）が揃うまで「読み込み中...」バナーを出し、揃ったら 1 回だけ描画 | `tabs/tab-registry.js #SORT_KEYS` | | 未検証 | |
| F5 | 読み込み中（`loadingDataKeys` あり）で 0 件なら「読み込み中...」、完了後の 0 件は空欄 | `ui/virtual-list.js setLoading` | | 未検証 | |
| F6 | 行の描画関数が例外を投げたら「描画エラー」カードにして続行（`console.error`）。タブの items 生成失敗も「描画エラー (tab)」カード | `ui/virtual-list.js #paint`, `tabs/tab-registry.js` | | 未検証 | |
| F7 | データ更新（refresh）はスクロール位置を保つ。タブ切替・フォーカス変化は先頭へ | `tabs/tab-registry.js`, `ui/keyboard-nav.js` | | 未検証 | |
| F8 | 行カーソル（`virtual-cursor` 枠）: j/k 移動、g/G、Enter で行内の最初のボタン/リンクを実行、o で詳細トグル | `ui/virtual-list.js setCursor / activateCursor`, `ui/keyboard-nav.js` | | 未検証 | |

## G. データ合成（データ層の規則。挙動を変えてはいけない）

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| G1 | 信頼性ティア `numbers:5 > official:4 > note:3 > youtube:2 > none:1`。`lowReliabilityLast` で youtube 以下を順序を保ったまま末尾へ | `core/reliability.js` | | 未検証 | |
| G2 | 各エンティティのティア判定（fighter: numbers_data → official_data → 最小登録 → source_article_ids → inferred_from_video_ids；bout: numbers_verified/numbers_records → source_article_id → inferred_from_video_id；event: numbers_only → official_data → source_article_id → official_youtube_title/source_video_ids；video: official → source_article_ids → youtube） | `core/reliability.js` | | 未検証 | |
| G3 | 最小登録選手の判定 `isMinimalFighter`（名鑑・公式・動画無し、かつ記事言及があっても summary に「最小登録」） | `core/reliability.js` | | 未検証 | |
| G4 | 一覧は CSV 昇順を `.reverse()` して新しい順（events / richEvents / richBouts / richVideos / richArticles / sourceDocuments / sourceMentions）。大会内の試合（`boutsForEvent`）は試合順の昇順 | `core/data-repository.js` | | 未検証 | |
| G5 | `richFighters`: canonical + 発掘（名鑑対応のみの選手、公式サイトのみの選手。公式のみは `official_<id>` 衝突回避）→ 名鑑掲載順で並べ替え（未掲載は元順で末尾）→ `enrichFighter` → 表記ゆれ統合 → `lowReliabilityLast` | `core/data-repository.js richFighters / #discoverFighters / #computeNumbersOrder` | | 未検証 | |
| G6 | `enrichFighter`: プレースホルダ概要の消去、公式（nickname/nationality/name_kana/bio→summary 代替/weight_class→main_division/organization→main_promotion_id/gym/age/height cm 付与）→ 名鑑（display_name/main_division/main_promotion_id/height/age/gym、`numbers_data`）の順で重ね、summary は名鑑 catchphrase+notes > base、`profile.record`（名鑑 fight_count/win_rate + 勝敗 + 公式 draws）、`profile.achievements`（👑 王座 / 🏆 優勝 / 白グローブ） | `core/data-enricher.js enrichFighter / #applyOfficialFighter / #applyNumbersFighter / #mergeRecord`, `numbersAchievementLabels` | | 未検証 | |
| G7 | 公式選手名の突合: 完全一致 → 中黒・空白・ピリオド・全半角差を無視した正規化キー（曖昧キーは除外） | `core/data-enricher.js normalizeFighterName / #officialPlayerByName` | | 未検証 | |
| G8 | 表記ゆれ重複選手の統合: 正規化名が同じ組を 1 人に（団体が矛盾する組は統合しない）。survivor は canonical → 関連数 → 名鑑あり。消えた表示名は `aliases`、`merged_fighter_ids`、別名インデックスで `findRichFighter` が解決 | `core/data-repository.js #mergeDuplicateFighters / #mergeFighterGroup / findRichFighter` | | 未検証 | |
| G9 | `enrichBout`: `promotion_id:(numbers_event_number || event_number)` で名鑑個人成績を引き、選手と対戦相手の両方が一致する記録だけ使う。相手側の行は勝敗を反転。winner/loser、`method_raw`（detail_raw）、division、bout_type（bout_format）を上書きし `result_status=numbers_verified`、`numbers_records` を添付 | `core/data-enricher.js enrichBout` | | 未検証 | |
| G10 | 名鑑のみの大会・試合の合成（`numbers-<promotion>-<N>` / `-<order>`、既存大会は団体+興行番号（numbers_event_number 優先）で除外、数字でない番号は除外、同団体の「…No.N」大会名から名前を作る、両選手の組で 1 試合にまとめる、`numbers_only: true`、概要/メモの定型文） | `core/data-repository.js #numbersOnlyData / numbersOnlyEvents / numbersOnlyBouts` | | 未検証 | |
| G11 | `findEvent` / `findBout` は名鑑のみの合成行にもフォールバック | `core/data-repository.js` | | 未検証 | |
| G12 | `enrichEvent`: 公式トーナメントを `maxbout-`→`max-bout-`、`-light/-middle/-heavy`→`-lightweight/...` に正規化し、event_id の `-gp` / `-tournament` 接尾辞を外して突合（`official_data`） | `core/data-enricher.js enrichEvent / #officialTournaments` | | 未検証 | |
| G13 | `enrichVideo`: YouTube アーカイブからタイトル・投稿者・投稿日・概要欄を補完、紐づく試合/大会から `promotion_id` / `division` を導出 | `core/data-enricher.js enrichVideo` | | 未検証 | |
| G14 | `enrichArticle`: note アーカイブからタイトル・説明を補完 | `core/data-enricher.js enrichArticle` | | 未検証 | |
| G15 | `sourceDocuments`: 降順にし `source_document_bodies` の `content_text` を結合（本文未ロード時はプレビューのみ） | `core/data-repository.js sourceDocuments` | | 未検証 | |
| G16 | `richTitles`: `source_video_id` → bouts の `inferred_from_video_id` から獲得大会を導出、前進パスで次代の獲得大会を喪失大会に（`end_reason=vacated` は補わない）、後退パスで前代の喪失大会を獲得大会に | `core/data-repository.js richTitles` | | 未検証 | |
| G17 | 王座表示名: `tournament` を含む → 「団体 階級トーナメント」、MAXバウト → 「団体 階級」、他 → 「団体 階級王座」 | `core/data-repository.js titleDisplayName` | | 未検証 | |
| G18 | 団体名 → promotion_id（中黒・空白を無視） | `core/data-repository.js promotionIdByName` | | 未検証 | |
| G19 | 出典本文の引き当て（記事: ref_id または `note:<id>`、動画: ref_id / `youtube_description:<id>` / URL。候補のうち元配列で最初の文書を返し、falsy キーも線形 find と同じ意味で保持） | `core/data-repository.js #sourceDocumentLookup / sourceDocumentForArticle / sourceDocumentForVideo` | | 未検証 | |
| G20 | 関係ヘルパ: `fighterSnapshotsForFighter`（統合 ID 群、event_id 降順）、`eventsForPromotion`（名鑑のみ含む、日付降順）、`titlesForPromotion`、`videoLinksForVideo`、`videosForEntity`、`videoIdsLinkedToEventBouts`、`eventSourceVideoIdsWithoutBoutCoverage`、`sourceReferencesForBout/Event`、`sourceReferenceForVideo`、`sourceContextForVideo`、`countSourceReferences`、`countSourceMentions`、`relatedBoutsForFighter`（統合 ID 群、メモ化）、`boutsForEvent` | `core/data-repository.js`, `core/base-repository.js` | | 未検証 | |
| G21 | ラベル辞書: video_type / relation_type / link_status / result_status / source_type / mention_type / article_type（未知コードは素通し） | `core/label-registry.js` | | 未検証 | |

## H. 各タブの表示内容

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| H1 | 公式タブ: 固定ページ（about / history）は折りたたみ（タイトル + 説明、本文は `body_html` をそのまま）、ニュースは日付降順でタイトル・日付/カテゴリ・Markdown 本文（見出し・太字・リンク・箇条書き・表・改行） | `tab-renderers.js official / renderOfficialPageDocCard / renderOfficialNewsDocCard`, `ui/markdown.js` | | 未検証 | |
| H2 | 通信タブ: note 記事の出典本文（`source_type=note_article`）を記事種別バッジ + 種別バッジ、外部リンクのタイトル、整形本文（日付行の後〜フッタ行の前、見出し重複を除去）。本文が無ければアーカイブ説明 → プレビュー | `tab-renderers.js tsushin / renderNoteArticleCard / #cleanNoteBody` | | 未検証 | |
| H3 | 試合カード: 対戦カード（選手リンク）、大会リンク / 階級、名鑑バッジ、結果サマリ（A def. B）+ 決着（NR 時間 決まり手）、王座戦メモ、動画（試合に紐づく動画）、出典候補（折りたたみ・確度順上位 5 件・「上位5件」/「N件」）、詳細（bout_id・大会・団体・試合順・階級/weight_class_id・種別・形式(名鑑)・結果状態ラベル・選手行(コーナー/結果)・決着(normalized/technique/score)・王座(title_id/title_result)・推定元動画・推定信頼度・メモ） | `tab-renderers.js renderBoutCard / renderFighterRows / boutDecisionLine`, `ui/html-utils.js boutResultText` | | 未検証 | |
| H4 | 選手カード: 名前リンク + 公式ニックネーム、階級 / 団体名、名鑑バッジ・公式バッジ、概要、所属/身長・年齢/国籍、「戦績・プロフィール」ブロック（通算 N戦 X勝Y敗Z分 (勝率 R%)、実績マーカー、出場大会、summary と重複しない公式 bio 箇条書き）、関連試合（大会リンク付き）、出典別プロフィール（大会リンク / 出典 = note 記事リンク or 公式ニュース「題」（日付）、所属・身長・年齢・戦績・主団体・肩書き・キャッチコピー）、出典記事リスト、詳細（fighter_id・別名・主階級・主団体・推定元動画・推定信頼度） | `tab-renderers.js renderFighterCard / renderProfileBlock / renderOfficialBio / renderFighterSnapshots / renderSnapshotSource / #recordText / #winRatePercent` | | 未検証 | |
| H5 | 大会カード: 名前リンク、団体 / 公開日、公式バッジ、「名鑑のみ」バッジ、概要（無ければ「概要未入力」）、公式データ（優勝 / 準優勝）、動画（大会に紐づく動画のうち試合で既出のものを除く）、関連試合（第N試合、試合順昇順）、出典候補（折りたたみ）、出典記事、詳細（event_id・団体・大会番号・大会種別・開催日・公開日・推定元・推定信頼度） | `tab-renderers.js renderEventCard`, `services/related-renderers.js renderEventBouts` | | 未検証 | |
| H6 | 団体カード: 名前、英字名 / カテゴリ、概要、出典記事、動画、大会（最新 12 件 + 「ほか N 件」）、王座（表示名 + N reigns）、詳細（promotion_id・英字名・カテゴリ・範囲・会場・ラウンド・判定・グローブ・肘・サッカーボールキック・踏みつけ・4点頭部キック・4点頭部膝 = あり/なし） | `tab-renderers.js renderPromotionCard / promotionRuleRows / renderPromotionEvents / renderPromotionTitles` | | 未検証 | |
| H7 | 動画カード: 外部リンクのタイトル（アーカイブ補完）、投稿者 / 投稿日、種別バッジ・紐づけ状態バッジ、動画 URL ブロック（リンク + 概要欄の ▶詳細 + 埋め込み）、YouTube 概要欄プレビュー（出典参照のプレビュー or 本文プレビュー、言及バッジ）、出典記事、紐づけ先（関係種別バッジ + 大会/試合/選手/団体リンク + 開始/終了時間 + メモ）、詳細（video_id・原題・platform・platform_video_id・公式状態・種別・紐づけ状態・重複候補・重複メモ・メモ） | `tab-renderers.js renderVideoCard / renderVideoLinkedEntities`, `services/source-renderers.js renderVideoSourceBlock / renderVideoDescriptionPreview` | | 未検証 | |
| H8 | 王座タブ: 団体名（日本語ロケール）→ 階級で並べ、「団体 / 階級」の見出しを挟む。王座カードは表示名、詳細（既定で開く: title_id・団体・階級・変遷数）、歴代カード（代ラベル or N代、選手リンク、獲得/喪失大会リンク、「返上（空位）」、出典 = 動画リンク優先 or 記事リンク） | `tab-renderers.js titles / renderTitleCard / renderLineageCard` | | 未検証 | |
| H9 | 出典本文カード（管理）: タイトル、種別 / 日付（無ければ「日付未入力」）/ ref、「出典を開く」、プレビュー、候補件数バッジ（大会候補 / 試合候補 / 動画候補）、「本文を表示」折りたたみ（無ければ「本文は空です。」）、詳細（source_id・URL・取得日時・content_hash・notes） | `tab-renderers.js renderSourceCard`, `services/source-renderers.js renderSourceReferenceCounts / renderSourceBody` | | 未検証 | |
| H10 | 出典言及カード（管理）: 種別バッジ + hint/matched_text、出典リンク（種別 / タイトル / line N）、本文（無ければ「本文なし」）、「文脈を表示」折りたたみ、詳細（mention_id・source_id・entity_type・confidence・line_number・source_ref_id・notes） | `tab-renderers.js renderMentionCard`, `services/source-renderers.js renderSourceMentionLink / renderTextDisclosure` | | 未検証 | |
| H11 | 名鑑選手カード（管理）: 名前、階級 / 団体 ID、名鑑バッジ、通算戦績、実績 + 出場、キャッチコピー、所属/身長・年齢、詳細（numbers_fighter_id・団体(原文)・メモ・出典シート/行） | `tab-renderers.js renderNumbersFighterCard` | | 未検証 | |
| H12 | 名前対応カード（管理）: 名鑑名 → 対応先（無ければ「未対応」）、信頼度バッジ、照合方法、詳細（各 ID・メモ） | `tab-renderers.js renderNumbersNameMatchCard` | | 未検証 | |
| H13 | 名鑑記録カード（管理）: 対戦カード、階級 / 団体 / 第N回（MAXバウトは原文）、形式、結果マーク + 結果、詳細原文（改行保持）、詳細（record_id・各 ID・相手 ID 群・団体(原文)・大会番号(原文)・出典） | `tab-renderers.js renderNumbersFightRecordCard` | | 未検証 | |
| H14 | 公式選手カード（管理）: 名前 + ニックネーム、階級 / 団体 / 国籍、公式バッジ、戦績、bio、詳細（id・読み・年齢・身長・デビュー・所属） | `tab-renderers.js renderOfficialPlayerCard` | | 未検証 | |
| H15 | 公式（その他）タブ（管理）: トーナメント（名前、日付、優勝/準優勝、id/video_id）、試合（A vs B、大会/日付/階級、結果、決着/ラウンド/メモ）、沿革（題、年/時代/月、説明）を種別バッジ付きで 1 リストに | `tab-renderers.js officialMisc / renderOfficialTournamentCard / renderOfficialMatchCard / renderOfficialHistoryCard` | | 未検証 | |
| H16 | 出所バッジの色分け: 名鑑 = 青、公式 = 緑（「名鑑のみ」も青）。管理ビューの単一出所カードは左の色帯（名鑑系 = 青、公式系 = 緑） | `style.css .video-badge / .official-badge / 左色帯` | | 未検証 | |
| H17 | 共通部品: 出典記事参照（アーカイブ題のリンク + 本文の ▶詳細/▼詳細）、動画参照（インラインリンク / 動画ブロック）、出典候補サマリ（種別 / 文書リンク + 詳細、「候補 <確度>」バッジ、言及バッジ（種別 件数）、matched_texts 先頭 3 件、line 番号。candidate_id で重複排除、確度 high→medium→low→不明 → タイトル → ID 順）、関連試合カード（第N試合 / 大会リンク、対戦カード + 名鑑バッジ、結果サマリ、決着、動画）、定義リスト（空は省く）、詳細折りたたみ、セクション/グリッド | `services/source-renderers.js`, `services/related-renderers.js`, `ui/component-builder.js` | | 未検証 | |
| H18 | YouTube 埋め込みファサード（`lite-youtube`）。`thumbnail_sizes` に `standard` が無い動画は `hqdefault.jpg` を先に指定して 404 を出さない。空なら既定に任せる | `services/source-renderers.js renderVideoEmbed`, `main.js (lite-youtube-embed import)`, `style.css lite-youtube` | | 未検証 | |
| H19 | 空・未入力の定型文: 「関連試合はまだ登録されていません。」「概要未入力」「本文は空です。」「プレビュー未入力」「日付未入力」「未入力」「大会未設定」「不明」 | `tab-renderers.js`, `services/*.js` | | 未検証 | |
| H20 | 外部由来の文字列はすべて HTML エスケープ。信頼済み HTML（`body_html` / Markdown 変換結果）だけ生で挿入。外部リンクは `target=_blank rel=noopener noreferrer` | `ui/html-utils.js escapeHtml / externalLink`, `ui/markdown.js` | | 未検証 | |

## I. キーボード操作・その他の操作

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| I1 | ショートカット: `j`/`↓` 次、`k`/`↑` 前、`g` 先頭、`G` 末尾、`Enter` 開く、`o` 詳細の開閉、`Space`/`Shift+Space` 半ページ、`/` 検索へ、`h`/`l`/`←`/`→` 前後のタブ、`1`〜`8` タブ直接、`c` URL コピー（トースト）、`r` 再読み込み、`Esc` 検索クリア/ヘルプを閉じる、`?` ヘルプ | `ui/keyboard-nav.js`, `index.html #keyboard-help` | | 未検証 | |
| I2 | 入力欄にフォーカス中は `Esc` で blur するだけで他のキーは奪わない。修飾キー付きは無視 | `ui/keyboard-nav.js #onKeyDown` | | 未検証 | |
| I3 | ヘルプダイアログ（`<dialog>`、閉じるボタン、背景クリックで閉じる） | `index.html`, `ui/keyboard-nav.js` | | 未検証 | |
| I4 | 本文の開閉 UI: note 本文・YouTube 概要欄の「▶ 詳細 / ▼ 詳細」、「本文を表示」「文脈を表示」、出典候補の折りたたみ、詳細の折りたたみ | `services/source-renderers.js`, `ui/component-builder.js detailDisclosure` | | 未検証 | |

## J. 見た目・レスポンシブ

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| J1 | ライトテーマのみ（`color-scheme: light`）。Noto Sans JP（Google Fonts）、1100px 幅の中央寄せ | `style.css`, `index.html` | | 未検証 | |
| J2 | レスポンシブ（560px 以下: ヘッダ説明を隠す、タブを等幅、詳細 dl を 1 列） | `style.css @media (max-width: 560px)` | | 未検証 | |
| J3 | 横スクロールを出さない（`overflow-x: hidden`） | `style.css body` | | 未検証 | |
