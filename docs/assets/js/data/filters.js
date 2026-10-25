import { isMinimalFighter } from "./reliability.js";

/**
 * タブごとの絞り込みフィルタの単一の真実。定義 (TAB_FILTERS)、ボタン列挙 (filterButtons)、
 * レコード照合 (itemPassesFilters) をここに置く。
 *
 * - TAB_FILTERS のキーは tab ID。group.stateKey は Store のフィールド名と 1 対 1
 *   （UI・状態・絞り込み・URL 同期がすべてこの名前を共有する）。
 * - option.value は URL/状態トークン（英語）、option.match（省略時 value）が実データ値、option.label が表示。
 * - OTHER_VALUE ("other") は予約値。実データに "other" という値が現れない前提。
 */

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
 * - type:       グループ識別子（タブ内で一意、data-filter-type）
 * - label:      行ラベル
 * - stateKey:   Store 上の選択値フィールド名
 * - field:      レコードの照合対象フィールド名
 * - matchPrefix: 真なら option.match との前方一致で照合する（省略時は完全一致）
 * - otherLabel: 設定すると「その他」(既知値以外) ボタンを末尾に追加する
 * - options:    選択肢
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
    // 公式サイトの階級は「ヘビー級101kg」のように体重が付くことがあるので前方一致で照合する。
    { type: "division", label: "階級", stateKey: "opDivision", field: "weight_class", otherLabel: "その他", options: DIVISION_OPTIONS, matchPrefix: true },
    { type: "promotion", label: "団体", stateKey: "opPromotion", field: "promotion_id", otherLabel: "その他", options: PROMOTION_OPTIONS },
  ],
};

/** 「その他」(既知の option 以外) を表す予約値 */
export const OTHER_VALUE = "other";

/** すべてのフィルタの stateKey（Store の初期化と URL 同期の指紋に使う） */
export const FILTER_STATE_KEYS = Object.values(TAB_FILTERS).flat().map((group) => group.stateKey);

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
    const same = group.matchPrefix ? (v, m) => String(v).startsWith(m) : (v, m) => v === m;

    if (selected === OTHER_VALUE) {
      return forcedOther || !values.some((v) => knownMatches.some((m) => same(v, m)));
    }
    const option = group.options.find((o) => o.value === selected);
    return !forcedOther && option != null && values.some((v) => same(v, matchOf(option)));
  });
}
