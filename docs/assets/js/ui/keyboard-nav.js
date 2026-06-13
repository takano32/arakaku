import { PUBLIC_TABS } from "../config.js";

/**
 * 役割: グローバルな keydown ハンドラ。j/k 行カーソル移動、h/l・数字キーでのタブ切替、
 *   ?/Escape のヘルプダイアログ、/ で検索フォーカス等の Vim 風ショートカットを提供する。
 * アーキ上の位置: main.js で new され bind() で document に登録される。行カーソル操作は
 *   tabRegistry (TabRendererRegistry → 現在タブの VirtualList) に委譲し、タブ切替は state.patch +
 *   dataLoader.loadForTab で行う。タブ一覧は config.js の PUBLIC_TABS が単一の真実。
 * 不変条件: PUBLIC_TABS の順序が h/l と数字キーの割り当てを決めるため config.js と同期必須。
 *   input/textarea/select にフォーカス中は / 以外のキーを無効化し、ページ操作を奪わないこと。
 * 関連スキル: .agents/skills/arakaku-viewer-ui
 */
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

    const dialog = document.querySelector("#keyboard-help");
    document.querySelector("#keyboard-help-close")?.addEventListener("click", () => dialog?.close());
    dialog?.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  }

  #toast(msg) {
    const el = document.createElement("div");
    el.className = "keyboard-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("keyboard-toast--show"));
    setTimeout(() => el.remove(), 2000);
  }

  #switchToTab(tabId) {
    this.#state.patch({ tab: tabId, focusFighterId: "", focusEventId: "" });
    this.#dataLoader.loadForTab(tabId);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  #switchTabBy(delta) {
    const tabs = PUBLIC_TABS.map(([id]) => id);
    const current = tabs.indexOf(this.#state.tab);
    // 末尾→先頭へ巻き戻すためタブ数を足してから剰余を取る (delta が負でも非負に保つ)。
    const next = (current + delta + tabs.length) % tabs.length;
    this.#switchToTab(tabs[next]);
  }

  #toggleHelp() {
    const dialog = document.querySelector("#keyboard-help");
    if (!dialog) return;
    dialog.open ? dialog.close() : dialog.showModal();
  }

  #onKeyDown(e) {
    // input 系にフォーカスがある場合は / 以外を無視
    const tag = document.activeElement?.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    if (inInput) {
      if (e.key === "Escape") document.activeElement.blur();
      return;
    }

    if (e.key === "?" || e.key === "Escape") {
      const dialog = document.querySelector("#keyboard-help");
      if (e.key === "Escape" && dialog?.open) { dialog.close(); return; }
      if (e.key === "?") { e.preventDefault(); this.#toggleHelp(); return; }
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

      case "h":
      case "ArrowLeft":
        e.preventDefault();
        this.#switchTabBy(-1);
        break;

      case "l":
      case "ArrowRight":
        e.preventDefault();
        this.#switchTabBy(1);
        break;

      case "o": {
        e.preventDefault();
        const row = this.#tabRegistry.getCursorEl();
        row?.querySelector("details > summary, .record-detail-toggle button")?.click();
        break;
      }

      case "c":
        e.preventDefault();
        navigator.clipboard?.writeText(location.href)
          .then(() => this.#toast("URLをコピーしました"))
          .catch(() => this.#toast("コピーに失敗しました"));
        break;

      case " ":
        e.preventDefault();
        window.scrollBy({ top: e.shiftKey ? -window.innerHeight * 0.6 : window.innerHeight * 0.6, behavior: "smooth" });
        break;

      case "r":
        e.preventDefault();
        location.reload();
        break;

      case "/":
        e.preventDefault();
        document.querySelector("#search")?.focus();
        break;

      default: {
        // 数字キー 1〜n でタブ切り替え
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= PUBLIC_TABS.length) {
          this.#switchToTab(PUBLIC_TABS[num - 1][0]);
        }
        break;
      }
    }
  }
}
