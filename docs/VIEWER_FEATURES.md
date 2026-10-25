# ビューア機能一覧（T.56 リビルドの機能マップ）

T.56「ビューアを今の見た目にとらわれずに作り直す（機能は残す）」で、リビルド前のビューア（`docs/assets/js/core/` `services/` `tabs/` `ui/` と `style.css`、約 6,400 行）が持っていた利用者から見える機能とデータ側の振る舞いをすべて洗い出し、新しいビューア（`docs/assets/js/app/` `data/` `ui/` と `app.css`）のどこで実現しているかを対応づけた表です。

- 「旧実装」はリビルド前にその機能が置かれていた場所（削除済みのファイル名）です。
- 「新実装」は 2026-10-24 時点の場所です（その後の変更は各行の備考に T 番号付きで書いています。2026-10-25 時点）。
- 「状態」は次のいずれかです。
  - `検証済`: 新ビューアで同じ振る舞いを確認した。確認方法は備考に書く（ブラウザ = Chrome で実データを表示して確認、Node = `scripts/validate_json.js` または旧新比較スクリプトで確認）。
  - `変更`: 意図して形を変えた。何をどう変えたかと理由を備考に書く。機能そのものは残っている。
  - `廃止`: 無くした。該当なし（0 件）。

検証の概要（T.56.3）:

- データ層は旧 `core/*` と新 `data/*` を Node で同じ `docs/data` に対して突き合わせ、`richFighters` (131) / `richBouts` (315) / `richEvents` (67) / `richVideos` (360) / `richArticles` (120) / `richTitles` (16) / `sourceDocuments` (479) / `richSourceMentions` (1683)、すべての finder と関係ヘルパ、信頼性ティア、全フィルタのバケット件数、21 語 × 3 言及種別の検索一致が完全一致（188/188）。
- `make check`（build → validate_json.py → validate_json.js → test_filters.mjs → pytest）が通る。`validate_json.js` は全 15 セクションの全行を Node で描画する。
- Chrome（1280px と 390px）で全 15 セクション、検索・絞り込み・フォーカス遷移・キーボード・配色切替・共有リンク（`?tab=events&event=max-bout-special-1`、`?tab=fighters&fighter=kabei`、`?tab=titles&title_promo=target`、`?tab=sources&src_type=note_article`、`?tab=mentions&mention=result`、`?tab=numbersFightRecords&nr_promo=max_bout`、`?tab=bogus`）を確認。Console はエラー・警告ともに 0 件（favicon の 404 も無し）。

