import { DEFAULT_TAB, REQUIRED_TAB_DATA_KEYS } from "../../config.js";
import { FILTER_STATE_KEYS } from "../../data/filters.js";
import { escapeHtml } from "../html.js";
import { RecordList } from "../list/record_list.js";
import { SECTIONS } from "../sections/index.js";

/**
 * 一覧 (#list-host) の描画制御。タブごとに 1 つの RecordList を保持し (タブを切り替えても開閉状態と
 * 描画済み件数を保つ)、描画ゲート (必須データの到着・選手タブのソート準備) と変化検知 (タブ・repo.revision・
 * 状態の指紋) を通ったときだけセクションの build() を呼んで一覧を作り直す / 差分更新する。
 * 飛び先 (フォーカス) は 1 件を開いて先頭に出す。
 * 判定の純関数 (listGate / stateFingerprint / focusKeyOf) は Node でテストできる。
 */

/**
 * 一覧を描く前に揃っている必要があるデータの状態。
 * - gateKey: 未着の必須キー (REQUIRED_TAB_DATA_KEYS) の指紋
 * - sortReady: 選手タブは名鑑順ソートに必要なキーが揃うまで待ち、揃ったら 1 回だけ描画する
 * - blocked: プレースホルダだけ出す (必須データ未着、またはソート準備中)
 * - loading: blocked のとき「読み込み中…」(取得中) か「読み込み待ち…」(未着手) か
 */
export function listGate(tabId, loadedDataKeys, loadingDataKeys) {
  const required = REQUIRED_TAB_DATA_KEYS[tabId] ?? [];
  const missing = required.filter((k) => !loadedDataKeys.has(k));
  const sortReady = tabId !== "fighters" || ["numbersFighters", "numbersNameMatches"].every((k) => loadedDataKeys.has(k));
  return {
    gateKey: missing.join(","),
    sortReady,
    blocked: missing.length > 0 || !sortReady,
    loading: missing.some((k) => loadingDataKeys.has(k)) || !sortReady,
  };
}

/** 一覧の中身を決める状態の指紋 (検索語・飛び先・言及種別・全フィルタ)。変わったときだけ build し直す。 */
export function stateFingerprint(state) {
  return [state.query, state.focusFighterId, state.focusEventId, state.focusBoutId, state.mentionType, ...FILTER_STATE_KEYS.map((k) => state[k])].join("\0");
}

/** 飛び先の指紋。変わった描画で見つかった 1 件を開く。 */
export function focusKeyOf(state) {
  return [state.focusFighterId, state.focusEventId, state.focusBoutId].join("\0");
}

export class ListView {
  #host;
  #query;
  #lists = new Map();
  #currentTab = null;
  #prevRevision = new Map();
  #prevFingerprint = new Map();
  #prevGate = new Map();
  #prevSortReady = new Map();
  #prevFocusKey = "";
  #lastCount = -1;

  /** @param {{ query: import("../../data/query.js").QueryMatcher, host?: Element|null }} deps */
  constructor({ query, host = document.querySelector("#list-host") }) {
    this.#query = query;
    this.#host = host;
  }

  /** 直近に描いた一覧の件数 (見出し行を除く)。まだ描けていなければ -1。 */
  get count() { return this.#lastCount; }

  /** タブの RecordList (まだ描いていなければ null)。キーボード操作が使う。 */
  listFor(tabId) {
    return this.#lists.get(tabId) ?? null;
  }

  render(state, repo) {
    this.#renderList(state, repo);
    // 一覧がまだ描けていない間だけ aria-busy (描けた後の補完データの読み込み中は busy にしない)。
    this.#host?.setAttribute("aria-busy", state.loadingDataKeys.size && this.#lastCount < 0 ? "true" : "false");
  }

  #renderList(state, repo) {
    const host = this.#host;
    if (!host) return;
    const tabId = SECTIONS[state.tab] ? state.tab : DEFAULT_TAB;
    const section = SECTIONS[tabId];

    if (!this.#lists.has(tabId)) this.#lists.set(tabId, new RecordList());
    const list = this.#lists.get(tabId);
    const tabChanged = tabId !== this.#currentTab;
    if (tabChanged || list.el.parentNode !== host) {
      host.replaceChildren(list.el);
      this.#currentTab = tabId;
    }

    // 描画ゲート: 必須データが未着ならプレースホルダだけ出す
    const gate = listGate(tabId, state.loadedDataKeys, state.loadingDataKeys);
    if (gate.blocked) {
      list.setItems({ items: [], keyOf: () => "", renderHead: () => "", renderBody: () => "" });
      list.setStatus({ loading: true, emptyMessage: gate.loading ? "読み込み中…" : "読み込み待ち…" });
      this.#prevGate.set(tabId, gate.gateKey);
      this.#prevSortReady.set(tabId, gate.sortReady);
      this.#prevRevision.set(tabId, null);
      this.#lastCount = -1;
      return;
    }

    const revision = repo.revision;
    const fingerprint = stateFingerprint(state);
    const focusKey = focusKeyOf(state);
    const focusChanged = focusKey !== this.#prevFocusKey;
    const gateChanged = gate.gateKey !== this.#prevGate.get(tabId) || gate.sortReady !== this.#prevSortReady.get(tabId);
    const changed = tabChanged || gateChanged || revision !== this.#prevRevision.get(tabId) || fingerprint !== this.#prevFingerprint.get(tabId);
    list.setStatus({ loading: state.loadingDataKeys.size > 0, emptyMessage: section.empty });
    if (!changed) return;

    let desc;
    try {
      desc = section.build({ state, repo, query: this.#query });
    } catch (err) {
      console.error(`Shell: section "${tabId}" failed to build`, err);
      host.innerHTML = `<div class="alert" role="alert"><p class="alert-title">描画エラー (${escapeHtml(tabId)})</p><p>${escapeHtml(err.message)}</p></div>`;
      this.#currentTab = null;
      this.#lastCount = -1; // エラーの横に前のタブの「N 件」を残さない (T.112.4.17)
      return;
    }

    if (tabChanged || gateChanged || this.#prevRevision.get(tabId) == null) {
      list.setItems(desc);
    } else {
      list.refresh(desc);
    }
    // フォーカス (特定レコードへのジャンプ) は 1 件を開いた状態で先頭に出す。
    // データ到着前はまだ見つからないので、見つかった描画で初めて「処理済み」にする。
    if (state.hasFocus) {
      if (focusChanged && desc.items.length === 1) {
        list.openByKey(desc.keyOf(desc.items[0]));
        window.scrollTo({ top: 0, behavior: "instant" });
        this.#prevFocusKey = focusKey;
      }
    } else {
      this.#prevFocusKey = focusKey;
    }
    this.#lastCount = desc.items.filter((item) => !desc.isHeader?.(item)).length;
    this.#prevRevision.set(tabId, revision);
    this.#prevFingerprint.set(tabId, fingerprint);
    this.#prevGate.set(tabId, gate.gateKey);
    this.#prevSortReady.set(tabId, gate.sortReady);
  }
}
