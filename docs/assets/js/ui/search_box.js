/**
 * 検索欄 (#search) と ✕ ボタン (#search-clear) の配線。状態は持たず、入力を onSearch / onClear に渡す。
 * - 入力は 150ms のデバウンス後に onSearch(value) を呼ぶ。日本語入力の変換中 (isComposing) は検索せず、
 *   確定 (compositionend) で検索する (T.66)。
 * - Esc と ✕ は onClear() を呼ぶ。
 * - setValue は URL からの復元・「戻る」・飛び先への移動で、検索欄と ✕ の表示を状態に合わせるために使う
 *   (イベントは発火しない)。
 */
export class SearchBox {
  #input;
  #clearButton;
  #timer = null;

  constructor({ input = document.querySelector("#search"), clearButton = document.querySelector("#search-clear") } = {}) {
    this.#input = input;
    this.#clearButton = clearButton;
  }

  bind({ onSearch, onClear }) {
    const schedule = (value) => {
      if (this.#clearButton) this.#clearButton.hidden = !value;
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => onSearch(value), 150);
    };
    this.#input?.addEventListener("input", (event) => {
      if (event.isComposing) return;
      schedule(event.target.value);
    });
    this.#input?.addEventListener("compositionend", (event) => schedule(event.target.value));
    this.#input?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") onClear();
    });
    this.#clearButton?.addEventListener("click", () => onClear());
  }

  setValue(value) {
    if (this.#input) this.#input.value = value;
    if (this.#clearButton) this.#clearButton.hidden = !value;
  }

  /** 予約済みの検索 (デバウンス待ち) を取り消す */
  cancelPending() {
    clearTimeout(this.#timer);
  }

  /** セクションごとの検索欄の文言。変わったときだけ書き換える */
  setPlaceholder(text) {
    if (this.#input && text && this.#input.placeholder !== text) this.#input.placeholder = text;
  }
}