## A. 画面構成・ナビゲーション

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| A1 | ヘッダ（タイトル、ロゴ画像 `header.webp`、GitHub リンク） | `index.html`, `style.css` | `index.html` `.brand` / `.side-links`、`app.css` | 変更 | ロゴとタイトルは左ナビの先頭に置き、GitHub は斜めリボンではなくナビ下部のリンク群に入れた。スマートフォンでは上部の 1 行になる。ブラウザで確認。T.67 でロゴリンクのアクセシブル名を表示文字列に合わせ、配色ボタンのラベルを「ダーク / ライト配色に切り替える」にし、選択中ナビと王座戦バッジのコントラストを 4.5:1 以上にした。スマートフォンの読み込み中のレイアウトのずれ（CLS 0.777）を 0 にした（Lighthouse モバイルでアクセシビリティ 100） |
| A2 | サマリー件数 8 項目（団体・大会・試合・選手・王座・動画・出典・出典候補）と未ロード時 `...`、選手は関係キーが揃ってから `richFighters.length`、大会・試合は名鑑のみ分を加算 | `view-controller.js renderSummary` | `ui/shell.js #counts / #renderStats`（ナビ下の「データ件数」。未ロードは `…`） | 変更 | 同じ規則。ブラウザで 7 / 67 / 315 / 131 / 16 / 360 / 479 / 1448 を確認。T.60 で各件数を該当タブへのリンクにした（出典・出典候補は出典本文へ） |
| A3 | 通常ビューのタブ 8 個（公式 / 通信 / 試合 / 選手 / 大会 / 団体 / 王座 / 動画、順 = キーボード 1〜8） | `config.js PUBLIC_TABS`, `view-controller.js renderTabs` | `config.js PUBLIC_TABS`, `ui/shell.js #renderNav`（`<a href="?tab=…">` のリスト） | 検証済 | ブラウザで全タブを巡回 |
| A4 | 管理ビューのタブ 7 個 | `config.js ADMIN_TABS` | `config.js ADMIN_TABS`, `ui/shell.js #renderNav`（`<details class="nav-admin">` 内） | 検証済 | ブラウザで全 7 タブを巡回 |
| A5 | 通常 / 管理ビューの切替と、各ビューの最後のタブの記憶・復元 | `event-controller.js #prevPublicTab / #prevAdminTab`, `view-controller.js renderViewModeSwitch` | `ui/shell.js bind()` の `toggle` ハンドラと `#prevPublicTab / #prevAdminTab`。`viewMode` は `app/state.js` でタブから導出 | 変更 | 切替ボタンではなく、ナビの「管理ビュー」グループの開閉がビュー切替。閉じると直前の通常タブ、開くと直前の管理タブへ戻る（ブラウザで確認: 閉じる → `?nr_promo=…`（公式）、開く → `?tab=sources`）。`?tab=sources` のような管理タブの共有リンクがそのまま管理ビューを開けるようになった |
| A6 | 既定タブは公式、管理の既定は出典本文 | `config.js` | `config.js DEFAULT_TAB / DEFAULT_ADMIN_TAB` | 検証済 | ブラウザ（`/` で公式） |
| A7 | 未知のタブ ID は既定タブにフォールバック | `tab-registry.js renderTo` | `ui/shell.js #renderList / switchTab` | 検証済 | ブラウザ（`?tab=bogus` → 公式） |
| A8 | フッタの外部リンク（公式サイト / のーと / YouTube） | `index.html` | `index.html` `.side-links`（デスクトップはナビ下部、スマートフォンは `<footer class="site-foot">`） | 検証済 | ブラウザ（1280px / 390px） |
| A9 | 構成が同じときは DOM を再構築せず active だけ更新 | `view-controller.js renderTabs / renderViewModeSwitch` | `ui/shell.js #renderNav`（`aria-current` の更新のみ）、`#renderFilters`（指紋が同じなら触らない） | 検証済 | コードとブラウザ（ナビのフォーカスが保たれる） |

## B. 検索・絞り込み

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| B1 | フリーテキスト検索（150ms デバウンス、✕ クリア、Esc でクリア、入力でフォーカス解除） | `event-controller.js` | `ui/shell.js bind()`（`#search` / `#search-clear`）、`clearSearch()` | 変更 | ブラウザ（「テール」で 1 件、クリアで 131 件、URL `q=`）。T.66 で全角半角・ひらがなカタカナ・大文字小文字を同一視（`data/query.js normalizeSearchText`）、空白区切りは AND、選手は団体名でも引ける、日本語入力の変換中は検索しない。validate_json.js で検査 |
| B2 | 小文字化した連結文字列への部分一致 | `query-matcher.js #matchQuery` | `data/query.js #matchQuery` | 検証済 | Node 旧新比較 |
| B3〜B10 | 各エンティティの検索対象テキスト（選手 / 試合 / 大会 / 団体 / 動画 / 王座 / 言及 / 出典本文） | `query-matcher.js` | `data/query.js`（`sourceReferenceSearchText` を同ファイルに移動。公式タブ・名鑑系・公式系の管理タブにも `includes` で検索を追加） | 検証済 | Node 旧新比較（21 語 × 3 言及種別で全エンティティの一致結果が同一）。公式 / 名鑑選手 / 名前対応 / 名鑑記録 / 公式選手 / 公式(その他) は旧実装では検索対象外だったが新実装では検索できる（追加） |
| B11 | 検索キャッシュは `repo.revision` で破棄 | `query-matcher.js #cachedText` | `data/query.js #cachedText` | 検証済 | コード同一 |
| B12 | タブ別の絞り込みボタン（`TAB_FILTERS`、11 タブ） | `filters.js`, `view-controller.js renderTabFilters` | `data/filters.js TAB_FILTERS`, `ui/shell.js #renderFilters`（`.chip`、`aria-pressed`） | 検証済 | ブラウザで各タブの行ラベルを確認（階級/団体/種別/区分） |
| B13 | URL / 状態トークンは英語、表示は日本語、実値は `match` | `filters.js` | `data/filters.js` | 検証済 | ブラウザ（`fighter_promo=max_bout`） |
| B14 | 「その他」バケットと `forceOther`（最小登録） | `filters.js itemPassesFilters`, `reliability.js isMinimalFighter` | `data/filters.js`, `data/reliability.js` | 検証済 | Node 旧新比較（全フィルタの件数一致）、`test_filters.mjs` |
| B15 | 配列フィールドはいずれか一致で通過 | `filters.js` | `data/filters.js` | 検証済 | `test_filters.mjs` |
| B16 | 派生フィルタ項目（動画の団体/階級、通信の団体/階級、公式選手の団体） | `data-enricher.js enrichVideo`, `tab-renderers.js #withNoteFilterFields / officialPlayers` | `data/enricher.js enrichVideo`, `ui/sections/tsushin.js withFilterFields`, `ui/sections/admin.js officialPlayersSection` | 検証済 | ブラウザ（通信・動画・公式選手で絞り込み） |
| B17 | 同じボタンの再クリックで解除 | `event-controller.js` | `ui/shell.js bind()` | 検証済 | ブラウザ |
| B18 | 出典言及の種別セレクト（`MENTION_TYPE_ORDER` → ja 順、「日本語 / コード」） | `view-controller.js renderMentionFilters` | `ui/shell.js #renderFilters / #sortedMentionTypes`（`#mention-type`） | 検証済 | ブラウザ（`?tab=mentions&mention=result` → 315 件） |
| B19 | `itemPassesFilters` の Node ユニットテスト | `scripts/test_filters.mjs` | `scripts/test_filters.mjs`（import 先を `data/filters.js` に） | 検証済 | `make check` |

