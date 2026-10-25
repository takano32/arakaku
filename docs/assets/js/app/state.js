import { ADMIN_TAB_IDS, ADMIN_TABS, DEFAULT_TAB, PUBLIC_TABS } from "../config.js";
import { FILTER_STATE_KEYS, TAB_FILTERS, filterButtons } from "../data/filters.js";

/**
 * ビューア全体の UI 状態 (タブ・検索語・各タブの絞り込み・フォーカス対象・ロード進捗) と、
 * その URL クエリ文字列との双方向同期。
 *
 * - フィルタ系プロパティ名は data/filters.js の group.stateKey と 1 対 1 (FILTER_STATE_KEYS から初期化)。
 * - 各フィルタの「未選択」は空文字 ""、tab の既定値は DEFAULT_TAB。writeToURL は既定値を省略する。
 * - data / repository / loadedDataKeys 等は data/loader.js が差し込む。
 * - viewMode はタブから導出する (管理タブなら "admin")。`?tab=sources` のような共有リンクが
 *   そのまま管理ビューを開けるようにするため、状態としては持たない。
 */

// URL パラメータ名 → 状態のプロパティ名。左辺 (短い URL 名) は既存の共有リンクとの互換のため変えない。
export const PARAM_MAP = {
  tab:            "tab",
  q:              "query",
  fighter:        "focusFighterId",
  event:          "focusEventId",
  bout:           "focusBoutId",
  title_promo:    "titlePromotion",
  title_div:      "titleDivision",
  mention:        "mentionType",
  fighter_div:    "fighterDivision",
  fighter_promo:  "fighterPromotion",
  bout_div:       "boutDivision",
  bout_promo:     "boutPromotion",
  event_promo:    "eventPromotion",
  event_type:     "eventType",
  promo_cat:      "promotionCategory",
  video_div:      "videoDivision",
  video_promo:    "videoPromotion",
  tsushin_div:    "tsushinDivision",
  tsushin_promo:  "tsushinPromotion",
  src_type:       "sourceType",
  nf_div:         "nfDivision",
  nf_promo:       "nfPromotion",
  nr_div:         "nrDivision",
  nr_promo:       "nrPromotion",
  op_div:         "opDivision",
  op_promo:       "opPromotion",
};

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

// URL から受け付ける値。tab はタブ id、フィルタは各グループのボタンの値だけ (それ以外は捨てて未選択にする)。
const VALID_TABS = new Set([...PUBLIC_TABS, ...ADMIN_TABS].map(([id]) => id));
const VALID_FILTER_VALUES = new Map(
  Object.values(TAB_FILTERS).flat().map((group) => [group.stateKey, new Set(filterButtons(group).map((b) => b.value))])
);

function isValidParam(stateKey, value) {
  if (stateKey === "tab") return VALID_TABS.has(value);
  const allowed = VALID_FILTER_VALUES.get(stateKey);
  return !allowed || allowed.has(value);
}

/** URL クエリ文字列から状態の初期値を返す (知らないタブ・絞り込みの値は捨てる) */
export function readFromURL(search = location.search) {
  const params = new URLSearchParams(search);
  const patch = {};
  for (const [param, stateKey] of Object.entries(PARAM_MAP)) {
    const value = params.get(param);
    if (value !== null && isValidParam(stateKey, value)) patch[stateKey] = value;
  }
  return patch;
}

/** 状態を URL クエリ文字列にする (既定値は省略) */
export function searchStringFor(state) {
  const params = new URLSearchParams();
  for (const [param, stateKey] of Object.entries(PARAM_MAP)) {
    const value = state[stateKey];
    if (value && value !== (stateKey === "tab" ? DEFAULT_TAB : "")) {
      params.set(param, value);
    }
  }
  return params.size > 0 ? `?${params}` : "";
}

let lastSearch = null;

/** 状態を URL に反映する (replaceState。履歴は増やさず、直前と同じなら書き込まない) */
export function writeToURL(state) {
  const search = searchStringFor(state);
  if (search === lastSearch) return;
  lastSearch = search;
  history.replaceState(null, "", search || location.pathname);
}
