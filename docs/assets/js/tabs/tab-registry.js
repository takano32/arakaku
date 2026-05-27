import { DEFAULT_TAB } from "../config.js";
import { VirtualList } from "../ui/virtual-list.js";

/** Strategy: タブ ID から描画 Strategy を解決 */
export class TabRendererRegistry {
  /** @param {import("./tab-renderers.js").TabRenderers} tabRenderers */
  constructor(tabRenderers) {
    this.#strategies = new Map([
      ["bouts", () => tabRenderers.bouts()],
      ["fighters", () => tabRenderers.fighters()],
      ["events", () => tabRenderers.events()],
      ["promotions", () => tabRenderers.promotions()],
      ["titles", () => tabRenderers.titles()],
      ["videos", () => tabRenderers.videos()],
      ["sources", () => tabRenderers.sources()],
      ["mentions", () => tabRenderers.mentions()],
    ]);
  }

  #strategies;
  #lists = new Map();

  renderTo(container, tabId) {
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

    if (!this.#lists.has(tabId)) {
      this.#lists.set(tabId, new VirtualList());
    }
    const list = this.#lists.get(tabId);

    // DOM に挿入してから setItems を呼ぶ (Virtualizer の要素測定に必要)
    container.replaceChildren(list.el);
    list.setItems(items, renderItem, estimateSize);
  }
}
