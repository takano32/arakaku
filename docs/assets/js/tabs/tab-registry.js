import { DEFAULT_TAB } from "../config.js";
import { TAB_FILTERS } from "../filters.js";
import { VirtualList } from "../ui/virtual-list.js";

/**
 * 役割: 現在のタブを VirtualList に描画する単一の窓口。タブ ID → 描画 Strategy
 *   (TabRenderers のメソッド) を解決し、不要な再描画を抑止する差分判定ロジックを持つ。
 * アーキ上の位置: main.js が生成し ViewController.renderTo() (= 唯一の renderTo 呼び出し元)
 *   と KeyboardNav (moveCursor 等のカーソル操作) が利用。tabRenderers (TabRenderers) /
 *   ctx (ViewContext) に依存。タブごとに 1 つの VirtualList を #lists にキャッシュして保持する。
 * 不変条件 / 注意:
 *   - #strategies のキーは TabRenderers のメソッド名・config.js のタブ ID と完全一致させること。
 *   - 差分判定 (#prev* 群) は renderTo 末尾でまとめて更新する。途中 return 時も整合が崩れない
 *     よう、各 early return が記録すべき #prev* を都度更新している点に注意。
 *   - repo はシングルトンで invalidate() のたびに revision が進む。同一性ではなく revision で
 *     データ更新を検知する (data-repository.js の revision 設計と対応)。
 * 関連 skill: .agents/skills/arakaku-viewer-ui (描画・ロード), arakaku-filters (フィルタ),
 *   arakaku-sorting-strategy (選手タブのソート完了待ち)。
 */
