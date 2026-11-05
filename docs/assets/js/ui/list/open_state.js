/**
 * OpenState — 行の開閉の記憶 (行キー → 真偽)。明示的に開閉した行だけを覚え、
 * それ以外は呼び出し側の既定値 (descriptor の defaultOpen) に任せる。DOM を持たない。
 */
export class OpenState {
  #map = new Map();

  /**
   * 覚えていればその値、無ければ fallback() の値 (fallback は覚えていないときだけ呼ぶ)。
   * @param {string} key
   * @param {() => boolean} fallback
   */
  isOpen(key, fallback) {
    if (this.#map.has(key)) return this.#map.get(key);
    return fallback();
  }

  set(key, open) {
    this.#map.set(key, open);
  }

  /** force があればその値に、無ければ今の値 (isOpen) を反転して覚え、新しい値を返す。 */
  toggle(key, fallback, force) {
    const next = force ?? !this.isOpen(key, fallback);
    this.set(key, next);
    return next;
  }
}