## C. URL 同期・共有リンク

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| C1 | `PARAM_MAP`（25 パラメータ） | `core/url-sync.js` | `app/state.js PARAM_MAP`（同じ 25 個 + `bout`（試合フォーカス）を追加） | 検証済 | ブラウザで `?tab=events&event=max-bout-special-1`、`?tab=fighters&fighter=kabei`、`?tab=titles&title_promo=target` などを確認 |
| C2 | 起動時に URL から復元し検索ボックスにも反映 | `main.js`, `url-sync.js readFromURL` | `main.js`, `app/state.js readFromURL` | 検証済 | ブラウザ |
| C3 | `replaceState` で URL を更新（既定値省略、同一なら書かない） | `url-sync.js writeToURL` | `app/state.js writeToURL / searchStringFor` | 検証済 | ブラウザ（フィルタ・検索・フォーカスの URL を確認） |

## D. 遷移・フォーカス

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| D1 | 選手名リンク → 選手タブでその選手だけを表示（通常ビューへ、大会フォーカス解除、先頭へ） | `ui/navigation.js jumpToFighter` | `ui/shell.js jumpToFighter / #jump`（`.link-fighter` の委譲） | 変更 | 旧実装は検索ボックスに選手名を入れて絞り込みを表していたが、新実装はツールバーの「選手: ○○ ✕」チップで表し、検索ボックスは空のまま（検索語で続けて絞り込める）。ブラウザで確認（`?tab=fighters&fighter=frank_dakuta`、チップで解除） |
| D2 | 大会名リンク → 大会タブでその大会だけを表示 | `ui/navigation.js jumpToEvent` | `ui/shell.js jumpToEvent`（`.link-event`） | 変更 | D1 と同じ（チップ）。ブラウザで確認。加えて試合へのリンク（`.link-bout`、`?bout=`）を追加 |
| D3 | フォーカス中は該当 1 件のみ | `tab-renderers.js focusedOrFiltered` | `ui/sections/common.js focusedOrFiltered`（試合 / 選手 / 大会） | 検証済 | ブラウザ・Node（validate_json.js のフォーカス検査） |
| D4 | フォーカス変化で先頭へ、タブ切替・検索入力で解除 | `tab-registry.js`, `event-controller.js`, `keyboard-nav.js` | `ui/shell.js switchTab / #jump / bind()`（検索 input） | 検証済 | ブラウザ |
| D5 | 対戦カード表記の優先順位 | `ui/navigation.js boutMatchup` | `ui/parts.js boutMatchup`（同じ優先順位。勝者側を太字 + 〇 で強調） | 検証済 | コード・ブラウザ |
| D6 | 結果サマリ「A def. B」（unknown は出さない） | `ui/navigation.js renderBoutResultSummary` | `ui/parts.js boutResultSummary` | 検証済 | ブラウザ |
| D7 | リンクの表示名は統合後の現在名を優先 | `ui/navigation.js fighterLink / eventLink` | `ui/parts.js fighterLink / eventLink` | 検証済 | コード同一 |

