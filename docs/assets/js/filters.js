import { isMinimalFighter } from "./core/reliability.js";

/**
 * 役割: タブごとの絞り込みフィルタの「単一の真実」。フィルタ定義 (TAB_FILTERS)、
 *   ボタン列挙 (filterButtons)、レコード照合ロジック (itemPassesFilters) を提供する。
 * アーキ上の位置:
 *   - view-controller.js: TAB_FILTERS/filterButtons でフィルタ UI のボタン HTML を描画。
 *   - event-controller.js: TAB_FILTERS でクリックされたボタンの group/stateKey を解決し state.patch。
 *   - tabs/tab-renderers.js: itemPassesFilters で各タブの items を絞り込み。
 *   - tabs/tab-registry.js: TAB_FILTERS の stateKey 群で再描画判定の fingerprint を作る。
 *   選択状態は core/app-state.js のフィールド (group.stateKey 名と一致) に保持される。
 * 不変条件 / 注意:
 *   - TAB_FILTERS のキーは tab ID と一致し、group.stateKey は AppState のフィールド名と
 *     1対1で対応していなければならない (UI・state・絞り込み・URL 同期が全てこの名前を共有)。
 *   - option.value は URL/state トークン (英語)、option.match (省略時 value) が実データ値。
 *     表示は option.label。この三者の役割を混同しないこと。
 *   - OTHER_VALUE("other") は予約値。実データに "other" という値が現れない前提。
 * 関連スキル: .agents/skills/arakaku-filters, .agents/skills/arakaku-viewer-ui
 */

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

const EVENT_TYPE_OPTIONS = [
  { value: "numbered_event", label: "通常大会" },
  { value: "tournament", label: "トーナメント" },
  { value: "special_event", label: "特別大会" },
];

const PROMOTION_CATEGORY_OPTIONS = [
  { value: "major", label: "主要" },
  { value: "special_event_series", label: "特別大会シリーズ" },
  { value: "minor", label: "マイナー" },
  { value: "event_series", label: "イベントシリーズ" },
  { value: "unclassified", label: "未分類" },
];

const SOURCE_TYPE_OPTIONS = [
  { value: "note_article", label: "ノート" },
  { value: "youtube_description", label: "YouTube概要" },
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
  titles: [
    { type: "division", label: "階級", stateKey: "titleDivision", field: "division", otherLabel: "その他", options: DIVISION_OPTIONS },
    { type: "promotion", label: "団体", stateKey: "titlePromotion", field: "promotion_id", otherLabel: "その他", options: PROMOTION_OPTIONS },
  ],
  events: [
    { type: "promotion", label: "団体", stateKey: "eventPromotion", field: "promotion_id", otherLabel: "その他", options: PROMOTION_OPTIONS },
    { type: "event_type", label: "種別", stateKey: "eventType", field: "event_type", otherLabel: "その他", options: EVENT_TYPE_OPTIONS },
  ],
  promotions: [
    { type: "category", label: "区分", stateKey: "promotionCategory", field: "category", options: PROMOTION_CATEGORY_OPTIONS },
  ],
  videos: [
    { type: "division", label: "階級", stateKey: "videoDivision", field: "division", otherLabel: "その他", options: DIVISION_OPTIONS },
    { type: "promotion", label: "団体", stateKey: "videoPromotion", field: "promotion_id", otherLabel: "その他", options: PROMOTION_OPTIONS },
  ],
  tsushin: [
    { type: "division", label: "階級", stateKey: "tsushinDivision", field: "divisions", otherLabel: "その他", options: DIVISION_OPTIONS },
    { type: "promotion", label: "団体", stateKey: "tsushinPromotion", field: "promotion_id", otherLabel: "その他", options: PROMOTION_OPTIONS },
  ],
  // 管理ビューのタブ
  sources: [
    { type: "source_type", label: "種別", stateKey: "sourceType", field: "source_type", options: SOURCE_TYPE_OPTIONS },
  ],
  numbersFighters: [
    { type: "division", label: "階級", stateKey: "nfDivision", field: "main_division", otherLabel: "その他", options: DIVISION_OPTIONS },
    { type: "promotion", label: "団体", stateKey: "nfPromotion", field: "main_promotion_id", otherLabel: "その他", options: PROMOTION_OPTIONS },
  ],
  numbersFightRecords: [
    { type: "division", label: "階級", stateKey: "nrDivision", field: "division", otherLabel: "その他", options: DIVISION_OPTIONS },
    { type: "promotion", label: "団体", stateKey: "nrPromotion", field: "promotion_id", otherLabel: "その他", options: PROMOTION_OPTIONS },
  ],
  officialPlayers: [
    { type: "division", label: "階級", stateKey: "opDivision", field: "weight_class", otherLabel: "その他", options: DIVISION_OPTIONS },
    { type: "promotion", label: "団体", stateKey: "opPromotion", field: "promotion_id", otherLabel: "その他", options: PROMOTION_OPTIONS },
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

/**
 * item が groups の選択値すべてを通過するか。
 * field の値は単一でも配列でもよい (例: 1記事が複数階級を含む)。配列の場合はいずれかが一致すれば通過。
 */
export function itemPassesFilters(item, groups, state) {
  return groups.every((group) => {
    const selected = state[group.stateKey];
    if (!selected) return true;

    // forceOther が真の項目は実値に関わらず「その他」側に倒す (例: 最小登録選手は
    // main_division を持っていても階級フィルタでは「その他」扱い)。
    const forcedOther = group.forceOther ? group.forceOther(item) : false;
    const raw = item[group.field];
    // field は単一値・配列・空のいずれもありうる。配列に正規化していずれか一致で通過扱い。
    const values = Array.isArray(raw) ? raw : raw == null || raw === "" ? [] : [raw];
    const knownMatches = group.options.map(matchOf);

    if (selected === OTHER_VALUE) {
      return forcedOther || !values.some((v) => knownMatches.includes(v));
    }
    const option = group.options.find((o) => o.value === selected);
    return !forcedOther && option != null && values.includes(matchOf(option));
  });
}
