/**
 * 配色 (ライト / ダーク) の切り替えボタン (#theme-toggle)。
 * 選択は <html data-theme> と localStorage "arakaku-theme" に保存する (index.html の先読みスクリプトが
 * スタイル適用前に同じキーを読む)。未保存なら OS 設定 (prefers-color-scheme) に従う。
 */
export class ThemeToggle {
  #button;

  constructor(button = document.querySelector("#theme-toggle")) {
    this.#button = button;
  }

  bind() {
    this.#button?.addEventListener("click", () => this.toggle());
    this.sync();
  }

  toggle() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("arakaku-theme", next); } catch { /* 保存できなくても動作に支障なし */ }
    this.sync();
  }

  // 配色ボタンのラベルで、押すとどちらの配色になるかを伝える (アイコンだけでは状態が分からないため)。
  sync() {
    if (!this.#button) return;
    const label = currentTheme() === "dark" ? "ライト配色に切り替える" : "ダーク配色に切り替える";
    this.#button.setAttribute("aria-label", label);
    this.#button.title = label;
  }
}

function currentTheme() {
  return document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
