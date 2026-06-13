import { DEFAULT_ADMIN_TAB, DEFAULT_TAB } from "./config.js";
import { escapeHtml } from "./ui/html-utils.js";
import { TAB_FILTERS } from "./filters.js";

/**
 * 役割: DOM の UI イベント (検索入力・フィルタボタン・タブ・ビュー切替・リンク) を
 *   AppState の更新へマッピングする Command 層。自身は描画せず、state.patch と
 *   viewController.renderContent / dataLoader.loadForTab を呼び分ける。
 * アーキ上の位置:
 *   - main.js で `new EventController(state, navigation, viewController, dataLoader)` 生成後 bind()。
 *   - bind() 内で state.subscribe(() => viewController.render()) を 1 回だけ登録する。
 *     これが state 変化 → 全体再描画をつなぐ唯一の購読 (ここを消すと UI が更新されなくなる)。
 *   - フィルタボタンの解決は filters.js の TAB_FILTERS を view-controller.js と共有。
 * 不変条件 / 注意:
 *   - patch しても自動描画されるのは render() 経由のフィルタ/タブ UI のみ。本文を即更新したい
 *     ハンドラ (検索・フィルタ・言及種別) は patch 後に明示的に renderContent() を呼ぶ必要がある。
 *   - タブ/ビュー切替は renderContent ではなく dataLoader.loadForTab を呼ぶ。loadForTab が
 *     必要データを読み終えて state を更新し、その更新で subscribe→render が走る。
 * 関連スキル: .agents/skills/arakaku-viewer-ui
 */

/** Command: UI イベントを状態更新へマッピング */
export class EventController {
  /**
   * @param {import("./core/app-state.js").AppState} state
   * @param {import("./ui/navigation.js").Navigator} navigator
   * @param {import("./view-controller.js").ViewController} viewController
   * @param {import("./data-loader.js").DataLoader} dataLoader
   */
  constructor(state, navigator, viewController, dataLoader) {
    this.state = state;
    this.navigator = navigator;
    this.viewController = viewController;
    this.dataLoader = dataLoader;
  }

  #searchTimer = null;
  // ビュー切替で離れる際の各モードの最後のタブを記憶し、戻ったとき復元する。
  #prevPublicTab = DEFAULT_TAB;
  #prevAdminTab = DEFAULT_ADMIN_TAB;

  #clearSearch() {
    const searchInput = document.querySelector("#search");
    const clearButton = document.querySelector("#search-clear");
    if (searchInput) searchInput.value = "";
    if (clearButton) clearButton.hidden = true;
    clearTimeout(this.#searchTimer);
    this.state.patch({ query: "", focusFighterId: "", focusEventId: "" });
    this.viewController.renderContent();
  }

  bind() {
    const searchInput = document.querySelector("#search");
    const clearButton = document.querySelector("#search-clear");

    searchInput?.addEventListener("input", (event) => {
      const value = event.target.value;
      if (clearButton) clearButton.hidden = !value;
      clearTimeout(this.#searchTimer);
      this.#searchTimer = setTimeout(() => {
        this.state.patch({
          query: value,
          focusFighterId: "",
          focusEventId: "",
        });
        this.viewController.renderContent();
      }, 150);
    });

    clearButton?.addEventListener("click", () => this.#clearSearch());

    searchInput?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.#clearSearch();
    });

    document.querySelector("#mention-type-filter")?.addEventListener("change", (event) => {
      this.state.patch({ mentionType: event.target.value });
      this.viewController.renderContent();
    });

    document.querySelector("#tab-filters")?.addEventListener("click", (event) => {
      const btn = event.target.closest(".filter-button");
      if (!btn) return;

      const groups = TAB_FILTERS[this.state.tab];
      const group = groups?.find((g) => g.type === btn.dataset.filterType);
      if (!group) return;

      const val = btn.dataset.filterVal;
      const nextVal = this.state[group.stateKey] === val ? "" : val;
      this.state.patch({ [group.stateKey]: nextVal });
      this.viewController.renderContent();
    });

    document.querySelector("#content")?.addEventListener("click", (event) => {
      const fighterButton = event.target.closest(".fighter-link");
      if (fighterButton) {
        this.navigator.jumpToFighter(fighterButton.dataset.fighterId, fighterButton.dataset.fighterName);
        return;
      }

      const eventButton = event.target.closest(".event-link");
      if (eventButton) {
        this.navigator.jumpToEvent(eventButton.dataset.eventId, eventButton.dataset.eventName);
      }
    });

    document.querySelector(".tabs")?.addEventListener("click", (event) => {
      const button = event.target.closest(".tab");
      if (!button?.dataset.tab) return;

      this.state.patch({
        tab: button.dataset.tab,
        focusFighterId: "",
        focusEventId: "",
      });
      this.dataLoader.loadForTab(button.dataset.tab);
    });

    document.querySelector(".view-mode-switch")?.addEventListener("click", (event) => {
      const button = event.target.closest(".view-mode-button");
      if (!button?.dataset.viewMode) return;

      const viewMode = button.dataset.viewMode;
      if (viewMode === "admin") this.#prevPublicTab = this.state.tab;
      else this.#prevAdminTab = this.state.tab;
      this.state.patch({
        viewMode,
        tab: viewMode === "admin" ? this.#prevAdminTab : this.#prevPublicTab,
        focusFighterId: "",
        focusEventId: "",
      });
      this.dataLoader.loadForTab(this.state.tab);
    });

    // state 変化 → 全体再描画をつなぐ唯一の購読。bind() は 1 度だけ呼ばれる前提。
    this.state.subscribe(() => {
      this.viewController.render();
    });
  }
}

export function renderLoadError(error) {
  document.querySelector("#content").innerHTML = `
    <article class="card">
      <h2>読み込みに失敗しました</h2>
      <p>${escapeHtml(error.message)}</p>
    </article>
  `;
}