## E. データ読み込み

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| E1 | `DATA_FILES`（31 ファイル） | `config.js` | `config.js DATA_FILES` | 検証済 | validate_json.js |
| E2 | フェーズ分割ロード（Phase 0 公式 → Phase 1 一覧 11 ファイル → Phase 2 補完 10 + 公開参照 3） | `data-loader.js load`, `config.js` | `data/loader.js load`, `config.js INITIAL/PRIMARY/ENRICHMENT/PUBLIC_REFERENCE_DATA_KEYS` | 検証済 | validate_json.js（CORE キーが揃い内容一致）、ブラウザのネットワーク順 |
| E3 | 配列 JSON の SAX ストリーミング（flush ごとの invalidate + rAF でまとめた再描画） | `data-loader.js #streamKey / #schedulePatch` | `data/loader.js #loadKeyProgressive / #schedulePatch` | 変更 | CDN の `@streamparser/json` を使わず、ファイル単位で届き次第反映する（invalidate + rAF でまとめた再描画は同じ）。理由: 一覧は新しい順なので部分配列の描画は先頭が入れ替わり続けて読みにくく、CDN 障害時の分岐も不要になる。最大のファイルでも 1MB 弱で、ファイル単位でも段階的に件数が増えていく |
| E4 | タブ別遅延ロード `TAB_DATA_KEYS` | `data-loader.js` | `config.js TAB_DATA_KEYS`, `data/loader.js loadForTab` | 検証済 | ブラウザ（通信で本文、出典言及で言及が後から届く）、validate_json.js |
| E5 | 描画ゲート `REQUIRED_TAB_DATA_KEYS` と「読み込み中 / 読み込み待ち」、通信タブはプレビュー先行 | `view-controller.js renderContent`, `tab-renderers.js renderNoteArticleCard` | `config.js REQUIRED_TAB_DATA_KEYS`, `ui/shell.js #renderList`, `ui/sections/tsushin.js`（本文未着時は「本文を読み込み中…」とプレビュー） | 検証済 | ブラウザ |
| E6 | 失敗はキー単位で fallback + `dataLoadErrors` + loaded 扱い | `data-loader.js #streamKeySafe / loadKeys` | `data/loader.js #loadKeyProgressive / loadKeys` | 検証済 | validate_json.js（存在しないファイルを混ぜても `load()` が落ちず記録される） |
| E7 | 「データ読み込み失敗」カード（`role="alert"`） | `view-controller.js renderDataLoadErrors` | `ui/shell.js #renderAlerts`（`#alerts`） | 検証済 | コード（Node で `dataLoadErrors` の記録を確認。実データでは失敗が無いので表示は未発生） |
| E8 | 致命的失敗のカード | `event-controller.js renderLoadError` | `main.js`（`#list-host` にアラート） | 検証済 | コード |
| E9 | 空フォールバックの形 | `core/data-parser.js` | `data/parser.js` | 検証済 | validate_json.js |
| E10 | Repository シングルトン + `invalidate()` + `revision` | `core/data-repository.js` | `data/repository.js` | 検証済 | Node 旧新比較 |
| E11 | Service Worker と「データが更新されました」バナー | `docs/sw.js`, `main.js` | `docs/sw.js`, `main.js` | 検証済 | ブラウザ（SW が制御中。バナーはデータ更新時のみ）。T.58 で本文が変わったときだけ通知、T.81 でキャッシュに無いときの保存を `waitUntil` に入れた |
| E12 | CDN 依存（virtual-core / streamparser / lite-youtube）と preconnect / Google Fonts | `ui/virtual-list.js`, `data-loader.js`, `main.js`, `index.html` | なし | 変更 | 外部依存を 0 にした（自前の一覧・ファサード・ファイル単位ロード、システムフォント）。`index.html` の外部リクエストは無く、favicon はインライン SVG |
| E13 | Node 検証用の DI（`dataFiles` / `fetchText` / `fetchResponse`）と `loadAll()` | `data-loader.js` | `data/loader.js`（`dataFiles` / `fetchText`、`loadAll()`） | 変更 | ストリーミング経路が無くなったので `fetchResponse` を廃止。`validate_json.js` を更新 |
| E14 | `validate_json.js` の検査項目 | `scripts/validate_json.js` | `scripts/validate_json.js` | 検証済 | 旧検査をすべて残し、rich レコード・名鑑のみ合成行の解決、失敗ファイルの封じ込め、`loadForTab`、全セクション全行の描画を追加 |

