import { PUBLIC_TABS } from "../config.js";

// フォーカス中なら Enter / Space をブラウザの既定動作 (押下) に任せる要素。
const CONTROL_SELECTOR = "a, button, summary, iframe, [contenteditable]";

// 押すと既定動作を止めて呼ぶ操作 (キー → 操作名)。
const KEY_ACTIONS = {
  j: "cursorDown",
  ArrowDown: "cursorDown",
  k: "cursorUp",
  ArrowUp: "cursorUp",
  g: "cursorFirst",
  G: "cursorLast",
  Enter: "toggleRow",
  o: "toggleDetails",
  h: "prevTab",
  ArrowLeft: "prevTab",
  l: "nextTab",
  ArrowRight: "nextTab",
  c: "copyUrl",
  r: "reload",
  "/": "focusSearch",
};

/**
 * キーの組み合わせと画面の状況から、行う操作を決める (純関数。DOM を読まないので Node でテストできる)。
 * @param {{ key: string, shiftKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean,
 *           inInput?: boolean, dialogOpen?: boolean, onControl?: boolean, hasQuery?: boolean }} input
 *   inInput: input/textarea/select にフォーカス中、dialogOpen: ヘルプが開いている、
 *   onControl: イベントの対象がボタン・リンク・summary など (CONTROL_SELECTOR) の中、hasQuery: 検索語がある
 * @returns {{ name: string, preventDefault: boolean, tabIndex?: number } | null}  null なら何もしない
 */
export function keyToAction({ key, shiftKey, ctrlKey, metaKey, altKey, inInput, dialogOpen, onControl, hasQuery }) {
  if (inInput) return key === "Escape" ? { name: "blurInput", preventDefault: false } : null;
  if (key === "Escape") {
    if (dialogOpen) return { name: "closeHelp", preventDefault: false };
    // 検索語があるときだけ消す。無いときに消すと選手などの絞り込みまで外れて履歴も積まれていた (T.102)。
    return hasQuery ? { name: "clearSearch", preventDefault: false } : null;
  }
  if (key === "?") return { name: "toggleHelp", preventDefault: true };
  if (dialogOpen) return null;
  if (ctrlKey || metaKey || altKey) return null;
  if ((key === "Enter" || key === " ") && onControl) return null;
  if (key === " ") return { name: shiftKey ? "scrollUp" : "scrollDown", preventDefault: true };
  if (Object.hasOwn(KEY_ACTIONS, key)) return { name: KEY_ACTIONS[key], preventDefault: true };
  const num = parseInt(key, 10);
  if (num >= 1 && num <= PUBLIC_TABS.length) return { name: "tab", preventDefault: false, tabIndex: num - 1 };
  return null;
}

/**
 * グローバルな keydown ハンドラ (Vim 風ショートカット)。
 *   j/k/↓/↑ 行カーソル、g/G 先頭/末尾、Enter 行の開閉、o 行内の「詳細」の開閉、
 *   Space/Shift+Space 半ページ、/ 検索、h/l/←/→ 前後のタブ、1〜8 タブ直接、
 *   c URL コピー、r 再読み込み、Esc 検索クリア/ヘルプを閉じる、? ヘルプ。
 * input/textarea/select にフォーカス中は Esc で blur するだけで他のキーは奪わない。修飾キー付きは無視。
 * ボタン・リンク・summary にフォーカス中の Enter / Space は奪わない (キーボードだけで押せるように)。
 * どのキーで何をするかは keyToAction が決め、このクラスは画面の状況を集めて操作を呼ぶだけ。
 */
export class KeyboardNav {
  /**
   * @param {{ switchTab(tabId: string): void, list(): import("./list/record_list.js").RecordList|null,
   *           clearSearch(): void, focusSearch(): void, toast(msg: string): void, state: { tab: string, query: string } }} app
   */
  constructor(app) {
    this.app = app;
  }

  bind() {
    document.addEventListener("keydown", (e) => this.#onKeyDown(e));
    const dialog = document.querySelector("#help");
    document.querySelector("#help-close")?.addEventListener("click", () => dialog?.close());
    for (const button of document.querySelectorAll(".help-open")) {
      button.addEventListener("click", () => this.#toggleHelp());
    }
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
    const dialog = document.querySelector("#help");
    const action = keyToAction({
      key: e.key,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      altKey: e.altKey,
      inInput: tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT",
      dialogOpen: Boolean(dialog?.open),
      onControl: Boolean(e.target.closest?.(CONTROL_SELECTOR)),
      hasQuery: Boolean(this.app.state.query),
    });
    if (!action) return;
    if (action.preventDefault) e.preventDefault();
    this.#run(action, dialog);
  }

  #run(action, dialog) {
    const list = this.app.list();
    switch (action.name) {
      case "blurInput": document.activeElement.blur(); break;
      case "closeHelp": dialog.close(); break;
      case "clearSearch": this.app.clearSearch(); break;
      case "toggleHelp": this.#toggleHelp(); break;
      case "cursorDown": list?.moveCursor(1); break;
      case "cursorUp": list?.moveCursor(-1); break;
      case "cursorFirst": list?.setCursorToEdge("first"); break;
      case "cursorLast": list?.setCursorToEdge("last"); break;
      case "toggleRow": list?.toggleCursor(); break;
      case "toggleDetails": {
        if (!list) break;
        const row = list.getCursorEl();
        if (!row) break;
        if (!row.classList.contains("rec-open")) list.toggleCursor();
        const details = list.getCursorEl()?.querySelector(".rec-body > .fold-details");
        if (details) details.open = !details.open;
        break;
      }
      case "prevTab": this.#switchTabBy(-1); break;
      case "nextTab": this.#switchTabBy(1); break;
      case "copyUrl":
        navigator.clipboard?.writeText(location.href)
          .then(() => this.app.toast("URLをコピーしました"))
          .catch(() => this.app.toast("コピーに失敗しました"));
        break;
      case "scrollUp":
      case "scrollDown": {
        const top = action.name === "scrollUp" ? -window.innerHeight * 0.6 : window.innerHeight * 0.6;
        window.scrollBy({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        break;
      }
      case "reload": location.reload(); break;
      case "focusSearch": this.app.focusSearch(); break;
      case "tab": this.app.switchTab(PUBLIC_TABS[action.tabIndex][0]); break;
    }
  }
}
