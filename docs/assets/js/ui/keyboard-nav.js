import { PUBLIC_TABS } from "../config.js";

/** j/k キーボードナビゲーション */
export class KeyboardNav {
  /**
   * @param {import("../tabs/tab-registry.js").TabRendererRegistry} tabRegistry
   * @param {import("../core/app-state.js").AppState} state
   * @param {import("./data-loader.js").DataLoader} dataLoader
   */
  constructor(tabRegistry, state, dataLoader) {
    this.#tabRegistry = tabRegistry;
    this.#state = state;
    this.#dataLoader = dataLoader;
  }

  #tabRegistry;
  #state;
  #dataLoader;

  bind() {
    document.addEventListener("keydown", (e) => this.#onKeyDown(e));
  }

  #onKeyDown(e) {
    // input 系にフォーカスがある場合は / 以外を無視
    const tag = document.activeElement?.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    if (inInput) {
      if (e.key === "Escape") {
        document.activeElement.blur();
      }
      return;
    }

    // modifier key 付きは無視
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case "j":
      case "ArrowDown":
        e.preventDefault();
        this.#tabRegistry.moveCursor(1);
        break;

      case "k":
      case "ArrowUp":
        e.preventDefault();
        this.#tabRegistry.moveCursor(-1);
        break;

      case "g":
        e.preventDefault();
        this.#tabRegistry.setCursorToEdge("first");
        break;

      case "G":
        e.preventDefault();
        this.#tabRegistry.setCursorToEdge("last");
        break;

      case "Enter":
        e.preventDefault();
        this.#tabRegistry.activateCursor();
        break;

      case "/":
        e.preventDefault();
        document.querySelector("#search")?.focus();
        break;

      default: {
        // 数字キー 1〜n でタブ切り替え
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= PUBLIC_TABS.length) {
          const [tabId] = PUBLIC_TABS[num - 1];
          this.#state.patch({ tab: tabId, focusFighterId: "", focusEventId: "" });
          this.#dataLoader.loadForTab(tabId);
        }
        break;
      }
    }
  }
}
