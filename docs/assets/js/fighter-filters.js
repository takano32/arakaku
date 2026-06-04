import { isMinimalFighter } from "./core/reliability.js";

/** @typedef {import("./core/app-state.js").AppState} AppState */

/**
 * 選手タブの絞り込みフィルタ定義。
 * ボタン HTML・絞り込みロジック・クリック処理・再描画判定の単一の真実。
 * 新しい階級や団体を増やすときはこの定義に追記するだけでよい。
 *
 * - type:     ボタンの data-filter-type / グループ識別子
 * - label:    行ラベル
 * - stateKey: AppState 上の選択値フィールド名
 * - field:    選手レコードの照合対象フィールド名
 * - otherLabel: 設定すると「その他」(既知値以外) ボタンを末尾に追加する
 * - options:  個別の選択肢 { value, label, match }
 *     value: URL / state 上のトークン (英語で統一)
 *     label: ボタン表示テキスト
 *     match: 選手レコードの実値 (省略時は value と同じ)
 */
export const FIGHTER_FILTERS = [
  {
    type: "division",
    label: "階級",
    stateKey: "fighterDivision",
    field: "main_division",
    otherLabel: "その他",
    options: [
      { value: "lightweight", label: "ライト", match: "ライト級" },
      { value: "middleweight", label: "ミドル", match: "ミドル級" },
      { value: "heavyweight", label: "ヘビー", match: "ヘビー級" },
    ],
  },
  {
    type: "promotion",
    label: "団体",
    stateKey: "fighterPromotion",
    field: "main_promotion_id",
    otherLabel: "その他",
    options: [
      { value: "target", label: "ターゲット" },
      { value: "emperor", label: "エンペラー" },
      { value: "mh", label: "マウンテンヒーローズ" },
    ],
  },
];

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

/** state の選択値で fighter が全フィルタを通過するか */
export function fighterPassesFilters(fighter, state) {
  // 最小登録の選手は実際の階級・団体に関わらず「その他」扱い
  const minimal = isMinimalFighter(fighter);
  return FIGHTER_FILTERS.every((group) => {
    const selected = state[group.stateKey];
    if (!selected) return true;

    const fieldValue = fighter[group.field];
    const matchOf = (option) => option.match ?? option.value;
    if (selected === OTHER_VALUE) {
      return minimal || !group.options.some((option) => matchOf(option) === fieldValue);
    }
    const option = group.options.find((o) => o.value === selected);
    return !minimal && option != null && fieldValue === matchOf(option);
  });
}