/** Strategy: タブ ID から描画 Strategy を解決 */
export class TabRendererRegistry {
  /** @param {import("./tab-renderers.js").TabRenderers} tabRenderers */
  /** @param {import("../core/view-context.js").ViewContext} ctx */
  constructor(tabRenderers, ctx) {
    this.#ctx = ctx;
    this.#strategies = new Map([
      ["official", () => tabRenderers.official()],
      ["tsushin", () => tabRenderers.tsushin()],
      ["bouts", () => tabRenderers.bouts()],
      ["fighters", () => tabRenderers.fighters()],
      ["events", () => tabRenderers.events()],
      ["promotions", () => tabRenderers.promotions()],
      ["titles", () => tabRenderers.titles()],
      ["videos", () => tabRenderers.videos()],
      ["sources", () => tabRenderers.sources()],
      ["mentions", () => tabRenderers.mentions()],
      ["numbersFighters", () => tabRenderers.numbersFighters()],
      ["numbersNameMatches", () => tabRenderers.numbersNameMatches()],
      ["numbersFightRecords", () => tabRenderers.numbersFightRecords()],
      ["officialPlayers", () => tabRenderers.officialPlayers()],
      ["officialMisc", () => tabRenderers.officialMisc()],
    ]);
  }

  #ctx;
  #strategies;
  #lists = new Map();
  #currentTabId = null;
  #prevCounts = new Map(); // tabId → 前回の items.length
  #prevRepoRefs = new Map(); // tabId → 前回の DataRepository 参照
  #prevFilters = new Map(); // tabId → 前回のフィルタ文字列
  #prevFocusKey = ""; // フォーカス変化の検出用
  #prevSortLoaded = new Map(); // tabId → 前回のソート完了状態
  #prevItemsSources = new Map(); // tabId → 前回の descriptor.itemsSource

  // 選手タブのソート順確定に必要なデータキー (data-loader が loadedDataKeys に追加する key 名と一致)。
  // 両方ロードされるまで選手タブは「読み込み中」を出し、完了時に1回だけ本描画する。
  static #SORT_KEYS = ["numbersFighters", "numbersNameMatches"];

  // 検索クエリ・フォーカス・フィルタ等、アイテム一覧に影響する state を文字列化
  #filterFingerprint() {
    const s = this.#ctx?.state;
    if (!s) return "";
    const tabFilters = Object.values(TAB_FILTERS).flat().map((group) => s[group.stateKey]);
    return [s.query, s.focusFighterId, s.focusEventId, s.mentionType, ...tabFilters].join("\0");
  }

  // フォーカス（ジャンプ）が変化したか
  #focusKey() {
    const s = this.#ctx?.state;
    if (!s) return "";
    return [s.focusFighterId, s.focusEventId].join("\0");
  }

  #isSortLoaded() {
    const loaded = this.#ctx?.state?.loadedDataKeys;
    return TabRendererRegistry.#SORT_KEYS.every(k => loaded?.has(k));
  }

  renderTo(container, tabId) {
    // repo はシングルトンで invalidate() 時に revision が進むため、
    // 同一性ではなく revision でデータ更新を検知する
    const repoStamp = this.#ctx?.repo?.revision ?? null;
    const fingerprint = this.#filterFingerprint();

    const focusKey = this.#focusKey();
    const focusChanged = focusKey !== this.#prevFocusKey;
    const tabChanged = tabId !== this.#currentTabId;
    const repoChanged = repoStamp !== this.#prevRepoRefs.get(tabId);
    const filterChanged = fingerprint !== this.#prevFilters.get(tabId);

    if (!this.#lists.has(tabId)) {
      this.#lists.set(tabId, new VirtualList());
    }
    const list = this.#lists.get(tabId);

    // VirtualList の DOM がこの container に未挿入 / 別 container 配下のときだけ挿し替える。
    // 既に正しく載っているなら触らない (差分描画で開いた <details> 等を保つため)。
    if (!list.el.parentNode || list.el.parentNode !== container) {
      container.replaceChildren(list.el);
    }

    const isLoading = (this.#ctx?.state?.loadingDataKeys?.size ?? 0) > 0;
    list.setLoading(isLoading);

    // 選手タブ: ソートデータ完了まではロード表示し、完了時に1回だけ描画
    const isSortLoaded = this.#isSortLoaded();
    const wasSortLoaded = this.#prevSortLoaded.get(tabId) ?? false;
    const sortJustCompleted = tabId === "fighters" && isSortLoaded && !wasSortLoaded;
    if (tabId === "fighters") {
      this.#prevSortLoaded.set(tabId, isSortLoaded);
      list.setBanner(isSortLoaded ? null : "読み込み中...");
    }

    // 選手タブでソート未完了: 初回表示のみ空リスト+ロード中を設定し、以降の更新はスキップ
    if (tabId === "fighters" && !isSortLoaded) {
      if (tabChanged || this.#prevCounts.get(tabId) === undefined) {
        container.replaceChildren(list.el);
        list.setItems([], () => "", () => 500);
        list.setLoading(true);
        list.resetCursor();
        this.#currentTabId = tabId;
        this.#prevCounts.set(tabId, 0);
        this.#prevRepoRefs.set(tabId, repoStamp);
        this.#prevFilters.set(tabId, fingerprint);
        this.#prevFocusKey = focusKey;
      }
      return;
    }

    // 何も変化していなければ strategy() (= items 再計算) すら走らせずに抜ける。
    if (!tabChanged && !repoChanged && !filterChanged && !sortJustCompleted) return;

    // 未知のタブ ID は DEFAULT_TAB にフォールバック。
    const strategy = this.#strategies.get(tabId) ?? this.#strategies.get(DEFAULT_TAB);
    let descriptor;
    try {
      descriptor = strategy();
    } catch (err) {
      console.error(`TabRendererRegistry: strategy() failed for tab "${tabId}"`, err);
      container.innerHTML = `<article class="card"><p class="meta">描画エラー (${tabId}): ${err.message}</p></article>`;
      return;
    }
    const { items, renderItem, estimateSize, itemsSource } = descriptor;

    // descriptor が itemsSource (描画元の生配列) を宣言するタブでは、その配列の
    // 同一性が保たれている限り repo 更新だけのリフレッシュを省略する。
    // 公式タブは Phase 0 完了後にデータが変わらないため、ストリーミング中の
    // flush ごとの再描画 (開いた <details> が閉じる等) を防げる。
    const sourcesUnchanged = this.#itemsSourceUnchanged(tabId, itemsSource);
    if (sourcesUnchanged && !tabChanged && !filterChanged && !focusChanged && !sortJustCompleted
        && this.#prevCounts.get(tabId) !== undefined) {
      this.#prevRepoRefs.set(tabId, repoStamp);
      return;
    }

    const prevCount = this.#prevCounts.get(tabId) ?? -1;

    // 初回 / タブ切替 / ソート完了直後はフルセット (renderItem・estimateSize ごと差し替え、
    // カーソルもリセット)。それ以外はデータだけ in-place 更新して描画状態を温存する。
    if (tabChanged || prevCount === -1 || sortJustCompleted) {
      container.replaceChildren(list.el);
      list.setItems(items, renderItem, estimateSize);
      list.resetCursor();
      this.#currentTabId = tabId;
    } else {
      list.refreshItems(items);
      // フォーカス (選手/大会へのジャンプ) で一覧内容が切り替わったら先頭へスクロール。
      if (focusChanged) window.scrollTo({ top: 0, behavior: "instant" });
    }

    this.#prevCounts.set(tabId, items.length);
    this.#prevRepoRefs.set(tabId, repoStamp);
    this.#prevFilters.set(tabId, fingerprint);
    this.#prevFocusKey = focusKey;
  }

  // itemsSource の各配列が前回と同一参照かを判定し、今回の値を記録する
  #itemsSourceUnchanged(tabId, src) {
    const prev = this.#prevItemsSources.get(tabId);
    this.#prevItemsSources.set(tabId, src);
    if (!src || !prev || prev.length !== src.length) return false;
    return src.every((arr, i) => arr === prev[i]);
  }

  #currentList() {
    return this.#lists.get(this.#currentTabId);
  }

  moveCursor(delta) {
    const list = this.#currentList();
    if (!list) return;
    const next = list.cursorIndex === -1 ? (delta > 0 ? 0 : list.count - 1) : list.cursorIndex + delta;
    list.setCursor(next);
  }

  setCursorToEdge(edge) {
    const list = this.#currentList();
    if (!list) return;
    list.setCursor(edge === "first" ? 0 : list.count - 1);
  }

  activateCursor() {
    this.#currentList()?.activateCursor();
  }

  getCursorEl() {
    return this.#currentList()?.getCursorEl() ?? null;
  }
}
