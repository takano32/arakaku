import { isMinimalFighter } from "./core/reliability.js";

/** @typedef {import("./core/app-state.js").AppState} AppState */

const DIVISION_OPTIONS = [
  { value: "lightweight", label: "ライト", match: "ライト級" },
  { value: "middleweight", label: "ミドル", match: "ミドル級" },
  { value: "heavyweight", label: "ヘビー", match: "ヘビー級" },
];

const PROMOTION_OPTIONS = [
  { value: "target", label: "ターゲット" },
  { value: "emperor", label: "エンペラー" },
  { value: "mh", label: "マウンテンヒーローズ" },
  { value: "max_bout", label: "MAXバウト" },
];

/**
 * タブごとの絞り込みフィルタ定義。ボタン HTML・絞り込み・クリック・再描画判定の単一の真実。
 *
 * - type:       data-filter-type / グループ識別子
 * - label:      行ラベル
 * - stateKey:   AppState 上の選択値フィールド名
 * - field:      レコードの照合対象フィールド名
 * - otherLabel: 設定すると「その他」(既知値以外) ボタンを末尾に追加する
 * - options:    選択肢 { value(URL/state トークン・英語), label(表示), match(実値・省略時 value) }
 * - forceOther: 指定した述語が真の項目は実値に関わらず「その他」扱い (任意)
 */
export const TAB_FILTERS = {
  fighters: [
    { type: "division", label: "階級", stateKey: "fighterDivision", field: "main_division", otherLabel: "その他", options: DIVISION_OPTIONS, forceOther: isMinimalFighter },
    { type: "promotion", label: "団体", stateKey: "fighterPromotion", field: "main_promotion_id", otherLabel: "その他", options: PROMOTION_OPTIONS, forceOther: isMinimalFighter },
  ],
  bouts: [
    { type: "division", label: "階級", stateKey: "boutDivision", field: "division", otherLabel: "その他", options: DIVISION_OPTIONS },
    { type: "promotion", label: "団体", stateKey: "boutPromotion", field: "promotion_id", otherLabel: "その他", options: PROMOTION_OPTIONS },
  ],
};

/** 「その他」(既知の option 以外) を表す予約値 */
export const OTHER_VALUE = "other";

/** グループ内の全ボタン (個別 option + 任意の「その他」) を返す */
export function filterButtons(group) {
  const buttons = group.options.map((option) => ({ ...option }));
  if (group.otherLabel) {
    buttons.push({ value: OTHER_VALUE, label: group.otherLabel });
  }
  return buttons;
}

const matchOf = (option) => option.match ?? option.value;

/** item が groups の選択値すべてを通過するか */
export function itemPassesFilters(item, groups, state) {
  return groups.every((group) => {
    const selected = state[group.stateKey];
    if (!selected) return true;

    const forcedOther = group.forceOther ? group.forceOther(item) : false;
    const fieldValue = item[group.field];
    if (selected === OTHER_VALUE) {
      return forcedOther || !group.options.some((option) => matchOf(option) === fieldValue);
    }
    const option = group.options.find((o) => o.value === selected);
    return !forcedOther && option != null && fieldValue === matchOf(option);
  });
}