## F. 描画基盤

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| F1 | 仮想スクロール（可視行だけ描画して初期描画を速くする） | `ui/virtual-list.js`（CDN） | `ui/list.js RecordList`（最初の 30 行 + IntersectionObserver で追加、行の本体は開いたときだけ描画） | 変更 | 同じ目的（初期描画と DOM 量の抑制）を、依存なしの段階描画 + 遅延本体で実現。全 1683 件の出典言及でも初期 30 行。ブラウザで確認 |
| F2 | タブごとの一覧保持と変化検知（タブ / revision / 指紋 / フォーカス） | `tabs/tab-registry.js renderTo` | `ui/shell.js #renderList`（`#prevRevision / #prevFingerprint / #prevGate`） | 検証済 | コード・ブラウザ |
| F3 | ストリーミング中に開いた `<details>` が閉じない | `tab-registry.js #itemsSourceUnchanged` | `ui/list.js refresh()`（キー列が同じなら HTML が変わった行だけ差し替える） | 検証済 | コード。公式タブはデータ到着ごとの再描画でも行の HTML が同一なので触られない |
| F4 | 選手タブは名鑑順の確定を待って 1 回だけ描画 | `tab-registry.js #SORT_KEYS` | `ui/shell.js #renderList`（`sortReady`） | 検証済 | コード・ブラウザ |
| F5 | 読み込み中は「読み込み中…」、完了後の 0 件は空欄 | `ui/virtual-list.js setLoading` | `ui/list.js setStatus`（0 件時は「該当する○○がありません。」と文言を出す） | 変更 | 空欄ではなくセクションごとの空文言を出す（分かりやすさのため） |
| F6 | 行の描画エラーをカードにして続行 | `ui/virtual-list.js #paint`, `tab-registry.js` | `ui/list.js #safe`（`.render-error`）、`ui/shell.js #renderList`（build 失敗のアラート） | 検証済 | コード。validate_json.js で全行が例外なく描けることも確認 |
| F7 | データ更新はスクロール位置を保ち、タブ切替・フォーカスは先頭へ | `tab-registry.js`, `keyboard-nav.js` | `ui/list.js refresh`, `ui/shell.js switchTab / #jump / #renderList` | 検証済 | ブラウザ |
| F8 | 行カーソル（j/k、g/G、Enter、o） | `ui/virtual-list.js`, `ui/keyboard-nav.js` | `ui/list.js`（`moveCursor / setCursorToEdge / toggleCursor`）, `ui/keyboard.js` | 変更 | Enter は「行を開く / 閉じる」、`o` は行内の「詳細」の開閉（旧: Enter = 行内の最初のリンクを実行、o = 詳細）。行が開閉式になったため。ブラウザで確認。T.64 でカーソル移動時に行へフォーカスを移し、フォーカス中のボタン・リンク・チップ・summary では Enter / Space をブラウザの既定動作（押下）に任せる（以前はキーボードだけでは押せなかった） |

