import { DEFAULT_TAB } from "../config.js";

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
