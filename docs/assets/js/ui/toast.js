/**
 * 画面下の短い通知 (#toast、role=status)。2 秒で消える。キーボードの c (URL コピー) が使う。
 */
export class Toast {
  #el;
  #timer = null;

  constructor(el = document.querySelector("#toast")) {
    this.#el = el;
  }

  show(message) {
    if (!this.#el) return;
    this.#el.textContent = message;
    this.#el.classList.add("is-shown");
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#el.classList.remove("is-shown"), 2000);
  }
}
