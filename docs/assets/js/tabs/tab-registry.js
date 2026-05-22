import { DEFAULT_TAB } from "../config.js";

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

  render(tabId) {
    const strategy = this.#strategies.get(tabId) ?? this.#strategies.get(DEFAULT_TAB);
    return strategy();
  }
}