## G. データ合成（データ層の規則）

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| G1 | 信頼性ティアと `lowReliabilityLast` | `core/reliability.js` | `data/reliability.js` | 検証済 | Node 旧新比較（全ティア一致） |
| G2 | 各エンティティのティア判定 | `core/reliability.js` | `data/reliability.js` | 検証済 | 同上 |
| G3 | `isMinimalFighter` | `core/reliability.js` | `data/reliability.js` | 検証済 | 同上 |
| G4 | 一覧の降順化、大会内の試合は昇順 | `core/data-repository.js` | `data/repository.js` | 検証済 | 同上（`richBouts` / `boutsForEvent` 一致） |
| G5 | `richFighters`（発掘・名鑑順・統合・低信頼末尾） | `core/data-repository.js` | `data/repository.js` | 検証済 | 同上（131 件一致） |
| G6 | `enrichFighter` | `core/data-enricher.js` | `data/enricher.js` | 検証済 | 同上 |
| G7 | 公式選手名の突合（正規化キー） | `core/data-enricher.js` | `data/enricher.js normalizeFighterName` | 検証済 | 同上 |
| G8 | 表記ゆれ重複選手の統合 | `core/data-repository.js` | `data/repository.js #mergeDuplicateFighters` | 検証済 | 同上（`findRichFighter` 全 ID 一致） |
| G9 | `enrichBout`（団体+興行番号、両者一致、反転、numbers_verified） | `core/data-enricher.js` | `data/enricher.js enrichBout` | 検証済 | 同上（315 件の winner/loser/method 一致） |
| G10 | 名鑑のみの大会・試合の合成 | `core/data-repository.js #numbersOnlyData` | `data/repository.js #numbersOnlyData` | 検証済 | 同上 |
| G11 | `findEvent` / `findBout` の名鑑のみフォールバック | `core/data-repository.js` | `data/repository.js` | 検証済 | 同上、validate_json.js |
| G12 | `enrichEvent`（公式トーナメント突合） | `core/data-enricher.js` | `data/enricher.js enrichEvent` | 検証済 | 同上 |
| G13 | `enrichVideo` | `core/data-enricher.js` | `data/enricher.js enrichVideo` | 検証済 | 同上 |
| G14 | `enrichArticle` | `core/data-enricher.js` | `data/enricher.js enrichArticle` | 検証済 | 同上 |
| G15 | `sourceDocuments` の本文結合 | `core/data-repository.js` | `data/repository.js` | 検証済 | 同上 |
| G16 | `richTitles` の獲得 / 喪失導出（vacated は補わない） | `core/data-repository.js` | `data/repository.js richTitles` | 検証済 | 同上（16 件一致）。ブラウザで「返上（空位）」表示を確認 |
| G17 | 王座表示名 | `core/data-repository.js titleDisplayName` | `data/repository.js titleDisplayName` | 検証済 | 同上 |
| G18 | `promotionIdByName` | `core/data-repository.js` | `data/repository.js` | 検証済 | 同上 |
| G19 | 出典本文の引き当て | `core/data-repository.js #sourceDocumentLookup` | `data/repository.js #sourceDocumentLookup` | 検証済 | 同上（記事 121・動画 360 件一致） |
| G20 | 関係ヘルパ群 | `core/data-repository.js`, `core/base-repository.js` | `data/repository.js`（1 ファイルに統合） | 検証済 | 同上 |
| G21 | ラベル辞書 | `core/label-registry.js` | `data/labels.js`（関数オブジェクト `labels`） | 検証済 | 値は同一 |

