import { ADMIN_TABS, DEFAULT_TAB, MENTION_TYPE_ORDER, PUBLIC_TABS } from "../config.js";
import { FILTER_STATE_KEYS, TAB_FILTERS, filterButtons } from "../data/filters.js";

/**
 * UI 状態 ⇔ URL クエリ文字列の変換 (純関数。history には触らない。履歴の操作は history_sync.js)。
 *
 * - フィルタ系プロパティ名は data/filters.js の group.stateKey と 1 対 1。
 * - 各フィルタの「未選択」は空文字 ""、tab の既定値は DEFAULT_TAB。searchStringFor は既定値を省略する。
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

// URL から受け付ける値。tab はタブ id、フィルタは各グループのボタンの値だけ (それ以外は捨てて未選択にする)。
const VALID_TABS = new Set([...PUBLIC_TABS, ...ADMIN_TABS].map(([id]) => id));
const VALID_FILTER_VALUES = new Map([
  ...Object.values(TAB_FILTERS).flat().map((group) => [group.stateKey, new Set(filterButtons(group).map((b) => b.value))]),
  // 言及の種別は select で選ぶ (filters.js のボタンではない)。知らない値を受け付けると 0 件なのに select は
  // 「すべての言及」と表示して食い違うので、ほかの絞り込みと同じく捨てる (T112.4.21)。
  ["mentionType", new Set(MENTION_TYPE_ORDER)],
]);

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

/** 「どこを見ているか」= タブと飛び先 (選手・大会・試合) の指紋。履歴を積むかどうかの判断に使う。 */
export function placeOf(state) {
  return [state.tab, state.focusFighterId, state.focusEventId, state.focusBoutId].join("\0");
}

/** URL クエリ文字列を、既定値で埋めた完全な状態パッチにする (「戻る」「進む」で丸ごと戻すため) */
export function stateFromSearch(search) {
  return {
    tab: DEFAULT_TAB, query: "", focusFighterId: "", focusEventId: "", focusBoutId: "", mentionType: "",
    ...Object.fromEntries(FILTER_STATE_KEYS.map((key) => [key, ""])),
    ...readFromURL(search),
  };
}
