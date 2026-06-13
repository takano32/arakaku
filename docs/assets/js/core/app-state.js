import { DEFAULT_TAB } from "../config.js";

/**
 * 役割: ビューア全体の UI 状態 (タブ・検索クエリ・各タブのフィルタ・フォーカス対象・
 *   ロード済みデータ) を1か所に集約する単一の状態オブジェクト。
 * アーキ上の位置: Singleton + Observer。main.js が getInstance() で生成し subscribe で
 *   購読する。event-controller が render を、url-sync (main.js 経由) が URL 反映を購読し、
 *   patch() が呼ばれるたびに全購読者へ通知される。ViewContext.state として全描画層から参照される。
 * 不変条件 / 注意:
 *   - フィルタ系プロパティ名 (xxxDivision / xxxPromotion など) は url-sync.js の PARAM_MAP の
 *     値と1対1で対応する。プロパティを足し引きする際は PARAM_MAP も合わせて更新すること。
 *   - 各フィルタの「未選択」は空文字 ""、tab の既定値は DEFAULT_TAB。url-sync の write 判定が
 *     この既定値に依存する。
 *   - data / repository は DataLoader が差し込み、loadedDataKeys 等でロード進捗を表す。
 */
/** Singleton + Observer: アプリ全体の UI 状態 */
export class AppState {
  static #instance = null;

  tab = DEFAULT_TAB;
  viewMode = "public";
  query = "";
  focusFighterId = "";
  focusEventId = "";
  titlePromotion = "";
  titleDivision = "";
  mentionType = "";
  fighterDivision = "";
  fighterPromotion = "";
  boutDivision = "";
  boutPromotion = "";
  eventPromotion = "";
  eventType = "";
  promotionCategory = "";
  videoDivision = "";
  videoPromotion = "";
  tsushinDivision = "";
  tsushinPromotion = "";
  sourceType = "";
  nfDivision = "";
  nfPromotion = "";
  nrDivision = "";
  nrPromotion = "";
  opDivision = "";
  opPromotion = "";
  data = null;
  repository = null;
  loadedDataKeys = new Set();
  loadingDataKeys = new Set();
  dataLoadErrors = {};

  #listeners = new Set();

  static getInstance() {
    if (!AppState.#instance) {
      AppState.#instance = new AppState();
    }
    return AppState.#instance;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  // updates が空オブジェクトでも #notify は走る。DataLoader はデータ差し込み後の
  // 再描画トリガとして patch({}) を多用する。
  patch(updates) {
    Object.assign(this, updates);
    this.#notify();
  }

  clearFocus() {
    this.focusFighterId = "";
    this.focusEventId = "";
  }

  #notify() {
    for (const listener of this.#listeners) {
      listener(this);
    }
  }
}
