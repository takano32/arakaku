import { DEFAULT_ADMIN_TAB, DEFAULT_TAB } from "./config.js";
import { escapeHtml } from "./ui/html-utils.js";

/** Command: UI イベントを状態更新へマッピング */
export class EventController {
  /**
   * @param {import("./core/app-state.js").AppState} state
   * @param {import("./ui/navigation.js").Navigator} navigator
   * @param {import("./view-controller.js").ViewController} viewController
   */
  constructor(state, navigator, viewController) {
    this.state = state;
    this.navigator = navigator;
    this.viewController = viewController;
  }

  bind() {
    document.querySelector("#search")?.addEventListener("input", (event) => {
      this.state.patch({
        query: event.target.value,
        focusFighterId: "",
        focusEventId: "",
      });
      this.viewController.renderContent();
    });

    document.querySelector("#title-promotion-filter")?.addEventListener("change", (event) => {
      this.state.patch({ titlePromotion: event.target.value });
      this.viewController.renderContent();
    });

    document.querySelector("#title-division-filter")?.addEventListener("change", (event) => {
      this.state.patch({ titleDivision: event.target.value });
      this.viewController.renderContent();
    });

    document.querySelector("#mention-type-filter")?.addEventListener("change", (event) => {
      this.state.patch({ mentionType: event.target.value });
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
    });

    document.querySelector(".view-mode-switch")?.addEventListener("click", (event) => {
      const button = event.target.closest(".view-mode-button");
      if (!button?.dataset.viewMode) return;

      const viewMode = button.dataset.viewMode;
      this.state.patch({
        viewMode,
        tab: viewMode === "admin" ? DEFAULT_ADMIN_TAB : DEFAULT_TAB,
        focusFighterId: "",
        focusEventId: "",
      });
    });

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
