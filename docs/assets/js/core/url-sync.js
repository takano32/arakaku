import { DEFAULT_TAB } from "../config.js";

/**
 * 役割: AppState のうち共有・復元したい部分を URL クエリ文字列と双方向に同期する
 *   (起動時の readFromURL で復元、状態変更時の writeToURL で反映)。
 * アーキ上の位置: main.js が起動時に readFromURL() で初期 patch を作り、
 *   state.subscribe((s) => writeToURL(s)) で状態変更ごとに URL を書き戻す。
 * 不変条件 / 注意:
 *   - PARAM_MAP の値 (右辺) は AppState のプロパティ名と完全一致させること。state 側に
 *     フィルタを増減したらここも更新する (左辺=短い URL パラメータ名は URL 互換のため安易に変えない)。
 *   - 既定値 (tab は DEFAULT_TAB、その他は空文字) はパラメータを出力しない。AppState の既定値を
 *     変える場合は writeToURL の比較もそれに追従させる。
 */
const PARAM_MAP = {
  tab:            "tab",
  q:              "query",
  fighter:        "focusFighterId",
  event:          "focusEventId",
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

/** URL クエリ文字列から state の初期値を返す */
export function readFromURL() {
  const params = new URLSearchParams(location.search);
  const patch = {};
  for (const [param, stateKey] of Object.entries(PARAM_MAP)) {
    const value = params.get(param);
    if (value !== null) patch[stateKey] = value;
  }
  return patch;
}

let _lastSearch = "";

/** state を URL クエリ文字列に反映する（履歴は増やさない） */
export function writeToURL(state) {
  const params = new URLSearchParams();
  for (const [param, stateKey] of Object.entries(PARAM_MAP)) {
    const value = state[stateKey];
    if (value && value !== (stateKey === "tab" ? DEFAULT_TAB : "")) {
      params.set(param, value);
    }
  }
  const search = params.size > 0 ? `?${params}` : location.pathname;
  // pushState ではなく replaceState。state は patch ごとに頻繁に通知されるため、
  // 履歴を増やさず直前と同一なら書き込みも省く (_lastSearch でガード)。
  if (search === _lastSearch) return;
  _lastSearch = search;
  history.replaceState(null, "", search);
}
