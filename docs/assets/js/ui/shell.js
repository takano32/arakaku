import { DEFAULT_ADMIN_TAB, DEFAULT_TAB, REQUIRED_TAB_DATA_KEYS } from "../config.js";
import { FILTER_STATE_KEYS, TAB_FILTERS } from "../data/filters.js";
import { escapeHtml } from "./html.js";
import { RecordList } from "./list.js";
import { AlertsRenderer } from "./render/alerts.js";
import { FiltersRenderer } from "./render/filters.js";
import { NavRenderer } from "./render/nav.js";
import { StatsRenderer } from "./render/stats.js";
import { ToolbarRenderer } from "./render/toolbar.js";
import { SECTIONS } from "./sections/index.js";
import { ThemeToggle } from "./theme.js";
import { Toast } from "./toast.js";
import { activateVideoFacade } from "./video_embed.js";

/**
 * Shell — 画面全体の UI イベントの配線と状態遷移 (タブ切替・飛び先・検索クリア)、および描画の順序付け。
 *
 * - state.subscribe → render() が唯一の再描画経路。render() は冪等で、各レンダラ (ui/render/*.js) が
 *   変化した部分だけ DOM を触る (ナビは aria-current の更新だけ、絞り込みは指紋が変わったときだけ、
 *   一覧はタブ・repo.revision・指紋のいずれかが変わったときだけ build する)。
 * - 一覧はタブごとに 1 つの RecordList を保持し、タブを切り替えても開閉状態と描画済み件数を保つ。
 * - 選手/大会/試合リンク (ui/parts/links.js の data-* 属性) と YouTube ファサードのクリックは
 *   #list-host への委譲で受ける。
 * - 検索欄 (ui/search_box.js)・配色 (ui/theme.js)・通知 (ui/toast.js) は部品として持つ。
 */
export class Shell {
  #state;
  #loader;
  #query;
  #searchBox;
  #theme = new ThemeToggle();
  #toast = new Toast();
  #nav = new NavRenderer();
  #stats = new StatsRenderer();
  #alerts = new AlertsRenderer();
  #filters = new FiltersRenderer();
  #toolbar = new ToolbarRenderer();
  #lists = new Map();
  #currentTab = null;
  #prevRevision = new Map();
  #prevFingerprint = new Map();
  #prevGate = new Map();
  #prevFocusKey = "";
  #prevSortReady = new Map();
  #prevPublicTab = DEFAULT_TAB;
  #prevAdminTab = DEFAULT_ADMIN_TAB;
  #lastCount = -1;

  constructor({ state, loader, query, searchBox }) {
    this.#state = state;
    this.#loader = loader;
    this.#query = query;
    this.#searchBox = searchBox;
  }

  get state() { return this.#state; }
  get repo() { return this.#state.repository; }

  // ── 配線 ───────────────────────────────────────────────────────────

  bind() {
    this.#searchBox.bind({
      onSearch: (value) => {
        this.#state.clearFocus();
        this.#state.patch({ query: value });
      },
      onClear: () => this.clearSearch(),
    });

    for (const selector of ["#nav", "#stats"]) {
      document.querySelector(selector)?.addEventListener("click", (event) => {
        const link = event.target.closest("a[data-tab]");
        if (!link) return;
        // Ctrl/Cmd/Shift クリックや中クリックはブラウザに任せて新しいタブ・ウィンドウで開く (T.102)。
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        this.switchTab(link.dataset.tab);
      });
    }

    document.querySelector("#nav")?.addEventListener("toggle", (event) => {
      // 管理ビューの開閉 = ビュー切替。離れる前の各ビューの最後のタブへ戻す。
      if (this.#nav.syncing || !event.target.classList.contains("nav-admin")) return;
      const open = event.target.open;
      if (open && this.#state.viewMode === "public") this.switchTab(this.#prevAdminTab);
      else if (!open && this.#state.viewMode === "admin") this.switchTab(this.#prevPublicTab);
    }, true);

    document.querySelector("#filters")?.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-filter-type]");
      if (!btn) return;
      const group = TAB_FILTERS[this.#state.tab]?.find((g) => g.type === btn.dataset.filterType);
      if (!group) return;
      const val = btn.dataset.filterVal;
      this.#state.patch({ [group.stateKey]: this.#state[group.stateKey] === val ? "" : val });
    });

    document.querySelector("#filters")?.addEventListener("change", (event) => {
      if (event.target.id === "mention-type") this.#state.patch({ mentionType: event.target.value });
    });

    document.querySelector("#toolbar")?.addEventListener("click", (event) => {
      if (event.target.closest("#focus-clear")) {
        this.#state.clearFocus();
        this.#state.patch({});
      }
    });

    document.querySelector("#list-host")?.addEventListener("click", (event) => {
      const fighter = event.target.closest(".link-fighter");
      if (fighter) { this.jumpToFighter(fighter.dataset.fighterId); return; }
      const ev = event.target.closest(".link-event");
      if (ev) { this.jumpToEvent(ev.dataset.eventId); return; }
      const bout = event.target.closest(".link-bout");
      if (bout) { this.jumpToBout(bout.dataset.boutId); return; }
      const yt = event.target.closest(".yt");
      if (yt) activateVideoFacade(yt);
    });

    this.#theme.bind();

    this.#state.subscribe(() => this.render());
  }

  // ── 遷移 ───────────────────────────────────────────────────────────

  switchTab(tabId) {
    if (!SECTIONS[tabId]) tabId = DEFAULT_TAB;
    this.#state.clearFocus();
    this.#state.patch({ tab: tabId });
    this.#loader.loadForTab(tabId);
    window.scrollTo({ top: 0, behavior: "instant" });
    this.#focusHeading();
  }

  // タブ切り替え・飛び先への移動のあと、押したボタンが描き直しで消えてフォーカスが body に落ちるので、
  // 見出しへ移して新しい表示を支援技術に伝える (T.102)。
  #focusHeading() {
    document.querySelector("#toolbar .section-title")?.focus({ preventScroll: true });
  }

