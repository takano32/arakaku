import { placeOf, searchStringFor, stateFromSearch } from "./url_params.js";

/**
 * 状態とブラウザ履歴 (URL) の同期。
 *
 * - 「どこを見ているか」= タブと飛び先 (選手・大会・試合)。これが変わったときだけ履歴を増やし、
 *   ブラウザの「戻る」で前の表示に戻れるようにする (T80)。検索語・絞り込みの変更は履歴を置き換える。
 * - 履歴を積む前に、いまの項目にスクロール位置を残す (「戻る」で戻すため。T102)。
 * - main.js が 1 つ作り、state.subscribe で write()、popstate で restore() を呼ぶ。
 * - history / location / scrollY は差し替え可能 (Node のテスト用。既定はブラウザのグローバル)。
 */
export class HistorySync {
  #lastSearch = null;
  #lastPlace = null;
  #history;
  #location;
  #scrollY;

  constructor({ history = globalThis.history, location = globalThis.location, scrollY = () => globalThis.scrollY } = {}) {
    this.#history = history;
    this.#location = location;
    this.#scrollY = scrollY;
  }

  /** 状態を URL に反映する (タブ・飛び先が変われば pushState、それ以外は replaceState。直前と同じなら書き込まない) */
  write(state) {
    const search = searchStringFor(state);
    if (search === this.#lastSearch) return;
    const place = placeOf(state);
    const push = this.#lastPlace !== null && place !== this.#lastPlace;
    this.#lastSearch = search;
    this.#lastPlace = place;
    if (push) this.#history.replaceState({ scrollY: this.#scrollY() }, "");
    this.#history[push ? "pushState" : "replaceState"](push ? null : this.#history.state, "", search || this.#location.pathname);
  }

  /** 「戻る」「進む」で URL が変わったとき、その URL の状態 (既定値で埋めたもの) を返し、書き戻しを抑える */
  restore(search = this.#location.search) {
    const patch = stateFromSearch(search);
    this.#lastSearch = searchStringFor(patch);
    this.#lastPlace = placeOf(patch);
    return patch;
  }
}
