import { AppState } from "./app-state.js";
import { DataRepository } from "./data-repository.js";
import { LabelRegistry } from "./label-registry.js";
import { QueryMatcher } from "./query-matcher.js";

/** Facade: 描画・サービス層が参照する統合コンテキスト */
export class ViewContext {
  /** @param {AppState} [state] */
  constructor(state = AppState.getInstance()) {
    this.state = state;
    this.labels = LabelRegistry.instance;
    this.query = new QueryMatcher(this);
    this.sources = null;
    this.related = null;
    this.navigation = null;
    this.components = null;
    this.tabs = null;
  }

  get repo() {
    return this.state.repository;
  }

  bindServices({ sources, related, navigation, components, tabs }) {
    this.sources = sources;
    this.related = related;
    this.navigation = navigation;
    this.components = components;
    this.tabs = tabs;
    this.query = new QueryMatcher(this);
  }

  get hasData() {
    return Boolean(this.state.data && this.repo);
  }
}
