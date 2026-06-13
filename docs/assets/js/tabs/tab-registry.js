import { DEFAULT_TAB } from "../config.js";
import { TAB_FILTERS } from "../filters.js";
import { VirtualList } from "../ui/virtual-list.js";

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

  // 選手タブのソート順確定に必要なキー
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

    if (!tabChanged && !repoChanged && !filterChanged && !sortJustCompleted) return;

    const strategy = this.#strategies.get(tabId) ?? this.#strategies.get(DEFAULT_TAB);
    let descriptor;
    try {
      descriptor = strategy();
    } catch (err) {
      console.error(`TabRendererRegistry: strategy() failed for tab "${tabId}"`, err);
      container.innerHTML = `<article class="card"><p class="meta">描画エラー (${tabId}): ${err.message}</p></article>`;
      return;
    }
    const { items, renderItem, estimateSize } = descriptor;

    const prevCount = this.#prevCounts.get(tabId) ?? -1;

    if (tabChanged || prevCount === -1 || sortJustCompleted) {
      container.replaceChildren(list.el);
      list.setItems(items, renderItem, estimateSize);
      list.resetCursor();
      this.#currentTabId = tabId;
    } else {
      list.refreshItems(items);
      if (focusChanged) window.scrollTo({ top: 0, behavior: "instant" });
    }

    this.#prevCounts.set(tabId, items.length);
    this.#prevRepoRefs.set(tabId, repoStamp);
    this.#prevFilters.set(tabId, fingerprint);
    this.#prevFocusKey = focusKey;
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
