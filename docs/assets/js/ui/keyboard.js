import { PUBLIC_TABS } from "../config.js";

/**
 * グローバルな keydown ハンドラ (Vim 風ショートカット)。
 *   j/k/↓/↑ 行カーソル、g/G 先頭/末尾、Enter 行の開閉、o 行内の「詳細」の開閉、
 *   Space/Shift+Space 半ページ、/ 検索、h/l/←/→ 前後のタブ、1〜8 タブ直接、
 *   c URL コピー、r 再読み込み、Esc 検索クリア/ヘルプを閉じる、? ヘルプ。
 * input/textarea/select にフォーカス中は Esc で blur するだけで他のキーは奪わない。修飾キー付きは無視。
 */
export class KeyboardNav {
  /**
   * @param {{ switchTab(tabId: string): void, list(): import("./list.js").RecordList|null,
   *           clearSearch(): void, toast(msg: string): void, state: { tab: string } }} app
   */
  constructor(app) {
    this.app = app;
  }

  bind() {
    document.addEventListener("keydown", (e) => this.#onKeyDown(e));
    const dialog = document.querySelector("#help");
    document.querySelector("#help-close")?.addEventListener("click", () => dialog?.close());
    document.querySelector("#help-open")?.addEventListener("click", () => this.#toggleHelp());
    dialog?.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  }

  #toggleHelp() {
    const dialog = document.querySelector("#help");
    if (!dialog) return;
    dialog.open ? dialog.close() : dialog.showModal();
  }

  #switchTabBy(delta) {
    const tabs = PUBLIC_TABS.map(([id]) => id);
    const current = tabs.indexOf(this.app.state.tab);
    // 管理タブ表示中 (current === -1) は公開の先頭/末尾から始める
    const base = current === -1 ? (delta > 0 ? -1 : 0) : current;
    const next = (base + delta + tabs.length) % tabs.length;
    this.app.switchTab(tabs[next]);
  }

  #onKeyDown(e) {
    const tag = document.activeElement?.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    if (inInput) {
      if (e.key === "Escape") document.activeElement.blur();
      return;
    }

    const dialog = document.querySelector("#help");
    if (e.key === "Escape") {
      if (dialog?.open) { dialog.close(); return; }
      this.app.clearSearch();
      return;
    }
    if (e.key === "?") { e.preventDefault(); this.#toggleHelp(); return; }
    if (dialog?.open) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const list = this.app.list();
    switch (e.key) {
      case "j":
      case "ArrowDown":
        e.preventDefault();
        list?.moveCursor(1);
        break;
      case "k":
      case "ArrowUp":
        e.preventDefault();
        list?.moveCursor(-1);
        break;
      case "g":
        e.preventDefault();
        list?.setCursorToEdge("first");
        break;
      case "G":
        e.preventDefault();
        list?.setCursorToEdge("last");
        break;
      case "Enter":
        e.preventDefault();
        list?.toggleCursor();
        break;
      case "o": {
        e.preventDefault();
        if (!list) break;
        const row = list.getCursorEl();
        if (!row) break;
        if (!row.classList.contains("rec-open")) list.toggleCursor();
        const details = list.getCursorEl()?.querySelector(".rec-body > .fold-details");
        if (details) details.open = !details.open;
        break;
      }
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
      case "c":
        e.preventDefault();
        navigator.clipboard?.writeText(location.href)
          .then(() => this.app.toast("URLをコピーしました"))
          .catch(() => this.app.toast("コピーに失敗しました"));
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
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= PUBLIC_TABS.length) {
          this.app.switchTab(PUBLIC_TABS[num - 1][0]);
        }
      }
    }
  }
}
