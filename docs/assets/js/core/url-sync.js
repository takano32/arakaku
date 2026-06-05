import { DEFAULT_TAB } from "../config.js";

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
  if (search === _lastSearch) return;
  _lastSearch = search;
  history.replaceState(null, "", search);
}