## H. 各タブの表示内容

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| H1 | 公式タブ（固定ページは折りたたみ、ニュースは日付降順で Markdown） | `tab-renderers.js official / renderOfficialPageDocCard / renderOfficialNewsDocCard`, `ui/markdown.js` | `ui/sections/official.js`（固定ページは閉じた行、ニュースは開いた行）, `ui/markdown.js` | 変更 | 本文 HTML の「/」始まりの画像・リンクを公式サイトの URL に直す（旧実装では 404 / 行き先なし）、リンクは別タブ、`web-share` を外す（Console 警告の原因）。本文の文面は不変。T.61 でニュース本文の 1 行だけの `<iframe>` を、tiget.net なら埋め込み＋リンク、ほかのホストならリンクとして表示（旧実装はタグが文字で出ていた） |
| H2 | 通信タブ（記事種別バッジ、整形本文、フォールバック） | `tab-renderers.js tsushin / renderNoteArticleCard / #cleanNoteBody` | `ui/sections/tsushin.js`（`cleanNoteBody` 同一。行の見出しに日付・団体・階級・2 行プレビュー、本文は開いたとき） | 検証済 | ブラウザ（120 件、本文の遅延ロード） |
| H3 | 試合カードの内容一式 | `tab-renderers.js renderBoutCard`, `ui/html-utils.js boutResultText` | `ui/sections/bouts.js`, `ui/html.js boutResultText`, `ui/parts.js` | 変更 | 内容は同じ（対戦カード・大会 / 階級・名鑑バッジ・結果・王座戦・動画・出典候補・詳細）。見出し右に決着を出し、「勝敗未入力」バッジを追加。名鑑由来の `method_raw` がラウンド・時間を含むとき旧実装は「1R 1分37秒 1R 1:37 KO(…)」と二重に出ていたのを 1 回にした |
| H4 | 選手カードの内容一式 | `tab-renderers.js renderFighterCard / renderProfileBlock / renderOfficialBio / renderFighterSnapshots / renderSnapshotSource` | `ui/sections/fighters.js`, `ui/parts.js profileBlock / officialBio / fighterSnapshots / snapshotSource / relatedBouts / articleRefList` | 検証済 | ブラウザ（かべい: 名鑑・公式・白グローブ、通算 19戦 14勝 5敗、関連試合 14、出典別プロフィール、詳細）。見出し右に通算戦績、統合した ID を詳細に追加 |
| H5 | 大会カードの内容一式 | `tab-renderers.js renderEventCard`, `services/related-renderers.js renderEventBouts` | `ui/sections/events.js`, `ui/parts.js eventBouts / videoLinks / sourceReferences` | 検証済 | ブラウザ（MAXバウトスペシャルワンマッチ大会: 5 試合、動画、名鑑バッジ）。見出し右に試合数、詳細に名鑑の興行番号を追加 |
| H6 | 団体カードの内容一式 | `tab-renderers.js renderPromotionCard / promotionRuleRows / renderPromotionEvents / renderPromotionTitles` | `ui/sections/promotions.js` | 検証済 | ブラウザ。ルールは詳細ではなく本体の定義リストに出す |
| H7 | 動画カードの内容一式 | `tab-renderers.js renderVideoCard / renderVideoLinkedEntities`, `services/source-renderers.js renderVideoSourceBlock / renderVideoDescriptionPreview` | `ui/sections/videos.js`, `ui/parts.js videoBlock / videoDescriptionPreview / videoFacade` | 検証済 | ブラウザ（360 件、サムネイル、概要欄、紐づけ先、埋め込み再生）。見出しにサムネイルと再生時間、詳細に再生数 / 高評価を追加 |
| H8 | 王座タブ（団体 / 階級の見出し、歴代、獲得 / 喪失、返上（空位）、出典） | `tab-renderers.js titles / renderTitleCard / renderLineageCard` | `ui/sections/titles.js` | 変更 | 歴代は番号付きリストで見せ、王座の行は既定で開く。詳細（title_id 等）は旧実装では既定で開いていたが閉じた状態にした。見出し右に現王者 / 最新優勝 |
| H9 | 出典本文カード | `tab-renderers.js renderSourceCard` | `ui/sections/admin.js sourcesSection` | 検証済 | ブラウザ（479 件、種別フィルタ、候補件数バッジ、本文） |
| H10 | 出典言及カード | `tab-renderers.js renderMentionCard` | `ui/sections/admin.js mentionsSection` | 検証済 | ブラウザ（1683 件） |
| H11 | 名鑑選手カード | `tab-renderers.js renderNumbersFighterCard` | `ui/sections/admin.js numbersFightersSection` | 検証済 | ブラウザ（106 件） |
| H12 | 名前対応カード | `tab-renderers.js renderNumbersNameMatchCard` | `ui/sections/admin.js numbersNameMatchesSection`（対応先を選手リンクに） | 検証済 | ブラウザ（106 件） |
| H13 | 名鑑記録カード | `tab-renderers.js renderNumbersFightRecordCard` | `ui/sections/admin.js numbersFightRecordsSection` | 検証済 | ブラウザ（561 件、MAXバウト絞り込みで 107 件） |
| H14 | 公式選手カード | `tab-renderers.js renderOfficialPlayerCard` | `ui/sections/admin.js officialPlayersSection` | 検証済 | ブラウザ（108 件） |
| H15 | 公式（その他）タブ | `tab-renderers.js officialMisc` | `ui/sections/admin.js officialMiscSection` | 検証済 | ブラウザ（28 件） |
| H16 | 出所バッジの色（名鑑 = 青、公式 = 緑）と管理カードの左色帯 | `style.css` | `app.css .badge-numbers / .badge-official / .badge-note / .badge-gold`, `.rec-src-numbers / .rec-src-official / .rec-src-note` | 検証済 | ブラウザ。note = 紫、実績・王座戦 = 金を追加。ライト / ダーク両方 |
| H17 | 共通部品（出典記事参照、動画参照、出典候補サマリ、関連試合、定義リスト、折りたたみ） | `services/source-renderers.js`, `services/related-renderers.js`, `ui/component-builder.js` | `ui/parts.js` | 検証済 | ブラウザ・Node（全行描画）。候補の重複排除・確度順・上位 5 件・「上位5件 / N件」は同じ |
| H18 | YouTube 埋め込みファサードとサムネイル 404 回避 | `services/source-renderers.js renderVideoEmbed`, `main.js (lite-youtube-embed)` | `ui/parts.js videoFacade`, `ui/shell.js #activateVideo` | 変更 | 自前のファサード（画像 + 再生ボタン → クリックで `youtube-nocookie` の iframe）。`thumbnail_sizes` から存在が確実なサイズ（maxres → sd → hq）を選ぶので 404 が出ない。ブラウザで確認 |
| H19 | 空・未入力の定型文 | `tab-renderers.js`, `services/*.js` | `ui/parts.js`, `ui/sections/*.js` | 検証済 | 文言はそのまま（grep で確認） |
| H20 | HTML エスケープと信頼済み HTML の扱い | `ui/html-utils.js`, `ui/markdown.js` | `ui/html.js escapeHtml / externalLink`, `ui/markdown.js`, `ui/sections/official.js officialBodyHtml` | 検証済 | コード。validate_json.js が全行描画で `undefined` 混入も検査。T.63 で Markdown のリンクを http(s) だけにし（`javascript:` や `"` による属性注入を防ぐ）、`scripts/test_markdown.mjs` で検査。公式ページ本文 HTML は validate_json.py が `<script>`・イベント属性・スクリプト URL・YouTube 以外の iframe を失敗にする |

