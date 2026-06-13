import { AppState } from "./app-state.js";
import { DataRepository } from "./data-repository.js";
import { LabelRegistry } from "./label-registry.js";
import { QueryMatcher } from "./query-matcher.js";

/**
 * 役割: 描画・サービス層がアクセスする共有依存をまとめた統合コンテキスト。state /
 *   repo / labels / query と各サービス (sources, related, navigation, components, tabs) への
 *   単一の入口を提供する。
 * アーキ上の位置: Facade。main.js が生成して各レンダラ/サービスへ ctx として渡す。
 *   repo は state.repository への getter で、DataLoader が repository を差し込んだ後に有効化される。
 * 不変条件 / 注意:
 *   - サービス群は構築順の循環を避けるため二段階で組む: まず ctx を作り、サービスを生成してから
 *     bindServices() で注入する。bindServices 完了までは ctx.sources 等は null。
 *   - bindServices は QueryMatcher を作り直す。query が ctx.sources に依存するため、
 *     サービス注入後の新インスタンスを使う必要がある (query-matcher.js のヘッダ参照)。
 */
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