  #jump(patch) {
    this.#state.clearFocus();
    this.#state.patch({ ...patch, query: "" });
    this.#searchBox.setValue("");
    this.#loader.loadForTab(this.#state.tab);
    window.scrollTo({ top: 0, behavior: "instant" });
    this.#focusHeading();
  }

  jumpToFighter(fighterId) { this.#jump({ tab: "fighters", focusFighterId: fighterId || "" }); }
  jumpToEvent(eventId) { this.#jump({ tab: "events", focusEventId: eventId || "" }); }
  jumpToBout(boutId) { this.#jump({ tab: "bouts", focusBoutId: boutId || "" }); }

  clearSearch() {
    this.#searchBox.setValue("");
    this.#searchBox.cancelPending();
    this.#state.clearFocus();
    this.#state.patch({ query: "" });
  }

  currentList() {
    return this.#lists.get(this.#state.tab) ?? null;
  }

  toast(message) {
    this.#toast.show(message);
  }

  // ── 描画 ───────────────────────────────────────────────────────────

  render() {
    const state = this.#state;
    if (!state.data || !state.repository) return;
    if (state.viewMode === "admin") this.#prevAdminTab = state.tab;
    else this.#prevPublicTab = state.tab;

    this.#nav.render(state);
    this.#stats.render(state, this.repo);
    this.#alerts.render(state.dataLoadErrors);
    this.#filters.render(state, this.repo);
    this.#renderList();
    const section = SECTIONS[state.tab];
    this.#toolbar.render({ state, repo: this.repo, section, count: this.#lastCount });
    // 一覧がまだ描けていない間だけ aria-busy (描けた後の補完データの読み込み中は busy にしない)。
    document.querySelector("#list-host")?.setAttribute("aria-busy", state.loadingDataKeys.size && this.#lastCount < 0 ? "true" : "false");
    this.#searchBox.setPlaceholder(section?.placeholder);
  }

  #fingerprint() {
    const s = this.#state;
    return [s.query, s.focusFighterId, s.focusEventId, s.focusBoutId, s.mentionType, ...FILTER_STATE_KEYS.map((k) => s[k])].join("\0");
  }

  #renderList() {
    const host = document.querySelector("#list-host");
    if (!host) return;
    const state = this.#state;
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
    const required = REQUIRED_TAB_DATA_KEYS[tabId] ?? [];
    const missing = required.filter((k) => !state.loadedDataKeys.has(k));
    const gateKey = missing.join(",");
    // 選手タブは名鑑順ソートに必要なキーが揃うまで待ち、揃ったら 1 回だけ描画する
    const sortReady = tabId !== "fighters" || ["numbersFighters", "numbersNameMatches"].every((k) => state.loadedDataKeys.has(k));
    if (missing.length > 0 || !sortReady) {
      const loading = missing.some((k) => state.loadingDataKeys.has(k)) || !sortReady;
      list.setItems({ items: [], keyOf: () => "", renderHead: () => "", renderBody: () => "" });
      list.setStatus({ loading: true, emptyMessage: loading ? "読み込み中…" : "読み込み待ち…" });
      this.#prevGate.set(tabId, gateKey);
      this.#prevSortReady.set(tabId, sortReady);
      this.#prevRevision.set(tabId, null);
      this.#lastCount = -1;
      return;
    }

    const revision = this.repo.revision;
    const fingerprint = this.#fingerprint();
    const focusKey = [state.focusFighterId, state.focusEventId, state.focusBoutId].join("\0");
    const focusChanged = focusKey !== this.#prevFocusKey;
    const gateChanged = gateKey !== this.#prevGate.get(tabId) || sortReady !== this.#prevSortReady.get(tabId);
    const changed = tabChanged || gateChanged || revision !== this.#prevRevision.get(tabId) || fingerprint !== this.#prevFingerprint.get(tabId);
    list.setStatus({ loading: state.loadingDataKeys.size > 0, emptyMessage: section.empty });
    if (!changed) return;

    let desc;
    try {
      desc = section.build({ state, repo: this.repo, query: this.#query });
    } catch (err) {
      console.error(`Shell: section "${tabId}" failed to build`, err);
      host.innerHTML = `<div class="alert" role="alert"><p class="alert-title">描画エラー (${escapeHtml(tabId)})</p><p>${escapeHtml(err.message)}</p></div>`;
      this.#currentTab = null;
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
    this.#prevGate.set(tabId, gateKey);
    this.#prevSortReady.set(tabId, sortReady);
  }
}