## I. キーボード操作・その他の操作

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| I1 | ショートカット一式 | `ui/keyboard-nav.js`, `index.html #keyboard-help` | `ui/keyboard.js`, `index.html #help` | 変更 | キー割り当ては同じ。Enter / o の意味は F8 のとおり変更。ブラウザで j/k/Enter/o/?/Esc//(検索)/h/l/数字を確認 |
| I2 | 入力欄フォーカス中は Esc で blur のみ、修飾キーは無視 | `ui/keyboard-nav.js` | `ui/keyboard.js` | 検証済 | コード・ブラウザ |
| I3 | ヘルプダイアログ | `index.html`, `ui/keyboard-nav.js` | `index.html #help`, `ui/keyboard.js`（ナビ下部 / ページ末尾の「キーボード操作」ボタンからも開く） | 検証済 | ブラウザ |
| I4 | 本文の開閉 UI（▶ 詳細 / ▼ 詳細、本文を表示、文脈を表示、出典候補、詳細） | `services/source-renderers.js`, `ui/component-builder.js` | `ui/parts.js textFold / fold / details`（`.fold`） | 変更 | 「▶ 詳細 / ▼ 詳細」は「本文を表示」「概要欄を表示」に改名（何が開くか分かるように）。開閉の挙動は同じ |

## J. 見た目・レスポンシブ

| No. | 機能 | 旧実装 | 新実装 | 状態 | 備考 |
|---|---|---|---|---|---|
| J1 | ライトテーマのみ、Noto Sans JP（Google Fonts）、1100px 中央寄せ | `style.css`, `index.html` | `app.css`（ライト + ダーク、`html[data-theme]` と `localStorage["arakaku-theme"]`、システムフォント、左ナビ + 本文） | 変更 | 配色を OS 設定に追従させ、手動で切替・保存できるようにした。Web フォントの外部リクエストを無くした。ブラウザで両配色を確認 |
| J2 | レスポンシブ（560px） | `style.css` | `app.css @media (max-width: 880px) / 480px` | 変更 | 880px 以下で 1 カラム、ナビと件数は横スクロール、行の右側情報は下に回る。ブラウザ（390px）で確認 |
| J3 | 横スクロールを出さない | `style.css body overflow-x` | `app.css`（`body { overflow-x: hidden }` + グリッド列 `minmax(0, 1fr)`） | 検証済 | ブラウザ（390px で `scrollWidth === innerWidth`） |

## 集計

表の行は 101（B3〜B10 の 8 機能を 1 行にまとめているので機能数は 108）。

- 検証済: 81 行（機能数 88）
- 変更: 20 行（A1, A2, A5, B1, D1, D2, E3, E12, E13, F1, F5, F8, H1, H3, H8, H18, I1, I4, J1, J2。いずれも機能は残し、形を変えた）
- 廃止: 0
