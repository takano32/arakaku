import { ADMIN_TAB_IDS, DEFAULT_TAB } from "../config.js";
import { FILTER_STATE_KEYS } from "../data/filters.js";

/**
 * ビューア全体の UI 状態 (タブ・検索語・各タブの絞り込み・フォーカス対象・ロード進捗)。
 *
 * - フィルタ系プロパティ名は data/filters.js の group.stateKey と 1 対 1 (FILTER_STATE_KEYS から初期化)。
 * - 各フィルタの「未選択」は空文字 ""、tab の既定値は DEFAULT_TAB。
 * - URL との双方向同期は app/url_params.js (変換) と app/history_sync.js (履歴) が担う。
 * - data / repository / loadedDataKeys 等は data/loader.js が差し込む。
 * - viewMode はタブから導出する (管理タブなら "admin")。`?tab=sources` のような共有リンクが
 *   そのまま管理ビューを開けるようにするため、状態としては持たない。
 */
export class Store {
  tab = DEFAULT_TAB;
  query = "";
  focusFighterId = "";
  focusEventId = "";
  focusBoutId = "";
  mentionType = "";
  data = null;
  repository = null;
  loadedDataKeys = new Set();
  loadingDataKeys = new Set();
  dataLoadErrors = {};

  #listeners = new Set();

  constructor() {
    for (const key of FILTER_STATE_KEYS) this[key] = "";
  }

  get viewMode() {
    return ADMIN_TAB_IDS.has(this.tab) ? "admin" : "public";
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  // updates が空でも通知は走る。DataLoader はデータ差し込み後の再描画トリガとして patch({}) を使う。
  patch(updates) {
    Object.assign(this, updates);
    for (const listener of this.#listeners) listener(this);
  }

  clearFocus() {
    this.focusFighterId = "";
    this.focusEventId = "";
    this.focusBoutId = "";
  }

  get hasFocus() {
    return Boolean(this.focusFighterId || this.focusEventId || this.focusBoutId);
  }
}
